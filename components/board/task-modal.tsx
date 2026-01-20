"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/cn";
import {
  X,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
  GripVertical,
  ArrowUpRight,
} from "lucide-react";
import { Task, Tag, Subtask } from "@/types/task";
import CommentSection from "@/components/tasks/comment-section";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const fetchSubtasks = useCallback(async () => {
    if (!task) return;
    try {
      setLoadingSubtasks(true);
      const res = await fetch(`/api/tasks/${task.id}/subtasks`);
      if (res.ok) {
        const data = await res.json();
        setSubtasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch subtasks:", err);
    } finally {
      setLoadingSubtasks(false);
    }
  }, [task]);

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
        fetchSubtasks();
      } else {
        setSelectedTagIds([]);
        setSubtasks([]);
      }
    }
  }, [isOpen, fetchMembers, fetchTags, fetchSubtasks, task]);

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

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtaskTitle.trim() || addingSubtask) return;

    try {
      setAddingSubtask(true);
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle }),
      });

      if (res.ok) {
        const newSub = await res.json();
        setSubtasks((prev) => [...prev, newSub]);
        setNewSubtaskTitle("");
      }
    } catch (err) {
      console.error("Failed to add subtask:", err);
    } finally {
      setAddingSubtask(false);
    }
  };

  const toggleSubtask = async (subtask: Subtask) => {
    try {
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtask.id ? { ...s, completed: !s.completed } : s,
        ),
      );

      const res = await fetch(`/api/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !subtask.completed }),
      });

      if (!res.ok) {
        // Revert on error
        setSubtasks((prev) =>
          prev.map((s) =>
            s.id === subtask.id ? { ...s, completed: subtask.completed } : s,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
    }
  };

  const handleDeleteSubtask = async (id: string) => {
    try {
      const res = await fetch(`/api/subtasks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubtasks((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete subtask:", err);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = subtasks.findIndex((i) => i.id === active.id);
      const newIndex = subtasks.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(subtasks, oldIndex, newIndex);

      // Optimistic update
      setSubtasks(newItems);

      // Calculate new position
      let newPos: number;
      if (newIndex === 0) {
        newPos = newItems[1].position / 2;
      } else if (newIndex === newItems.length - 1) {
        newPos = newItems[newIndex - 1].position + 1000;
      } else {
        newPos =
          (newItems[newIndex - 1].position + newItems[newIndex + 1].position) /
          2;
      }

      // Update API
      try {
        await fetch(`/api/subtasks/${active.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: newPos }),
        });
        // Update local items with exact new position to keep it consistent
        newItems[newIndex].position = newPos;
        setSubtasks([...newItems]);
      } catch (e) {
        console.error("Failed to update subtask position:", e);
        // Rollback on error
        fetchSubtasks();
      }
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      await fetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete subtask:", err);
      fetchSubtasks(); // Refresh on error
    }
  };

  const handlePromoteSubtask = async (subtaskId: string) => {
    if (!confirm("Convert this subtask into a full task?")) return;
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}/promote`, {
        method: "POST",
      });

      if (res.ok) {
        const newTask = await res.json();
        setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
        onTaskCreated(newTask); // Add the new task to the board
      }
    } catch (err) {
      console.error("Failed to promote subtask:", err);
    }
  };

  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtaskProgress =
    subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

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

          {/* Subtasks Section */}
          {task && (
            <div className="flex flex-col gap-4 p-4 bg-muted/30 border border-border rounded-2xl">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-mutedForeground">
                  Subtasks ({completedSubtasks}/{subtasks.length})
                </label>
                <div className="text-[10px] font-black uppercase text-primary">
                  {Math.round(subtaskProgress)}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>

              <div className="space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={subtasks.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {subtasks.map((sub) => (
                      <SortableSubtask
                        key={sub.id}
                        sub={sub}
                        onToggle={() => toggleSubtask(sub)}
                        onDelete={() => deleteSubtask(sub.id)}
                        onPromote={() => handlePromoteSubtask(sub.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Add a subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask(e);
                    }
                  }}
                  className="w-full px-4 py-2 pr-10 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim() || addingSubtask}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:brightness-110 disabled:opacity-30"
                >
                  {addingSubtask ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                </button>
              </div>
            </div>
          )}

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

function SortableSubtask({
  sub,
  onToggle,
  onDelete,
  onPromote,
}: {
  sub: Subtask;
  onToggle: () => void;
  onDelete: () => void;
  onPromote: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg group transition-all",
        isDragging && "bg-muted shadow-lg ring-1 ring-primary/20",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-mutedForeground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
      >
        <GripVertical size={14} />
      </button>

      <button
        type="button"
        onClick={onToggle}
        className={`transition-colors ${sub.completed ? "text-primary" : "text-mutedForeground"}`}
      >
        {sub.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      <span
        className={`text-sm transition-all flex-1 ${
          sub.completed
            ? "line-through text-mutedForeground"
            : "text-foreground font-medium"
        }`}
      >
        {sub.title}
      </span>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button
          type="button"
          onClick={onPromote}
          title="Convert to Task"
          className="text-mutedForeground hover:text-primary transition-all p-1"
        >
          <ArrowUpRight size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="text-mutedForeground hover:text-destructive transition-all p-1"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
