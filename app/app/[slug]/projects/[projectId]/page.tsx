"use client";

import { use, useState, useEffect } from "react";
import KanbanBoard from "@/components/board/kanban-board";
import ProjectMembers from "@/components/project/project-members";
import {
  Users,
  LayoutGrid,
  ArrowLeft,
  Loader2,
  Settings,
  Star,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const { slug, projectId } = use(params);
  const [activeTab, setActiveTab] = useState<"board" | "members">("board");
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects?workspaceSlug=${slug}`);
        if (res.ok) {
          const projects = await res.json();
          const p = projects.find((p: Project) => p.id === projectId);
          setProject(p);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchProject();
  }, [projectId, slug]);

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-medium text-mutedForeground">Opening project...</p>
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-muted/30 overflow-hidden">
      <header className="bg-card border-b border-border/50 px-8 pt-8 shrink-0">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <Link
                href={`/app/${slug}`}
                className="inline-flex items-center gap-2 text-[10px] font-black text-mutedForeground hover:text-primary transition-colors group uppercase tracking-widest"
              >
                <ArrowLeft
                  size={12}
                  className="group-hover:-translate-x-1 transition-transform"
                />
                Back to Workspace
              </Link>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <LayoutGrid size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                      {project?.name || "Project Details"}
                    </h1>
                    <button className="text-mutedForeground/40 hover:text-amber-400 transition-colors">
                      <Star size={20} />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-mutedForeground">
                    Workspace:{" "}
                    <span className="text-foreground font-bold">{slug}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="rounded-xl h-11 w-11 shadow-sm border-border/50"
              >
                <Settings size={20} />
              </Button>
              <Button className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20">
                Share Project
              </Button>
            </div>
          </div>

          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("board")}
              className={`pb-4 px-1 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === "board"
                  ? "text-primary"
                  : "text-mutedForeground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutGrid size={14} />
                Board
              </div>
              {activeTab === "board" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full animate-in fade-in slide-in-from-bottom-1" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`pb-4 px-1 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === "members"
                  ? "text-primary"
                  : "text-mutedForeground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={14} />
                Team Members
              </div>
              {activeTab === "members" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full animate-in fade-in slide-in-from-bottom-1" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === "board" ? (
              <KanbanBoard projectId={projectId} />
            ) : (
              <ProjectMembers projectId={projectId} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
