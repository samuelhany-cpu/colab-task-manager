"use client";

import { useState, useEffect } from "react";
import {
    X,
    Clock,
    Calendar as CalendarIcon,
    MessageSquare,
    Search,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Project {
    id: string;
    name: string;
}

interface Task {
    id: string;
    title: string;
    projectId: string;
}

interface TimeEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceSlug: string;
    onSuccess: () => void;
}

export default function TimeEntryModal({
    isOpen,
    onClose,
    workspaceSlug,
    onSuccess,
}: TimeEntryModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [selectedTaskId, setSelectedTaskId] = useState<string>("");
    const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [startTime, setStartTime] = useState<string>("09:00");
    const [endTime, setEndTime] = useState<string>("10:00");
    const [note, setNote] = useState<string>("");
    const [isBillable, setIsBillable] = useState<boolean>(true);

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setFetching(true);
            setError(null);
            try {
                // 1. Get workspace ID from slug
                const wsRes = await fetch("/api/workspaces");
                if (!wsRes.ok) throw new Error("Failed to fetch workspaces");
                const workspaces = await wsRes.json();
                const workspace = workspaces.find((w: any) => w.slug === workspaceSlug);

                if (!workspace) throw new Error("Workspace not found");

                // 2. Get projects for workspace
                const pRes = await fetch(`/api/projects?workspaceId=${workspace.id}`);
                if (!pRes.ok) throw new Error("Failed to fetch projects");
                const projectsData = await pRes.json();
                setProjects(projectsData);

                if (projectsData.length > 0) {
                    setSelectedProjectId(projectsData[0].id);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Something went wrong");
            } finally {
                setFetching(false);
            }
        };

        fetchData();
    }, [isOpen, workspaceSlug]);

    useEffect(() => {
        if (!selectedProjectId) {
            setTasks([]);
            return;
        }

        const fetchTasks = async () => {
            try {
                const tRes = await fetch(`/api/tasks?projectId=${selectedProjectId}`);
                if (!tRes.ok) throw new Error("Failed to fetch tasks");
                const tasksData = await tRes.json();
                setTasks(tasksData);
                if (tasksData.length > 0) {
                    setSelectedTaskId(tasksData[0].id);
                } else {
                    setSelectedTaskId("");
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchTasks();
    }, [selectedProjectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaskId) return;

        setLoading(true);
        setError(null);

        const start = new Date(`${date}T${startTime}:00`);
        const end = new Date(`${date}T${endTime}:00`);

        if (end <= start) {
            setError("End time must be after start time");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/time", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId: selectedTaskId,
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    note,
                    isBillable,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to add time entry");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to save entry");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-xl shadow-2xl border-border/50 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Manual Time Entry</h2>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Log work for {workspaceSlug}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X size={20} />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {fetching ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <Loader2 className="animate-spin" size={32} />
                            <p className="font-medium">Loading projects and tasks...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Project</label>
                                    <select
                                        value={selectedProjectId}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        required
                                    >
                                        <option value="" disabled>Select a project</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Task</label>
                                    <select
                                        value={selectedTaskId}
                                        onChange={(e) => setSelectedTaskId(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        required
                                        disabled={tasks.length === 0}
                                    >
                                        {tasks.length === 0 ? (
                                            <option value="" disabled>No tasks available</option>
                                        ) : (
                                            <>
                                                <option value="" disabled>Select a task</option>
                                                {tasks.map((t) => (
                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="pl-12 h-11 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Start Time</label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="h-11 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">End Time</label>
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="h-11 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Note (Optional)</label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-4 top-3 text-muted-foreground" size={16} />
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full min-h-[100px] pl-12 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                        placeholder="What did you work on?"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isBillable"
                                    checked={isBillable}
                                    onChange={(e) => setIsBillable(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                                />
                                <label htmlFor="isBillable" className="text-sm font-bold text-foreground cursor-pointer select-none">
                                    Billable
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="flex-1 rounded-xl h-12 font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !selectedTaskId}
                                    className="flex-[2] rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 animate-spin" size={18} />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Time Entry"
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            </Card>
        </div>
    );
}
