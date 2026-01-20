"use client";

import { useState, useEffect } from "react";
import { Folder, X, Loader2, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface FolderItem {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
}

interface MoveFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  projectId: string;
  onSuccess: () => void;
}

export default function MoveFileModal({
  isOpen,
  onClose,
  fileId,
  projectId,
  onSuccess,
}: MoveFileModalProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFolders = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/folders`);
        if (res.ok) {
          const data = await res.json();
          setFolders(data);
        }
      } catch (error) {
        console.error("Failed to fetch folders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();
  }, [isOpen, projectId]);

  const handleMove = async () => {
    try {
      setMoving(true);
      const res = await fetch(`/api/files/${fileId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: selectedFolderId }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Move failed:", error);
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen) return null;

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl border-border/50 overflow-hidden animate-in zoom-in-95 duration-300 rounded-[2rem]">
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Folder size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Move File</h2>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                Select destination folder
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <Input
              placeholder="Search folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/50 border-border/50"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-bold",
                selectedFolderId === null
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "hover:bg-muted/50 text-muted-foreground",
              )}
            >
              <Folder size={16} />
              <span>Root Project Folder</span>
            </button>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground opacity-50">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Loading folders...
                </span>
              </div>
            ) : filteredFolders.length > 0 ? (
              filteredFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all text-sm font-bold",
                    selectedFolderId === folder.id
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Folder size={16} />
                    <span>{folder.name}</span>
                  </div>
                  <ChevronRight size={14} className="opacity-40" />
                </button>
              ))
            ) : search ? (
              <div className="py-12 text-center text-xs font-bold text-muted-foreground uppercase">
                No folders matched &quot;{search}&quot;
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-6 bg-muted/5 border-t border-border/50 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 rounded-xl font-bold h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={moving || loading}
            className="flex-[2] rounded-xl font-bold h-11 shadow-lg shadow-primary/20"
          >
            {moving ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={16} />
                Moving...
              </>
            ) : (
              "Move File Here"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
