"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { getSocket } from "@/lib/socket-client";

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.append("type", filter);

      const res = await fetch(`/api/notifications?${params}`);
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
  }, [filter]);

  useEffect(() => {
    fetchNotifications();

    // Real-time notifications
    const socket = getSocket();
    socket.on("notification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      socket.off("notification");
    };
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [filter, isOpen, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const clearAll = async () => {
    if (!confirm("Clear all notifications?")) return;

    try {
      const res = await fetch("/api/notifications?all=true", {
        method: "DELETE",
      });

      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return "📋";
      case "COMMENT_MENTION":
        return "💬";
      case "MESSAGE_RECEIVED":
        return "✉️";
      case "PROJECT_INVITE":
        return "👥";
      default:
        return "🔔";
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="notification-container" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                disabled={unreadCount === 0}
              >
                <CheckCheck size={16} />
              </button>
              <button
                onClick={clearAll}
                title="Clear all"
                disabled={notifications.length === 0}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="notification-filters">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={filter === "TASK_ASSIGNED" ? "active" : ""}
              onClick={() => setFilter("TASK_ASSIGNED")}
            >
              Tasks
            </button>
            <button
              className={filter === "COMMENT_MENTION" ? "active" : ""}
              onClick={() => setFilter("COMMENT_MENTION")}
            >
              Mentions
            </button>
            <button
              className={filter === "MESSAGE_RECEIVED" ? "active" : ""}
              onClick={() => setFilter("MESSAGE_RECEIVED")}
            >
              Messages
            </button>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={48} style={{ opacity: 0.3 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <p>{notification.content}</p>
                    <span className="notification-time">
                      {getTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  <div className="notification-item-actions">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        title="Mark as read"
                        className="mark-read-btn"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => deleteNotification(notification.id, e)}
                      title="Delete"
                      className="delete-btn"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .notification-container {
          position: relative;
        }
        .notification-bell {
          position: relative;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .notification-bell:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          min-width: 18px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        }
        .notification-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          width: 400px;
          max-height: 600px;
          background: rgba(30, 41, 59, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .notification-header h3 {
          font-size: 1rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }
        .notification-actions {
          display: flex;
          gap: 0.5rem;
        }
        .notification-actions button {
          padding: 0.375rem;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }
        .notification-actions button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .notification-actions button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .notification-filters {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          overflow-x: auto;
        }
        .notification-filters button {
          padding: 0.375rem 0.75rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .notification-filters button:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
        }
        .notification-filters button.active {
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          border-color: transparent;
          color: white;
        }
        .notification-list {
          flex: 1;
          overflow-y: auto;
          max-height: 450px;
        }
        .notification-loading,
        .notification-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: rgba(255, 255, 255, 0.5);
          gap: 1rem;
        }
        .notification-empty p {
          margin: 0;
          font-size: 0.875rem;
        }
        .notification-item {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        .notification-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .notification-item.unread {
          background: rgba(59, 130, 246, 0.05);
        }
        .notification-item.unread::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
        }
        .notification-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .notification-content {
          flex: 1;
          min-width: 0;
        }
        .notification-content p {
          margin: 0 0 0.25rem;
          color: white;
          font-size: 0.875rem;
          line-height: 1.4;
        }
        .notification-time {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .notification-item-actions {
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .notification-item:hover .notification-item-actions {
          opacity: 1;
        }
        .notification-item-actions button {
          padding: 0.25rem;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border-radius: 0.25rem;
          transition: all 0.2s ease;
        }
        .notification-item-actions button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .notification-item-actions .mark-read-btn:hover {
          color: #60a5fa;
        }
        .notification-item-actions .delete-btn:hover {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
