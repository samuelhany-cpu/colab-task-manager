"use client";

import { useState, useEffect, useCallback } from "react";
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
import { getSocket } from "@/lib/socket-client";
import TaskModal from "./task-modal";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  assignee?: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
  _count: { comments: number };
}

export default function KanbanBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
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
    const socket = getSocket();
    socket.emit("join-project", projectId);

    socket.on("task-updated", () => {
      fetchTasks();
    });

    return () => {
      socket.off("task-updated");
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
    setIsModalOpen(true);
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
      } else {
        // Emit socket event
        const socket = getSocket();
        socket.emit("task-updated", { projectId, taskId: draggedTask.id });
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      fetchTasks();
    }

    setDraggedTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTasks(tasks.filter((t) => t.id !== taskId));
        const socket = getSocket();
        socket.emit("task-updated", { projectId, taskId });
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task");
    }
    setOpenMenuTaskId(null);
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
    <div className="board-container">
      <div className="board-header">
        <div className="header-left">
          <h2>Project Board</h2>
          <div className="board-controls">
            <div className="search-box glass">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-group glass">
              <Filter size={16} />
              <select
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

            <div className="filter-group glass">
              <ArrowUpDown size={16} />
              <select
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
        <div className="board-actions">
          <button
            className="create-task-btn primary-btn"
            onClick={() => handleAddTask("TODO")}
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </div>

      <div className="kanban-grid">
        {columns.map((column) => (
          <div
            key={column.status}
            className={`kanban-column ${dragOverColumn === column.status ? "drag-over" : ""}`}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className="column-header">
              <span className="column-title">{column.title}</span>
              <span className="task-count">
                {getFilteredAndSortedTasks(column.status).length}
              </span>
            </div>

            <div className="task-list">
              {getFilteredAndSortedTasks(column.status).map((task) => (
                <div
                  key={task.id}
                  className={`task-card glass ${draggedTask?.id === task.id ? "dragging" : ""}`}
                  draggable={openMenuTaskId !== task.id}
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <div
                    className="task-priority-bar"
                    style={{ background: getPriorityColor(task.priority) }}
                  />
                  <div className="task-content">
                    <div className="task-top">
                      <span
                        className="task-priority"
                        style={{ color: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                      <div
                        className="task-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="task-more"
                          onClick={(e) => toggleMenu(e, task.id)}
                          type="button"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {openMenuTaskId === task.id && (
                          <div className="task-dropdown">
                            <button
                              className="dropdown-item"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuTaskId(null);
                              }}
                            >
                              <Edit size={14} />
                              <span>Edit Task</span>
                            </button>
                            <button
                              className="dropdown-item delete"
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
                    <h4 className="task-title">{task.title}</h4>
                    <div className="task-meta">
                      {task.dueDate && (
                        <div className="meta-item">
                          <Calendar size={12} />
                          <span>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="meta-stats">
                        <div className="meta-item">
                          <MessageCircle size={12} />
                          <span>{task._count.comments}</span>
                        </div>
                      </div>
                      <div className="assignee">
                        {task.assignee ? (
                          task.assignee.image ? (
                            <div
                              className="avatar small"
                              style={{
                                backgroundImage: `url(${task.assignee.image})`,
                                backgroundSize: "cover",
                              }}
                              title={
                                task.assignee.name ||
                                task.assignee.email ||
                                "Assigned"
                              }
                            />
                          ) : (
                            <div
                              className="avatar small"
                              title={
                                task.assignee.name ||
                                task.assignee.email ||
                                "Assigned"
                              }
                            >
                              {(task.assignee.name ||
                                task.assignee.email ||
                                "?")[0].toUpperCase()}
                            </div>
                          )
                        ) : (
                          <UserIcon
                            size={14}
                            className="text-gray-400"
                            title="Unassigned"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                className="add-card-btn"
                onClick={() => handleAddTask(column.status)}
              >
                <Plus size={16} />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <TaskModal
        projectId={projectId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialStatus={initialStatus}
        onTaskCreated={() => fetchTasks()}
      />

      <style jsx>{`
        .board-container {
          padding: 2rem;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .board-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-shrink: 0;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }
        .board-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.75rem;
          min-width: 200px;
        }
        .search-box input {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          outline: none;
          font-size: 0.875rem;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.75rem;
        }
        .filter-group select {
          background: transparent;
          border: none;
          color: white;
          outline: none;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .filter-group select option {
          background: #1e293b;
        }
        h2 {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .kanban-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-bottom: 1rem;
        }
        .kanban-column {
          display: flex;
          flex-direction: column;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 1rem;
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease;
          height: fit-content;
          min-height: 200px;
        }
        .kanban-column.drag-over {
          background: rgba(139, 92, 246, 0.1);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5);
          padding: 1rem;
        }
        .column-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding: 0 0.5rem;
        }
        .column-title {
          font-weight: 600;
          font-size: 0.9375rem;
        }
        .task-count {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.125rem 0.5rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
          flex: 1;
          padding: 0.25rem;
        }
        .task-card {
          position: relative;
          padding: 1rem;
          border-radius: 0.75rem;
          cursor: grab;
          transition:
            transform 0.1s,
            opacity 0.2s;
        }
        .task-card:active {
          cursor: grabbing;
        }
        .task-card.dragging {
          opacity: 0.5;
          transform: scale(0.95);
        }
        .task-card:hover {
          transform: translateY(-2px);
          background: rgba(30, 41, 59, 1);
        }
        .task-card.dragging:hover {
          transform: scale(0.95);
        }
        .task-priority-bar {
          position: absolute;
          left: 0;
          top: 1rem;
          bottom: 1rem;
          width: 3px;
          border-radius: 0 2px 2px 0;
        }
        .task-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .task-menu {
          position: relative;
          z-index: 5;
        }
        .task-more {
          padding: 0.25rem;
          border-radius: 0.375rem;
          color: var(--muted-foreground);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          z-index: 2;
        }
        .task-more:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .task-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.25rem;
          background: rgba(30, 41, 59, 0.98);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.5rem;
          min-width: 150px;
          z-index: 100;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(8px);
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          border-radius: 0.375rem;
          color: var(--foreground);
          font-size: 0.875rem;
          transition: background 0.2s ease;
          text-align: left;
          cursor: pointer;
          border: none;
          background: transparent;
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .dropdown-item.delete {
          color: #ef4444;
        }
        .dropdown-item.delete:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        .task-priority {
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .task-title {
          font-size: 0.9375rem;
          font-weight: 500;
          margin-bottom: 1rem;
          line-height: 1.4;
        }
        .task-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: var(--muted-foreground);
          font-size: 0.75rem;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .assignee {
          margin-left: auto;
        }
        .avatar.small {
          width: 24px;
          height: 24px;
          font-size: 0.625rem;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          object-fit: cover;
          cursor: pointer;
        }
        img.avatar.small {
          object-fit: cover;
        }
        .add-card-btn {
          width: 100%;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--muted-foreground);
          font-size: 0.875rem;
          justify-content: center;
        }
        .add-card-btn:hover {
          color: var(--foreground);
        }
        .primary-btn {
          padding: 0.5rem 1rem;
          background: var(--primary);
          color: white;
          border-radius: 0.5rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
