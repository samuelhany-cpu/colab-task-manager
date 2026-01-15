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
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Stats {
  projects: number;
  tasks: number;
  members: number;
  hours: number;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  project: string;
  time: string;
  color: string;
}

interface ActionItem {
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
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
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch(`/api/workspaces/${slug}/dashboard`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setActivities(data.recentActivity);
        }
      } catch (e: unknown) {
        console.error("Dashboard fetch error:", e);
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
      trend: "Total current",
      href: `/app/${slug}/projects`,
    },
    {
      label: "Open Tasks",
      value: stats.tasks,
      icon: CheckCircle2,
      color: "#10b981",
      trend: "Across projects",
      href: `/app/${slug}/tasks`,
    },
    {
      label: "Team Members",
      value: stats.members,
      icon: Users,
      color: "#3b82f6",
      trend: "In workspace",
      href: `/app/${slug}/settings/members`,
    },
    {
      label: "Hours Tracked",
      value: stats.hours,
      icon: Clock,
      color: "#f59e0b",
      trend: "Last 30 days",
      href: `/app/${slug}/timesheet`,
    },
  ];

  const quickActions: ActionItem[] = [
    {
      label: "Create New Project",
      icon: Briefcase,
      href: `/app/${slug}/projects/new`,
      description: "Start a new team collaboration"
    },
    {
      label: "Invite Team Members",
      icon: Users,
      href: `/app/${slug}/settings/members`,
      description: "Grow your workspace team"
    },
    {
      label: "Generate API Key",
      icon: Zap,
      href: `/app/${slug}/settings/developer`,
      description: "Access workspace via API"
    },
  ];

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-muted/30 text-mutedForeground text-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="font-bold text-lg text-foreground">Syncing your workspace...</p>
          <p className="text-sm opacity-70">Fetching real-time data from database</p>
        </div>
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {slug}
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Workspace Overview
          </h1>
          <p className="text-mutedForeground text-lg">
            Welcome back! You have{" "}
            <span className="text-foreground font-bold">{stats.tasks} tasks</span> currently in progress.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button asChild variant="secondary" className="flex-1 md:flex-none gap-2 px-6 h-12 rounded-xl shadow-sm border-border/50 hover:bg-muted font-bold">
            <Link href={`/app/${slug}/timesheet`}>
              <Calendar size={18} />
              <span>Weekly Report</span>
            </Link>
          </Button>
          <Button asChild className="flex-1 md:flex-none gap-2 px-6 h-12 rounded-xl shadow-lg shadow-primary/20 font-bold">
            <Link href={`/app/${slug}/projects/new`}>
              <Zap size={18} />
              <span>Quick Start</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block group">
            <Card className="p-7 h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group-hover:border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-4">
                <ArrowRight className="text-primary" size={16} />
              </div>

              <div className="flex justify-between items-start mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
                  style={{
                    background: `${stat.color}10`,
                    color: stat.color,
                  }}
                >
                  <stat.icon size={28} />
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase tracking-widest opacity-60 bg-muted/30 border-transparent group-hover:bg-primary/5 group-hover:text-primary transition-colors"
                >
                  {stat.trend}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="text-4xl font-black tracking-tight group-hover:text-primary transition-colors">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-mutedForeground uppercase tracking-[0.15em] opacity-70 group-hover:opacity-100 transition-opacity">
                  {stat.label}
                </div>
              </div>

              <div className="mt-8 h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out delay-300"
                  style={{ background: stat.color, width: stats.tasks > 0 ? "45%" : "5%" }}
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Activity Section */}
        <div className="lg:col-span-8">
          <Card className="flex flex-col h-full overflow-hidden border-border/40 shadow-sm">
            <div className="p-8 pb-6 flex justify-between items-center bg-muted/5 border-b border-border/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl">
                  <ActivityIcon size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Recent Activity</h3>
                  <p className="text-xs text-mutedForeground font-medium">Live updates from your team</p>
                </div>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-primary font-bold hover:bg-primary/10 px-4 rounded-lg transition-all"
              >
                <Link href={`/app/${slug}/activity`}>View All</Link>
              </Button>
            </div>

            <div className="p-8 space-y-10 relative bg-card">
              {activities.length > 0 ? (
                activities.map((item, i) => (
                  <div key={item.id} className="flex gap-6 relative group">
                    {i !== activities.length - 1 && (
                      <div className="absolute left-[7px] top-6 h-[calc(100%+40px)] w-[2px] bg-muted/40" />
                    )}
                    <div className="relative z-10 mt-1">
                      <div
                        className="w-4 h-4 rounded-full border-4 border-background shadow-md transition-all duration-300 group-hover:scale-125 group-hover:shadow-primary/20"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-[15px] leading-relaxed text-mutedForeground group-hover:text-foreground transition-colors">
                        <span className="font-bold text-foreground">
                          {item.user}
                        </span>{" "}
                        {item.action}
                        <span className="text-foreground font-semibold italic mx-1.5">
                          &quot;{item.target}&quot;
                        </span>
                        in
                        <Badge
                          variant="outline"
                          className="ml-2 font-bold text-[9px] uppercase tracking-tighter px-2 py-0 transition-all border-current/20 group-hover:border-current"
                          style={{
                            color: item.color,
                            backgroundColor: `${item.color}05`,
                          }}
                        >
                          {item.project}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-bold text-mutedForeground/40 uppercase tracking-widest flex items-center gap-1.5 group-hover:text-mutedForeground transition-colors">
                        <Clock size={10} />
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <ActivityIcon size={32} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground">No activity yet</h4>
                    <p className="text-sm">Start working in projects to see updates here.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="p-8 border-border/40 shadow-sm bg-card">
            <div className="mb-8">
              <h3 className="text-xl font-bold">Quick Actions</h3>
              <p className="text-xs text-mutedForeground mt-1 font-medium">Common workspace tasks</p>
            </div>

            <div className="flex flex-col gap-3">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  asChild
                  variant="ghost"
                  className="justify-start gap-4 p-4 h-auto group text-left rounded-2xl transition-all border border-transparent hover:border-primary/10 hover:bg-primary/5 hover:translate-x-1"
                >
                  <Link href={action.href}>
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-mutedForeground group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                      <action.icon size={22} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[15px] group-hover:text-primary transition-colors">
                        {action.label}
                      </div>
                      <div className="text-[11px] text-mutedForeground font-medium opacity-70 group-hover:opacity-100 italic">
                        {action.description}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-mutedForeground/30 group-hover:text-primary group-hover:translate-x-1 transition-all"
                    />
                  </Link>
                </Button>
              ))}
            </div>
          </Card>

          <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#6366f1] text-primary-foreground shadow-2xl shadow-blue-500/30 relative overflow-hidden group border border-white/10">
            {/* Decorative background circle */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl transition-all duration-1000 group-hover:scale-150 group-hover:bg-white/20" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-sky-400/20 rounded-full blur-2xl transition-all duration-1000 group-hover:scale-125" />

            <div className="relative z-10 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-inner">
                <Zap size={28} className="fill-white" />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-black tracking-tight">
                  Go Premium
                </h4>
                <p className="text-sm font-medium opacity-80 leading-relaxed">
                  Unlock unlimited projects, team-wide analytics, and priority 24/7 support.
                </p>
              </div>

              <Button
                asChild
                className="w-full bg-white text-blue-600 hover:bg-slate-50 font-black border-none shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all h-14 rounded-2xl text-base"
              >
                <Link href={`/app/${slug}/billing`}>Upgrade Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
