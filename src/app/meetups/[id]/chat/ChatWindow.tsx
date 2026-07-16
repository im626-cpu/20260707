"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction } from "./actions";

type Message = { id: string; content: string; createdAt: string; userId: string };
type Participant = { id: string; nickname: string };

export default function ChatWindow({
  meetupId,
  currentUserId,
  participants,
  initialMessages,
}: {
  meetupId: string;
  currentUserId: string;
  participants: Participant[];
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const nicknameOf = useMemo(() => {
    const map = new Map(participants.map((p) => [p.id, p.nickname]));
    return (userId: string) => map.get(userId) ?? "알 수 없음";
  }, [participants]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${meetupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ChatMessage",
          filter: `meetupId=eq.${meetupId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            content: string;
            createdAt: string;
            userId: string;
          };
          // Own messages are already reflected via the optimistic add + reconcile below;
          // re-adding them here would race with that reconcile and duplicate the bubble.
          if (row.userId === currentUserId) return;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe((status, err) => {
        console.log(`[chat:${meetupId}] realtime status:`, status, err ?? "");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetupId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    setError(null);

    const tempId = `optimistic-${crypto.randomUUID()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, content, createdAt: new Date().toISOString(), userId: currentUserId },
    ]);

    startTransition(async () => {
      try {
        const result = await sendMessageAction(meetupId, content);
        if (result) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, id: result.id, createdAt: result.createdAt } : m)),
          );
        }
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(content);
        setError(e instanceof Error ? e.message : "메시지 전송에 실패했습니다.");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => {
          const mine = m.userId === currentUserId;
          return (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                mine ? "ml-auto bg-neutral-900 text-white" : "bg-neutral-100"
              }`}
            >
              {!mine && <p className="mb-0.5 text-xs text-neutral-500">{nicknameOf(m.userId)}</p>}
              <p>{m.content}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-3 pt-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-neutral-200 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
}
