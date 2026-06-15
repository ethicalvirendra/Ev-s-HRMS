import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TicketRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
  employee?: { full_name: string; email: string } | null;
};

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TicketRow[]> => {
    const { supabase, userId } = context;

    // Get employee id
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp) return [];

    const { data, error } = await supabase
      .from("tickets")
      .select("*, employee:employees(full_name, email)")
      .eq("employee_id", emp.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TicketRow[];
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    title: string;
    description?: string;
    category: string;
    priority?: "low" | "medium" | "high";
  }) => {
    if (!data.title) throw new Error("Title is required");
    if (!data.category) throw new Error("Category is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get employee id
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp) throw new Error("Employee record not found");

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        employee_id: emp.id,
        title: data.title,
        description: data.description || null,
        category: data.category,
        priority: data.priority || "medium",
        status: "open",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return ticket;
  });
