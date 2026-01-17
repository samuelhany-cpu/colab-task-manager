"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Command,
  FileText,
  LayoutGrid,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface SearchResult {
  id: string;
  type: "TASK" | "PROJECT" | "FILE";
  title: string;
  subtitle: string;
  url: string;
}

interface GlobalSearchModalProps {
  workspaceSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({
  workspaceSlug,
  isOpen,
  onClose,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchResults = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&workspaceSlug=${workspaceSlug}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setLoading(false);
      }
    },
    [workspaceSlug],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + results.length) % Math.max(results.length, 1),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        router.push(results[selectedIndex].url);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300"
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex items-center p-4 border-b border-border bg-muted/30">
          <Search className="absolute left-6 text-mutedForeground" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for tasks, projects, or files... (Use ↑↓ to navigate)"
            className="w-full pl-12 pr-12 py-3 bg-transparent text-lg font-medium outline-none placeholder:text-mutedForeground/60"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute right-6 flex items-center gap-2 px-2 py-1 rounded bg-muted border border-border text-[10px] font-black text-mutedForeground">
            <Command size={10} /> K
          </div>
        </div>

        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4 text-mutedForeground">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-bold uppercase tracking-widest">
                Searching the workspace...
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => {
                    router.push(result.url);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl transition-all group text-left",
                    index === selectedIndex
                      ? "bg-primary text-primary-foreground shadow-lg scale-[1.01]"
                      : "hover:bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner",
                      index === selectedIndex ? "bg-white/20" : "bg-muted",
                    )}
                  >
                    {result.type === "TASK" ? (
                      <CheckCircle2 size={20} />
                    ) : result.type === "PROJECT" ? (
                      <LayoutGrid size={20} />
                    ) : (
                      <FileText size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{result.title}</p>
                    <p
                      className={cn(
                        "text-xs truncate",
                        index === selectedIndex
                          ? "text-white/70"
                          : "text-mutedForeground",
                      )}
                    >
                      {result.subtitle}
                    </p>
                  </div>
                  <ArrowRight
                    size={18}
                    className={cn(
                      "transition-all",
                      index === selectedIndex
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-2",
                    )}
                  />
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-12 text-center text-mutedForeground">
              <p className="text-lg font-black uppercase tracking-widest mb-2">
                No matches found
              </p>
              <p className="text-sm font-medium opacity-60">
                We couldn&apos;t find anything matching &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <div className="p-12 text-center text-mutedForeground/40">
              <div className="flex justify-center gap-8 mb-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    Tasks
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <LayoutGrid size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    Projects
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    Files
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium">
                Type at least 2 characters to start searching...
              </p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between px-6">
          <div className="flex gap-4">
            <div className="flex items-center gap-1 text-[10px] font-bold text-mutedForeground">
              <span className="px-1.5 py-0.5 rounded bg-muted border border-border">
                ↑↓
              </span>{" "}
              Navigate
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-mutedForeground">
              <span className="px-1.5 py-0.5 rounded bg-muted border border-border">
                Enter
              </span>{" "}
              Select
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-mutedForeground hover:text-foreground transition-colors"
          >
            Close Search
          </button>
        </div>
      </div>
    </div>
  );
}
