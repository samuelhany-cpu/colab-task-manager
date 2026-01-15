"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Hash, User as UserIcon, Loader2 } from "lucide-react";
import { getSocket } from "@/lib/socket-client";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const socket = getSocket();

    if (projectId) socket.emit("join-project", projectId);
    socket.emit("join-user", (session?.user as { id: string })?.id);

    socket.on("new-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("new-message");
    };
  }, [projectId, receiverId, session]);

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
        await res.json();
        const socket = getSocket();
        socket.emit("send-message", {
          ...payload,
          senderId: (session?.user as { id: string }).id,
        });
        setInput("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <div className="chat-loading">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="chat-box glass">
      <div className="chat-header">
        {projectId ? <Hash size={20} /> : <UserIcon size={20} />}
        <span>{projectId ? "Project Channel" : "Direct Message"}</span>
      </div>

      <div className="messages-area" ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-row ${msg.senderId === (session?.user as { id: string })?.id ? "own" : ""}`}
          >
            <div className="message-avatar">{(msg.sender.name || "U")[0]}</div>
            <div className="message-content-wrapper">
              <div className="message-info">
                <span className="sender-name">{msg.sender.name}</span>
                <span className="msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="message-bubble">{msg.content}</div>
            </div>
          </div>
        ))}
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={!input.trim()}>
          <Send size={18} />
        </button>
      </form>

      <style jsx>{`
        .chat-box {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: var(--radius);
        }
        .chat-header {
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid var(--border);
          font-weight: 600;
        }
        .messages-area {
          flex: 1;
          overflow-y: auto;
          paddding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        .message-row {
          display: flex;
          gap: 1rem;
          max-width: 80%;
        }
        .message-row.own {
          align-self: flex-end;
          flex-direction: row-reverse;
          text-align: right;
        }
        .message-avatar {
          width: 36px;
          height: 36px;
          background: var(--secondary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .message-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .own .message-info {
          flex-direction: row-reverse;
        }
        .sender-name {
          font-weight: 600;
          font-size: 0.8125rem;
        }
        .msg-time {
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }
        .message-bubble {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.75rem;
          font-size: 0.9375rem;
          line-height: 1.5;
          word-break: break-word;
        }
        .own .message-bubble {
          background: var(--primary);
          color: white;
        }
        .chat-input-area {
          padding: 1.25rem;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 0.75rem;
        }
        input {
          flex: 1;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          color: white;
        }
        button {
          width: 42px;
          height: 42px;
          background: var(--primary);
          color: white;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .chat-loading {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
