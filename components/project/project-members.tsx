"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User2,
  Crown,
  Mail,
  UserMinus,
  Shield,
  AlertCircle,
  Loader2,
  X,
  UserPlus,
} from "lucide-react";

interface ProjectMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface ProjectMembersProps {
  projectId: string;
}

export default function ProjectMembers({ projectId }: ProjectMembersProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"MEMBER" | "OWNER">(
    "MEMBER",
  );
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch members");
      }
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    try {
      setAdding(true);
      setAddError("");
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      setMembers([...members, data]);
      setShowAddModal(false);
      setNewMemberEmail("");
      setNewMemberRole("MEMBER");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      setRemovingId(memberId);
      const res = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleChangeRole = async (
    memberId: string,
    newRole: "MEMBER" | "OWNER",
  ) => {
    try {
      setChangingRoleId(memberId);
      const res = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change role");
      }

      setMembers(members.map((m) => (m.id === memberId ? data : m)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setChangingRoleId(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
      </div>
    );

  if (error)
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl">
          <AlertCircle size={20} />
          <span className="font-bold">{error}</span>
        </div>
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Team Members ({members.length})</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-soft hover:brightness-110 active:scale-95 transition-all"
        >
          <UserPlus size={16} />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl shadow-soft transition-all hover:translate-y-[-2px] hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              {member.user.image ? (
                <div
                  style={{
                    backgroundImage: `url(${member.user.image})`,
                    backgroundSize: "cover",
                  }}
                  className="w-12 h-12 rounded-full border-2 border-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                  <User2 size={24} />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">
                    {member.user.name || "Unknown User"}
                  </span>
                  {member.role === "OWNER" && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-amber-500/20">
                      <Crown size={12} />
                      Owner
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-mutedForeground text-xs">
                  <Mail size={12} />
                  {member.user.email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {member.role === "MEMBER" && (
                <button
                  onClick={() => handleChangeRole(member.id, "OWNER")}
                  disabled={changingRoleId === member.id}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 text-amber-600 border border-amber-500/20 rounded-xl text-xs font-bold hover:bg-amber-500/10 transition-all disabled:opacity-50"
                  title="Make Owner"
                >
                  {changingRoleId === member.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Shield size={14} />
                      Promote
                    </>
                  )}
                </button>
              )}
              {member.role === "OWNER" &&
                members.filter((m) => m.role === "OWNER").length > 1 && (
                  <button
                    onClick={() => handleChangeRole(member.id, "MEMBER")}
                    disabled={changingRoleId === member.id}
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-mutedForeground border border-border rounded-xl text-xs font-bold hover:bg-muted/80 transition-all disabled:opacity-50"
                    title="Demote to Member"
                  >
                    {changingRoleId === member.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Demote"
                    )}
                  </button>
                )}
              <button
                onClick={() => handleRemoveMember(member.id)}
                disabled={removingId === member.id}
                className="flex items-center gap-2 px-4 py-2 bg-destructive/5 text-destructive border border-destructive/20 rounded-xl text-xs font-bold hover:bg-destructive/10 transition-all disabled:opacity-50"
                title="Remove Member"
              >
                {removingId === member.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <UserMinus size={14} />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center p-16 text-mutedForeground gap-4">
            <User2 size={64} className="opacity-20" />
            <p className="text-lg font-medium">
              No members yet. Add your first member to get started!
            </p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] bg-card border border-border p-8 rounded-[1.5rem] shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">Add Team Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddError("");
                  setNewMemberEmail("");
                }}
                className="p-2 text-mutedForeground hover:bg-muted rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-mutedForeground">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="px-4 py-3 bg-muted border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-mutedForeground/50"
                />
                <p className="text-[10px] text-mutedForeground italic">
                  User must already have an account and be a workspace member
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-mutedForeground">
                  Role
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) =>
                    setNewMemberRole(e.target.value as "MEMBER" | "OWNER")
                  }
                  className="px-4 py-3 bg-muted border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="MEMBER">Member</option>
                  <option value="OWNER">Owner</option>
                </select>
                <p className="text-[10px] text-mutedForeground italic">
                  Owners can manage members and settings
                </p>
              </div>

              {addError && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm">
                  <AlertCircle size={16} />
                  <span>{addError}</span>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError("");
                    setNewMemberEmail("");
                  }}
                  className="flex-1 py-3 bg-muted text-foreground border border-border rounded-xl font-bold hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-soft hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Member"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
