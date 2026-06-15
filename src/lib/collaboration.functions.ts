import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChannelRow = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_at: string;
};

export type MessageRow = {
  id: string;
  channel_id: string | null;
  employee_id: string;
  recipient_id: string | null;
  message_text: string;
  created_at: string;
  employee?: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
};

export const listChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChannelRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as ChannelRow[];
  });

export const listChannelMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { channel_id: string }) => {
    if (!data.channel_id) throw new Error("Channel ID required");
    return data;
  })
  .handler(async ({ data, context }): Promise<MessageRow[]> => {
    const { supabase } = context;
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*, employee:employees(id, full_name, email, avatar_url)")
      .eq("channel_id", data.channel_id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return (messages ?? []) as unknown as MessageRow[];
  });

export const listDmMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { peer_employee_id: string }) => {
    if (!data.peer_employee_id) throw new Error("Peer Employee ID required");
    return data;
  })
  .handler(async ({ data, context }): Promise<MessageRow[]> => {
    const { supabase, userId } = context;

    // Get current employee id
    const { data: me } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!me) return [];

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*, employee:employees(id, full_name, email, avatar_url)")
      .or(
        `and(employee_id.eq.${me.id},recipient_id.eq.${data.peer_employee_id}),and(employee_id.eq.${data.peer_employee_id},recipient_id.eq.${me.id})`
      )
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return (messages ?? []) as unknown as MessageRow[];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    channel_id?: string;
    recipient_id?: string;
    message_text: string;
  }) => {
    if (!data.message_text?.trim()) throw new Error("Message text cannot be empty");
    if (!data.channel_id && !data.recipient_id) throw new Error("Either channel_id or recipient_id is required");
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

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        employee_id: emp.id,
        channel_id: data.channel_id || null,
        recipient_id: data.recipient_id || null,
        message_text: data.message_text.trim(),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return msg;
  });

export const createChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; description?: string }) => {
    if (!data.name?.trim()) throw new Error("Channel name is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const cleanName = data.name.trim().toLowerCase().replace(/\s+/g, "-");

    const { data: chan, error } = await supabase
      .from("channels")
      .insert({
        name: cleanName,
        description: data.description || null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return chan;
  });
