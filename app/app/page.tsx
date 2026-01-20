"use client";

import { useState, useEffect } from "react";
import { Plus, Layout, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export default function WorkspaceSelector() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: "", slug: "" });
  const [creating, setCreating] = useState(false);
  const [takingLong, setTakingLong] = useState(false);

  useEffect(() => {
    fetchWorkspaces();

    const timer = setTimeout(() => {
      if (loading) {
        setTakingLong(true);
      }
    }, 8000); // 8 seconds timeout for "taking long" message

    return () => clearTimeout(timer);
  }, []);

  const fetchWorkspaces = async () => {
    setError(null);
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load workspaces");
      }
    } catch (error) {
      console.error("Failed to fetch workspaces", error);
      setError("Unable to connect to service. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWorkspace),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces([data, ...workspaces]);
        setShowCreate(false);
        setNewWorkspace({ name: "", slug: "" });
        // Redirect to new workspace immediately for better UX
        router.push(`/app/${data.slug}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create workspace");
      }
    } catch (error) {
      console.error("Failed to create workspace", error);
    } finally {
      setCreating(false);
    }
  };

  if (loading || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-6 text-center">
        {loading ? (
          <>
            <div className="relative">
              <Loader2 className="animate-spin text-primary" size={48} />
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black tracking-tight">
                Initializing Environment
              </p>
              <p className="text-mutedForeground font-medium max-w-xs mx-auto">
                {takingLong
                  ? "This is taking longer than usual... We're checking the status of your workspaces."
                  : "Fetching your high-intensity workspaces..."}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-2">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black tracking-tight">System Notice</p>
              <p className="text-mutedForeground font-medium max-w-xs mx-auto">
                {error}
              </p>
            </div>
            <Button
              onClick={fetchWorkspaces}
              variant="secondary"
              className="mt-4 rounded-xl font-bold h-12 px-8 border-border/50 hover:bg-muted"
            >
              Try Again
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 relative flex flex-col items-center py-20 px-4">
      <div className="w-full max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground">
            Welcome Back
          </h1>
          <p className="text-mutedForeground text-xl max-w-2xl mx-auto">
            Select a workspace to start collaborating or create a brand new one
            for your team.
          </p>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/app/${ws.slug}`} className="group block">
              <Card className="p-6 h-full transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 border border-border/50 bg-card overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="text-primary" size={20} />
                </div>

                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 flex items-center justify-center bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Layout
                      size={28}
                      className="text-primary group-hover:text-white transition-colors"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {ws.name}
                    </h3>
                    <p className="text-mutedForeground text-xs font-mono truncate uppercase tracking-widest opacity-70">
                      /{ws.slug}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {/* Create Workspace CTA */}
          <button
            onClick={() => setShowCreate(true)}
            className="group relative p-6 h-full min-h-[140px] flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-mutedForeground/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-muted group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <Plus
                size={24}
                className="text-mutedForeground group-hover:text-white group-hover:rotate-90 transition-all duration-300"
              />
            </div>
            <span className="text-mutedForeground group-hover:text-primary font-bold text-sm tracking-wide transition-colors">
              CREATE WORKSPACE
            </span>
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 border-border/50">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                New Workspace
              </h2>
              <p className="text-mutedForeground text-sm">
                Set up a name and slug for your team.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-mutedForeground/80 ml-1">
                  Workspace Name
                </label>
                <Input
                  required
                  value={newWorkspace.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewWorkspace({
                      name,
                      slug: name
                        .toLowerCase()
                        .replace(/ /g, "-")
                        .replace(/[^\w-]/g, ""),
                    });
                  }}
                  placeholder="e.g. Acme Studio"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-mutedForeground/80 ml-1">
                  Workspace Slug
                </label>
                <Input
                  required
                  value={newWorkspace.slug}
                  onChange={(e) =>
                    setNewWorkspace({ ...newWorkspace, slug: e.target.value })
                  }
                  placeholder="e.g. acme-studio"
                  className="rounded-xl h-11 font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl font-bold min-w-[100px] shadow-lg shadow-primary/20"
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
