"use client";

import { useState, useEffect, use } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  MoreVertical,
  ArrowLeft,
  Loader2,
  Search,
  Check,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser } from "@/components/providers/user-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  role: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  acceptedAt: string | null;
  expiresAt: string;
}

export default function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useUser();

  console.log("[MEMBERS_PAGE] Rendering. Slug:", slug, "User:", user?.email);

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "OWNER">("MEMBER");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      console.log("[MEMBERS_PAGE] Fetching members for slug:", slug);
      try {
        const res = await fetch(`/api/workspaces/${slug}/members`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
          setInvitations(data.invitations || []);
        }
      } catch (e: unknown) {
        console.error("Members fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    if (user && slug) fetchMembers();
  }, [user, slug]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(
      "[MEMBERS_PAGE] handleInvite triggered with email:",
      email,
      "role:",
      role,
    );
    if (!email) {
      console.warn("[MEMBERS_PAGE] No email provided, returning.");
      return;
    }

    setInviting(true);
    setError(null);

    console.log(
      "[MEMBERS_PAGE] Attempting fetch to:",
      `/api/workspaces/${slug}/invite`,
    );

    try {
      const res = await fetch(`/api/workspaces/${slug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setInviteSuccess(true);
      setEmail("");
      // Refresh invitations list
      const membersRes = await fetch(`/api/workspaces/${slug}/members`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setInvitations(membersData.invitations || []);
      }
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInviting(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-medium text-mutedForeground">
          Loading team members...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
      <header className="max-w-6xl mx-auto space-y-4">
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
              Team Members
            </h1>
            <p className="text-mutedForeground text-lg font-medium">
              Manage your workspace people and their access levels.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedForeground"
                size={18}
              />
              <Input
                placeholder="Search members..."
                className="pl-10 h-11 rounded-xl bg-card border-border/50"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Members List */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-2xl border-border/40 shadow-sm bg-card overflow-hidden">
            <div className="divide-y divide-border/40">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border-2 border-background">
                      {member.user.name?.[0] || member.user.email?.[0] || "?"}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">
                        {member.user.name || "Invite Pending"}
                      </div>
                      <div className="text-xs text-mutedForeground font-medium">
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Badge
                      variant="secondary"
                      className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border-none"
                    >
                      {member.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-mutedForeground"
                    >
                      <MoreVertical size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {invitations.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 px-1">
                <Mail size={14} className="text-mutedForeground" />
                <h3 className="text-xs font-black uppercase tracking-widest text-mutedForeground">
                  Pending Invitations ({invitations.length})
                </h3>
              </div>
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card overflow-hidden">
                <div className="divide-y divide-border/40">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-mutedForeground font-bold text-sm">
                          {inv.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">
                            {inv.email}
                          </div>
                          <div className="text-[10px] text-mutedForeground font-medium">
                            Expires{" "}
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-muted/30 border-none"
                      >
                        {inv.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-8 border-border/40 shadow-sm bg-card rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <UserPlus size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Invite People</h3>
                <p className="text-xs text-mutedForeground font-medium">
                  Add new collaborators
                </p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-mutedForeground ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedForeground/50"
                    size={16}
                  />
                  <Input
                    placeholder="teammate@company.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 rounded-xl border-border/60 focus:bg-background bg-muted/20"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive font-bold px-1 animate-in shake duration-300">
                  {error}
                </p>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-mutedForeground ml-1">
                  Member Role
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={role === "MEMBER" ? "secondary" : "ghost"}
                    onClick={() => setRole("MEMBER")}
                    className={cn(
                      "flex-1 h-12 rounded-xl text-xs font-bold gap-2",
                      role !== "MEMBER" && "border border-border/40",
                    )}
                  >
                    <Users size={14} />
                    Member
                  </Button>
                  <Button
                    type="button"
                    variant={role === "OWNER" ? "secondary" : "ghost"}
                    onClick={() => setRole("OWNER")}
                    className={cn(
                      "flex-1 h-12 rounded-xl text-xs font-bold gap-2",
                      role !== "OWNER" && "border border-border/40",
                    )}
                  >
                    <Shield size={14} />
                    Admin
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={inviting || inviteSuccess}
                className={`w-full h-12 rounded-xl font-black transition-all ${inviteSuccess ? "bg-green-500 hover:bg-green-500" : "shadow-lg shadow-primary/20"}`}
              >
                {inviting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : inviteSuccess ? (
                  <div className="flex items-center gap-2">
                    <Check size={18} />
                    <span>Invitation Sent!</span>
                  </div>
                ) : (
                  <span>Send Invitation</span>
                )}
              </Button>
            </form>
          </Card>

          <Card className="p-8 border-border/40 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl">
            <h4 className="font-bold mb-2">Workspace Limits</h4>
            <p className="text-xs text-mutedForeground leading-relaxed mb-6">
              You are currently on the{" "}
              <span className="text-foreground font-bold italic">
                Free Plan
              </span>
              . You can add up to{" "}
              <span className="text-foreground font-bold">5 team members</span>.
            </p>
            <Button
              variant="secondary"
              className="w-full rounded-xl font-bold h-10 text-xs"
            >
              View Plan Details
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
