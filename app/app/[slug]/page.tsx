"use client";

import { useState, useEffect, use } from "react";
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Activity as ActivityIcon,
  Zap,
  ChevronRight,
  Calendar,
  LucideIcon,
  Loader2,
  ArrowRight,
  AlertCircle,
  Timer as TimerIcon,
  StopCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

interface Stats {
  projects: number;
  tasks: number;
  members: number;
  hours: number;
}

interface MiniTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  project: string;
  time: string;
  color: string;
}

interface ActiveTimer {
  id: string;
  taskId: string;
  startTime: string;
  duration: number; // current duration in seconds
  task: { title: string };
}

interface DashboardData {
  stats: Stats;
  todaysTasks: MiniTask[];
  overdueTasks: MiniTask[];
  upcomingTasks: MiniTask[];
  activeTimer: ActiveTimer | null;
  taskStatusStats: { TODO: number; IN_PROGRESS: number; DONE: number };
  recentActivity: ActivityItem[];
}

export default function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timerDisplay, setTimerDisplay] = useState("00:00:00");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch(`/api/workspaces/${slug}/dashboard`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (e: unknown) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchDashboardData();
  }, [slug]);

  // Timer tick effect
  useEffect(() => {
    if (!data?.activeTimer) return;

    const interval = setInterval(() => {
      setData((prev) => {
        if (!prev?.activeTimer) return prev;
        return {
          ...prev,
          activeTimer: {
            ...prev.activeTimer,
            duration: prev.activeTimer.duration + 1,
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.activeTimer]);

  useEffect(() => {
    if (data?.activeTimer) {
      const d = data.activeTimer.duration;
      const h = Math.floor(d / 3600);
      const m = Math.floor((d % 3600) / 60);
      const s = d % 60;
      setTimerDisplay(
        `${h.toString().padStart(2, "0")}:${m
          .toString()
          .padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    }
  }, [data?.activeTimer, data?.activeTimer?.duration]);

  const handleStopTimer = async () => {
    if (!data?.activeTimer) return;
    try {
      const res = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: data.activeTimer.taskId,
          action: "stop",
        }),
      });
      if (res.ok) {
        setData((prev) => (prev ? { ...prev, activeTimer: null } : null));
      }
    } catch (err) {
      console.error("Failed to stop timer:", err);
    }
  };

  const statCards = data
    ? [
        {
          label: "Active Projects",
          value: data.stats.projects,
          icon: Briefcase,
          color: "#8b5cf6",
          trend: "Total current",
          href: `/app/${slug}/projects`,
        },
        {
          label: "Open Tasks",
          value: data.stats.tasks,
          icon: CheckCircle2,
          color: "#10b981",
          trend: "Across projects",
          href: `/app/${slug}/tasks`,
        },
        {
          label: "Team Members",
          value: data.stats.members,
          icon: Users,
          color: "#3b82f6",
          trend: "In workspace",
          href: `/app/${slug}/settings/members`,
        },
        {
          label: "Hours Tracked",
          value: data.stats.hours,
          icon: Clock,
          color: "#f59e0b",
          trend: "Last 30 days",
          href: `/app/${slug}/timesheet`,
        },
      ]
    : [];

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-muted/30 text-mutedForeground text-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="font-bold text-lg text-foreground">
            Syncing your workspace...
          </p>
          <p className="text-sm opacity-70">
            Fetching real-time data from database
          </p>
        </div>
      </div>
    );

  if (!data) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="secondary"
              className="bg-primary/5 text-primary border-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            >
              {slug}
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Workspace Overview
          </h1>
          <p className="text-mutedForeground text-lg">
            Welcome back! You have{" "}
            <span className="text-foreground font-bold">
              {data.stats.tasks} tasks
            </span>{" "}
            currently in progress.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button
            asChild
            variant="secondary"
            className="flex-1 md:flex-none gap-2 px-6 h-12 rounded-xl shadow-sm border-border/50 hover:bg-muted font-bold"
          >
            <Link href={`/app/${slug}/timesheet`}>
              <Calendar size={18} />
              <span>Weekly Report</span>
            </Link>
          </Button>
          <Button
            asChild
            className="flex-1 md:flex-none gap-2 px-6 h-12 rounded-xl shadow-lg shadow-primary/20 font-bold"
          >
            <Link href={`/app/${slug}/projects/new`}>
              <Zap size={18} />
              <span>Quick Start</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Timer Section IF Active */}
      {data.activeTimer && (
        <Card className="p-6 bg-primary/5 border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-glow-primary">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center animate-pulse shadow-soft">
              <TimerIcon size={32} className="text-white" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">
                Active Timer
              </p>
              <h3 className="text-xl font-black text-foreground">
                {data.activeTimer.task.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-5xl font-mono font-black tracking-tighter text-primary slashed-zero">
              {timerDisplay}
            </div>
            <Button
              onClick={handleStopTimer}
              variant="destructive"
              className="h-14 px-8 rounded-2xl font-black shadow-lg shadow-red-500/20 gap-2 text-base transition-all active:scale-95"
            >
              <StopCircle size={20} />
              Stop Timer
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block group">
            <Card className="p-7 h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group-hover:border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-4">
                <ArrowRight className="text-primary" size={16} />
              </div>

              <div className="flex justify-between items-start mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
                  style={{
                    background: `${stat.color}10`,
                    color: stat.color,
                  }}
                >
                  <stat.icon size={28} />
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase tracking-widest opacity-60 bg-muted/30 border-transparent group-hover:bg-primary/5 group-hover:text-primary transition-colors"
                >
                  {stat.trend}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="text-4xl font-black tracking-tight group-hover:text-primary transition-colors">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-mutedForeground uppercase tracking-[0.15em] opacity-70 group-hover:opacity-100 transition-opacity">
                  {stat.label}
                </div>
              </div>

              <div className="mt-8 h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out delay-300"
                  style={{
                    background: stat.color,
                    width:
                      data.stats.tasks > 0
                        ? `${Math.min((stat.value / (data.stats.tasks || 1)) * 100, 100)}%`
                        : "5%",
                  }}
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Task Summary at a Glance */}
        <div className="lg:col-span-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DashboardTaskWidget
              title="Today's Focus"
              tasks={data.todaysTasks}
              icon={Zap}
              color="text-amber-500"
            />
            <DashboardTaskWidget
              title="Overdue"
              tasks={data.overdueTasks}
              icon={AlertCircle}
              color="text-red-500"
              showDate
            />
            <DashboardTaskWidget
              title="Upcoming Deadline"
              tasks={data.upcomingTasks}
              icon={Calendar}
              color="text-blue-500"
              showDate
            />
          </div>
        </div>

        {/* Activity Section */}
        <div className="lg:col-span-8">
          <Card className="flex flex-col h-full overflow-hidden border-border/40 shadow-sm">
            <div className="p-8 pb-6 flex justify-between items-center bg-muted/5 border-b border-border/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl">
                  <ActivityIcon size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Recent Activity</h3>
                  <p className="text-xs text-mutedForeground font-medium">
                    Live updates from your team
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-primary font-bold hover:bg-primary/10 px-4 rounded-lg transition-all"
              >
                <Link href={`/app/${slug}/activity`}>View All</Link>
              </Button>
            </div>

            <div className="p-8 space-y-10 relative bg-card">
              {data.recentActivity.length > 0 ? (
                data.recentActivity.map((item, i) => (
                  <div key={item.id} className="flex gap-6 relative group">
                    {i !== data.recentActivity.length - 1 && (
                      <div className="absolute left-[7px] top-6 h-[calc(100%+40px)] w-[2px] bg-muted/40" />
                    )}
                    <div className="relative z-10 mt-1">
                      <div
                        className="w-4 h-4 rounded-full border-4 border-background shadow-md transition-all duration-300 group-hover:scale-125 group-hover:shadow-primary/20"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-[15px] leading-relaxed text-mutedForeground group-hover:text-foreground transition-colors">
                        <span className="font-bold text-foreground">
                          {item.user}
                        </span>{" "}
                        {item.action}
                        <span className="text-foreground font-semibold italic mx-1.5">
                          &quot;{item.target}&quot;
                        </span>
                        in
                        <Badge
                          variant="outline"
                          className="ml-2 font-bold text-[9px] uppercase tracking-tighter px-2 py-0 transition-all border-current/20 group-hover:border-current"
                          style={{
                            color: item.color,
                            backgroundColor: `${item.color}05`,
                          }}
                        >
                          {item.project}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-bold text-mutedForeground/40 uppercase tracking-widest flex items-center gap-1.5 group-hover:text-mutedForeground transition-colors">
                        <Clock size={10} />
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <ActivityIcon size={32} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground">
                      No activity yet
                    </h4>
                    <p className="text-sm">
                      Start working in projects to see updates here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Status Distribution */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="p-8 border-border/40 shadow-sm bg-card">
            <div className="mb-8">
              <h3 className="text-xl font-bold">Task Status Distribution</h3>
              <p className="text-xs text-mutedForeground mt-1 font-medium">
                Overall workspace health
              </p>
            </div>

            <div className="space-y-6">
              <StatusProgressBar
                label="To Do"
                value={data.taskStatusStats.TODO}
                total={data.stats.tasks}
                color="bg-slate-400"
              />
              <StatusProgressBar
                label="In Progress"
                value={data.taskStatusStats.IN_PROGRESS}
                total={data.stats.tasks}
                color="bg-primary"
              />
              <StatusProgressBar
                label="Done"
                value={data.taskStatusStats.DONE}
                total={data.stats.tasks}
                color="bg-emerald-500"
              />
            </div>
          </Card>

          <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#6366f1] text-primary-foreground shadow-2xl shadow-blue-500/30 relative overflow-hidden group border border-white/10">
            {/* Decorative background circle */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl transition-all duration-1000 group-hover:scale-150 group-hover:bg-white/20" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-sky-400/20 rounded-full blur-2xl transition-all duration-1000 group-hover:scale-125" />

            <div className="relative z-10 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-inner">
                <Zap size={28} className="fill-white" />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-black tracking-tight">
                  Go Premium
                </h4>
                <p className="text-sm font-medium opacity-80 leading-relaxed">
                  Unlock unlimited projects, team-wide analytics, and priority
                  24/7 support.
                </p>
              </div>

              <Button
                asChild
                className="w-full bg-white text-blue-600 hover:bg-slate-50 font-black border-none shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all h-14 rounded-2xl text-base"
              >
                <Link href={`/app/${slug}/billing`}>Upgrade Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardTaskWidget({
  title,
  tasks,
  icon: Icon,
  color,
  showDate = false,
}: {
  title: string;
  tasks: MiniTask[];
  icon: LucideIcon;
  color: string;
  showDate?: boolean;
}) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg border-border/40 group">
      <div className="p-5 border-b border-border/30 bg-muted/5 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-current/10 shrink-0", color)}>
          <Icon size={18} />
        </div>
        <h4 className="font-bold text-sm tracking-tight">{title}</h4>
        <Badge
          variant="secondary"
          className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full bg-muted/50"
        >
          {tasks.length}
        </Badge>
      </div>
      <div className="p-2 space-y-1">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between group/item"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover/item:text-primary transition-colors">
                  {task.title}
                </p>
                {showDate && task.dueDate && (
                  <p className="text-[10px] font-bold text-mutedForeground uppercase flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] font-black uppercase px-1.5 py-0 border-current/20",
                  task.priority === "URGENT"
                    ? "text-red-500 bg-red-500/5"
                    : task.priority === "HIGH"
                      ? "text-amber-500 bg-amber-500/5"
                      : "text-blue-500 bg-blue-500/5",
                )}
              >
                {task.priority}
              </Badge>
            </div>
          ))
        ) : (
          <div className="py-8 text-center px-4">
            <p className="text-xs font-medium text-mutedForeground/60">
              No tasks found
            </p>
          </div>
        )}
      </div>
      {tasks.length > 0 && (
        <div className="p-3 border-t border-border/30 bg-muted/5 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[10px] font-bold h-7 gap-1 hover:text-primary"
          >
            View All <ChevronRight size={10} />
          </Button>
        </div>
      )}
    </Card>
  );
}

function StatusProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-foreground uppercase tracking-widest opacity-80">
          {label}
        </span>
        <span className="text-xs font-black text-mutedForeground">
          <span className="text-foreground">{value}</span>
          <span className="mx-1 opacity-30">/</span>
          {total}
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            color,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
