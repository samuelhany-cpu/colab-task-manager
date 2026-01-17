"use client";

import { useState, useEffect, use } from "react";
import { useUser } from "@/components/providers/user-provider";
import {
  Clock,
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Play,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const { slug } = use(params);
  const { user } = useUser();

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
          setEntries(data.entries || []);
        }
      } catch (e: unknown) {
        console.error("Timesheet fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchEntries();
  }, [user]);

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
    }
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

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-medium text-mutedForeground">
          Loading your timesheet...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 max-w-7xl mx-auto">
        <div className="space-y-4">
          <Link
            href={`/app/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-black text-mutedForeground hover:text-primary transition-colors group"
          >
            <ArrowLeft
              size={14}
              className="group-hover:-translate-x-1 transition-transform"
            />
            BACK TO DASHBOARD
          </Link>
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Timesheet
            </h1>
            <p className="text-mutedForeground text-lg">
              Track your productivity and billable hours.
            </p>
          </div>
        </div>

        <Card className="flex items-center p-2 rounded-2xl bg-card shadow-sm border-border/40">
          <div className="px-6 py-3 border-r border-border/50">
            <span className="block text-[10px] font-bold text-mutedForeground uppercase tracking-widest mb-1">
              Total Week
            </span>
            <span className="text-2xl font-black text-primary leading-none">
              {formatDuration(totalTime)}
            </span>
          </div>
          <div className="px-6 py-3">
            <span className="block text-[10px] font-bold text-mutedForeground uppercase tracking-widest mb-1">
              Today
            </span>
            <span className="text-2xl font-black text-foreground leading-none">
              {formatDuration(getTodayTotal())}
            </span>
          </div>
        </Card>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-2xl border border-border/40 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted"
              onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="flex items-center gap-2.5 px-4 font-bold text-foreground">
              <CalendarIcon size={18} className="text-primary" />
              <span className="whitespace-nowrap">{getWeekDateRange()}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted"
              onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
            >
              <ChevronRight size={20} />
            </Button>
          </div>
          <Button
            className="w-full sm:w-auto rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 gap-2 px-6 h-11"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            <span>Add Entry</span>
          </Button>
        </div>

        {/* List */}
        <Card className="rounded-2xl overflow-hidden border-border/40 shadow-sm bg-card">
          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest">
                      Task / Project
                    </th>
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest">
                      Note
                    </th>
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest">
                      Date
                    </th>
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest">
                      Duration
                    </th>
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="group hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-5">
                        <div className="space-y-1">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {entry.task.title}
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-primary/5 text-primary border-none text-[9px] font-bold uppercase tracking-wider px-2"
                          >
                            {entry.task.project.name}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="text-sm text-mutedForeground font-medium italic">
                          {entry.note || "—"}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className="text-sm font-bold text-foreground opacity-70">
                          {new Date(entry.startTime).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-lg font-mono font-bold text-sm">
                          <Clock size={12} className="text-mutedForeground" />
                          {formatDuration(entry.duration)}
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 text-mutedForeground hover:text-primary hover:bg-primary/5 rounded-lg"
                          >
                            <Play size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 text-mutedForeground hover:text-destructive hover:bg-destructive/5 rounded-lg"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Clock size={40} className="text-mutedForeground" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">
                  No time entries yet
                </h3>
                <p className="text-sm max-w-xs mx-auto">
                  Start a timer on a task to begin tracking your productivity.
                </p>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
          onClick={() => setShowAddModal(false)}
        >
          <Card
            className="w-full max-w-md p-8 shadow-2xl space-y-6 border-border/50 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">
                Add Time Entry
              </h2>
              <p className="text-mutedForeground text-sm leading-relaxed">
                Direct entry creation is coming soon. For now, please use the{" "}
                <strong>Timer</strong> on individual tasks to track your
                specific work.
              </p>
            </div>
            <div className="pt-4">
              <Button
                className="w-full rounded-xl h-12 font-bold"
                onClick={() => setShowAddModal(false)}
              >
                Got it
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
