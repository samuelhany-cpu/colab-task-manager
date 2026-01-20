import { useState, useEffect, useCallback } from "react";
import {
  X,
  ExternalLink,
  Download,
  FileText,
  FileImage,
  File as FileIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  History,
  Clock,
  UploadCloud,
  Loader2,
  Video as VideoIcon,
  Music as MusicIcon,
} from "lucide-react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface FilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    key: string;
    originalName: string;
    mimeType: string;
    url: string;
    size: number;
  } | null;
  onNext?: () => void;
  onPrev?: () => void;
  onRefresh?: () => void;
}

interface FileVersion {
  id: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  versionNumber: number;
  createdAt: string;
  url: string;
  uploadedBy: { name: string };
}

export default function FilePreview({
  isOpen,
  onClose,
  file,
  onNext,
  onPrev,
  onRefresh,
}: FilePreviewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!file?.id) return;
    try {
      setLoadingVersions(true);
      const res = await fetch(`/api/files/${file.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (e) {
      console.error("Failed to fetch versions:", e);
    } finally {
      setLoadingVersions(false);
    }
  }, [file?.id]);

  useEffect(() => {
    if (showHistory && file?.id) {
      fetchVersions();
    }
  }, [file?.id, showHistory, fetchVersions]);

  const handleUploadVersion = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !file?.id) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`/api/files/${file.id}/versions`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchVersions();
        onRefresh?.();
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!file?.id) return;
    try {
      setRestoring(versionId);
      const res = await fetch(
        `/api/files/${file.id}/versions/${versionId}/restore`,
        {
          method: "POST",
        },
      );

      if (res.ok) {
        fetchVersions();
        onRefresh?.();
      }
    } catch (e) {
      console.error("Restore failed:", e);
    } finally {
      setRestoring(null);
    }
  };

  if (!isOpen || !file) return null;

  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";
  const isVideo = file.mimeType.startsWith("video/");
  const isAudio = file.mimeType.startsWith("audio/");

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const ZoomControls = () => {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    return (
      <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => zoomOut()}
          className="h-8 w-8 text-white/60 hover:text-white"
        >
          <ZoomOut size={16} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => zoomIn()}
          className="h-8 w-8 text-white/60 hover:text-white"
        >
          <ZoomIn size={16} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => resetTransform()}
          className="h-8 w-8 text-white/60 hover:text-white"
        >
          <RotateCcw size={16} />
        </Button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
            {isImage ? (
              <FileImage size={20} />
            ) : isPdf ? (
              <FileText size={20} />
            ) : isVideo ? (
              <VideoIcon size={20} />
            ) : isAudio ? (
              <MusicIcon size={20} />
            ) : (
              <FileIcon size={20} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-black text-white truncate max-w-[200px] sm:max-w-md">
              {file.originalName}
            </h3>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {formatSize(file.size)} • {file.mimeType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls will be rendered inside TransformWrapper if isImage is true */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
            asChild
          >
            <a href={file.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={20} />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
            asChild
          >
            <a href={file.url} download={file.originalName}>
              <Download size={20} />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-white/60 hover:text-white hover:bg-white/10 rounded-xl",
              showHistory && "bg-primary text-white",
            )}
            onClick={() => setShowHistory(!showHistory)}
          >
            <History size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl ml-2"
          >
            <X size={24} />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
        {/* Preview Content */}
        <main className="flex-1 overflow-hidden relative flex items-center justify-center p-4 sm:p-8">
          {/* Navigation Controls */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between z-[100] pointer-events-none">
            {onPrev ? (
              <button
                onClick={onPrev}
                className="pointer-events-auto w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:scale-110 transition-all shadow-xl"
              >
                <ChevronLeft size={32} />
              </button>
            ) : (
              <div />
            )}
            {onNext ? (
              <button
                onClick={onNext}
                className="pointer-events-auto w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:scale-110 transition-all shadow-xl"
              >
                <ChevronRight size={32} />
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            {isImage ? (
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={8}
                centerOnInit
              >
                <div className="absolute top-4 right-4 z-[100] sm:top-24 sm:right-10">
                  <ZoomControls />
                </div>
                <TransformComponent
                  wrapperClass="!w-full !h-full"
                  contentClass="!w-full !h-full flex items-center justify-center"
                >
                  <img
                    src={file.url}
                    alt={file.originalName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-500 cursor-zoom-in"
                  />
                </TransformComponent>
              </TransformWrapper>
            ) : isVideo ? (
              <div className="w-full max-w-5xl aspect-video bg-black/40 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 p-2">
                <video
                  src={file.url}
                  controls
                  className="w-full h-full rounded-[2rem] object-contain"
                  autoPlay
                />
              </div>
            ) : isAudio ? (
              <div className="bg-white/5 backdrop-blur-xl p-12 rounded-[4rem] w-full max-w-xl text-center space-y-8 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-8">
                <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto shadow-inner relative">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping opacity-20" />
                  <MusicIcon size={64} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">
                    {file.originalName}
                  </h2>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Audio track • {formatSize(file.size)}
                  </p>
                </div>
                <audio
                  src={file.url}
                  controls
                  className="w-full h-12 rounded-full appearance-none shadow-xl"
                  autoPlay
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={`${file.url}#toolbar=0`}
                className="w-full h-full max-w-5xl bg-white rounded-lg shadow-2xl animate-in fade-in duration-500 border-none"
                title={file.originalName}
              />
            ) : (
              <div className="flex flex-col items-center gap-8 text-center animate-in zoom-in-95">
                <div className="w-40 h-40 rounded-[3rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/10 shadow-inner group">
                  <FileIcon
                    size={80}
                    className="group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-white">
                    No Preview Available
                  </h2>
                  <p className="text-white/40 max-w-xs mx-auto text-sm font-medium leading-relaxed">
                    This file type ({file.mimeType}) cannot be previewed
                    directly. Download it to view on your device.
                  </p>
                </div>
                <Button
                  className="mt-4 bg-primary text-white hover:bg-primary/90 font-black rounded-2xl px-12 h-14 shadow-2xl shadow-primary/20 text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                  asChild
                >
                  <a href={file.url} download={file.originalName}>
                    Download Now
                  </a>
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Version History Sidebar */}
        {showHistory && (
          <aside className="w-80 border-l border-white/10 bg-black/40 backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10">
              <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Version History
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {loadingVersions ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/20">
                  <Loader2 className="animate-spin" size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Loading history...
                  </span>
                </div>
              ) : versions.length > 0 ? (
                versions.map((v: FileVersion) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-3xl bg-white/5 border border-white/5 space-y-3 group hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black uppercase border-primary/30 text-primary"
                      >
                        Version {v.versionNumber}
                      </Badge>
                      <span className="text-[10px] font-bold text-white/30">
                        {format(new Date(v.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-xs font-bold text-white truncate"
                        title={v.originalName}
                      >
                        {v.originalName}
                      </p>
                      <p className="text-[10px] font-bold text-white/30 mt-1 uppercase tracking-tighter">
                        {formatSize(v.size)} • {v.uploadedBy.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                        asChild
                      >
                        <a href={v.url} download={v.originalName}>
                          <Download size={12} className="mr-2" /> Download
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!!restoring}
                        onClick={() => handleRestore(v.id)}
                        className="flex-1 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20"
                      >
                        {restoring === v.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <RotateCcw size={12} className="mr-2" /> Restore
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/10 mx-auto">
                    <History size={24} />
                  </div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    No previous versions
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-black/20">
              <label className="block">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUploadVersion}
                  disabled={uploading}
                />
                <div
                  className={cn(
                    "w-full h-12 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 flex items-center justify-center gap-3 cursor-pointer transition-all",
                    uploading && "opacity-50 cursor-wait",
                  )}
                >
                  {uploading ? (
                    <Loader2 className="animate-spin text-primary" size={20} />
                  ) : (
                    <>
                      <UploadCloud size={20} className="text-white/40" />
                      <span className="text-xs font-black text-white/60 uppercase tracking-widest">
                        Upload New Version
                      </span>
                    </>
                  )}
                </div>
              </label>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
