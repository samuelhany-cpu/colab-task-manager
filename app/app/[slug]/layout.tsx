"use client";

import { use } from "react";
import Sidebar from "@/components/layout/sidebar";
import { UserProvider } from "@/components/providers/user-provider";

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <UserProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar workspaceSlug={slug} />
        <main className="flex-1 overflow-y-auto bg-muted/30">{children}</main>
      </div>
    </UserProvider>
  );
}
