"use client";

import { useState, useEffect } from "react";
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
import { signOut, useSession } from "next-auth/react";
import NotificationDropdown from "@/components/notifications/notification-dropdown";

export default function Sidebar({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

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
    <div className={`sidebar-wrapper ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-glass">
        <div className="sidebar-header">
          {!collapsed && (
            <Link href="/app" className="logo-container">
              <div className="logo-icon-wrapper">
                <div className="logo-icon gradient-bg">C</div>
              </div>
              <span className="logo-text gradient-text">Colab</span>
            </Link>
          )}
          <button
            className="collapse-btn glass-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="sidebar-content">
          <div className="nav-section">
            <div className="section-label">
              {!collapsed && <span>Main Menu</span>}
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  <div className="nav-link-content">
                    <item.icon size={20} className="nav-icon" />
                    {!collapsed && (
                      <span className="nav-text">{item.name}</span>
                    )}
                  </div>
                  {isActive && !collapsed && <div className="active-glow" />}
                </Link>
              );
            })}
          </div>

          <div className="nav-divider" />

          <div className="nav-section projects-section">
            <div className="section-label">
              {!collapsed && <span>Projects</span>}
              <Link
                href={`/app/${workspaceSlug}/projects/new`}
                className="add-project-btn glass-btn"
                title="New Project"
              >
                <Plus size={14} />
              </Link>
            </div>
            <div className="project-list">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/${workspaceSlug}/projects/${project.id}`}
                    className={`nav-item ${pathname.includes(project.id) ? "active" : ""}`}
                  >
                    <div className="nav-link-content">
                      <div className="project-dot gradient-bg" />
                      {!collapsed && (
                        <span className="nav-text project-name">
                          {project.name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              ) : !collapsed ? (
                <div className="empty-projects">No projects yet</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          {!collapsed ? (
            <div className="user-card glass">
              <div className="user-info">
                <div className="user-avatar-wrapper">
                  <div className="user-avatar gradient-bg">
                    {session?.user?.name?.[0]}
                  </div>
                  <div className="status-indicator online" />
                </div>
                <div className="user-meta">
                  <p className="user-name">{session?.user?.name || "User"}</p>
                  <p className="user-email">
                    {session?.user?.email?.split("@")[0]}
                  </p>
                </div>
              </div>
              <div className="user-actions">
                <button className="action-btn glass-btn" title="Settings">
                  <Settings size={16} />
                </button>
                <NotificationDropdown />
              </div>
            </div>
          ) : (
            <div className="user-avatar-collapsed">
              <div className="user-avatar gradient-bg">
                {session?.user?.name?.[0]}
              </div>
              <div className="status-indicator online" />
            </div>
          )}

          <div className="footer-actions-container">
            <button
              className="logout-btn nav-item"
              onClick={() => signOut()}
              title="Sign Out"
            >
              <LogOut size={20} />
              {!collapsed && <span>Sign Out</span>}
            </button>
            {!collapsed && (
              <Link
                href="/app"
                className="switch-btn glass-btn"
                title="Switch Workspace"
              >
                <Compass size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .sidebar-wrapper {
          height: 100vh;
          width: 280px;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 1rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .sidebar-wrapper.collapsed {
          width: 100px;
        }

        .sidebar-glass {
          height: 100%;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 2rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .sidebar-header {
          padding: 2rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
        }

        .logo-icon-wrapper {
          padding: 2px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: white;
          font-size: 1.25rem;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .gradient-bg {
          background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%);
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .collapse-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted-foreground);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }

        .collapse-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          transform: scale(1.05);
        }

        .sidebar-content {
          flex: 1;
          padding: 0 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .nav-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .section-label {
          padding: 0 1rem 0.75rem;
          font-size: 0.7rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-item {
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .nav-link-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          z-index: 2;
        }

        .nav-text {
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
          transform: translateX(4px);
        }

        .nav-item.active {
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
        }

        .active-glow {
          position: absolute;
          right: 0;
          height: 60%;
          width: 4px;
          background: #8b5cf6;
          border-radius: 10px 0 0 10px;
          box-shadow: -4px 0 15px rgba(139, 92, 246, 0.5);
        }

        .nav-divider {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.05),
            transparent
          );
          margin: 0 1rem;
        }

        .add-project-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.4);
        }

        .add-project-btn:hover {
          background: #8b5cf6;
          color: white;
        }

        .project-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin: 0 6px;
          transition: all 0.3s;
        }

        .project-name {
          font-weight: 400;
          color: rgba(255, 255, 255, 0.5);
        }

        .active .project-name {
          color: white;
          font-weight: 600;
        }

        .sidebar-footer {
          padding: 1.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: rgba(0, 0, 0, 0.15);
        }

        .user-card {
          padding: 1rem;
          border-radius: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .user-avatar-wrapper {
          position: relative;
        }

        .user-avatar-collapsed {
          display: flex;
          justify-content: center;
          position: relative;
          padding: 0.5rem 0;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.1);
          font-size: 1rem;
        }

        .status-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #0f172a;
        }

        .user-avatar-collapsed .status-indicator {
          bottom: 2px;
          right: 20px;
        }

        .status-indicator.online {
          background: #10b981;
        }

        .user-meta {
          overflow: hidden;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .user-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          flex: 1;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.5);
        }

        .footer-actions-container {
          display: flex;
          gap: 0.5rem;
        }

        .logout-btn {
          flex: 1;
          background: rgba(239, 68, 68, 0.05);
          color: #ef4444 !important;
          justify-content: center !important;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.15) !important;
          transform: scale(1.02);
        }

        .switch-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.6);
        }

        .glass-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }

        .glass-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .collapsed .nav-text,
        .collapsed .logo-text,
        .collapsed .section-label span,
        .collapsed .active-glow {
          display: none;
        }

        .collapsed .sidebar-header {
          flex-direction: column;
          gap: 1.5rem;
          padding: 2rem 0;
        }

        .collapsed .nav-item {
          justify-content: center;
          padding: 0.75rem 0;
        }

        .collapsed .nav-item:hover {
          transform: scale(1.1);
        }

        .collapsed .nav-link-content {
          gap: 0;
        }

        .collapsed .project-dot {
          width: 12px;
          height: 12px;
          margin: 0;
        }

        .collapsed .section-label {
          justify-content: center;
          padding: 0 0 1rem;
        }

        .collapsed .add-project-btn {
          width: 32px;
          height: 32px;
        }

        .collapsed .sidebar-footer {
          padding: 1.5rem 0.5rem;
        }

        .collapsed .footer-actions-container {
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
