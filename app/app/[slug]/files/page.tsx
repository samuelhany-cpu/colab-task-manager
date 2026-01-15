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
  ArrowLeft,
  Loader2,
  FolderOpen,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileRecord {
  id: string;
  name: string;
  originalName: string;
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
          const pRes = await fetch(`/api/projects?workspaceId=${workspace.id}`);
          const projects = await pRes.json();

          let allFiles: FileRecord[] = [];
          for (const project of projects) {
            const fRes = await fetch(`/api/files?projectId=${project.id}`);
            const projectFiles = await fRes.json();
            if (Array.isArray(projectFiles)) {
              allFiles = [
                ...allFiles,
                ...projectFiles.map((f: any) => ({
                  ...f,
                  project: { name: project.name },
                })),
              ];
            }
          }
          setFiles(allFiles);
        }
      } catch (e: unknown) {
        console.error("Files fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchFiles();
  }, [slug]);

  const getFileIcon = (mime: string) => {
    if (mime.startsWith("image/"))
      return <ImageIcon size={24} className="text-purple-500" />;
    if (mime.startsWith("video/"))
      return <Film size={24} className="text-amber-500" />;
    return <FileText size={24} className="text-blue-500" />;
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
      (f.originalName || f.name).toLowerCase().includes(search.toLowerCase()) ||
      f.project.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-medium text-mutedForeground">Accessing workspace assets...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
      <header className="max-w-7xl mx-auto space-y-4">
        <Link
          href={`/app/${slug}`}
          className="inline-flex items-center gap-2 text-xs font-black text-mutedForeground hover:text-primary transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          BACK TO DASHBOARD
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Workspace Files</h1>
            <p className="text-mutedForeground text-lg font-medium">
              Manage and storage for all assets in <span className="text-foreground font-bold">{slug}</span>.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedForeground" size={18} />
              <Input
                placeholder="Search filename or project..."
                className="pl-10 h-11 rounded-xl bg-card border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="secondary" className="rounded-xl font-bold h-11 gap-2">
              <FolderOpen size={18} />
              <span>New Folder</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="p-6 group flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-border/40 bg-card rounded-[2rem]">
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg">
                    <Share2 size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg">
                    <MoreVertical size={14} />
                  </Button>
                </div>

                <div className="w-full h-32 rounded-2xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                  {getFileIcon(file.mimeType)}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors" title={file.originalName || file.name}>
                      {file.originalName || file.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[9px] font-black uppercase tracking-widest px-2">
                        {file.project.name}
                      </Badge>
                      <span className="text-[10px] text-mutedForeground font-bold uppercase tracking-tighter">
                        {formatSize(file.size)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-mutedForeground/60 font-bold uppercase">Uploaded By</span>
                      <span className="text-xs font-bold text-foreground/80">{file.uploadedBy.name}</span>
                    </div>
                    <Button asChild variant="ghost" size="icon" className="h-9 w-9 bg-muted/40 hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm">
                      <a href={`/uploads/${file.key}`} download={file.originalName || file.name}>
                        <Download size={16} />
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-24 border-border/40 bg-card rounded-[3rem] border-dashed flex flex-col items-center justify-center text-center space-y-6 opacity-40">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-mutedForeground">
              <File size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground">No files found</h3>
              <p className="text-mutedForeground max-w-sm mx-auto font-medium">
                {search
                  ? `Nothing matched your search for "${search}".`
                  : "Upload assets within individual projects to see them collected here."}
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
