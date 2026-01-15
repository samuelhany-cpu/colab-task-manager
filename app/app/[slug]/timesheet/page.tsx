"use client";

import { useState, useEffect, use } from "react";
import {
  Clock,
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Play,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface TimeEntry {
  id: string;
  duration: number;
  note: string | null;
  startTime: string;
  endTime: string;
  task: {
    title: string;
    project: { name: string };
  };
}

export default function TimesheetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  use(params);
  const { data: session } = useSession();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const res = await fetch("/api/time");
        if (res.ok) {
          const data = await res.json();
          // API returns { entries, activeTimer }
          setEntries(data.entries || []);
        }
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) fetchEntries();
  }, [session]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;

    try {
      const res = await fetch(`/api/time/${entryId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEntries(entries.filter((e) => e.id !== entryId));
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      alert("Failed to delete time entry");
    }
  };

  const handleAddEntry = () => {
    setShowAddModal(true);
  };

  const handlePreviousWeek = () => {
    setCurrentWeekOffset(currentWeekOffset - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeekOffset(currentWeekOffset + 1);
  };

  const getWeekDateRange = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + currentWeekOffset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };

    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}, ${weekEnd.getFullYear()}`;
  };

  const getTodayTotal = () => {
    const today = new Date().toDateString();
    const todayEntries = entries.filter(
      (e) => new Date(e.startTime).toDateString() === today,
    );
    return todayEntries.reduce((acc, curr) => acc + curr.duration, 0);
  };

  const totalTime = entries.reduce((acc, curr) => acc + curr.duration, 0);

  if (loading) return <div className="p-8">Loading timesheet...</div>;

  return (
    <div className="timesheet-container">
      <header className="page-header">
        <div>
          <h1 className="gradient-text">Timesheet</h1>
          <p className="subtitle">
            Track your productivity and billable hours.
          </p>
        </div>
        <div className="summary-card glass">
          <div className="summary-item">
            <span className="summary-label">Total Week</span>
            <span className="summary-value">{formatDuration(totalTime)}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-label">Today</span>
            <span className="summary-value">
              {formatDuration(getTodayTotal())}
            </span>
          </div>
        </div>
      </header>

      <div className="timesheet-controls glass">
        <div className="date-nav">
          <button className="nav-btn" onClick={handlePreviousWeek}>
            <ChevronLeft size={20} />
          </button>
          <div className="current-date">
            <CalendarIcon size={18} />
            <span>{getWeekDateRange()}</span>
          </div>
          <button className="nav-btn" onClick={handleNextWeek}>
            <ChevronRight size={20} />
          </button>
        </div>
        <button className="primary-btn" onClick={handleAddEntry}>
          <Plus size={18} />
          <span>Add Entry</span>
        </button>
      </div>

      <div className="entries-list glass">
        {entries.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task / Project</th>
                  <th>Note</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="entry-row">
                    <td>
                      <div className="task-cell">
                        <span className="task-title">{entry.task.title}</span>
                        <span className="project-tag">
                          {entry.task.project.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="note-text">
                        {entry.note || "No notes"}
                      </span>
                    </td>
                    <td>{new Date(entry.startTime).toLocaleDateString()}</td>
                    <td>
                      <span className="duration-tag">
                        {formatDuration(entry.duration)}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="icon-btn"
                          title="Continue Timer"
                          onClick={() =>
                            alert("Timer feature - integrate with task timer")
                          }
                        >
                          <Play size={16} />
                        </button>
                        <button
                          className="icon-btn delete"
                          title="Delete Entry"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Clock size={48} className="muted-icon" />
            <h3>No time entries yet</h3>
            <p>Start a timer on a task to track your work.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <h2>Add Time Entry</h2>
            <p className="modal-message">
              To add a time entry, please use the timer feature on a task, or
              this feature will be implemented soon.
            </p>
            <div className="modal-actions">
              <button
                className="primary-btn"
                onClick={() => setShowAddModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .timesheet-container {
          padding: 3rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }
        h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .subtitle {
          color: var(--muted-foreground);
        }
        .summary-card {
          display: flex;
          align-items: center;
          padding: 1rem 2rem;
          border-radius: 1rem;
          gap: 2rem;
        }
        .summary-item {
          display: flex;
          flex-direction: column;
        }
        .summary-label {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          text-transform: uppercase;
          font-weight: 600;
        }
        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }
        .summary-divider {
          width: 1px;
          height: 30px;
          background: var(--border);
        }

        .timesheet-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-radius: 1rem;
          margin-bottom: 2rem;
        }
        .date-nav {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .current-date {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
        }
        .nav-btn {
          color: var(--muted-foreground);
          padding: 0.5rem;
          border-radius: 50%;
        }
        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .primary-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--primary), #d946ef);
          color: white;
          border-radius: 0.625rem;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .primary-btn:hover {
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
          transform: translateY(-2px);
        }

        .entries-list {
          border-radius: 1.5rem;
          overflow: hidden;
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
          color: var(--muted-foreground);
          border-bottom: 1px solid var(--border);
        }
        td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .entry-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .task-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .task-title {
          font-weight: 600;
        }
        .project-tag {
          font-size: 0.7rem;
          color: var(--primary);
          font-weight: 700;
        }
        .note-text {
          font-size: 0.875rem;
          color: var(--muted-foreground);
        }
        .duration-tag {
          font-weight: 700;
          font-family: monospace;
          font-size: 1rem;
        }
        .actions-cell {
          display: flex;
          gap: 0.75rem;
        }
        .icon-btn {
          color: var(--muted-foreground);
          transition: color 0.2s;
          cursor: pointer;
        }
        .icon-btn:hover {
          color: white;
        }
        .icon-btn.delete:hover {
          color: #ef4444;
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
        .muted-icon {
          opacity: 0.2;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .modal {
          max-width: 500px;
          padding: 2rem;
          border-radius: 1rem;
        }
        .modal h2 {
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        .modal-message {
          color: var(--muted-foreground);
          margin-bottom: 1.5rem;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
      `}</style>
    </div>
  );
}
