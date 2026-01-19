"use client";

import { useState } from "react";
import ChatPane, { Message } from "./chat-pane";
import { cn } from "@/lib/cn";

interface ChatBoxProps {
  workspaceId?: string;
  projectId?: string;
  receiverId?: string;
  conversationId?: string;
}

export default function ChatBox({
  workspaceId,
  projectId,
  receiverId,
  conversationId,
}: ChatBoxProps) {
  const [activeThread, setActiveThread] = useState<Message | null>(null);

  return (
    <div className="flex h-full overflow-hidden">
      <ChatPane
        workspaceId={workspaceId}
        projectId={projectId}
        receiverId={receiverId}
        conversationId={conversationId}
        parentId={activeThread ? activeThread.id : undefined}
        className={cn("flex-1", activeThread ? "border-r border-border" : "")}
        onThreadSelect={setActiveThread}
      />

      {activeThread && (
        <ChatPane
          parentId={activeThread.id}
          className="w-[400px] border-l border-border bg-muted/30"
          isThreadView
          onClose={() => setActiveThread(null)}
          // Pass context if needed for permissions/channel subscription rules
          workspaceId={workspaceId}
          projectId={projectId}
        />
      )}
    </div>
  );
}
