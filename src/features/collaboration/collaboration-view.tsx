import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChannels, listChannelMessages, listDmMessages, sendMessage, createChannel } from "@/lib/collaboration.functions";
import { listEmployees } from "@/lib/employees.functions";
import { toast } from "sonner";

export function CollaborationView() {
  const qc = useQueryClient();
  const fetchChannels = useServerFn(listChannels);
  const fetchChannelMsgs = useServerFn(listChannelMessages);
  const fetchDmMsgs = useServerFn(listDmMessages);
  const fetchEmployees = useServerFn(listEmployees);
  const send = useServerFn(sendMessage);
  const triggerCreate = useServerFn(createChannel);

  const channels = useQuery({ queryKey: ["collaboration", "channels"], queryFn: () => fetchChannels() });
  const employees = useQuery({ queryKey: ["collaboration", "employees"], queryFn: () => fetchEmployees() });

  const [activeTab, setActiveTab] = useState<{ type: "channel" | "dm"; id: string; name: string }>({
    type: "channel",
    id: "",
    name: "announcements",
  });

  const activeId = activeTab.id || (channels.data?.[0]?.id ?? "");
  const activeName = activeTab.name || (channels.data?.[0]?.name ?? "general");

  const messages = useQuery({
    queryKey: ["collaboration", "messages", activeTab.type, activeId],
    queryFn: () => {
      if (!activeId) return [];
      if (activeTab.type === "channel") {
        return fetchChannelMsgs({ data: { channel_id: activeId } });
      } else {
        return fetchDmMsgs({ data: { peer_employee_id: activeId } });
      }
    },
    enabled: !!activeId,
  });

  // Automatically select first channel if none selected
  useEffect(() => {
    if (!activeTab.id && channels.data && channels.data.length > 0) {
      setActiveTab({
        type: "channel",
        id: channels.data[0].id,
        name: channels.data[0].name,
      });
    }
  }, [channels.data, activeTab.id]);

  const [text, setText] = useState("");
  const [newChanName, setNewChanName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data]);

  const sendMut = useMutation({
    mutationFn: (msgText: string) => {
      const payload = activeTab.type === "channel"
        ? { channel_id: activeId, message_text: msgText }
        : { recipient_id: activeId, message_text: msgText };
      return send({ data: payload });
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["collaboration", "messages", activeTab.type, activeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createChanMut = useMutation({
    mutationFn: (name: string) => triggerCreate({ data: { name } }),
    onSuccess: (newChan) => {
      toast.success("Channel created!");
      setModalOpen(false);
      setNewChanName("");
      qc.invalidateQueries({ queryKey: ["collaboration", "channels"] });
      setActiveTab({ type: "channel", id: newChan.id, name: newChan.name });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sendMut.isPending) return;
    sendMut.mutate(text);
  };

  const handleCreateChan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim() || createChanMut.isPending) return;
    createChanMut.mutate(newChanName);
  };

  const activeMessages = messages.data ?? [];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-slate-50">
      {/* Channels & DMs Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-full shrink-0 text-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 text-sm">HRMS Workspace</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="text-slate-400 hover:text-blue-600 rounded p-1 hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-sm font-semibold">add</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {/* Channels list */}
          <div className="mb-4">
            <div className="px-4 py-1 flex justify-between items-center text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
              <span>Channels</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {channels.data && channels.data.map((c) => {
                const isActive = activeTab.type === "channel" && activeId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveTab({ type: "channel", id: c.id, name: c.name })}
                      className={`w-full flex items-center gap-2 px-4 py-1.5 text-left font-medium transition-colors ${
                        isActive ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs font-light">tag</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* DMs list */}
          <div>
            <div className="px-4 py-1 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
              <span>Direct Messages</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {employees.data && employees.data.map((emp) => {
                const isActive = activeTab.type === "dm" && activeId === emp.id;
                return (
                  <li key={emp.id}>
                    <button
                      onClick={() => setActiveTab({ type: "dm", id: emp.id, name: emp.full_name })}
                      className={`w-full flex items-center gap-2 px-4 py-1.5 text-left font-medium transition-colors ${
                        isActive ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-700">
                          {emp.full_name[0]}
                        </div>
                      )}
                      <span className="truncate">{emp.full_name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="flex-1 flex flex-col h-full bg-white relative">
        {/* Chat Header */}
        <header className="h-14 border-b border-slate-200 px-6 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-sm">
              {activeTab.type === "channel" ? "tag" : "person"}
            </span>
            <span className="font-bold text-slate-800 text-sm">
              {activeTab.type === "channel" ? activeName : activeName}
            </span>
          </div>
        </header>

        {/* Messages list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeMessages.map((m) => {
            const senderName = m.employee?.full_name ?? "User";
            const senderInitial = senderName[0]?.toUpperCase() ?? "U";
            const initials = senderName.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();

            return (
              <div key={m.id} className="flex items-start gap-3 text-xs">
                {m.employee?.avatar_url ? (
                  <img src={m.employee.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0 mt-0.5">
                    {initials || senderInitial}
                  </div>
                )}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900">{senderName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{m.message_text}</p>
                </div>
              </div>
            );
          })}
          {activeMessages.length === 0 && (
            <div className="text-center text-slate-400 text-xs py-16">
              This is the beginning of your chat history. Say hello!
            </div>
          )}
        </div>

        {/* Message Input bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${activeTab.type === "channel" ? "#" + activeName : activeName}...`}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendMut.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </section>

      {/* Create Channel Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xl p-6 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="font-bold text-slate-900 text-sm">Create a channel</h2>
              <button onClick={() => setModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateChan} className="space-y-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Channel Name</label>
                <input
                  required
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  placeholder="e.g. project-x"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <button
                disabled={createChanMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {createChanMut.isPending ? "Creating..." : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
