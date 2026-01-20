"use client";

import { use, useState, useEffect } from "react";
import Sidebar from "@/components/layout/sidebar";
import { UserProvider } from "@/components/providers/user-provider";
import GlobalSearchModal from "@/components/search/global-search-modal";

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <UserProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          workspaceSlug={slug}
          onSearchClick={() => setIsSearchOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30">{children}</main>
      </div>
      <GlobalSearchModal
        workspaceSlug={slug}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </UserProvider>
  );
}
