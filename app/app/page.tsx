"use client";

import { useState, useEffect } from "react";
import { Plus, Layout, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export default function WorkspaceSelector() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: "", slug: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWorkspace),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces([data, ...workspaces]);
        setShowCreate(false);
        setNewWorkspace({ name: "", slug: "" });
      }
    } catch (error) {
      console.error("Failed to create workspace", error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="center-container">
        <Loader2 className="animate-spin primary-color" size={48} />
      </div>
    );
  }

  return (
    <div className="selector-container">
      <div className="content-box">
        <div className="header">
          <h1 className="gradient-text">Choose a Workspace</h1>
          <p>
            Select an existing workspace or create a new one to get started.
          </p>
        </div>

        <div className="workspace-grid">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/app/${ws.slug}`}
              className="workspace-card glass"
            >
              <div className="icon">
                <Layout size={24} />
              </div>
              <div className="info">
                <h3>{ws.name}</h3>
                <p>/{ws.slug}</p>
              </div>
              <ArrowRight className="arrow" size={20} />
            </Link>
          ))}

          <button
            className="create-card glass"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={24} />
            <span>Create Workspace</span>
          </button>
        </div>

        {showCreate && (
          <div className="modal-overlay">
            <div className="modal glass">
              <h2>New Workspace</h2>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    required
                    value={newWorkspace.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewWorkspace({
                        name,
                        slug: name
                          .toLowerCase()
                          .replace(/ /g, "-")
                          .replace(/[^\w-]/g, ""),
                      });
                    }}
                    placeholder="Engineering Team"
                  />
                </div>
                <div className="form-group">
                  <label>Slug</label>
                  <input
                    required
                    value={newWorkspace.slug}
                    onChange={(e) =>
                      setNewWorkspace({ ...newWorkspace, slug: e.target.value })
                    }
                    placeholder="engineering-team"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={creating}
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .selector-container {
          min-height: 100vh;
          padding: 4rem 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          background: radial-gradient(
            circle at top left,
            #1e1b4b 0%,
            #0f172a 100%
          );
          position: relative;
          overflow: hidden;
        }
        .selector-container::before {
          content: "";
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(
            circle,
            rgba(139, 92, 246, 0.1) 0%,
            transparent 70%
          );
          animation: float 20s ease-in-out infinite;
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-20px, -20px);
          }
        }
        .content-box {
          width: 100%;
          max-width: 900px;
          position: relative;
          z-index: 1;
        }
        .header {
          text-align: center;
          margin-bottom: 4rem;
          animation: fadeInDown 0.6s ease-out;
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        h1 {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }
        p {
          color: var(--muted-foreground);
          font-size: 1.25rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .workspace-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .workspace-card,
        .create-card {
          padding: 1.75rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border-radius: var(--radius);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .workspace-card::before,
        .create-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.1),
            rgba(217, 70, 239, 0.1)
          );
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .workspace-card:hover::before {
          opacity: 1;
        }
        .workspace-card:hover,
        .create-card:hover {
          transform: translateY(-6px);
          background: rgba(30, 41, 59, 0.95);
          box-shadow: 0 20px 40px -10px rgba(139, 92, 246, 0.3);
        }
        .icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--primary), #d946ef);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 16px -4px rgba(139, 92, 246, 0.4);
          flex-shrink: 0;
        }
        .info {
          flex: 1;
          min-width: 0;
        }
        .info h3 {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
          font-weight: 700;
        }
        .info p {
          font-size: 0.875rem;
          margin: 0;
          opacity: 0.7;
        }
        .arrow {
          margin-left: auto;
          color: var(--primary);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }
        .workspace-card:hover .arrow {
          opacity: 1;
          transform: translateX(6px);
        }
        .create-card {
          border: 2px dashed rgba(139, 92, 246, 0.3);
          justify-content: center;
          flex-direction: column;
          color: var(--muted-foreground);
          font-weight: 600;
          background: transparent;
          min-height: 140px;
        }
        .create-card:hover {
          border-color: var(--primary);
          color: var(--foreground);
          border-style: solid;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          z-index: 50;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .modal {
          width: 100%;
          max-width: 480px;
          padding: 2.5rem;
          border-radius: var(--radius);
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .modal h2 {
          margin-bottom: 2rem;
          font-size: 1.75rem;
          font-weight: 700;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--foreground);
        }
        input {
          padding: 0.875rem 1.25rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 0.625rem;
          color: white;
          font-size: 1rem;
          transition: all 0.2s ease;
        }
        input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(15, 23, 42, 0.8);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        input::placeholder {
          color: var(--muted-foreground);
          opacity: 0.5;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .modal-actions button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.625rem;
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all 0.2s ease;
        }
        .modal-actions button[type="button"] {
          background: rgba(30, 41, 59, 0.5);
          color: var(--foreground);
          border: 1px solid var(--border);
        }
        .modal-actions button[type="button"]:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .primary-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--primary), #d946ef);
          color: white;
          border-radius: 0.625rem;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
        }
        .primary-btn:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
          transform: translateY(-2px);
        }
        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .center-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
          color: var(--primary);
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 768px) {
          h1 {
            font-size: 2.5rem;
          }
          .workspace-grid {
            grid-template-columns: 1fr;
          }
          .modal {
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
