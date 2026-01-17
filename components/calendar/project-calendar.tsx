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

function Badge({ children, variant, className }: any) {
  return (
    <div className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase border",
      variant === "outline" ? "border-border text-muted-foreground" : "bg-primary text-primary-foreground border-primary",
      className
    )}>
      {children}
    </div>
  );
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
  const [view, setView] = useState<"MONTH" | "WEEK" | "DAY">("MONTH");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, [fetchTasks, fetchMembers]);

  const nextDate = () => {
    if (view === "MONTH") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "WEEK") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const prevDate = () => {
    if (view === "MONTH") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "WEEK") setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const onDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("taskId", task.id);
  };

  const onDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, dueDate: date.toISOString() } : t,
      ),
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: date.toISOString() }),
      });
      if (!res.ok) fetchTasks();
    } catch (error) {
      console.error("Failed to update task due date:", error);
      fetchTasks();
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    if (assigneeFilter !== "ALL") {
      filtered = filtered.filter((t) => t.assignee?.id === assigneeFilter);
    }
    return filtered;
  };

  const renderHeader = () => {
    return (
      <div className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <span className="text-primary">
                {format(currentDate, view === "MONTH" ? "MMMM" : "MMM d")}
              </span>
              <span className="text-mutedForeground/40">
                {format(currentDate, "yyyy")}
              </span>
            </h2>
            <div className="flex items-center bg-muted border border-border rounded-xl p-1 shadow-sm">
              <button
                onClick={prevDate}
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
                onClick={nextDate}
                className="p-2 hover:bg-card hover:text-primary rounded-lg transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center bg-muted border border-border rounded-xl p-1 shadow-sm">
              {(["MONTH", "WEEK", "DAY"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    view === v
                      ? "bg-card text-primary shadow-sm"
                      : "text-mutedForeground hover:bg-card/50",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-xl">
              <Search size={16} className="text-mutedForeground" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="bg-transparent border-none text-foreground w-40 outline-none text-xs placeholder:text-mutedForeground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-xl">
            <span className="text-mutedForeground text-[10px] font-black uppercase tracking-widest">Assignee:</span>
            <select
              className="bg-transparent border-none text-foreground outline-none text-xs cursor-pointer font-bold"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="ALL">Everyone</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.user.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (view === "DAY") {
      return (
        <div className="grid grid-cols-1 border-b border-border/50">
          <div className="text-center text-[10px] font-black uppercase tracking-widest text-mutedForeground/40 py-4">
            {format(currentDate, "EEEE")}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 border-b border-border/50">
        {dateNames.map((name, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-black uppercase tracking-widest text-mutedForeground/40 py-4"
          >
            {name}
          </div>
        ))}
      </div>
    );
  };

  const renderTask = (task: Task) => (
    <button
      key={task.id}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
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
  );

  const renderCells = () => {
    const filteredTasks = getFilteredTasks();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = view === "MONTH" ? startOfWeek(monthStart) : startOfWeek(currentDate);
    const endDate = view === "MONTH" ? endOfWeek(monthEnd) : endOfWeek(currentDate);

    if (view === "DAY") {
      const dayTasks = filteredTasks.filter(
        (task) => task.dueDate && isSameDay(parseISO(task.dueDate), currentDate),
      );
      return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-soft p-4 min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black">{format(currentDate, "EEEE, MMMM d")}</h3>
            <Badge variant="outline">{dayTasks.length} Tasks</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {dayTasks.map(renderTask)}
            <button
              className="flex items-center justify-center gap-2 p-10 rounded-2xl border-2 border-dashed border-border text-mutedForeground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group"
              onClick={() => {
                setEditingTask(null);
                setIsModalOpen(true);
              }}
            >
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold">Add Task for Today</span>
            </button>
          </div>
        </div>
      );
    }

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayTasks = filteredTasks.filter(
          (task) => task.dueDate && isSameDay(parseISO(task.dueDate), cloneDay),
        );

        days.push(
          <div
            key={day.toString()}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, cloneDay)}
            className={cn(
              "relative min-h-[140px] border-r border-b border-border/50 p-2 transition-all hover:bg-muted/30 group",
              view === "MONTH" && !isSameMonth(day, monthStart) && "bg-muted/10 opacity-40 grayscale-[0.5]",
              isToday(day) && "bg-primary/5",
            )}
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
                {format(day, "d")}
              </span>
              {dayTasks.length > 0 && (
                <span className="text-[10px] font-bold text-mutedForeground/40 px-1.5 py-0.5 bg-muted rounded-md group-hover:bg-card">
                  {dayTasks.length}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar">
              {dayTasks.map(renderTask)}
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
        onTaskCreated={() => fetchTasks()}
        onTaskUpdated={() => fetchTasks()}
      />
    </div>
  );
}
