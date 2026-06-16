import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ZiaMessage = { role: "user" | "assistant"; content: string };

type ChatInput = { messages: ZiaMessage[] };

export const askZia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ChatInput) => {
    if (!data || !Array.isArray(data.messages)) throw new Error("messages required");
    if (data.messages.length === 0) throw new Error("at least one message required");
    if (data.messages.length > 30) throw new Error("too many messages");
    for (const m of data.messages) {
      if (m.role !== "user" && m.role !== "assistant") throw new Error("bad role");
      if (typeof m.content !== "string" || m.content.length === 0 || m.content.length > 4000) {
        throw new Error("bad content");
      }
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<{ reply: string }> => {
    const { supabase, userId } = context;

    // Gather lightweight HR context for the signed-in user.
    const [{ data: me }, { data: balances }, { data: today }, { data: empCount }] = await Promise.all([
      supabase
        .from("employees")
        .select("id, full_name, employee_code, job_title, location, hire_date, department:departments(name)")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("leave_balances")
        .select("allocated, used, year, leave_type:leave_types(name)")
        .eq("employee_id", (await supabase.rpc("current_employee_id")).data ?? "")
        .eq("year", new Date().getUTCFullYear()),
      supabase
        .from("attendance_logs")
        .select("clock_in, clock_out, work_date, status")
        .eq("employee_id", (await supabase.rpc("current_employee_id")).data ?? "")
        .order("work_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("employees").select("id", { count: "exact", head: true }),
    ]);

    type BalanceRow = { allocated: number; used: number; leave_type: { name: string } | null };
    const balRows = (Array.isArray(balances) ? (balances as unknown as BalanceRow[]) : []);
    const ctx = {
      you: me
        ? {
            name: me.full_name,
            code: me.employee_code,
            title: me.job_title,
            location: me.location,
            department: (me as { department?: { name?: string } | null }).department?.name ?? null,
            hire_date: me.hire_date,
          }
        : null,
      leave_balances: balRows.map((b) => ({
        type: b.leave_type?.name,
        allocated: b.allocated,
        used: b.used,
        remaining: Number(b.allocated) - Number(b.used),
      })),
      latest_attendance: today,
      org_employee_count: (empCount as unknown as { count?: number })?.count ?? null,
      today_iso: new Date().toISOString(),
    };

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable is not configured");

    const systemPrompt = `You are Evai, the friendly AI assistant inside Ev's HRMS.
You help employees with HR questions: leave balances, attendance, directory lookups, company policy guidance, and quick task help.
Be concise (under 120 words unless asked for detail). Use bullet points for lists. Never invent data — if context is missing, say so and suggest where to look in the app (Directory, Attendance, Time-off, Payroll, etc.).
Here is verified live context about the current user and org (JSON):\n${JSON.stringify(ctx)}`;

    // Select primary model based on user query complexity (free tier)
    const lastUserMessage = data.messages[data.messages.length - 1]?.content || "";
    const isComplex = lastUserMessage.length > 150 || 
                      /calculate|report|analytics|predict|forecast|summarize|succession|leave balance|payroll/i.test(lastUserMessage);
    
    const primaryModel = isComplex ? "google/gemini-2.5-flash:free" : "google/gemini-2.5-flash-lite:free";

    // Fallback models (OpenRouter allows at most 3 items in the fallback array)
    const fallbackModels = [
      "google/gemini-2.5-flash:free",
      "google/gemini-2.5-flash-lite:free",
      "meta-llama/llama-3-8b-instruct:free"
    ];

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ethicalvirendra.github.io/Ev-s-HRMS",
        "X-OpenRouter-Title": "Ev's HRMS",
      },
      body: JSON.stringify({
        model: primaryModel,
        models: fallbackModels.filter(m => m !== primaryModel),
        messages: [{ role: "system", content: systemPrompt }, ...data.messages],
        max_tokens: 1000,
      }),
    });

    if (res.status === 429) return { reply: "I'm a bit overloaded right now (rate limit). Please try again in a moment." };
    if (res.status === 402) {
      const text = await res.text().catch(() => "");
      console.error("Evai AI billing error", res.status, text);
      return { reply: "AI credits are exhausted. Please top up your OpenRouter credits." };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Evai AI gateway error", res.status, text);
      return { reply: "Sorry, I couldn't reach the AI service. Please try again shortly." };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim() || "I don't have an answer for that.";
    return { reply };
  });
