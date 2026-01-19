"use client";

import { useState } from "react";
import ChatPane, { Message } from "./chat-pane";
import { cn } from "@/lib/cn";

export default function ChatBox({
  workspaceId,
  projectId,
  receiverId,
}: {
  workspaceId?: string;
  projectId?: string;
  receiverId?: string;
}) {
  const [activeThread, setActiveThread] = useState<Message | null>(null);

  return (
    <div className="flex h-full overflow-hidden">
      <ChatPane
        workspaceId={workspaceId}
        projectId={projectId}
        receiverId={receiverId}
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
