"use client";

import { useState, useEffect, use } from "react";
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Activity as ActivityIcon,
  Zap,
  ChevronRight,
  Calendar,
  LucideIcon,
} from "lucide-react";

interface Stats {
  projects: number;
  tasks: number;
  members: number;
  hours: number;
}

interface ActionItem {
  label: string;
  icon: LucideIcon;
}

export default function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [stats, setStats] = useState<Stats>({
    projects: 0,
    tasks: 0,
    members: 0,
    hours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const wsRes = await fetch("/api/workspaces");
        const workspaces = await wsRes.json();
        const ws = workspaces.find(
          (w: { slug: string; projects?: unknown[]; members?: unknown[] }) =>
            w.slug === slug,
        );

        if (ws) {
          setStats({
            projects: ws.projects?.length || 0,
            tasks: 12, // Mock for now
            members: ws.members?.length || 1,
            hours: 45.5, // Mock for now
          });
        }
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchDashboardData();
  }, [slug]);

  const statCards = [
    {
      label: "Active Projects",
      value: stats.projects,
      icon: Briefcase,
      color: "#8b5cf6",
      trend: "+2 this month",
    },
    {
      label: "Open Tasks",
      value: stats.tasks,
      icon: CheckCircle2,
      color: "#10b981",
      trend: "5 urgent",
    },
    {
      label: "Team Members",
      value: stats.members,
      icon: Users,
      color: "#3b82f6",
      trend: "3 active now",
    },
    {
      label: "Hours Tracked",
      value: stats.hours,
      icon: Clock,
      color: "#f59e0b",
      trend: "12.5 hrs today",
    },
  ];

  if (loading)
    return (
      <div className="loading-state">
        <div className="spinner gradient-bg" />
        <p>Loading your workspace...</p>
        <style jsx>{`
          .loading-state {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0% {
              transform: scale(0.8);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.1);
              opacity: 1;
            }
            100% {
              transform: scale(0.8);
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    );

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-info">
          <h1 className="gradient-text">Workspace Overview</h1>
          <p>
            Welcome back! You have <span className="highlight">5 tasks</span>{" "}
            due today.
          </p>
        </div>
        <div className="header-actions">
          <button className="glass-btn glass">
            <Calendar size={18} />
            <span>Weekly Report</span>
          </button>
          <button className="primary-btn">
            <Zap size={18} />
            <span>Quick Start</span>
          </button>
        </div>
      </header>

      <div className="stats-grid">
        {statCards.map((stat, idx) => (
          <div
            key={stat.label}
            className="stat-card glass glass-hover"
            style={{ "--delay": `${idx * 0.1}s` } as React.CSSProperties}
          >
            <div className="stat-header">
              <div
                className="stat-icon"
                style={{ background: `${stat.color}15`, color: stat.color }}
              >
                <stat.icon size={22} />
              </div>
              <span className="stat-trend">{stat.trend}</span>
            </div>
            <div className="stat-body">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
            <div className="stat-progress-bg">
              <div
                className="stat-progress-bar"
                style={{ background: stat.color, width: "40%" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-layout">
        <div className="main-col">
          <section className="activity-section glass">
            <div className="section-header">
              <div className="header-title">
                <ActivityIcon size={20} className="header-icon" />
                <h3>Recent Activity</h3>
              </div>
              <button className="text-btn">View All</button>
            </div>
            <div className="activity-list">
              {[
                {
                  user: "You",
                  action: "created task",
                  target: "Setup R2 Bucket",
                  project: "Dev Ops",
                  time: "2h ago",
                  color: "#8b5cf6",
                },
                {
                  user: "Sarah",
                  action: "commented on",
                  target: "Fix Auth Bug",
                  project: "Project Alpha",
                  time: "4h ago",
                  color: "#10b981",
                },
                {
                  user: "John",
                  action: "completed",
                  target: "Update Logo",
                  project: "Branding",
                  time: "Yesterday",
                  color: "#3b82f6",
                },
                {
                  user: "System",
                  action: "automated report",
                  target: "Weekly Summary",
                  project: "General",
                  time: "1 day ago",
                  color: "#94a3b8",
                },
              ].map((item, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-line" />
                  <div
                    className="user-dot"
                    style={{ background: item.color }}
                  />
                  <div className="activity-content">
                    <p className="activity-text">
                      <span className="user-name">{item.user}</span>{" "}
                      {item.action}
                      <span className="target-name">
                        {" "}
                        &quot;{item.target}&quot;
                      </span>
                      in{" "}
                      <span
                        className="project-tag"
                        style={{ color: item.color }}
                      >
                        {item.project}
                      </span>
                    </p>
                    <span className="activity-time">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="side-col">
          <section className="quick-actions glass">
            <div className="section-header">
              <h3>Quick Actions</h3>
            </div>
            <nav className="action-nav">
              {(
                [
                  { label: "Create New Project", icon: Briefcase },
                  { label: "Invite Team Members", icon: Users },
                  { label: "Generate API Key", icon: Zap },
                ] as ActionItem[]
              ).map((action, i) => (
                <button key={i} className="action-link glass-hover">
                  <div className="action-icon glass">
                    <action.icon size={18} />
                  </div>
                  <span>{action.label}</span>
                  <ChevronRight size={16} className="chevron" />
                </button>
              ))}
            </nav>
          </section>

          <section className="upgrade-card gradient-bg">
            <h4>Go Premium</h4>
            <p>Unlock unlimited projects and advanced analytics.</p>
            <button className="white-btn">Upgrade Now</button>
          </section>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          padding: 3rem;
          max-width: 1400px;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
        }
        .header-info h1 {
          font-size: 2.75rem;
          margin-bottom: 0.5rem;
          letter-spacing: -0.04em;
        }
        .header-info p {
          color: var(--muted-foreground);
          font-size: 1.125rem;
        }
        .highlight {
          color: var(--foreground);
          font-weight: 600;
        }
        .header-actions {
          display: flex;
          gap: 1rem;
        }
        .glass-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          border-radius: 0.75rem;
          color: white;
          font-weight: 500;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .stat-card {
          padding: 1.75rem;
          border-radius: 1.25rem;
          position: relative;
          overflow: hidden;
          animation: slideUp 0.6s ease-out backwards;
          animation-delay: var(--delay);
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-trend {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--muted-foreground);
          padding: 0.25rem 0.6rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 100px;
        }
        .stat-value {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
          letter-spacing: -0.02em;
        }
        .stat-label {
          font-size: 0.875rem;
          color: var(--muted-foreground);
          font-weight: 500;
        }
        .stat-progress-bg {
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
          margin-top: 1.5rem;
        }
        .stat-progress-bar {
          height: 100%;
          border-radius: 2px;
        }
        .dashboard-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 2rem;
        }
        .activity-section,
        .quick-actions {
          padding: 2rem;
          border-radius: 1.5rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .header-icon {
          color: var(--primary);
        }
        .section-header h3 {
          font-size: 1.125rem;
          font-weight: 700;
        }
        .text-btn {
          color: var(--primary);
          font-size: 0.875rem;
          font-weight: 600;
        }
        .activity-list {
          display: flex;
          flex-direction: column;
        }
        .activity-item {
          display: flex;
          gap: 1.5rem;
          padding-bottom: 2rem;
          position: relative;
        }
        .activity-line {
          position: absolute;
          left: 5px;
          top: 10px;
          bottom: 0;
          width: 1px;
          background: var(--border);
        }
        .activity-item:last-child .activity-line {
          display: none;
        }
        .user-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 3px solid #1e293b;
          position: relative;
          z-index: 1;
          margin-top: 4px;
        }
        .user-name {
          font-weight: 700;
          color: var(--foreground);
        }
        .target-name {
          color: var(--foreground);
          font-weight: 500;
        }
        .project-tag {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.1rem 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid currentColor;
          border-radius: 4px;
          margin-left: 0.25rem;
        }
        .activity-time {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          margin-top: 0.25rem;
          display: block;
        }
        .action-nav {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .action-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 1rem;
          text-align: left;
        }
        .action-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted-foreground);
        }
        .action-link:hover .action-icon {
          color: var(--primary);
          background: rgba(139, 92, 246, 0.1);
        }
        .action-link span {
          flex: 1;
          font-weight: 500;
          font-size: 0.9375rem;
        }
        .chevron {
          color: var(--muted-foreground);
          transition: transform 0.2s;
        }
        .action-link:hover .chevron {
          transform: translateX(3px);
          color: white;
        }
        .upgrade-card {
          margin-top: 2rem;
          padding: 2rem;
          border-radius: 1.5rem;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .upgrade-card h4 {
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .upgrade-card p {
          font-size: 0.875rem;
          opacity: 0.9;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        .white-btn {
          background: white;
          color: var(--primary);
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 700;
          width: 100%;
        }
        @media (max-width: 1024px) {
          .dashboard-layout {
            grid-template-columns: 1fr;
          }
          .side-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            align-items: start;
          }
          .upgrade-card {
            margin-top: 0;
          }
        }
      `}</style>
    </div>
  );
}
