import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ZiaMessage = { role: "user" | "assistant"; content: string };

type ChatInput = { messages: ZiaMessage[] };

export type ZiaAction = {
  name: string;
  arguments: any;
};

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
  .handler(async ({ data, context }): Promise<{ reply: string; action?: ZiaAction }> => {
    const { supabase, userId } = context;

    // Gather lightweight HR context for the signed-in user.
    const [
      { data: me },
      { data: balances },
      { data: today },
      { data: empCount },
      { data: leaveTypes },
      { data: packages }
    ] = await Promise.all([
      supabase
        .from("employees")
        .select("id, full_name, employee_code, job_title, location, hire_date, department:departments(name), organization_id")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("leave_balances")
        .select("allocated, used, year, leave_type:leave_types(name)")
        .eq("employee_id", (await supabase.rpc("current_employee_id")).data ?? "")
        .eq("year", new Date().getUTCFullYear()),
      supabase
        .from("attendance_logs")
        .select("id, clock_in, clock_out, work_date, status")
        .eq("employee_id", (await supabase.rpc("current_employee_id")).data ?? "")
        .order("work_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("employees").select("id", { count: "exact", head: true }),
      supabase.from("leave_types").select("id, name"),
      supabase.from("benefits_packages").select("id, name, provider, type")
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
      leave_types: leaveTypes ?? [],
      benefits_packages: packages ?? [],
      today_iso: new Date().toISOString(),
    };

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable is not configured");

    const systemPrompt = `You are Evai, the friendly AI assistant inside Ev's HRMS.
You help employees with HR questions: leave balances, attendance, directory lookups, company policy guidance, and quick task help.
Be concise (under 120 words unless asked for detail). Use bullet points for lists. Never invent data — if context is missing, say so and suggest where to look in the app (Directory, Attendance, Time-off, Payroll, etc.).
You can perform actions on behalf of the user using tools. Always call the corresponding tool when a user asks you to perform an action (like clocking in, clocking out, requesting time off, enrolling in benefits, or waiving benefits). You must explain what action you are proposing to do. The user will be prompted to approve the action before it is executed.
Here is verified live context about the current user and org (JSON):\n${JSON.stringify(ctx)}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "clock_in",
          description: "Clock in for today's work shift",
          parameters: {
            type: "object",
            properties: {
              notes: { type: "string", description: "Optional check-in notes or location info" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "clock_out",
          description: "Clock out of the current open work shift. Requires the active shift ID.",
          parameters: {
            type: "object",
            properties: {
              id: { type: "string", description: "The UUID of the active attendance log to clock out from" }
            },
            required: ["id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "request_leave",
          description: "Submit a leave request / time off",
          parameters: {
            type: "object",
            properties: {
              leave_type_id: { type: "string", description: "The UUID of the leave type" },
              start_date: { type: "string", description: "Start date in format YYYY-MM-DD" },
              end_date: { type: "string", description: "End date in format YYYY-MM-DD" },
              reason: { type: "string", description: "Optional reason or note for the leave request" }
            },
            required: ["leave_type_id", "start_date", "end_date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "enroll_benefit",
          description: "Enroll in an insurance or retirement benefit package",
          parameters: {
            type: "object",
            properties: {
              package_id: { type: "string", description: "The UUID of the benefits package" }
            },
            required: ["package_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "waive_benefit",
          description: "Waive enrollment in a benefits package",
          parameters: {
            type: "object",
            properties: {
              package_id: { type: "string", description: "The UUID of the benefits package" }
            },
            required: ["package_id"]
          }
        }
      }
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
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...data.messages],
        tools: tools,
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

    const json = (await res.json()) as {
      choices?: {
        message?: {
          content?: string;
          tool_calls?: {
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }[];
        };
      }[];
    };

    const choice = json.choices?.[0];
    const reply = choice?.message?.content?.trim() || "";
    const toolCall = choice?.message?.tool_calls?.[0];

    if (toolCall) {
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (err) {}

      let proposedMessage = reply;
      if (!proposedMessage) {
        if (toolCall.function.name === "clock_in") {
          proposedMessage = "I would like to clock you in for your shift. Please confirm.";
        } else if (toolCall.function.name === "clock_out") {
          proposedMessage = "I would like to clock you out of your current shift. Please confirm.";
        } else if (toolCall.function.name === "request_leave") {
          proposedMessage = `I would like to submit a leave request from ${args.start_date} to ${args.end_date}. Please confirm.`;
        } else if (toolCall.function.name === "enroll_benefit") {
          proposedMessage = "I would like to enroll you in this benefits package. Please confirm.";
        } else if (toolCall.function.name === "waive_benefit") {
          proposedMessage = "I would like to waive this benefits package for you. Please confirm.";
        } else {
          proposedMessage = `I would like to perform this action: ${toolCall.function.name}. Please confirm.`;
        }
      }

      return {
        reply: proposedMessage,
        action: {
          name: toolCall.function.name,
          arguments: args,
        },
      };
    }

    return { reply: reply || "I don't have an answer for that." };
  });
