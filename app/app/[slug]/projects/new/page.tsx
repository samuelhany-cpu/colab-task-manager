"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

export default function NewProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      // First get workspace ID
      const wsRes = await fetch("/api/workspaces");
      const workspaces = await wsRes.json();
      const workspace = workspaces.find(
        (w: { id: string; slug: string }) => w.slug === slug,
      );

      if (!workspace) throw new Error("Workspace not found");

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, workspaceId: workspace.id }),
      });

      if (!res.ok) throw new Error("Failed to create project");

      const project = await res.json();
      router.push(`/app/${slug}/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-project-container">
      <div className="header">
        <h1 className="gradient-text">Create New Project</h1>
        <p>
          Start a new collaboration in the <strong>{slug}</strong> workspace.
        </p>
      </div>

      <div className="form-card glass">
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Project Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Website Overhaul"
              className="glass"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="What is this project about?"
              className="glass"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => router.back()}
            >
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
              {!loading && <ChevronRight size={18} />}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .new-project-container {
          padding: 4rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          margin-bottom: 3rem;
        }
        h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        p {
          color: var(--muted-foreground);
        }
        .form-card {
          padding: 3rem;
          border-radius: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }
        label {
          font-size: 0.875rem;
          font-weight: 600;
        }
        input,
        textarea {
          padding: 1rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          color: white;
          width: 100%;
          outline: none;
        }
        input:focus,
        textarea:focus {
          border-color: var(--primary);
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
        .cancel-btn {
          padding: 0.75rem 1.5rem;
          color: var(--muted-foreground);
        }
        .error-msg {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-radius: 0.75rem;
          margin-bottom: 2rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
