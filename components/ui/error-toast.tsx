"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { subscribeAppErrors, type AppErrorEvent } from "@/lib/app-errors";

/**
 * Listens to the in-app error bus and renders a soft toast in the
 * bottom-right corner. Each error gets a 6-second auto-dismiss; the user can
 * also close manually. Multiple errors stack.
 *
 * Mounted once in the dashboard layout so every page benefits without per-
 * page wiring.
 */
export function ErrorToastListener() {
  const [errors, setErrors] = useState<AppErrorEvent[]>([]);

  useEffect(() => {
    return subscribeAppErrors((next) => {
      setErrors((prev) => [...prev, next]);
      window.setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.id !== next.id));
      }, 6000);
    });
  }, []);

  function dismiss(id: string) {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100vw-3rem)] sm:w-auto pointer-events-none">
      {errors.map((err) => (
        <div
          key={err.id}
          role="status"
          aria-live="polite"
          className="bg-card border border-rose-200 shadow-lg rounded-lg p-3 pr-9 relative flex items-start gap-2.5 pointer-events-auto"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">
              {err.scope ?? "Something went wrong"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
              {err.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(err.id)}
            className="tap-target absolute top-2 right-2 text-muted-foreground hover:text-foreground rounded p-1"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
