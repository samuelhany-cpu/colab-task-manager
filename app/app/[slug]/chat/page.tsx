"use client";

import { use } from "react";
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

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      <header className="p-6 bg-card border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/app/${slug}`}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-mutedForeground hover:bg-primary hover:text-white transition-all shadow-sm group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground">General Workspace Chat</h1>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[9px] font-black uppercase tracking-widest px-2">
                Public
              </Badge>
            </div>
            <p className="text-xs text-mutedForeground font-medium flex items-center gap-1.5 uppercase tracking-wider">
              <MessageSquare size={12} className="opacity-50" />
              Workspace: <span className="text-foreground font-bold">{slug}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 mr-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                U{i}
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-background bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
              +12
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5 font-bold text-[10px] uppercase border-border/50 bg-background py-1">
            <Shield size={10} className="text-green-500" />
            Encrypted
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        <ChatBox projectId="" />
      </main>
    </div>
  );
}
