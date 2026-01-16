"use client";

import { useState, useEffect, use } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Activity as ActivityIcon,
  Clock,
  ArrowLeft,
  Loader2,
  Calendar,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  project: string;
  time: string;
  color: string;
}

export default function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/workspaces/${slug}/dashboard`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.recentActivity || []);
        }
      } catch (e: unknown) {
        console.error("Activity fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    if (user && slug) {
      fetchActivity();
    } else if (!user && !loading) {
      setLoading(false);
    }
  }, [user, slug, loading]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-medium text-mutedForeground">
          Loading activity logs...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
      <header className="max-w-5xl mx-auto space-y-4">
        <Link
          href={`/app/${slug}`}
          className="inline-flex items-center gap-2 text-xs font-black text-mutedForeground hover:text-primary transition-colors group"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-1 transition-transform"
          />
          BACK TO DASHBOARD
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Activity Log
            </h1>
            <p className="text-mutedForeground text-lg font-medium">
              Real-time stream of all actions in{" "}
              <span className="text-foreground font-bold">{slug}</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="rounded-xl font-bold gap-2 bg-card border-border/50"
            >
              <Calendar size={16} />
              <span>All Time</span>
            </Button>
            <Button
              variant="secondary"
              className="rounded-xl font-bold gap-2 bg-card border-border/50"
            >
              <Filter size={16} />
              <span>Filters</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        <Card className="p-8 md:p-12 border-border/40 shadow-sm bg-card rounded-[2rem]">
          <div className="space-y-12 relative">
            {activities.length > 0 ? (
              activities.map((item, i) => (
                <div key={item.id} className="flex gap-8 relative group">
                  {i !== activities.length - 1 && (
                    <div className="absolute left-[7px] top-8 h-[calc(100%+48px)] w-[2px] bg-muted/40" />
                  )}
                  <div className="relative z-10 mt-1">
                    <div
                      className="w-4 h-4 rounded-full border-4 border-background shadow-md transition-all duration-300 group-hover:scale-125 group-hover:shadow-primary/20"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="text-lg leading-relaxed text-mutedForeground group-hover:text-foreground transition-colors">
                      <span className="font-bold text-foreground underline decoration-primary/20 underline-offset-4">
                        {item.user}
                      </span>{" "}
                      {item.action}
                      <span className="text-foreground font-semibold italic mx-2 block md:inline-block">
                        &quot;{item.target}&quot;
                      </span>
                      <span className="text-sm opacity-60">in</span>
                      <Badge
                        variant="outline"
                        className="ml-3 font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 border-current/20 group-hover:border-current transition-all"
                        style={{
                          color: item.color,
                          backgroundColor: `${item.color}08`,
                        }}
                      >
                        {item.project}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-mutedForeground/50 uppercase tracking-widest group-hover:text-mutedForeground transition-colors">
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {item.time}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span>{slug} workspace</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <ActivityIcon size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-foreground">
                    No activities recorded
                  </h3>
                  <p className="text-mutedForeground max-w-sm mx-auto">
                    Events will appear here as team members create tasks, update
                    projects, and track time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
