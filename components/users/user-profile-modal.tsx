"use client";

import { useState, useEffect } from "react";
import { X, Loader2, User, Mail, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
  workspaces: {
    role: string;
    workspace: {
      name: string;
      slug: string;
    };
  }[];
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  userId,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-sm shadow-2xl border-border/50 overflow-hidden animate-in zoom-in-95 duration-300 rounded-[2.5rem]">
        <div className="relative h-24 bg-gradient-to-br from-primary/20 to-primary/5 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-background/50 backdrop-blur-md shadow-soft"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="px-8 pb-8 -mt-12 text-center">
          <div className="inline-block relative">
            {loading ? (
              <div className="w-24 h-24 rounded-3xl bg-card border-4 border-background shadow-xl flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : profile?.image ? (
              <img
                src={profile.image}
                className="w-24 h-24 rounded-3xl border-4 border-background shadow-xl object-cover"
                alt=""
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-primary/10 border-4 border-background shadow-xl flex items-center justify-center text-primary">
                <User size={40} />
              </div>
            )}
          </div>

          {!loading && profile && (
            <div className="mt-4 space-y-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  {profile.name || "Anonymous User"}
                </h2>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                  User Profile
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex items-center gap-4 text-left transition-all hover:bg-muted/50">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                    <Mail size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Email Address
                    </p>
                    <p className="text-sm font-bold truncate">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex items-center gap-4 text-left transition-all hover:bg-muted/50">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                    <Calendar size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Member Since
                    </p>
                    <p className="text-sm font-bold">
                      {format(new Date(profile.createdAt), "MMMM yyyy")}
                    </p>
                  </div>
                </div>

                {profile.workspaces.length > 0 && (
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex items-center gap-4 text-left transition-all hover:bg-muted/50">
                    <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                      <Shield size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Primary Role
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">
                          {profile.workspaces[0].role}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[8px] h-4 font-black uppercase tracking-tighter ring-0 px-1 border-primary/30 text-primary"
                        >
                          {profile.workspaces[0].workspace.name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={onClose}
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-soft"
              >
                Close Profile
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
