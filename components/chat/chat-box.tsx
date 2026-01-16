"use client";

import { useState, useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { Send, Hash, User as UserIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: { name: string; image?: string };
  createdAt: string;
}

export default function ChatBox({
  projectId,
  receiverId,
}: {
  projectId?: string;
  receiverId?: string;
}) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    initAuth();
  }, [supabase]);

  useEffect(() => {
    const fetchMessages = async () => {
      const url = projectId
        ? `/api/chat?projectId=${projectId}`
        : `/api/chat?receiverId=${receiverId}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        setMessages(data);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    if (!user) return;

    // Supabase Realtime Channel Subscription
    const channelName = projectId ? `project:${projectId}` : `user:${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "new-message" }, ({ payload }) => {
        const msg = payload as Message;
        // Check if message belongs to current DM context if in DM mode
        if (
          !projectId &&
          msg.senderId !== user.id &&
          msg.senderId !== receiverId
        ) {
          return;
        }
        setMessages((prev) => [...prev, msg]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, receiverId, user, supabase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const payload = {
      content: input,
      projectId,
      receiverId,
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newMessage = await res.json();
        // The message will also be received via broadcast, but adding it manually
        // for immediate feedback (optimistic update/sync)
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        setInput("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-card text-card-foreground shadow-soft overflow-hidden">
      <div className="p-4 px-6 flex items-center gap-3 border-b border-border font-semibold">
        {projectId ? (
          <Hash size={20} className="text-muted-foreground" />
        ) : (
          <UserIcon size={20} className="text-muted-foreground" />
        )}
        <span className="text-sm">
          {projectId ? "Project Channel" : "Direct Message"}
        </span>
      </div>

      <div
        className="flex-1 overflow-y-auto p-6 flex flex-col gap-5"
        ref={scrollRef}
      >
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 max-w-[85%]",
                isOwn ? "self-end flex-row-reverse" : "self-start",
              )}
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-semibold text-xs shrink-0 uppercase">
                {(msg.sender.name || "U")[0]}
              </div>
              <div className={cn("flex flex-col gap-1", isOwn && "items-end")}>
                <div
                  className={cn(
                    "flex items-center gap-2",
                    isOwn && "flex-row-reverse",
                  )}
                >
                  <span className="text-xs font-bold">{msg.sender.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={cn(
                    "p-3 px-4 rounded-2xl text-[14px] leading-relaxed break-words",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none",
                  )}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="p-4 border-t border-border flex gap-3 bg-card"
        onSubmit={handleSend}
      >
        <input
          placeholder="Type a message..."
          className="flex-1 h-11 bg-muted border border-border rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-11 h-11 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
