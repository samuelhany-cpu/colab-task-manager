"use client";

import { use } from "react";
import ChatBox from "@/components/chat/chat-box";

export default function WorkspaceChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  // For workspace-level chat, we'd need a general channel or DM list.
  // For now, let's just render the ChatBox component.
  return (
    <div className="chat-page-container">
      <div className="chat-header glass">
        <h1 className="gradient-text">General Chat</h1>
        <p>Workspace: {slug}</p>
      </div>
      <div className="chat-main">
        <ChatBox projectId="" />
      </div>

      <style jsx>{`
        .chat-page-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0f172a;
        }
        .chat-header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--border);
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 700;
        }
        p {
          font-size: 0.875rem;
          color: var(--muted-foreground);
        }
        .chat-main {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
