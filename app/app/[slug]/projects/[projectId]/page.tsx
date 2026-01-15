"use client";

import { use, useState } from "react";
import KanbanBoard from "@/components/board/kanban-board";
import ProjectMembers from "@/components/project/project-members";
import { Users, LayoutGrid } from "lucide-react";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [activeTab, setActiveTab] = useState<"board" | "members">("board");

  return (
    <div className="page-container">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab("board")}
          className={`tab-button ${activeTab === "board" ? "active" : ""}`}
        >
          <LayoutGrid size={16} />
          Board
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`tab-button ${activeTab === "members" ? "active" : ""}`}
        >
          <Users size={16} />
          Members
        </button>
      </div>

      {/* Content */}
      <div className="tab-content">
        {activeTab === "board" ? (
          <KanbanBoard projectId={projectId} />
        ) : (
          <ProjectMembers projectId={projectId} />
        )}
      </div>

      <style jsx>{`
        .page-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          padding: 1.5rem 2rem 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        .tab-button:hover {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .tab-button.active {
          color: #60a5fa;
          border-bottom-color: #60a5fa;
        }
        .tab-button.active::after {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          box-shadow: 0 0 10px rgba(96, 165, 250, 0.5);
        }
        .tab-content {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
      `}</style>
    </div>
  );
}
