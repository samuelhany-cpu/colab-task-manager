"use client";

import { use, useEffect, useState } from "react";
import ChatBox from "@/components/chat/chat-box";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function WorkspaceChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const res = await fetch(`/api/workspaces?slug=${slug}`);
        if (res.ok) {
          const workspaces = await res.json();
          if (workspaces && workspaces.length > 0) {
            setWorkspaceId(workspaces[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch workspace:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkspace();
  }, [slug]);

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      <header className="p-6 bg-card border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/app/${slug}`}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-mutedForeground hover:bg-primary hover:text-white transition-all shadow-sm group"
          >
            <ArrowLeft
              size={20}
              className="group-hover:-translate-x-1 transition-transform"
            />
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground">
                General Workspace Chat
              </h1>
              <Badge
                variant="secondary"
                className="bg-primary/5 text-primary border-none text-[9px] font-black uppercase tracking-widest px-2"
              >
                Public
              </Badge>
            </div>
            <p className="text-xs text-mutedForeground font-medium flex items-center gap-1.5 uppercase tracking-wider">
              <MessageSquare size={12} className="opacity-50" />
              Workspace:{" "}
              <span className="text-foreground font-bold">{slug}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 mr-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold"
              >
                U{i}
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-background bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
              +12
            </div>
          </div>
          <Badge
            variant="outline"
            className="gap-1.5 font-bold text-[10px] uppercase border-border/50 bg-background py-1"
          >
            <Shield size={10} className="text-green-500" />
            Encrypted
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : workspaceId ? (
          <ChatBox workspaceId={workspaceId} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Workspace Not Found
              </h2>
              <p className="text-sm text-muted-foreground">
                Unable to load workspace chat. Please try again.
              </p>
              <Link
                href={`/app/${slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
