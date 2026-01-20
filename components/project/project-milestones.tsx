"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/cn";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
}

export default function ProjectMilestones({
  projectId,
}: {
  projectId: string;
}) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/milestones`);
        if (res.ok) {
          const data = await res.json();
          setMilestones(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, [projectId]);

  const toggleMilestone = async (_id: string, _completed: boolean) => {
    try {
      // We don't have the [milestoneId] PATCH yet, so let's just use current state for UI
      // but in real app we'd call PATCH /api/projects/[projectId]/milestones/[id]
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-widest text-mutedForeground">
          Milestones
        </h2>
        <Button className="rounded-xl h-9 px-4 font-bold gap-2">
          <Plus size={16} /> Add Milestone
        </Button>
      </div>

      <div className="space-y-4">
        {milestones.length > 0 ? (
          milestones.map((m) => (
            <Card
              key={m.id}
              className="p-6 bg-card border-border/50 rounded-2xl flex items-center gap-6 hover:shadow-lg transition-all group"
            >
              <button
                onClick={() => toggleMilestone(m.id, !m.completed)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  m.completed
                    ? "bg-green-500/10 text-green-500"
                    : "bg-primary/5 text-primary hover:bg-primary/10",
                )}
              >
                {m.completed ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <Circle size={24} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    "font-bold text-foreground truncate text-lg",
                    m.completed && "line-through opacity-50",
                  )}
                >
                  {m.title}
                </h3>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-mutedForeground tracking-widest">
                    <Clock size={12} />
                    Due {format(new Date(m.dueDate), "MMM d, yyyy")}
                  </div>
                  {m.description && (
                    <p className="text-xs text-mutedForeground truncate italic">
                      {m.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {new Date() > new Date(m.dueDate) && !m.completed && (
                  <Badge
                    variant="destructive"
                    className="rounded-lg text-[8px] font-black uppercase tracking-tighter"
                  >
                    Overdue
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-xl"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="p-20 border-2 border-dashed border-border/30 rounded-[3rem] text-center space-y-4">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
              <Target size={32} className="text-mutedForeground opacity-20" />
            </div>
            <p className="text-sm font-bold text-mutedForeground uppercase tracking-widest">
              No milestones defined for this project
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
