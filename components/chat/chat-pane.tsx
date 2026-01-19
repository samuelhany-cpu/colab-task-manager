"use client";

import React, {
  useState,
  useEffect,
  useRef,
  FormEvent,
  ChangeEvent,
  useMemo,
} from "react";

import { useUser } from "@/components/providers/user-provider";
import {
  Send,
  Hash,
  User as UserIcon,
  Loader2,
  Reply,
  Pencil,
  Trash2,
  X,
  ArrowLeft,
  Search,
  Pin,
  PinOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import UserProfileModal from "@/components/users/user-profile-modal";
import { Badge } from "@/components/ui/badge";
import EmojiPicker from "./emoji-picker";
import MessageReactions from "./message-reactions";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: { name: string; image?: string };
  isPinned: boolean;
  status?: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  reactions: {
    id: string; // Added id
    emoji: string;
    userId: string;
    user: { id: string; name: string; email: string };
    createdAt: string; // Added createdAt
  }[];
  _count: { replies: number };
}

interface ChatPaneProps {
  workspaceId?: string;
  projectId?: string;
  receiverId?: string;
  parentId?: string;
  onThreadSelect?: (message: Message) => void;
  onClose?: () => void;
  className?: string;
  isThreadView?: boolean;
}

export default function ChatPane({
  workspaceId,
  projectId,
  receiverId,
  parentId,
  onThreadSelect,
  onClose,
  className,
  isThreadView,
}: ChatPaneProps) {
  const supabase = createClient();
  const { user } = useUser();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Typing debounce refs
  const typingIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typingThrottleRef = useRef<number>(0);

  const myDisplayName = useMemo(() => {
    return user?.user_metadata?.name || user?.email || "Unknown";
  }, [user]);

  // Deterministic DM key (stable conversation id for two users)
  const dmKey = useMemo(() => {
    if (!user?.id || !receiverId) return null;
    return [user.id, receiverId].sort().join(":");
  }, [user?.id, receiverId]);

  // Determine realtime channel name
  const channelName = useMemo(() => {
    if (!user?.id) return null;

    if (parentId) return `thread:${parentId}`;
    if (workspaceId) return `workspace:${workspaceId}`;
    if (projectId) return `project:${projectId}`;
    if (dmKey) return `dm:${dmKey}`;

    // fallback (should be rare): if no receiverId and no projectId
    return `user:${user.id}`;
  }, [user?.id, parentId, workspaceId, projectId, dmKey]);

  // Build fetch URL
  const fetchUrl = useMemo(() => {
    if (parentId) return `/api/chat?parentId=${encodeURIComponent(parentId)}`;
    if (workspaceId)
      return `/api/chat?workspaceId=${encodeURIComponent(workspaceId)}`;
    if (projectId)
      return `/api/chat?projectId=${encodeURIComponent(projectId)}`;
    if (receiverId)
      return `/api/chat?receiverId=${encodeURIComponent(receiverId)}`;
    return `/api/chat`;
  }, [parentId, workspaceId, projectId, receiverId, dmKey]);

  // Fetch messages + subscribe realtime
  useEffect(() => {
    // Reset UI when context changes
    setMessages([]);
    setTypingUsers([]);
    setLoading(true);

    // Must wait for auth
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // For DM view, receiverId must exist to be meaningful
    if (!workspaceId && !projectId && !parentId && !receiverId) {
      // Added workspaceId
      setLoading(false);
      return;
    }

    let isMounted = true;
    const abort = new AbortController();

    const fetchMessages = async () => {
      try {
        const res = await fetch(fetchUrl, {
          method: "GET",
          credentials: "include",
          signal: abort.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          // 401 commonly happens if session cookie is not ready/valid
          console.error(`Fetch failed: ${res.status} ${text}`);
          if (isMounted) setMessages([]);
          return;
        }

        const data = await res.json();
        if (!isMounted) return;
        setMessages(
          Array.isArray(data) ? data : (data?.messages ?? data ?? []),
        );
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        console.error("fetchMessages error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
      abort.abort();
    };
  }, [
    user?.id,
    workspaceId, // Added workspaceId
    projectId,
    receiverId,
    fetchUrl,
    parentId,
  ]);

  // Subscribe realtime
  useEffect(() => {
    if (!user?.id || !channelName) return;

    // Cleanup any previous channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "new-message" }, async ({ payload }) => {
        const msg = payload as Message;

        // If we are in DM context, ensure the message belongs to this DM conversation.
        // With dm:<sortedUserIds> channel this should already be correct, but keep this as safety.
        if (!workspaceId && !projectId && !parentId && receiverId) {
          // Added workspaceId
          const a = user.id;
          const b = receiverId;
          const ok =
            (msg.senderId === a &&
              (payload as { receiverId?: string })?.receiverId === b) ||
            (msg.senderId === b &&
              (payload as { receiverId?: string })?.receiverId === a) ||
            msg.senderId === a ||
            msg.senderId === b;

          // We cannot fully validate without receiverId in payload, so we minimally keep it permissive.
          // The dm:<key> channel should already isolate correctly.
          if (!ok) return;
        }

        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // Send delivery confirmation if message is from someone else
        if (msg.senderId !== user.id) {
          try {
            await fetch("/api/messages/delivered", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ messageId: msg.id }),
            });
          } catch (e: unknown) {
            console.error("Failed to send delivery confirmation:", e);
          }
        }
      })
      .on("broadcast", { event: "message-updated" }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.id ? { ...m, ...payload } : m)),
        );
      })
      .on("broadcast", { event: "message-deleted" }, ({ payload }) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.id));
      })
      .on("broadcast", { event: "message-pinned-toggled" }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.id ? { ...m, isPinned: payload.isPinned } : m,
          ),
        );
      })
      .on("broadcast", { event: "message-delivered" }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.id
              ? {
                  ...m,
                  status: payload.status,
                  deliveredAt: payload.deliveredAt,
                }
              : m,
          ),
        );
      })
      .on("broadcast", { event: "message-read" }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.id ? { ...m, status: payload.status } : m,
          ),
        );
      })
      .on("broadcast", { event: "reaction-added" }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  reactions: [...(m.reactions ?? []), payload.reaction],
                }
              : m,
          ),
        );
      })
      .on("broadcast", { event: "reaction-removed" }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  reactions: (m.reactions ?? []).filter(
                    (r) =>
                      !(
                        r.userId === payload.userId && r.emoji === payload.emoji
                      ),
                  ),
                }
              : m,
          ),
        );
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          name: string;
          isTyping: boolean;
        }>();

        // Only show users who are actually typing
        const usersTyping = Object.values(state)
          .flat()
          .filter((p) => p?.isTyping === true)
          .map((p) => p?.name)
          .filter((name): name is string => !!name && name !== myDisplayName);

        setTypingUsers(usersTyping);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: myDisplayName, isTyping: false });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingIdleTimeoutRef.current)
        clearTimeout(typingIdleTimeoutRef.current);
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [
    user?.id,
    myDisplayName,
    workspaceId,
    projectId,
    receiverId,
    dmKey,
    channelName,
    fetchUrl,
    parentId,
    supabase,
  ]);

  // Send read receipt when messages change
  useEffect(() => {
    const sendReadReceipt = async () => {
      if (!messages.length) return;
      const lastMessage = messages[messages.length - 1];
      try {
        await fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            messageId: lastMessage.id,
            projectId,
            receiverId,
          }),
        });
      } catch (e) {
        console.error("Read receipt failed:", e);
      }
    };

    sendReadReceipt();
  }, [messages, projectId, receiverId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers.length]);

  // Debounced typing tracker
  const trackTyping = async (isTyping: boolean) => {
    if (!user || !channelRef.current) return;

    const now = Date.now();
    // Throttle presence updates (avoid spamming)
    if (isTyping && now - typingThrottleRef.current < 300) return;
    typingThrottleRef.current = now;

    try {
      await channelRef.current.track({ name: myDisplayName, isTyping });
    } catch (e) {
      // Presence track can fail if channel disconnected momentarily
      console.error("Typing track failed:", e);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (!user?.id) return;

    // Mark typing true when there is content, false when empty.
    const currentlyTyping = value.length > 0;

    // Immediately track typing true (throttled)
    if (currentlyTyping) {
      void trackTyping(true);
    } else {
      void trackTyping(false);
    }

    // When user stops typing for a short time, send isTyping=false
    if (typingIdleTimeoutRef.current)
      clearTimeout(typingIdleTimeoutRef.current);
    typingIdleTimeoutRef.current = setTimeout(() => {
      void trackTyping(false);
    }, 900);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    // stop typing once sending
    void trackTyping(false);
    if (typingIdleTimeoutRef.current)
      clearTimeout(typingIdleTimeoutRef.current);

    const payload = {
      content: input.trim(),
      workspaceId,
      projectId,
      receiverId,
      parentId,
    };

    const url = editingMessage
      ? `/api/messages/${editingMessage.id}`
      : "/api/chat";
    const method = editingMessage ? "PATCH" : "POST";

    // Optimistic update: Show message immediately
    if (!editingMessage) {
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        content: payload.content,
        senderId: user.id,
        sender: {
          name:
            (user as unknown as { name?: string }).name || user.email || "You",
          image: (user as unknown as { image?: string }).image,
        },
        isPinned: false,
        status: "SENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reactions: [],
        _count: { replies: 0 },
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setInput("");
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Send failed: ${res.status} ${text}`);

        // Mark as failed if not editing
        if (!editingMessage) {
          setMessages((prev) =>
            prev.map((m) =>
              m.status === "SENDING" ? { ...m, status: "FAILED" as const } : m,
            ),
          );
        }
        return;
      }

      // Some endpoints might return empty body; handle safely
      const text = await res.text();
      const newMessage = text ? (JSON.parse(text) as Message) : null;
      if (!newMessage) {
        if (!editingMessage) setInput("");
        setEditingMessage(null);
        return;
      }

      if (editingMessage) {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMessage.id ? newMessage : m)),
        );
        setEditingMessage(null);
      } else {
        // Replace optimistic message with server response
        setMessages((prev) =>
          prev.map((m) => (m.status === "SENDING" ? newMessage : m)),
        );
      }
    } catch (e) {
      console.error("Send error:", e);
      // Mark as failed
      if (!editingMessage) {
        setMessages((prev) =>
          prev.map((m) =>
            m.status === "SENDING" ? { ...m, status: "FAILED" as const } : m,
          ),
        );
      }
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emoji }),
      });
      // UI updates via realtime broadcast
    } catch (e) {
      console.error("Reaction failed:", e);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/pin`, {
        method: "POST",
        credentials: "include",
      });
      // UI updates via realtime broadcast
    } catch (e) {
      console.error("Pin failed:", e);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/messages/${messageToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });
      // UI updates via realtime broadcast
      setMessageToDelete(null);
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderContent = (content: string) => {
    // Regex for: @[Name](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const result: React.ReactNode[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(content)) !== null) {
      result.push(content.substring(lastIndex, match.index));

      const mentionName = match[1];
      const mentionUserId = match[2];

      result.push(
        <button
          key={mentionUserId + match.index}
          onClick={() => {
            setSelectedUserId(mentionUserId);
            setIsProfileModalOpen(true);
          }}
          className="hover:scale-110 transition-transform active:scale-95 inline-block"
        >
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary border-none text-[12px] font-bold mx-0.5 cursor-pointer"
          >
            @{mentionName}
          </Badge>
        </button>,
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
          {isThreadView ? (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-full transition-colors mr-1"
              aria-label="Back"
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
              {isThreadView
                ? "Thread"
                : projectId
                  ? "Project Channel"
                  : "Direct Message"}
            </span>
          </div>
        </div>

        {isThreadView && (
          <button
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Close Thread
          </button>
        )}

        {!isThreadView && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "p-2 rounded-xl transition-all",
              showSearch
                ? "bg-primary text-white"
                : "hover:bg-muted text-muted-foreground",
            )}
            aria-label="Search"
          >
            <Search size={18} />
          </button>
        )}
      </div>

      {showSearch && (
        <div className="p-3 px-6 border-b border-border bg-muted/20 animate-in slide-in-from-top duration-200">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <input
              autoFocus
              placeholder="Search messages..."
              className="w-full h-10 bg-card border border-border rounded-xl pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
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
        {messages
          .filter(
            (msg) =>
              !searchQuery ||
              msg.content.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map((msg) => {
            const isOwn = msg.senderId === user?.id;
            const hasReactions = (msg.reactions?.length ?? 0) > 0;

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[90%] group",
                  isOwn ? "self-end flex-row-reverse" : "self-start",
                )}
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-semibold text-xs shrink-0 uppercase">
                  {(msg.sender?.name || "U")[0]}
                </div>

                <div
                  className={cn("flex flex-col gap-1", isOwn && "items-end")}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      isOwn && "flex-row-reverse",
                    )}
                  >
                    <span className="text-xs font-bold">
                      {msg.sender?.name || "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {msg.isPinned && (
                        <Pin
                          size={10}
                          className="rotate-45 fill-muted-foreground"
                        />
                      )}
                      {msg.updatedAt !== msg.createdAt && (
                        <span
                          className="text-[9px] italic"
                          title={`Edited: ${new Date(msg.updatedAt).toLocaleString()}`}
                        >
                          (edited)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="relative group/content">
                    <div
                      className={cn(
                        "p-3 px-4 rounded-2xl text-[14px] leading-relaxed wrap-break-words",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none",
                      )}
                    >
                      {renderContent(msg.content)}
                    </div>

                    <MessageReactions
                      reactions={msg.reactions || []}
                      currentUserId={user?.id || ""}
                      onReactionToggle={(emoji) =>
                        handleAddReaction(msg.id, emoji)
                      }
                    />

                    {/* Thread Reply Count */}
                    {(msg._count?.replies || 0) > 0 && (
                      <button
                        onClick={() => onThreadSelect?.(msg)}
                        className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-primary hover:underline group/thread"
                      >
                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 group-hover/thread:bg-primary/20 transition-colors">
                          <Reply size={9} className="scale-x-[-1]" />
                        </div>
                        {msg._count.replies}{" "}
                        {msg._count.replies === 1 ? "reply" : "replies"}
                      </button>
                    )}

                    {/* Actions Menu (on hover) */}
                    <div
                      className={cn(
                        "absolute top-0 opacity-0 group-hover/content:opacity-100 transition-opacity flex items-center gap-1 bg-card border border-border rounded-lg shadow-sm p-1 z-10",
                        isOwn ? "right-full mr-2" : "left-full ml-2",
                      )}
                    >
                      <EmojiPicker
                        onEmojiSelect={(emoji) =>
                          handleAddReaction(msg.id, emoji)
                        }
                        className="hover:bg-muted rounded-md transition-colors"
                      />

                      <button
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => onThreadSelect?.(msg)}
                        title="Reply"
                        type="button"
                      >
                        <Reply size={14} />
                      </button>

                      <button
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => handlePinMessage(msg.id)}
                        title={msg.isPinned ? "Unpin" : "Pin"}
                        type="button"
                      >
                        {msg.isPinned ? (
                          <PinOff size={14} />
                        ) : (
                          <Pin size={14} />
                        )}
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
                            type="button"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            className="p-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/5 rounded-md transition-colors"
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Delete"
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
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
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
            typing...
          </div>
        )}
      </div>

      <form
        className="p-4 border-t border-border flex gap-3 bg-card"
        onSubmit={handleSend}
      >
        <input
          placeholder={
            editingMessage ? "Editing message..." : "Type a message..."
          }
          className={cn(
            "flex-1 h-11 bg-muted border border-border rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
            editingMessage && "ring-2 ring-primary/20 border-primary",
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
            aria-label="Cancel edit"
          >
            <X size={18} />
          </button>
        )}

        <button
          type="submit"
          disabled={!input.trim()}
          className="w-11 h-11 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </form>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={selectedUserId}
      />

      <ConfirmDialog
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}
