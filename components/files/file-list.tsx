"use client";

import { useState, useEffect } from "react";
import { Upload, File as FileIcon, Download, Loader2 } from "lucide-react";

interface FileEntry {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  url: string; // Now provided by the API
  uploader: { name: string };
}

export default function FileList({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/files?projectId=${projectId}`);
        const data = await res.json();
        setFiles(data);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newFile = await res.json();
        // Add relative URL for the new file
        newFile.url = `/uploads/${newFile.key}`;
        setFiles((prev) => [newFile, ...prev]);
      }
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) return <div>Loading files...</div>;

  return (
    <div className="file-section">
      <div className="section-header">
        <h2>Project Files</h2>
        <div className="upload-btn-wrapper">
          <button className="primary-btn" disabled={uploading}>
            {uploading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Upload size={18} />
            )}
            {uploading ? "Uploading..." : "Upload File"}
          </button>
          <input type="file" onChange={handleUpload} disabled={uploading} />
        </div>
      </div>

      <div className="file-grid">
        {files.map((file) => (
          <div key={file.id} className="file-card glass">
            <div className="file-icon">
              <FileIcon size={24} />
            </div>
            <div className="file-info">
              <div className="file-name" title={file.name}>
                {file.name}
              </div>
              <div className="file-meta">
                {formatSize(file.size)} • {file.uploader.name}
              </div>
            </div>
            <div className="file-actions">
              <a
                href={file.url}
                download={file.name}
                className="download-link"
                title="Download"
              >
                <Download size={18} />
              </a>
            </div>
          </div>
        ))}

        {files.length === 0 && (
          <div className="empty-files glass">
            <Upload size={48} className="muted-icon" />
            <p>No files uploaded yet.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .file-section {
          padding: 2rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .upload-btn-wrapper {
          position: relative;
          overflow: hidden;
          display: inline-block;
        }
        .upload-btn-wrapper input[type="file"] {
          font-size: 100px;
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          cursor: pointer;
        }
        .primary-btn {
          padding: 0.625rem 1.25rem;
          background: var(--primary);
          color: white;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }
        .file-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .file-card {
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-radius: 0.75rem;
        }
        .file-icon {
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }
        .file-name {
          font-weight: 600;
          font-size: 0.9375rem;
          margin-bottom: 0.25rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 180px;
        }
        .file-meta {
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }
        .file-actions {
          margin-left: auto;
          display: flex;
          gap: 0.5rem;
        }
        .download-link {
          padding: 0.5rem;
          color: var(--muted-foreground);
          border-radius: 0.375rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .download-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--foreground);
        }
        .empty-files {
          grid-column: 1 / -1;
          padding: 4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--muted-foreground);
        }
        .muted-icon {
          opacity: 0.3;
        }
        .animate-spin {
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
      `}</style>
    </div>
  );
}
