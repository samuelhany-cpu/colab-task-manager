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

  if (loading) {
    return (
      <div className="members-loading">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "#60a5fa" }}
        />
        <style jsx>{`
          .members-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4rem 0;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="members-container">
        <div className="error-box">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <style jsx>{`
          .members-container {
            padding: 2rem;
          }
          .error-box {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 0.75rem;
            color: #f87171;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="members-container">
      <div className="members-header">
        <h3 className="members-title">Team Members ({members.length})</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="add-member-btn"
        >
          <UserPlus size={16} />
          Add Member
        </button>
      </div>

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-card glass">
            <div className="member-info">
              {member.user.image ? (
                <div
                  style={{
                    backgroundImage: `url(${member.user.image})`,
                    backgroundSize: "cover",
                  }}
                  className="member-avatar"
                />
              ) : (
                <div className="member-avatar-placeholder">
                  <User2 size={20} />
                </div>
              )}
              <div className="member-details">
                <div className="member-name-row">
                  <span className="member-name">
                    {member.user.name || "Unknown User"}
                  </span>
                  {member.role === "OWNER" && (
                    <span className="owner-badge">
                      <Crown size={12} />
                      Owner
                    </span>
                  )}
                </div>
                <div className="member-email">
                  <Mail size={12} />
                  {member.user.email}
                </div>
              </div>
            </div>

            <div className="member-actions">
              {member.role === "MEMBER" && (
                <button
                  onClick={() => handleChangeRole(member.id, "OWNER")}
                  disabled={changingRoleId === member.id}
                  className="action-btn promote-btn"
                  title="Make Owner"
                >
                  {changingRoleId === member.id ? (
                    <Loader2 size={14} className="spinner" />
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
                    className="action-btn demote-btn"
                    title="Demote to Member"
                  >
                    {changingRoleId === member.id ? (
                      <Loader2 size={14} className="spinner" />
                    ) : (
                      "Demote"
                    )}
                  </button>
                )}
              <button
                onClick={() => handleRemoveMember(member.id)}
                disabled={removingId === member.id}
                className="action-btn remove-btn"
                title="Remove Member"
              >
                {removingId === member.id ? (
                  <Loader2 size={14} className="spinner" />
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
          <div className="empty-state">
            <User2 size={48} style={{ opacity: 0.3 }} />
            <p>No members yet. Add your first member to get started!</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <div className="modal-header">
              <h3 className="modal-title">Add Team Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddError("");
                  setNewMemberEmail("");
                }}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="modal-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="form-input glass"
                />
                <p className="form-hint">
                  User must already have an account and be a workspace member
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) =>
                    setNewMemberRole(e.target.value as "MEMBER" | "OWNER")
                  }
                  className="form-input glass"
                >
                  <option value="MEMBER">Member</option>
                  <option value="OWNER">Owner</option>
                </select>
                <p className="form-hint">
                  Owners can manage members and settings
                </p>
              </div>

              {addError && (
                <div className="error-box">
                  <AlertCircle size={16} />
                  <span>{addError}</span>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError("");
                    setNewMemberEmail("");
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="submit-btn">
                  {adding ? (
                    <>
                      <Loader2 size={16} className="spinner" />
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

      <style jsx>{`
        .members-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .members-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }
        .members-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }
        .add-member-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .add-member-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }
        .members-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .member-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          border-radius: 1rem;
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .member-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .member-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .member-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }
        .member-avatar-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }
        .member-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .member-name-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .member-name {
          font-weight: 600;
          color: white;
          font-size: 0.95rem;
        }
        .owner-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
          color: #78350f;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .member-email {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
        }
        .member-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .promote-btn {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        .promote-btn:hover:not(:disabled) {
          background: rgba(245, 158, 11, 0.2);
        }
        .demote-btn {
          background: rgba(148, 163, 184, 0.1);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        .demote-btn:hover:not(:disabled) {
          background: rgba(148, 163, 184, 0.2);
        }
        .remove-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(248, 113, 113, 0.3);
        }
        .remove-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: rgba(255, 255, 255, 0.5);
          gap: 1rem;
        }
        .empty-state p {
          font-size: 1rem;
          text-align: center;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .modal-content {
          max-width: 500px;
          width: 100%;
          padding: 2rem;
          border-radius: 1.5rem;
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }
        .close-btn {
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          border-radius: 0.5rem;
          transition: all 0.2s ease;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }
        .form-input {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s ease;
        }
        .form-input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
        }
        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .form-input option {
          background: #1e293b;
          color: white;
        }
        .form-hint {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .error-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.75rem;
          color: #f87171;
          font-size: 0.875rem;
        }
        .modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .cancel-btn {
          flex: 1;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .submit-btn {
          flex: 1;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .glass {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
