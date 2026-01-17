"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight } from "lucide-react";
import { Task, Tag } from "@/types/task";

interface TaskModalProps {
  projectId: string;
  workspaceSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task?: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  initialStatus?: string;
  task?: Task | null;
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
  workspaceSlug,
  isOpen,
  onClose,
  onTaskCreated,
  onTaskUpdated,
  initialStatus = "TODO",
  task,
}: TaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/tags`);
      if (res.ok) {
        const data = await res.json();
        setAllTags(data);
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchTags();
      if (task) {
        setSelectedTagIds(task.tags?.map((t) => t.id) || []);
      } else {
        setSelectedTagIds([]);
      }
    }
  }, [isOpen, fetchMembers, fetchTags, task]);

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
      const payload = {
        title,
        description,
        priority,
        status,
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
        tagIds: selectedTagIds,
      };

      if (task) {
        // Update existing task
        const res = await fetch(`/api/tasks?taskId=${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update task");
        }

        const updatedTask = (await res.json()) as Task;
        if (onTaskUpdated) onTaskUpdated(updatedTask);
      } else {
        // Create new task
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, projectId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create task");
        }

        const newTask = (await res.json()) as Task;
        onTaskCreated(newTask);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border border-border p-8 rounded-[1.5rem] shadow-2xl animate-in slide-in-from-bottom-8 duration-300 custom-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">
            {task ? "Edit Task" : "Create New Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-mutedForeground hover:text-foreground transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="title"
              className="text-sm font-bold text-mutedForeground"
            >
              Task Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={task?.title}
              placeholder="What needs to be done?"
              className="px-4 py-3 bg-muted border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="description"
              className="text-sm font-bold text-mutedForeground"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={task?.description}
              placeholder="Add more details..."
              className="px-4 py-3 bg-muted border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {/* Tags Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-mutedForeground">
              Labels
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all ${
                    selectedTagIds.includes(tag.id)
                      ? "border-current opacity-100 ring-2 ring-current/20"
                      : "border-current/20 opacity-50 grayscale-[0.5]"
                  }`}
                  style={{
                    color: tag.color,
                    backgroundColor: `${tag.color}15`,
                  }}
                >
                  {tag.name}
                </button>
              ))}
              {allTags.length === 0 && (
                <p className="text-[10px] text-mutedForeground italic">
                  No workspace labels found
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="status"
                className="text-sm font-bold text-mutedForeground"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                className="px-4 py-3 bg-muted border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer text-sm font-bold"
                defaultValue={task?.status || initialStatus}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="priority"
                className="text-sm font-bold text-mutedForeground"
              >
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                className="px-4 py-3 bg-muted border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer text-sm font-bold"
                defaultValue={task?.priority || "MEDIUM"}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="assigneeId"
                className="text-sm font-bold text-mutedForeground"
              >
                Assign To
              </label>
              <select
                id="assigneeId"
                name="assigneeId"
                className="px-4 py-3 bg-muted border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer disabled:opacity-50 text-sm font-bold"
                disabled={loadingMembers}
                defaultValue={task?.assignee?.id || ""}
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
                <span className="text-[10px] text-mutedForeground">
                  Loading members...
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="dueDate"
                className="text-sm font-bold text-mutedForeground"
              >
                Due Date
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={
                  task?.dueDate
                    ? new Date(task.dueDate).toISOString().split("T")[0]
                    : ""
                }
                className="px-4 py-3 bg-muted border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-sm font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-6 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-mutedForeground hover:text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-soft hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
              disabled={loading}
            >
              {loading
                ? task
                  ? "Updating..."
                  : "Creating..."
                : task
                  ? "Update Task"
                  : "Create Task"}
              {!loading && <ChevronRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
