"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  CheckSquare,
  AlertCircle,
  Calendar as CalendarIcon,
  Search,
} from "lucide-react";
import { getSocket } from "@/lib/socket-client";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project: {
    id: string;
    name: string;
  };
}

export default function MyTasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMyTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/my?workspaceSlug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug && session?.user) {
      fetchMyTasks();

      // Set up socket listeners for real-time updates
      const socket = getSocket();

      socket.on("task-updated", () => {
        fetchMyTasks();
      });

      return () => {
        socket.off("task-updated");
      };
    }
  }, [slug, session, fetchMyTasks]);

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.project.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div className="p-8">Loading your tasks...</div>;

  return (
    <div className="tasks-container">
      <header className="page-header">
        <div>
          <h1 className="gradient-text">My Tasks</h1>
          <p className="subtitle">
            You have {tasks.length} tasks assigned to you in this workspace.
          </p>
        </div>
        <div className="header-actions">
          <div className="search-bar glass">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="tasks-list glass">
        {filteredTasks.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="task-row">
                    <td>
                      <div className="task-title-cell">
                        <CheckSquare size={16} className="task-icon" />
                        <span>{task.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className="project-badge">{task.project.name}</span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${task.status.toLowerCase()}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`priority-badge ${task.priority.toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <div className="date-cell">
                        <CalendarIcon size={14} />
                        <span>
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString()
                            : "No date"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h3>No tasks found</h3>
            <p>
              You don&apos;t have any tasks assigned that match your criteria.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .tasks-container {
          padding: 3rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
        }
        h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .subtitle {
          color: var(--muted-foreground);
        }
        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 1rem;
          border-radius: 0.75rem;
          width: 300px;
        }
        .search-bar input {
          background: none;
          border: none;
          color: white;
          width: 100%;
          outline: none;
        }
        .tasks-list {
          border-radius: 1.25rem;
          overflow: hidden;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th {
          padding: 1.25rem 1.5rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted-foreground);
          border-bottom: 1px solid var(--border);
        }
        td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .task-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .task-title-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
        }
        .task-icon {
          color: var(--primary);
        }
        .project-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 100px;
          color: var(--muted-foreground);
        }
        .status-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .status-badge.todo {
          background: rgba(148, 163, 184, 0.1);
          color: #94a3b8;
        }
        .status-badge.in_progress {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }
        .status-badge.done {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .priority-badge {
          font-size: 0.75rem;
          font-weight: 600;
        }
        .priority-badge.urgent {
          color: #ef4444;
        }
        .priority-badge.high {
          color: #f59e0b;
        }
        .priority-badge.medium {
          color: #3b82f6;
        }
        .priority-badge.low {
          color: #94a3b8;
        }
        .date-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--muted-foreground);
        }
        .empty-state {
          padding: 5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--muted-foreground);
        }
        .empty-state h3 {
          color: white;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
