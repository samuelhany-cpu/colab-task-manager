"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  CheckSquare,
  AlertCircle,
  Calendar as CalendarIcon,
  Search,
  ArrowLeft,
  Loader2,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { getSocket } from "@/lib/socket-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return "bg-green-500/10 text-green-600 border-green-200";
      case "in_progress":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "text-red-600";
      case "high":
        return "text-amber-600";
      case "medium":
        return "text-blue-600";
      default:
        return "text-slate-500";
    }
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-medium text-mutedForeground">
          Loading your tasks...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
      <header className="max-w-6xl mx-auto space-y-4">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              My Tasks
            </h1>
            <p className="text-mutedForeground text-lg font-medium">
              You have {tasks.length} tasks assigned to you in{" "}
              <span className="text-foreground font-bold">{slug}</span>.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedForeground"
                size={18}
              />
              <Input
                placeholder="Search tasks or projects..."
                className="pl-10 h-11 rounded-xl bg-card border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              className="rounded-xl font-bold h-11 gap-2"
            >
              <Filter size={18} />
              <span>Filters</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <Card className="rounded-2xl border-border/40 shadow-sm bg-card overflow-hidden">
          {filteredTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest">
                      Task Detail
                    </th>
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest">
                      Project
                    </th>
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest text-center">
                      Status
                    </th>
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest text-center">
                      Priority
                    </th>
                    <th className="p-5 text-[10px] font-black text-mutedForeground uppercase tracking-widest text-right">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="group hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                            <CheckSquare size={20} />
                          </div>
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <Badge
                          variant="secondary"
                          className="bg-muted text-[10px] font-bold uppercase tracking-wider px-3 py-1"
                        >
                          {task.project.name}
                        </Badge>
                      </td>
                      <td className="p-5 text-center">
                        <Badge
                          variant="outline"
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${getStatusColor(task.status)}`}
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-5 text-center">
                        <span
                          className={`text-xs font-black uppercase tracking-widest ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-5 text-right text-sm font-bold text-mutedForeground/60">
                        <div className="flex items-center justify-end gap-2">
                          <CalendarIcon size={14} />
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString()
                            : "No date"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-mutedForeground">
                <AlertCircle size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground">
                  No tasks found
                </h3>
                <p className="text-mutedForeground max-w-sm mx-auto">
                  {search
                    ? `No tasks match your search for "${search}".`
                    : "You don't have any tasks assigned in this workspace yet."}
                </p>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
