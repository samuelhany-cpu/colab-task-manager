"use client";

import { use } from "react";
import Sidebar from "@/components/layout/sidebar";

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <div className="layout-container">
      <Sidebar workspaceSlug={slug} />
      <main className="main-content">{children}</main>

      <style jsx>{`
        .layout-container {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }
        .main-content {
          flex: 1;
          overflow-y: auto;
          background: #0f172a;
        }
      `}</style>
    </div>
  );
}
