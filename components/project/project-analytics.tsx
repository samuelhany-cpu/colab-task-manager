"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
}

interface TaskData {
  id: string;
  status: string;
  dueDate: string | null;
}

export default function ProjectAnalytics({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/tasks?projectId=${projectId}`);
        if (res.ok) {
          const tasks: TaskData[] = await res.json();
          const total = tasks.length;
          const completed = tasks.filter((t) => t.status === "DONE").length;
          const inProgress = tasks.filter(
            (t) => t.status === "IN_PROGRESS",
          ).length;
          const todo = tasks.filter((t) => t.status === "TODO").length;
          const overdue = tasks.filter(
            (t) =>
              t.dueDate &&
              new Date(t.dueDate) < new Date() &&
              t.status !== "DONE",
          ).length;

          setStats({ total, completed, inProgress, todo, overdue });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [projectId]);

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  if (!stats) return null;

  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-widest text-mutedForeground">
          Project Health
        </h2>
        <div className="flex items-center gap-2 text-xs font-bold text-mutedForeground">
          <TrendingUp size={14} className="text-green-500" />
          Auto-calculated from tasks
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-card border-border/50 rounded-2xl shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground mb-1">
            Total Tasks
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black tracking-tight">
              {stats.total}
            </h3>
            <BarChart3 className="text-primary opacity-20" size={24} />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border/50 rounded-2xl shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground mb-1">
            Completed
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black tracking-tight text-green-500">
              {stats.completed}
            </h3>
            <CheckCircle2 className="text-green-500 opacity-20" size={24} />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border/50 rounded-2xl shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground mb-1">
            In Progress
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black tracking-tight text-amber-500">
              {stats.inProgress}
            </h3>
            <Clock className="text-amber-500 opacity-20" size={24} />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border/50 rounded-2xl shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground mb-1">
            Overdue
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black tracking-tight text-destructive">
              {stats.overdue}
            </h3>
            <AlertCircle className="text-destructive opacity-20" size={24} />
          </div>
        </Card>
      </div>

      <Card className="p-8 bg-card border-border/50 rounded-[2.5rem] shadow-soft space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground">
              Completion rate
            </p>
            <h3 className="text-4xl font-black tracking-tight">
              {Math.round(progress)}%
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground">
              Tasks remaining
            </p>
            <h3 className="text-xl font-bold">
              {stats.total - stats.completed}
            </h3>
          </div>
        </div>
        <Progress
          value={progress}
          className="h-4 rounded-full bg-muted shadow-inner"
        />
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase text-mutedForeground">
              TODO
            </p>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400"
                style={{ width: `${(stats.todo / stats.total) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase text-mutedForeground">
              In Progress
            </p>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
