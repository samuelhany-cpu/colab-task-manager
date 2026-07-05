"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  Github,
  ArrowLeft,
  Loader2,
  Save,
  ExternalLink,
  CheckCircle2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface ProjectIntegration {
  name: string;
  githubRepo?: string | null;
}

export default function ProjectIntegrationsPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const { slug, projectId } = use(params);
  const [project, setProject] = useState<ProjectIntegration | null>(null);
  const [githubRepo, setGithubRepo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (res.ok) {
        setProject(data);
        setGithubRepo(data.githubRepo || "");
      }
    } catch (error) {
      console.error("Failed to fetch project", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubRepo }),
      });
      if (res.ok) {
        toast({
          title: "Success",
          description: "Integration settings updated.",
        });
        fetchProject();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubRepo: null }),
      });
      if (res.ok) {
        toast({
          title: "Disconnected",
          description:
            "GitHub repository has been disconnected from this project.",
        });
        setGithubRepo("");
        fetchProject();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to disconnect");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href={`/app/${slug}/projects/${projectId}`}>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              Project Integrations
            </h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Manage external connections for <strong>{project?.name}</strong>.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" /> GitHub Sync
            </CardTitle>
            <CardDescription>
              Link this project to a GitHub repository to sync tasks as issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository Name</label>
              <div className="flex gap-2">
                <Input
                  placeholder="owner/repo (e.g. facebook/react)"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                />
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                All tasks created in this project will be pushed to the
                specified repository.
              </p>
            </div>

            {project?.githubRepo && (
              <div className="pt-4 border-t space-y-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                            Connected Repository
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            Tasks will sync to GitHub issues automatically
                          </p>
                        </div>
                        <a
                          href={`https://github.com/${project.githubRepo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-green-950/50 border border-green-300 dark:border-green-700 rounded-md hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors"
                        >
                          <Github className="w-4 h-4" />
                          {project.githubRepo}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <Button
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Unlink className="w-4 h-4 mr-2" />
                          Disconnect
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="opacity-60 grayscale cursor-not-allowed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Atlassian Jira
            </CardTitle>
            <CardDescription>Map this project to a Jira board.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon in Phase 3.1...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
