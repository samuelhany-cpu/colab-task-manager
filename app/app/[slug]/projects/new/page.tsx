"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      // First get workspace ID
      const wsRes = await fetch("/api/workspaces");
      const workspaces = await wsRes.json();
      const workspace = workspaces.find(
        (w: { id: string; slug: string }) => w.slug === slug,
      );

      if (!workspace) throw new Error("Workspace not found");

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, workspaceId: workspace.id }),
      });

      if (!res.ok) throw new Error("Failed to create project");

      const project = await res.json();
      router.push(`/app/${slug}/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-8 md:p-12 lg:p-16 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Back Link */}
        <Link
          href={`/app/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-mutedForeground hover:text-primary transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          BACK TO DASHBOARD
        </Link>

        {/* Header */}
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Create New Project
          </h1>
          <p className="text-mutedForeground text-lg">
            Start a new collaboration in the <span className="text-foreground font-bold">{slug}</span> workspace.
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-8 md:p-10 shadow-xl shadow-border/20 border-border/50 bg-card overflow-hidden relative">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-bold animate-in shake duration-500">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-mutedForeground/80 ml-1">
                Project Name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Website Overhaul"
                className="h-12 rounded-xl text-lg font-medium border-border/60 focus:border-primary/50 transition-all bg-muted/20 focus:bg-background"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-mutedForeground/80 ml-1">
                Description (Optional)
              </label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="What is this project about? Describe the goals and scope..."
                className="rounded-xl border-border/60 focus:border-primary/50 transition-all bg-muted/20 focus:bg-background resize-none py-4"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                className="rounded-xl h-12 px-8 font-bold text-mutedForeground hover:text-foreground border-transparent hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl h-12 px-10 font-black shadow-lg shadow-primary/25 gap-2"
              >
                {loading ? "Creating Project..." : "Create Project"}
                {!loading && <ChevronRight size={18} />}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
