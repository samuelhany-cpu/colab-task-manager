"use client";

import { useState, useCallback, useEffect } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let count = 0;
const genId = () => {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
};

const listeners: Array<(toasts: Toast[]) => void> = [];
let memoryToasts: Toast[] = [];

export function toast({ title, description, variant }: Omit<Toast, "id">) {
  const id = genId();
  const newToast = { id, title, description, variant };
  memoryToasts = [...memoryToasts, newToast];
  listeners.forEach((listener) => listener(memoryToasts));

  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    listeners.forEach((listener) => listener(memoryToasts));
  }, 5000);

  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return { toasts, toast };
}
