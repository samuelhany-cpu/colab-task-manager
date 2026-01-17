"use client";

import { useState, useEffect, use, useCallback } from "react";
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
  FolderPlus,
  ArrowRight,
  Folder as FolderIcon,
  ChevronRight,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FilePreview from "@/components/files/file-preview";
import MoveFileModal from "@/components/files/move-file-modal";
import { cn } from "@/lib/cn";

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
  url?: string;
}

interface Folder {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface Workspace {
  id: string;
  slug: string;
  name: string;
}

export default function AllFilesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([
    { id: "root", name: "All Files" },
  ]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [moveFile, setMoveFile] = useState<FileRecord | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const fetchWorkspaceData = useCallback(async () => {
    try {
      setLoadingWorkspace(true);
      const wsRes = await fetch("/api/workspaces");
      if (!wsRes.ok) return;
      const workspaces: Workspace[] = await wsRes.json();
      const workspace = workspaces.find((w) => w.slug === slug);

      if (workspace) {
        const pRes = await fetch(`/api/projects?workspaceId=${workspace.id}`);
        if (!pRes.ok) return;
        const projectsData = await pRes.json();
        setProjects(projectsData);

        // Fetch all files initially or based on filters
        let allFiles: FileRecord[] = [];
        let allFolders: Folder[] = [];

        if (selectedProjectId === "ALL") {
          for (const project of projectsData) {
            const fRes = await fetch(`/api/files?projectId=${project.id}`);
            const projectFiles = await fRes.json();
            if (Array.isArray(projectFiles)) {
              allFiles = [
                ...allFiles,
                ...projectFiles.map((f: FileRecord) => ({
                  ...f,
                  project: { name: project.name },
                })),
              ];
            }
          }
          setFolders([]); // Don't show folders in "All Projects" view to avoid confusion
        } else {
          // Fetch specific project files and folders
          const fRes = await fetch(`/api/files?projectId=${selectedProjectId}&folderId=${currentFolderId}`);
          const projectFiles = await fRes.json();
          if (Array.isArray(projectFiles)) {
            const project = projectsData.find((p: Project) => p.id === selectedProjectId);
            allFiles = projectFiles.map((f: FileRecord) => ({ ...f, project: { name: project?.name || "" } }));
          }

          const foldRes = await fetch(`/api/projects/${selectedProjectId}/folders`);
          if (foldRes.ok) {
            const foldersData = await foldRes.json();
            allFolders = foldersData.filter((f: Folder) =>
              currentFolderId === "root" ? !f.parentId : f.parentId === currentFolderId
            );
          }
          setFolders(allFolders);
        }
        setFiles(allFiles);
      }
    } catch (e) {
      console.error("Failed to fetch workspace data:", e);
    } finally {
      setLoadingWorkspace(false);
    }
  }, [slug, selectedProjectId, currentFolderId]);

  useEffect(() => {
    if (slug) fetchWorkspaceData();
  }, [slug, fetchWorkspaceData]);

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

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || selectedProjectId === "ALL") return;

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId === "root" ? null : currentFolderId,
        }),
      });

      if (res.ok) {
        setNewFolderName("");
        setShowNewFolderModal(false);
        fetchWorkspaceData();
      }
    } catch (e) {
      console.error("Failed to create folder:", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedProjectId === "ALL") return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProjectId);
      if (currentFolderId !== "root") {
        formData.append("folderId", currentFolderId);
      }

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchWorkspaceData();
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleNextFile = () => {
    if (!previewFile) return;
    const currentIndex = filteredFiles.findIndex(f => f.id === previewFile.id);
    if (currentIndex !== -1 && currentIndex < filteredFiles.length - 1) {
      setPreviewFile(filteredFiles[currentIndex + 1]);
    }
  };

  const handlePrevFile = () => {
    if (!previewFile) return;
    const currentIndex = filteredFiles.findIndex(f => f.id === previewFile.id);
    if (currentIndex > 0) {
      setPreviewFile(filteredFiles[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
      <header className="max-w-7xl mx-auto space-y-4">
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
              Workspace Files
            </h1>
            <p className="text-mutedForeground text-lg font-medium">
              Manage and storage for all assets in{" "}
              <span className="text-foreground font-bold">{slug}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedForeground"
                size={16}
              />
              <Input
                placeholder="Search files..."
                className="pl-10 h-11 rounded-xl bg-card border-border/50 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-2 bg-card border border-border/50 rounded-xl text-sm font-bold outline-none cursor-pointer h-11 min-w-[160px]"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setCurrentFolderId("root");
                setBreadcrumbs([{ id: "root", name: "All Files" }]);
              }}
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <Button
              variant="secondary"
              className="rounded-xl font-bold h-11 gap-2 px-6"
              disabled={selectedProjectId === "ALL"}
              onClick={() => setShowNewFolderModal(true)}
            >
              <FolderPlus size={18} />
              <span className="hidden sm:inline">New Folder</span>
            </Button>

            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading || selectedProjectId === "ALL"}
              />
              <Button
                asChild
                className="rounded-xl font-bold h-11 gap-2 px-6 shadow-lg shadow-primary/20"
                disabled={uploading || selectedProjectId === "ALL"}
              >
                <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  <span>{uploading ? "Uploading..." : "Upload File"}</span>
                </label>
              </Button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {selectedProjectId !== "ALL" && (
          <div className="flex items-center gap-2 p-2 px-4 bg-muted/40 rounded-xl border border-border/30 w-fit">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id} className="flex items-center gap-2">
                {idx > 0 && <ChevronRight size={14} className="text-mutedForeground" />}
                <button
                  onClick={() => {
                    setCurrentFolderId(crumb.id);
                    setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
                  }}
                  className={cn(
                    "text-xs font-bold transition-colors",
                    idx === breadcrumbs.length - 1 ? "text-primary" : "text-mutedForeground hover:text-foreground"
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto">
        {folders.length > 0 || filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Folders */}
            {folders.map((folder) => (
              <Card
                key={folder.id}
                onClick={() => {
                  setCurrentFolderId(folder.id);
                  setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
                }}
                className="p-6 group flex items-center gap-6 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all border-border/40 bg-card rounded-[2rem]"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-white transition-all">
                  <FolderIcon size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{folder.name}</h3>
                  <p className="text-[10px] font-black text-mutedForeground uppercase tracking-widest mt-0.5">Folder</p>
                </div>
                <ArrowRight size={20} className="text-mutedForeground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </Card>
            ))}

            {/* Files */}
            {filteredFiles.map((file) => (
              <Card
                key={file.id}
                onClick={() => {
                  setPreviewFile(file);
                  setShowPreview(true);
                }}
                className="p-6 group flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-border/40 bg-card rounded-[2rem] cursor-pointer"
              >
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <Share2 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveFile(file);
                      setShowMoveModal(true);
                    }}
                  >
                    <FolderOpen size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <MoreVertical size={14} />
                  </Button>
                </div>

                <div className="w-full h-32 rounded-2xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                  {getFileIcon(file.mimeType)}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3
                      className="font-bold text-foreground truncate group-hover:text-primary transition-colors"
                      title={file.originalName || file.name}
                    >
                      {file.originalName || file.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className="bg-primary/5 text-primary border-none text-[9px] font-black uppercase tracking-widest px-2"
                      >
                        {file.project.name}
                      </Badge>
                      <span className="text-[10px] text-mutedForeground font-bold uppercase tracking-tighter">
                        {formatSize(file.size)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-mutedForeground/60 font-bold uppercase">
                        Uploaded By
                      </span>
                      <span className="text-xs font-bold text-foreground/80">
                        {file.uploadedBy.name}
                      </span>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 bg-muted/40 hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={file.url}
                        download={file.originalName || file.name}
                      >
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
              <h3 className="text-2xl font-black text-foreground">
                No files found
              </h3>
              <p className="text-mutedForeground max-w-sm mx-auto font-medium">
                {search
                  ? `Nothing matched your search for "${search}".`
                  : "Upload assets within individual projects to see them collected here."}
              </p>
            </div>
          </Card>
        )}
      </main>

      <FilePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        file={previewFile ? { ...previewFile, url: previewFile.url || "" } : null}
        onNext={previewFile && filteredFiles.findIndex(f => f.id === previewFile.id) < filteredFiles.length - 1 ? handleNextFile : undefined}
        onPrev={previewFile && filteredFiles.findIndex(f => f.id === previewFile.id) > 0 ? handlePrevFile : undefined}
        onRefresh={fetchWorkspaceData}
      />

      <MoveFileModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        fileId={moveFile?.id || ""}
        projectId={selectedProjectId === "ALL" ? "" : selectedProjectId}
        onSuccess={fetchWorkspaceData}
      />

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-[400px] p-8 rounded-[1.5rem] shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <h2 className="text-xl font-bold mb-6">Create New Folder</h2>
            <form onSubmit={handleCreateFolder} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-mutedForeground">Folder Name</label>
                <Input
                  autoFocus
                  placeholder="Enter folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="rounded-xl h-12 bg-muted border-border/50 font-bold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="font-bold rounded-xl"
                  onClick={() => setShowNewFolderModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="font-bold rounded-xl px-8"
                  disabled={!newFolderName.trim()}
                >
                  Create
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
