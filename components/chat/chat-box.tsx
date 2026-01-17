"use client";

import { useState, useEffect, useRef } from "react";

import { useUser } from "@/components/providers/user-provider";
import { Send, Hash, User as UserIcon, Loader2, Smile, Reply, MoreHorizontal, Pencil, Trash2, X, ArrowLeft, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import UserProfileModal from "@/components/users/user-profile-modal";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: { name: string; image?: string };
  createdAt: string;
  updatedAt: string;
  reactions: {
    emoji: string;
    userId: string;
    user: { name: string };
  }[];
  _count: { replies: number };
}

export default function ChatBox({
  projectId,
  receiverId,
}: {
  projectId?: string;
  receiverId?: string;
}) {
  const supabase = createClient();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const url = activeThread
        ? `/api/chat?parentId=${activeThread.id}`
        : projectId
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
    const channelName = activeThread
      ? `thread:${activeThread.id}`
      : projectId ? `project:${projectId}` : `user:${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "new-message" }, ({ payload }) => {
        const msg = payload as Message;
        if (!projectId && msg.senderId !== user.id && msg.senderId !== receiverId) return;
        setMessages((prev) => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .on("broadcast", { event: "message-updated" }, ({ payload }) => {
        setMessages((prev) => prev.map(m => m.id === payload.id ? { ...m, ...payload } : m));
      })
      .on("broadcast", { event: "message-deleted" }, ({ payload }) => {
        setMessages((prev) => prev.filter(m => m.id !== payload.id));
      })
      .on("broadcast", { event: "reaction-added" }, ({ payload }) => {
        setMessages((prev) => prev.map(m => m.id === payload.messageId ? {
          ...m,
          reactions: [...m.reactions, payload.reaction]
        } : m));
      })
      .on("broadcast", { event: "reaction-removed" }, ({ payload }) => {
        setMessages((prev) => prev.map(m => m.id === payload.messageId ? {
          ...m,
          reactions: m.reactions.filter(r => !(r.userId === payload.userId && r.emoji === payload.emoji))
        } : m));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const userName = user?.user_metadata?.name || user?.email || "Unknown";
        const users = Object.values(state).flat().map((p: any) => p.name).filter(name => name !== userName);
        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const userName = user?.user_metadata?.name || user?.email || "Unknown";
          await channel.track({ name: userName, isTyping: false });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, receiverId, user, supabase, activeThread]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (user) {
      const channelName = activeThread
        ? `thread:${activeThread.id}`
        : projectId ? `project:${projectId}` : `user:${user.id}`;

      const channel = supabase.channel(channelName);
      const userName = user.user_metadata?.name || user.email || "Unknown";
      if (e.target.value.length > 0) {
        await channel.track({ name: userName, isTyping: true });
      } else {
        await channel.track({ name: userName, isTyping: false });
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const payload = {
      content: input,
      projectId,
      receiverId,
      parentId: activeThread?.id,
    };

    const url = editingMessage ? `/api/messages/${editingMessage.id}` : "/api/chat";
    const method = editingMessage ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newMessage = await res.json();
        if (editingMessage) {
          setMessages(prev => prev.map(m => m.id === newMessage.id ? newMessage : m));
          setEditingMessage(null);
        } else {
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
        setInput("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      // UI will be updated via real-time broadcast
    } catch (e) {
      console.error("Reaction failed:", e);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
      // UI will be updated via real-time broadcast
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const renderContent = (content: string) => {
    // Regex for: @[Name](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = content.split(mentionRegex);
    const result = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(content)) !== null) {
      // Normal text before mention
      result.push(content.substring(lastIndex, match.index));
      // Mention with badge
      result.push(
        <button
          key={match[2] + match.index}
          onClick={() => {
            setSelectedUserId(match![2]);
            setIsProfileModalOpen(true);
          }}
          className="hover:scale-110 transition-transform active:scale-95 inline-block"
        >
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary border-none text-[12px] font-bold mx-0.5 cursor-pointer"
          >
            @{match![1]}
          </Badge>
        </button>
      );
      lastIndex = mentionRegex.lastIndex;
    }
    result.push(content.substring(lastIndex));

    return result;
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-card text-card-foreground shadow-soft overflow-hidden">
      <div className="p-4 px-6 flex items-center justify-between border-b border-border font-semibold bg-muted/5">
        <div className="flex items-center gap-3">
          {activeThread ? (
            <button
              onClick={() => setActiveThread(null)}
              className="p-1.5 hover:bg-muted rounded-full transition-colors mr-1"
            >
              <ArrowLeft size={18} />
            </button>
          ) : projectId ? (
            <Hash size={20} className="text-muted-foreground" />
          ) : (
            <UserIcon size={20} className="text-muted-foreground" />
          )}
          <div className="flex flex-col">
            <span className="text-sm">
              {activeThread ? "Thread" : projectId ? "Project Channel" : "Direct Message"}
            </span>
            {activeThread && (
              <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[200px]">
                Replying to: {activeThread.content}
              </span>
            )}
          </div>
        </div>
        {activeThread && (
          <button
            onClick={() => setActiveThread(null)}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Close Thread
          </button>
        )}
        {!activeThread && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "p-2 rounded-xl transition-all",
              showSearch ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Search size={18} />
          </button>
        )}
      </div>

      {showSearch && (
        <div className="p-3 px-6 border-b border-border bg-muted/20 animate-in slide-in-from-top duration-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              autoFocus
              placeholder="Search messages..."
              className="w-full h-10 bg-card border border-border rounded-xl pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-6 flex flex-col gap-5"
        ref={scrollRef}
      >
        {messages.filter(msg =>
          !searchQuery || msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        ).map((msg) => {
          const isOwn = msg.senderId === user?.id;
          const hasReactions = msg.reactions?.length > 0;

          return (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 max-w-[90%] group",
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

                <div className="relative group/content">
                  <div
                    className={cn(
                      "p-3 px-4 rounded-2xl text-[14px] leading-relaxed break-words",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none",
                    )}
                  >
                    {renderContent(msg.content)}
                  </div>

                  {/* Actions Menu (on hover) */}
                  <div className={cn(
                    "absolute top-0 opacity-0 group-hover/content:opacity-100 transition-opacity flex items-center gap-1 bg-card border border-border rounded-lg shadow-sm p-1 z-10",
                    isOwn ? "right-full mr-2" : "left-full ml-2"
                  )}>
                    <button
                      className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => handleAddReaction(msg.id, "👍")}
                      title="React with 👍"
                    >
                      <Smile size={14} />
                    </button>
                    <button
                      className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setActiveThread(msg)}
                      title="Reply"
                    >
                      <Reply size={14} />
                    </button>
                    {isOwn && (
                      <>
                        <button
                          className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => {
                            setEditingMessage(msg);
                            setInput(msg.content);
                          }}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 hover:bg-muted rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/5 rounded-md transition-colors"
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {hasReactions && (
                  <div className={cn("flex flex-wrap gap-1 mt-1", isOwn && "justify-end")}>
                    {Object.entries(
                      msg.reactions.reduce((acc: any, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]: [string, any]) => {
                      const reactedByMe = msg.reactions.some(r => r.userId === user?.id && r.emoji === emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(msg.id, emoji)}
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all",
                            reactedByMe
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-muted border-border text-muted-foreground hover:border-border-hover"
                          )}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Reply Count */}
                {!activeThread && msg._count?.replies > 0 && (
                  <button
                    onClick={() => setActiveThread(msg)}
                    className={cn(
                      "mt-1 text-[10px] font-bold text-primary hover:underline flex items-center gap-1",
                      isOwn && "justify-end w-full"
                    )}
                  >
                    <Reply size={10} />
                    {msg._count.replies} {msg._count.replies === 1 ? "reply" : "replies"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-pulse font-bold ml-12">
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}
      </div>

      <form
        className="p-4 border-t border-border flex gap-3 bg-card"
        onSubmit={handleSend}
      >
        <input
          placeholder={editingMessage ? "Editing message..." : "Type a message..."}
          className={cn(
            "flex-1 h-11 bg-muted border border-border rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
            editingMessage && "ring-2 ring-primary/20 border-primary"
          )}
          value={input}
          onChange={handleInputChange}
        />
        {editingMessage && (
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setInput("");
            }}
            className="w-11 h-11 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        )}
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-11 h-11 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft"
        >
          <Send size={18} />
        </button>
      </form>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={selectedUserId}
      />
    </div>
  );
}
