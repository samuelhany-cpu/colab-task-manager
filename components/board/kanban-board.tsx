"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Plus,
  MoreVertical,
  Calendar,
  MessageCircle,
  User as UserIcon,
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import TaskModal from "./task-modal";
import { Task } from "@/types/task";

export default function KanbanBoard({
  projectId,
  workspaceSlug,
}: {
  projectId: string;
  workspaceSlug: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  // ... (rest of states remain same)
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState<Task["status"]>("TODO");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task["status"] | null>(
    null,
  );
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?projectId=${projectId}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();

    const supabase = (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      return createClient();
    })();

    let channel: RealtimeChannel;

    supabase.then((client) => {
      channel = client
        .channel(`project:${projectId}`)
        .on("broadcast", { event: "task-updated" }, () => {
          fetchTasks();
        })
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.then((client) => client.removeChannel(channel));
      }
    };
  }, [projectId, fetchTasks]);

  // Separate effect for click-outside handling
  useEffect(() => {
    if (!openMenuTaskId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".task-menu")) {
        setOpenMenuTaskId(null);
      }
    };

    // Add listener after a small delay to avoid capturing the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openMenuTaskId]);

  const handleAddTask = (status: Task["status"] = "TODO") => {
    setInitialStatus(status);
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
    setOpenMenuTaskId(null);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    // Don't start drag if clicking on menu button
    if ((e.target as HTMLElement).closest(".task-menu")) {
      e.preventDefault();
      return;
    }
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: Task["status"]) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Task["status"]) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    setTasks(
      tasks.map((t) =>
        t.id === draggedTask.id ? { ...t, status: newStatus } : t,
      ),
    );

    try {
      const res = await fetch(`/api/tasks/${draggedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Revert on error
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      fetchTasks();
    }

    setDraggedTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    // Optimistic update
    const previousTasks = [...tasks];
    setTasks(tasks.filter((t) => t.id !== taskId));
    setOpenMenuTaskId(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Revert on error
        setTasks(previousTasks);
        alert("Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      setTasks(previousTasks);
      alert("Failed to delete task");
    }
  };

  const toggleMenu = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuTaskId(openMenuTaskId === taskId ? null : taskId);
  };

  const columns: { title: string; status: Task["status"] }[] = [
    { title: "To Do", status: "TODO" },
    { title: "In Progress", status: "IN_PROGRESS" },
    { title: "Done", status: "DONE" },
  ];

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "LOW":
        return "#94a3b8";
      case "MEDIUM":
        return "#3b82f6";
      case "HIGH":
        return "#f59e0b";
      case "URGENT":
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  };

  const getFilteredAndSortedTasks = (status: Task["status"]) => {
    let filtered = tasks.filter((t) => t.status === status);

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (filterPriority !== "ALL") {
      filtered = filtered.filter((t) => t.priority === filterPriority);
    }

    return filtered.sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === "priority") {
        const priorityScore = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityScore[b.priority] - priorityScore[a.priority];
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  };

  if (loading) return <div className="p-8">Loading board...</div>;

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div className="flex items-center gap-10">
          <h2 className="text-2xl font-bold">Project Board</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-xl min-w-[200px]">
              <Search size={16} className="text-mutedForeground" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="bg-transparent border-none text-foreground w-full outline-none text-sm placeholder:text-mutedForeground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-xl">
              <Filter size={16} className="text-mutedForeground" />
              <select
                className="bg-transparent border-none text-foreground outline-none text-sm cursor-pointer"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-xl">
              <ArrowUpDown size={16} className="text-mutedForeground" />
              <select
                className="bg-transparent border-none text-foreground outline-none text-sm cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm shadow-soft hover:brightness-110 transition-all active:scale-95"
            onClick={() => handleAddTask("TODO")}
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto pb-4">
        {columns.map((column) => (
          <div
            key={column.status}
            className={cn(
              "flex flex-col bg-muted/30 rounded-2xl h-fit min-h-[200px] transition-all p-2",
              dragOverColumn === column.status &&
                "bg-primary/5 ring-2 ring-primary/50",
            )}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className="flex items-center gap-3 mb-4 px-2 pt-2">
              <span className="font-semibold text-[15px]">{column.title}</span>
              <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-bold text-mutedForeground">
                {getFilteredAndSortedTasks(column.status).length}
              </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto flex-1 p-1">
              {getFilteredAndSortedTasks(column.status).map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "group relative p-4 rounded-xl border border-border bg-card text-card-foreground shadow-soft transition-all cursor-grab active:cursor-grabbing hover:-translate-y-1",
                    draggedTask?.id === task.id && "opacity-50 scale-95",
                  )}
                  draggable={openMenuTaskId !== task.id}
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <div
                    className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                    style={{ background: getPriorityColor(task.priority) }}
                  />
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                      <div
                        className="relative z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="p-1 rounded-md text-mutedForeground hover:bg-muted hover:text-foreground transition-all"
                          onClick={(e) => toggleMenu(e, task.id)}
                          type="button"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {openMenuTaskId === task.id && (
                          <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl p-1 min-width-[150px] z-[100] shadow-soft backdrop-blur-md">
                            <button
                              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-all text-left"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTask(task);
                              }}
                            >
                              <Edit size={14} />
                              <span>Edit Task</span>
                            </button>
                            <button
                              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all text-left"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Tags Display */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {task.tags.map((tag) => (
                          <div
                            key={tag.id}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-current/20 flex items-center"
                            style={{
                              color: tag.color,
                              backgroundColor: `${tag.color}10`,
                            }}
                          >
                            {tag.name}
                          </div>
                        ))}
                      </div>
                    )}

                    <h4 className="text-[15px] font-semibold mb-4 leading-normal">
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-4 text-mutedForeground text-[11px]">
                      {task.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <MessageCircle size={12} />
                        <span>{task._count?.comments || 0}</span>
                      </div>
                      <div className="ml-auto">
                        {task.assignee ? (
                          task.assignee.image ? (
                            <div
                              className="w-6 h-6 rounded-full border border-border bg-primary flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-soft"
                              style={{
                                backgroundImage: `url(${task.assignee.image})`,
                                backgroundSize: "cover",
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-border bg-primary flex items-center justify-center text-[10px] font-bold text-white shadow-soft">
                              {(task.assignee.name ||
                                task.assignee.email ||
                                "?")[0].toUpperCase()}
                            </div>
                          )
                        ) : (
                          <UserIcon
                            size={14}
                            className="text-mutedForeground opacity-50"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border text-mutedForeground text-sm hover:border-primary/50 hover:text-primary transition-all group mt-1"
                onClick={() => handleAddTask(column.status)}
              >
                <Plus
                  size={16}
                  className="group-hover:scale-110 transition-transform"
                />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <TaskModal
        projectId={projectId}
        workspaceSlug={workspaceSlug}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialStatus={initialStatus}
        task={editingTask}
        onTaskCreated={(newTask) => {
          if (newTask) {
            const taskWithDefaults: Task = {
              ...newTask,
              tags: newTask.tags || [],
              _count: newTask._count || { comments: 0 },
            };
            setTasks((prev) => [...prev, taskWithDefaults]);
          } else {
            fetchTasks();
          }
        }}
        onTaskUpdated={(updatedTask) => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === updatedTask.id
                ? ({
                    ...updatedTask,
                    tags: updatedTask.tags || [],
                    _count: t._count,
                  } as Task)
                : t,
            ),
          );
        }}
      />
    </div>
  );
}
