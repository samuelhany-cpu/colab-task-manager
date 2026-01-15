"use client";

import { useState, useEffect } from "react";
import { Upload, File as FileIcon, Download, Loader2, FileText, ImageIcon, Music, Video, Archive } from "lucide-react";
import { cn } from "@/lib/cn";

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

  const getFileIcon = (mime: string) => {
    if (mime.startsWith("image/")) return <ImageIcon size={20} />;
    if (mime.startsWith("video/")) return <Video size={20} />;
    if (mime.startsWith("audio/")) return <Music size={20} />;
    if (mime.includes("pdf") || mime.includes("text")) return <FileText size={20} />;
    if (mime.includes("zip") || mime.includes("tar") || mime.includes("compressed")) return <Archive size={20} />;
    return <FileIcon size={20} />;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4 text-mutedForeground">
      <Loader2 className="animate-spin opacity-20" size={40} />
      <span className="text-sm font-bold uppercase tracking-widest">Loading assets...</span>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Project Files</h2>
          <p className="text-sm text-mutedForeground">Manage and share assets for this project</p>
        </div>
        <div className="relative inline-block group">
          <button
            className={cn(
              "flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-soft transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
              uploading && "animate-pulse"
            )}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Upload size={18} />
            )}
            {uploading ? "Uploading..." : "Upload File"}
          </button>
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((file) => (
          <div
            key={file.id}
            className="group flex flex-col p-5 bg-card border border-border rounded-2xl shadow-soft transition-all hover:translate-y-[-4px] hover:shadow-xl hover:border-primary/20"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {getFileIcon(file.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground truncate" title={file.name}>
                  {file.name}
                </h4>
                <p className="text-[10px] font-extrabold text-mutedForeground uppercase tracking-wider">
                  {file.mimeType.split("/")[1] || "File"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-foreground/80">{formatSize(file.size)}</span>
                <span className="text-[10px] text-mutedForeground">by {file.uploader.name}</span>
              </div>
              <a
                href={file.url}
                download={file.name}
                className="p-2.5 rounded-xl bg-muted text-mutedForeground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                title="Download"
              >
                <Download size={18} />
              </a>
            </div>
          </div>
        ))}

        {files.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-20 bg-muted/20 border-2 border-dashed border-border rounded-[2rem] text-mutedForeground gap-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Upload size={40} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">No files yet</p>
              <p className="text-sm">Upload your first document or image to get started.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
