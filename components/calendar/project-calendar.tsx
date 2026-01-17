"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Clock } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
  isToday,
} from "date-fns";
import { cn } from "@/lib/cn";
import { Task } from "@/types/task";
import TaskModal from "@/components/board/task-modal";

interface ProjectCalendarProps {
  projectId: string;
  workspaceSlug: string;
}

export default function ProjectCalendar({
  projectId,
  workspaceSlug,
}: ProjectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <span className="text-primary">{format(currentDate, "MMMM")}</span>
            <span className="text-mutedForeground/40">
              {format(currentDate, "yyyy")}
            </span>
          </h2>
          <div className="flex items-center bg-muted border border-border rounded-xl p-1 shadow-sm">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-card hover:text-primary rounded-lg transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-card hover:text-primary rounded-lg transition-all"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-card hover:text-primary rounded-lg transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-xl">
            <Search size={16} className="text-mutedForeground" />
            <input
              type="text"
              placeholder="Search projects..."
              className="bg-transparent border-none text-foreground w-40 outline-none text-xs placeholder:text-mutedForeground"
            />
          </div>
          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-soft hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={18} />
            New Task
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const date = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
      days.push(
        <div
          key={i}
          className="text-center text-[10px] font-black uppercase tracking-widest text-mutedForeground/40 py-4"
        >
          {date[i]}
        </div>,
      );
    }

    return (
      <div className="grid grid-cols-7 border-b border-border/50">{days}</div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const dayTasks = tasks.filter(
          (task) => task.dueDate && isSameDay(parseISO(task.dueDate), cloneDay),
        );

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "relative min-h-[140px] border-r border-b border-border/50 p-2 transition-all hover:bg-muted/30 group",
              !isSameMonth(day, monthStart) &&
                "bg-muted/10 opacity-40 grayscale-[0.5]",
              isToday(day) && "bg-primary/5",
            )}
            onClick={() => {
              // Day clicked
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <span
                className={cn(
                  "text-xs font-black w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                  isToday(day)
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-mutedForeground group-hover:text-foreground",
                )}
              >
                {formattedDate}
              </span>
              {dayTasks.length > 0 && (
                <span className="text-[10px] font-bold text-mutedForeground/40 px-1.5 py-0.5 bg-muted rounded-md group-hover:bg-card">
                  {dayTasks.length}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar">
              {dayTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTask(task);
                    setIsModalOpen(true);
                  }}
                  className={cn(
                    "text-[10px] text-left p-2 rounded-lg border border-border shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-95",
                    task.priority === "URGENT"
                      ? "bg-red-500/10 border-red-500/30 text-red-600"
                      : task.priority === "HIGH"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                        : "bg-card text-foreground",
                  )}
                >
                  <div className="font-bold truncate">{task.title}</div>
                  <div className="flex items-center gap-2 mt-1 opacity-60">
                    <Clock size={8} />
                    <span className="uppercase text-[8px] tracking-tighter">
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button
              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-card border border-border text-mutedForeground opacity-0 group-hover:opacity-100 transition-all hover:text-primary hover:border-primary shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditingTask(null);
                setIsModalOpen(true);
              }}
            >
              <Plus size={14} />
            </button>
          </div>,
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>,
      );
      days = [];
    }
    return (
      <div className="bg-card border-l border-t border-border/50 rounded-2xl overflow-hidden shadow-soft">
        {rows}
      </div>
    );
  };

  if (loading) return <div className="p-8">Loading calendar...</div>;

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden bg-muted/30">
      {renderHeader()}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {renderDays()}
        {renderCells()}
      </div>

      <TaskModal
        projectId={projectId}
        workspaceSlug={workspaceSlug}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialStatus="TODO"
        task={editingTask}
        onTaskCreated={(_newTask) => {
          fetchTasks();
        }}
        onTaskUpdated={(_updatedTask) => {
          fetchTasks();
        }}
      />
    </div>
  );
}
