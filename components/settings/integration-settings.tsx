"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Link as LinkIcon, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Integration {
  type: "GITHUB" | "JIRA";
  connected: boolean;
  externalId?: string;
}

export function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/user/profile"); // We'll update profile to include integration status
      const data = await res.json();
      if (res.ok) {
        const github = data.integrations?.find(
          (i: { type: string; externalId?: string }) => i.type === "GITHUB",
        );
        setIntegrations([
          {
            type: "GITHUB",
            connected: !!github,
            externalId: github?.externalId,
          },
          { type: "JIRA", connected: false }, // Jira coming soon
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch integrations", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (type: string) => {
    if (type === "GITHUB") {
      window.location.href = "/api/integrations/github?action=connect";
    } else {
      toast({
        title: "Coming Soon",
        description: "Jira integration is currently being developed.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* GitHub Integration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" /> GitHub
            </CardTitle>
            <CardDescription>
              Sync your tasks with GitHub issues and pull requests.
            </CardDescription>
          </div>
          {integrations.find((i) => i.type === "GITHUB")?.connected ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Connected
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConnect("GITHUB")}
            >
              Connect
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {integrations.find((i) => i.type === "GITHUB")?.connected ? (
              <p>
                Connected as GitHub user ID:{" "}
                {integrations.find((i) => i.type === "GITHUB")?.externalId}
              </p>
            ) : (
              <p>
                Authorize Colab to access your repositories and sync activities.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jira Integration */}
      <Card className="opacity-60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" /> Atlassian Jira
            </CardTitle>
            <CardDescription>
              Connect to Jira Software to manage enterprise workflows.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConnect("JIRA")}
          >
            In Development
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>
              Seamlessly bridge the gap between Colab tasks and Jira projects.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
