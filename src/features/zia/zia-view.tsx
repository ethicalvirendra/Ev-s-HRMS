import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, useEffect } from "react";
import { askZia, type ZiaMessage, type ZiaAction } from "@/lib/zia.functions";
import { clockIn, clockOut } from "@/lib/attendance.functions";
import { submitLeaveRequest } from "@/lib/leave.functions";
import { enrollInBenefit, waiveBenefit } from "@/lib/benefits.functions";

interface ChatMessage extends ZiaMessage {
  action?: ZiaAction;
  approved?: boolean;
  completed?: boolean;
  error?: string;
}

const SUGGESTIONS = [
  "How much annual leave do I have left?",
  "Did I clock in today?",
  "Who works in Engineering?",
  "How do I request time off?",
];

export function ZiaView() {
  const ask = useServerFn(askZia);
  const runClockIn = useServerFn(clockIn);
  const runClockOut = useServerFn(clockOut);
  const runRequestLeave = useServerFn(submitLeaveRequest);
  const runEnrollBenefit = useServerFn(enrollInBenefit);
  const runWaiveBenefit = useServerFn(waiveBenefit);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm Evai, your HR assistant. Ask me about your leave, attendance, the directory, or anything HR-related." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [runningAction, setRunningAction] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (history: ZiaMessage[]) => ask({ data: { messages: history } }),
    onSuccess: (res) => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.reply,
          action: res.action,
          completed: !res.action,
        },
      ]);
    },
    onError: (err: Error) => {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${err.message}` }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || mutation.isPending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    mutation.mutate(
      next
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }))
    );
  }

  async function handleExecuteAction(msgIndex: number, actionName: string, args: any) {
    setRunningAction(msgIndex);
    try {
      let resultMessage = "";
      if (actionName === "clock_in") {
        await runClockIn({ notes: args.notes });
        resultMessage = "Clock-in completed successfully!";
      } else if (actionName === "clock_out") {
        await runClockOut({ id: args.id });
        resultMessage = "Clock-out completed successfully!";
      } else if (actionName === "request_leave") {
        await runRequestLeave({
          leave_type_id: args.leave_type_id,
          start_date: args.start_date,
          end_date: args.end_date,
          reason: args.reason,
        });
        resultMessage = `Leave request submitted successfully for ${args.start_date} to ${args.end_date}!`;
      } else if (actionName === "enroll_benefit") {
        await runEnrollBenefit(args.package_id);
        resultMessage = "Successfully enrolled in benefits package!";
      } else if (actionName === "waive_benefit") {
        await runWaiveBenefit(args.package_id);
        resultMessage = "Successfully waived benefits package!";
      } else {
        throw new Error(`Unknown action: ${actionName}`);
      }

      setMessages((m) =>
        m.map((msg, idx) =>
          idx === msgIndex
            ? { ...msg, approved: true, completed: true, content: `${msg.content}\n\n✓ ${resultMessage}` }
            : msg
        )
      );
    } catch (err: any) {
      console.error(err);
      setMessages((m) =>
        m.map((msg, idx) =>
          idx === msgIndex
            ? { ...msg, approved: false, completed: true, error: err.message || "Failed to execute action." }
            : msg
        )
      );
    } finally {
      setRunningAction(null);
    }
  }

  function handleCancelAction(msgIndex: number) {
    setMessages((m) =>
      m.map((msg, idx) =>
        idx === msgIndex
          ? { ...msg, approved: false, completed: true, content: `${msg.content}\n\n✗ Action declined by user.` }
          : msg
      )
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow">
          <span className="material-symbols-outlined">auto_awesome</span>
        </div>
        <div>
          <div className="text-base font-semibold">Evai</div>
          <div className="text-xs text-slate-500">Your AI HR assistant · powered by Gemini</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              {m.content}
            </div>

            {m.role === "assistant" && m.action && !m.completed && (
              <div className="mt-2 w-full max-w-[80%] rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="material-symbols-outlined text-[14px]">pending_actions</span>
                  Proposed Action: {m.action.name.replace("_", " ")}
                </div>
                
                <div className="text-slate-600 space-y-1 bg-white border border-slate-100 p-2.5 rounded-lg">
                  {Object.entries(m.action.arguments).map(([key, val]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <span className="font-semibold">{key.replace("_", " ")}:</span>
                      <span className="truncate max-w-[70%]">{String(val)}</span>
                    </div>
                  ))}
                  {Object.keys(m.action.arguments).length === 0 && (
                    <div className="text-slate-400 italic">No parameters required</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleExecuteAction(i, m.action!.name, m.action!.arguments)}
                    disabled={runningAction !== null}
                    className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {runningAction === i ? "Executing…" : "Approve & Run"}
                  </button>
                  <button
                    onClick={() => handleCancelAction(i)}
                    disabled={runningAction !== null}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {m.role === "assistant" && m.error && (
              <div className="mt-1.5 text-[11px] text-red-600 font-medium bg-red-50 border border-red-100 rounded px-2.5 py-1">
                ⚠️ Error: {m.error}
              </div>
            )}
          </div>
        ))}
        {mutation.isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">Evai is thinking…</div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Evai anything…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          disabled={mutation.isPending}
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
