"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight } from "lucide-react";

interface TaskModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  initialStatus?: string;
}

interface ProjectMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export default function TaskModal({
  projectId,
  isOpen,
  onClose,
  onTaskCreated,
  initialStatus = "TODO",
}: TaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, fetchMembers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;
    const status = formData.get("status") as string;
    const dueDate = formData.get("dueDate") as string;
    const assigneeId = formData.get("assigneeId") as string;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          status,
          dueDate: dueDate || null,
          assigneeId: assigneeId || null,
          projectId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create task");
      }

      onTaskCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>Create New Task</h2>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="title">Task Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="What needs to be done?"
              className="glass"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Add more details..."
              className="glass"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                className="glass"
                defaultValue={initialStatus}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                className="glass"
                defaultValue="MEDIUM"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="assigneeId">Assign To</label>
              <select
                id="assigneeId"
                name="assigneeId"
                className="glass"
                disabled={loadingMembers}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user.id}>
                    {member.user.name || member.user.email}
                    {member.role === "OWNER" && " (Owner)"}
                  </option>
                ))}
              </select>
              {loadingMembers && (
                <span className="text-xs text-gray-400">
                  Loading members...
                </span>
              )}
              {!loadingMembers && members.length === 0 && (
                <span className="text-xs text-amber-400">
                  No members yet. Add members in the Members tab.
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                className="glass"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-link">
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
              {!loading && <ChevronRight size={18} />}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .modal-content {
          width: 100%;
          max-width: 500px;
          padding: 2.5rem;
          border-radius: 1.5rem;
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        h2 {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .close-btn {
          color: var(--muted-foreground);
          transition: color 0.2s;
        }
        .close-btn:hover {
          color: white;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--muted-foreground);
        }
        input,
        textarea,
        select {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
          color: white;
          outline: none;
        }
        input:focus,
        textarea:focus,
        select:focus {
          border-color: var(--primary);
        }
        option {
          background: #1e293b;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 1.5rem;
          margin-top: 1rem;
        }
        .cancel-link {
          color: var(--muted-foreground);
          font-size: 0.875rem;
        }
        .cancel-link:hover {
          color: white;
        }
        .error-msg {
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
