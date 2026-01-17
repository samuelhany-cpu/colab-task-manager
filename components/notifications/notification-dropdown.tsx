"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@/components/providers/user-provider";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, BellOff, Check, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { user } = useUser();

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?filter=${filter}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Setup Supabase Realtime for notifications

  useEffect(() => {
    if (!user) return;

    // Listen for new notifications via Supabase Realtime
    const channel = supabase
      .channel(`user:${user.id}`)
      .on("broadcast", { event: "new-notification" }, ({ payload }) => {
        const notification = payload as Notification;
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Show browser notification if supported
        if (Notification.permission === "granted") {
          new Notification("New Notification", {
            body: notification.content,
            icon: "/favicon.ico",
          });
        }
      })
      .subscribe();

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Mark notification as read
  const markAsRead = async (id: string, read: boolean = true) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read } : n)),
        );
        setUnreadCount((prev) => (read ? prev - 1 : prev + 1));
      }
    } catch (error) {
      console.error("Failed to mark notification:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.read) {
          setUnreadCount((prev) => prev - 1);
        }
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return "📋";
      case "COMMENT_MENTION":
        return "💬";
      case "MESSAGE_RECEIVED":
        return "✉️";
      case "PROJECT_INVITE":
        return "🎯";
      default:
        return "🔔";
    }
  };

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2.5 rounded-xl text-mutedForeground bg-muted/50 border border-border hover:bg-muted hover:text-foreground transition-all flex items-center justify-center group"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className="group-hover:scale-110 transition-transform"
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground border-2 border-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-[400px] max-h-[600px] bg-card border border-border rounded-2xl shadow-2xl z-[1000] flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between p-5 border-b border-border bg-card">
            <h3 className="text-lg font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="text-xs font-bold text-primary hover:text-primary/80 transition-all p-1.5 hover:bg-primary/5 rounded-lg"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="flex gap-2 p-3 border-b border-border bg-muted/30 overflow-x-auto no-scrollbar">
            {["all", "unread", "TASK_ASSIGNED", "MESSAGE_RECEIVED"].map((t) => (
              <button
                key={t}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                  filter === t
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-mutedForeground hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setFilter(t)}
              >
                {t === "all"
                  ? "All"
                  : t === "unread"
                    ? "Unread"
                    : t === "TASK_ASSIGNED"
                      ? "Tasks"
                      : "Messages"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-border">
            {loading ? (
              <div className="p-12 text-center text-mutedForeground flex flex-col items-center gap-3">
                <Loader2 className="animate-spin opacity-20" size={32} />
                <span className="text-sm font-medium">
                  Crunching notifications...
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-16 text-center text-mutedForeground flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <BellOff size={32} className="opacity-20" />
                </div>
                <p className="text-sm font-medium text-mutedForeground/60">
                  No notifications found
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group flex items-start gap-4 p-4 transition-all hover:bg-muted/50",
                    !notification.read && "bg-primary/[0.02]",
                  )}
                >
                  <div
                    className="flex-1 flex gap-4 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm leading-snug break-words",
                          !notification.read
                            ? "font-bold text-foreground"
                            : "text-mutedForeground",
                        )}
                      >
                        {notification.content}
                      </p>
                      <span className="text-[10px] font-medium text-mutedForeground opacity-60 uppercase tracking-wider">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!notification.read && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)] group-hover:opacity-0 transition-opacity" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
