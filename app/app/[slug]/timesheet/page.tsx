"use client";

import { useState, useEffect, use } from "react";
import { useUser } from "@/components/providers/user-provider";
import {
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  Download,
  Filter as FilterIcon,
  BarChart3,
  FileText,
  Clock,
  Play,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TimeEntryModal from "@/components/timesheet/time-entry-modal";
import { useCallback } from "react";

interface TimeEntry {
  id: string;
  duration: number;
  note: string | null;
  startTime: string;
  endTime: string;
  user: {
    name: string | null;
    email: string | null;
  };
  task: {
    title: string;
    project: { name: string };
  };
  isBillable?: boolean;
}

interface Project {
  id: string;
  name: string;
}

interface Workspace {
  id: string;
  slug: string;
  name: string;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchEntries = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (selectedProjectId !== "ALL")
        queryParams.append("projectId", selectedProjectId);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);

      const res = await fetch(`/api/time?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (e: unknown) {
      console.error("Timesheet fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, startDate, endDate]);

  const fetchProjects = useCallback(async () => {
    try {
      // First get workspace ID from slug
      const wsRes = await fetch("/api/workspaces");
      if (wsRes.ok) {
        const workspaces: Workspace[] = await wsRes.json();
        const workspace = workspaces.find((w) => w.slug === slug);
        if (workspace) {
          const pRes = await fetch(`/api/projects?workspaceId=${workspace.id}`);
          if (pRes.ok) {
            const projectsData = await pRes.json();
            setProjects(projectsData);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch projects:", e);
    }
  }, [slug]);

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchProjects();
    }
  }, [user, fetchEntries, fetchProjects]);

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

  const getTodayTotal = () => {
    const today = new Date().toDateString();
    const todayEntries = entries.filter(
      (e) => new Date(e.startTime).toDateString() === today,
    );
    return todayEntries.reduce((acc, curr) => acc + curr.duration, 0);
  };

  const handleExportPDF = () => {
    if (entries.length === 0) return;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(`Timesheet Report - ${new Date().toLocaleDateString()}`, 14, 22);

    // Summary
    doc.setFontSize(11);
    doc.text(`Total Time: ${formatDuration(totalTime)}`, 14, 32);

    const tableColumn = [
      "User",
      "Date",
      "Project",
      "Task",
      "Duration",
      "Billable",
      "Note",
    ];
    const tableRows = entries.map((entry) => [
      entry.user?.name || entry.user?.email || "Unknown",
      new Date(entry.startTime).toLocaleDateString(),
      entry.task.project.name,
      entry.task.title,
      formatDuration(entry.duration),
      entry.isBillable ? "Yes" : "No",
      entry.note || "",
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
    });

    doc.save(`timesheet-report-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;

    const headers = [
      "User",
      "Date",
      "Task",
      "Project",
      "Duration (sec)",
      "Duration (formatted)",
      "Note",
    ];
    const rows = entries.map((e) => [
      e.user?.name || e.user?.email || "Unknown",
      new Date(e.startTime).toLocaleDateString(),
      e.task.title,
      e.task.project.name,
      e.duration,
      formatDuration(e.duration),
      e.note || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `timesheet-export-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getWeeklyData = () => {
    const data = [];
    const now = new Date();
    // Start of current week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayString = day.toDateString();
      const dayEntries = entries.filter(
        (e) => new Date(e.startTime).toDateString() === dayString,
      );
      const seconds = dayEntries.reduce((acc, curr) => acc + curr.duration, 0);
      data.push({
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        hours: seconds / 3600,
      });
    }
    return data;
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
        {/* Filters & Actions */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-6 rounded-2xl border border-border/40 shadow-sm">
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-xl">
                <FilterIcon size={14} className="text-mutedForeground" />
                <select
                  className="bg-transparent border-none text-foreground outline-none text-xs font-bold cursor-pointer"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="ALL">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="h-9 text-xs rounded-xl w-36 border-border/50"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-mutedForeground text-xs font-bold">
                  TO
                </span>
                <Input
                  type="date"
                  className="h-9 text-xs rounded-xl w-36 border-border/50"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {(selectedProjectId !== "ALL" || startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold text-mutedForeground hover:text-primary transition-colors"
                  onClick={() => {
                    setSelectedProjectId("ALL");
                    setStartDate("");
                    setEndDate("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Button
                variant="secondary"
                className="flex-1 lg:flex-none rounded-xl font-bold border-border/50 gap-2 h-11 px-6 shadow-sm"
                onClick={handleExportPDF}
                disabled={entries.length === 0}
              >
                <FileText size={18} />
                <span>Export PDF</span>
              </Button>
              <Button
                variant="secondary"
                className="flex-1 lg:flex-none rounded-xl font-bold border-border/50 gap-2 h-11 px-6 shadow-sm"
                onClick={handleExportCSV}
                disabled={entries.length === 0}
              >
                <Download size={18} />
                <span>Export CSV</span>
              </Button>
              <Button
                className="flex-1 lg:flex-none rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 gap-2 h-11 px-6"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={18} />
                <span>Add Entry</span>
              </Button>
            </div>
          </div>

          {/* Simple Chart */}
          <Card className="p-6 rounded-2xl border-border/40 shadow-sm bg-card overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BarChart3 size={16} />
              </div>
              <h3 className="font-black text-sm uppercase tracking-wider">
                Activity this week
              </h3>
            </div>
            <div className="flex items-end justify-between h-32 gap-2 mt-4 px-2">
              {getWeeklyData().map((day, idx) => {
                const height = Math.min(100, (day.hours / 8) * 100); // Scale relative to 8 hours
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2 group"
                  >
                    <div className="relative w-full flex justify-center">
                      <div
                        className="w-full max-w-[40px] bg-primary/10 rounded-t-lg transition-all duration-500 origin-bottom group-hover:bg-primary/30"
                        style={{ height: `${height}%`, minHeight: "4px" }}
                      />
                      <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                        {day.hours.toFixed(1)}h
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-mutedForeground uppercase tracking-tighter">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
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
                      <td className="p-5">{entry.note || "—"}</td>
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
      <TimeEntryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        workspaceSlug={slug}
        onSuccess={fetchEntries}
      />
    </div>
  );
}
