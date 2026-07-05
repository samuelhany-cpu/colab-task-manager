"use client";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/cn";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-[400px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "p-4 rounded-xl shadow-lg border animate-in slide-in-from-right",
            toast.variant === "destructive"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-background text-foreground border-border",
          )}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              {toast.title && (
                <p className="font-bold text-sm">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-xs opacity-90">{toast.description}</p>
              )}
            </div>
            {/* Simple close button logic omitted for brevity, timeouts handle it */}
          </div>
        </div>
      ))}
    </div>
  );
}
