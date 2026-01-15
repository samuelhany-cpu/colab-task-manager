"use client";

import { useState, useEffect, use } from "react";
import {
  File,
  Download,
  Search,
  FileText,
  Image as ImageIcon,
  Film,
  MoreVertical,
} from "lucide-react";

interface FileRecord {
  id: string;
  name: string;
  key: string;
  mimeType: string;
  size: number;
  project: { name: string };
  uploadedBy: { name: string };
  createdAt: string;
}

export default function AllFilesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const wsRes = await fetch("/api/workspaces");
        const workspaces = await wsRes.json();
        const workspace = workspaces.find(
          (w: { id: string; slug: string }) => w.slug === slug,
        );

        if (workspace) {
          // Fetch across all projects in workspace
          const pRes = await fetch(`/api/projects?workspaceId=${workspace.id}`);
          const projects = await pRes.json();

          let allFiles: FileRecord[] = [];
          for (const project of projects) {
            // Use existing file list logic if available or fetch from custom endpoint
            const fRes = await fetch(`/api/files?projectId=${project.id}`);
            const projectFiles = await fRes.json();
            if (Array.isArray(projectFiles)) {
              allFiles = [
                ...allFiles,
                ...projectFiles.map((f) => ({
                  ...f,
                  project: { name: project.name },
                })),
              ];
            }
          }
          setFiles(allFiles);
        }
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchFiles();
  }, [slug]);

  const getFileIcon = (mime: string) => {
    if (mime.startsWith("image/"))
      return <ImageIcon size={20} className="icon-image" />;
    if (mime.startsWith("video/"))
      return <Film size={20} className="icon-video" />;
    return <FileText size={20} className="icon-file" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.project.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div className="p-8">Loading workspace files...</div>;

  return (
    <div className="files-container">
      <header className="page-header">
        <div>
          <h1 className="gradient-text">Workspace Files</h1>
          <p className="subtitle">
            Management and storage for all assets in {slug}.
          </p>
        </div>
        <div className="header-actions">
          <div className="search-bar glass">
            <Search size={18} />
            <input
              type="text"
              placeholder="Filter files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="files-grid">
        {filteredFiles.map((file) => (
          <div key={file.id} className="file-card glass glass-hover">
            <div className="file-preview">{getFileIcon(file.mimeType)}</div>
            <div className="file-info">
              <h3 className="file-name" title={file.name}>
                {file.name}
              </h3>
              <p className="file-meta">
                {file.project.name} • {formatSize(file.size)}
              </p>
              <div className="file-details">
                <span className="uploader">By {file.uploadedBy.name}</span>
                <span className="date">
                  {new Date(file.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="file-actions">
              <a
                href={`/uploads/${file.key}`}
                download={file.name}
                className="action-icon-btn"
              >
                <Download size={16} />
              </a>
              <button className="action-icon-btn">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        ))}
        {filteredFiles.length === 0 && (
          <div className="empty-files glass">
            <File size={40} className="muted-icon" />
            <p>No files found in this workspace.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .files-container {
          padding: 3rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
        }
        h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .subtitle {
          color: var(--muted-foreground);
        }
        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 1rem;
          border-radius: 0.75rem;
          width: 300px;
        }
        .search-bar input {
          background: none;
          border: none;
          color: white;
          width: 100%;
          outline: none;
        }
        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .file-card {
          padding: 1.5rem;
          border-radius: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: relative;
        }
        .file-preview {
          height: 120px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-image {
          color: #8b5cf6;
        }
        .icon-video {
          color: #f59e0b;
        }
        .icon-file {
          color: #3b82f6;
        }
        .file-name {
          font-size: 1rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .file-meta {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          margin-bottom: 0.5rem;
        }
        .file-details {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--muted-foreground);
          border-top: 1px solid var(--border);
          padding-top: 0.75rem;
        }
        .file-actions {
          position: absolute;
          top: 1rem;
          right: 1rem;
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .file-card:hover .file-actions {
          opacity: 1;
        }
        .action-icon-btn {
          padding: 0.4rem;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-icon-btn:hover {
          background: var(--primary);
        }
        .empty-files {
          grid-column: 1 / -1;
          padding: 5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--muted-foreground);
        }
        .muted-icon {
          opacity: 0.2;
        }
      `}</style>
    </div>
  );
}
