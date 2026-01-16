import { useState, useEffect } from "react";
import { type User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  Compass,
  MessageSquare,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NotificationDropdown from "@/components/notifications/notification-dropdown";
import { cn } from "@/lib/cn";

export default function Sidebar({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const wsRes = await fetch("/api/workspaces");
        if (wsRes.ok) {
          const workspaces = await wsRes.json();
          const workspace = workspaces.find(
            (w: { id: string; slug: string }) => w.slug === workspaceSlug,
          );

          if (workspace) {
            const pRes = await fetch(
              `/api/projects?workspaceId=${workspace.id}`,
            );
            const pData = await pRes.json();
            setProjects(pData);
          }
        }
      } catch (e: unknown) {
        console.error(e);
      }
    };

    if (workspaceSlug) fetchProjects();
  }, [workspaceSlug]);

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: `/app/${workspaceSlug}` },
    {
      name: "My Tasks",
      icon: CheckSquare,
      href: `/app/${workspaceSlug}/tasks`,
    },
    { name: "Chat", icon: MessageSquare, href: `/app/${workspaceSlug}/chat` },
    { name: "Timesheet", icon: Clock, href: `/app/${workspaceSlug}/timesheet` },
    { name: "All Files", icon: FileText, href: `/app/${workspaceSlug}/files` },
  ];

  return (
    <div
      className={cn(
        "h-screen sticky top-0 z-50 p-4 transition-all duration-500 ease-out bg-background",
        collapsed ? "w-[100px]" : "w-[280px]",
      )}
    >
      <div className="h-full bg-card border border-border rounded-[2rem] flex flex-col overflow-hidden shadow-soft">
        {/* Header */}
        <div className="p-8 px-6 flex items-center justify-between">
          {!collapsed && (
            <Link href="/app" className="flex items-center gap-3 no-underline">
              <div className="p-0.5 bg-muted rounded-xl">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-white text-xl bg-gradient-to-br from-primary to-blue-600 shadow-soft">
                  C
                </div>
              </div>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent tracking-tight">
                Colab
              </span>
            </Link>
          )}
          <button
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-mutedForeground bg-muted border border-border hover:bg-muted/80 hover:text-foreground hover:scale-105 transition-all"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-3 flex flex-col gap-8 overflow-y-auto">
          {/* Main Navigation */}
          <div className="flex flex-col gap-1">
            <div className="px-4 pb-3 flex items-center justify-between">
              {!collapsed && (
                <span className="text-[0.7rem] font-extrabold text-mutedForeground uppercase tracking-widest">
                  Main Menu
                </span>
              )}
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-3 flex items-center justify-between rounded-xl text-mutedForeground no-underline transition-all duration-300 relative overflow-hidden group",
                    "hover:bg-muted hover:text-foreground hover:translate-x-1",
                    isActive &&
                      "bg-primary/5 text-primary hover:translate-x-1 font-semibold",
                    collapsed && "justify-center px-0 hover:scale-110",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-4 z-10",
                      collapsed && "gap-0",
                    )}
                  >
                    <item.icon size={20} />
                    {!collapsed && (
                      <span className="text-[15px] font-medium">
                        {item.name}
                      </span>
                    )}
                  </div>
                  {isActive && !collapsed && (
                    <div className="absolute right-0 h-3/5 w-1 bg-primary rounded-l-full shadow-soft" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4" />

          {/* Projects */}
          <div className="flex flex-col gap-1">
            <div className="px-4 pb-3 flex items-center justify-between">
              {!collapsed && (
                <span className="text-[0.7rem] font-extrabold text-mutedForeground uppercase tracking-widest">
                  Projects
                </span>
              )}
              <Link
                href={`/app/${workspaceSlug}/projects/new`}
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center text-mutedForeground bg-muted border border-border hover:bg-primary hover:text-primary-foreground transition-all",
                  collapsed && "w-8 h-8",
                )}
                title="New Project"
              >
                <Plus size={14} />
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              {projects.length > 0 ? (
                projects.map((project) => {
                  const isActive = pathname.includes(project.id);
                  return (
                    <Link
                      key={project.id}
                      href={`/app/${workspaceSlug}/projects/${project.id}`}
                      className={cn(
                        "px-4 py-3 flex items-center rounded-xl text-mutedForeground no-underline transition-all duration-300 relative overflow-hidden",
                        "hover:bg-muted hover:text-foreground hover:translate-x-1",
                        isActive && "bg-primary/5 text-primary font-semibold",
                        collapsed && "justify-center px-0 hover:scale-110",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-4",
                          collapsed && "gap-0",
                        )}
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full bg-gradient-to-br from-primary to-blue-600 transition-all",
                            collapsed && "w-3 h-3",
                          )}
                        />
                        {!collapsed && (
                          <span
                            className={cn(
                              "text-sm",
                              isActive
                                ? "text-foreground font-semibold"
                                : "text-mutedForeground font-normal",
                            )}
                          >
                            {project.name}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              ) : !collapsed ? (
                <div className="px-4 py-2 text-xs text-mutedForeground">
                  No projects yet
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-6 flex flex-col gap-6 bg-muted/30">
          {!collapsed ? (
            <div className="p-4 rounded-[1.25rem] bg-card border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white border-2 border-border bg-gradient-to-br from-primary to-blue-600">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card bg-green-500" />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    {user?.user_metadata?.full_name ||
                      user?.email?.split("@")[0] ||
                      "User"}
                  </p>
                  <p className="text-xs text-mutedForeground">
                    {user?.email?.split("@")[0]}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 h-8 rounded-lg flex items-center justify-center text-mutedForeground bg-muted border border-border hover:bg-muted/80 hover:text-foreground transition-all"
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
                <NotificationDropdown />
              </div>
            </div>
          ) : (
            <div className="flex justify-center relative pb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br from-primary to-blue-600 shadow-soft">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="absolute bottom-2 right-5 w-3 h-3 rounded-full border-2 border-card bg-green-500" />
            </div>
          )}

          <div className={cn("flex gap-2", collapsed && "flex-col")}>
            <button
              className={cn(
                "flex-1 h-11 rounded-xl flex items-center justify-center gap-2 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:scale-105 transition-all font-medium",
                collapsed && "flex-col gap-0",
              )}
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              title="Sign Out"
            >
              <LogOut size={20} />
              {!collapsed && <span>Sign Out</span>}
            </button>
            {!collapsed && (
              <Link
                href="/app"
                className="w-11 h-11 rounded-xl flex items-center justify-center text-mutedForeground bg-muted border border-border hover:bg-muted/80 hover:text-foreground transition-all"
                title="Switch Workspace"
              >
                <Compass size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
