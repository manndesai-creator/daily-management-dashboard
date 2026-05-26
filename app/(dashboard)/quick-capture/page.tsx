"use client";

import { useState } from "react";
import { useCaptures } from "@/lib/db";
import { Capture, generateId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap, Check, Trash2 } from "lucide-react";

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function QuickCapturePage() {
  const { captures, addCapture, updateCapture, deleteCapture, clearProcessed } = useCaptures();
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<"unprocessed" | "processed" | "all">("unprocessed");

  function handleCapture() {
    if (!input.trim()) return;
    const newCapture: Capture = {
      id: generateId(),
      content: input.trim(),
      createdAt: new Date().toISOString(),
      processed: false,
    };
    addCapture(newCapture);
    setInput("");
  }

  function toggleProcessed(id: string) {
    const capture = captures.find((c) => c.id === id);
    if (!capture) return;
    updateCapture(id, { processed: !capture.processed });
  }

  function handleClearProcessed() {
    if (confirm("Clear all processed captures?")) {
      clearProcessed();
    }
  }

  const unprocessedCount = captures.filter((c) => !c.processed).length;
  const processedCount = captures.filter((c) => c.processed).length;

  const filtered = captures.filter((c) => {
    if (filter === "unprocessed") return !c.processed;
    if (filter === "processed") return c.processed;
    return true;
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Quick Capture</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dump ideas, links, and thoughts instantly. Sort them later.
        </p>
      </div>

      {/* Capture input */}
      <div className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm">
        <textarea
          autoFocus
          placeholder="What's on your mind? Paste a link, jot an idea, note a task, anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCapture();
          }}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">Ctrl + Enter to capture</span>
          <Button onClick={handleCapture} size="sm">
            <Zap className="w-3.5 h-3.5 mr-1" />
            Capture
          </Button>
        </div>
      </div>

      {/* Filter + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          {[
            { key: "unprocessed", label: `Inbox (${unprocessedCount})` },
            { key: "processed", label: `Done (${processedCount})` },
            { key: "all", label: `All (${captures.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === key
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {processedCount > 0 && filter === "processed" && (
          <button
            onClick={handleClearProcessed}
            className="text-xs text-rose-600 hover:underline"
          >
            Clear processed
          </button>
        )}
      </div>

      {/* Captures list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">
            {filter === "unprocessed" ? "Inbox is clear." : "Nothing here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((capture) => (
            <div
              key={capture.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border bg-card group",
                capture.processed && "opacity-55"
              )}
            >
              <button
                onClick={() => toggleProcessed(capture.id)}
                className={cn(
                  "mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                  capture.processed
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-border hover:border-emerald-400"
                )}
              >
                {capture.processed && <Check className="w-2.5 h-2.5 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm whitespace-pre-wrap break-words",
                    capture.processed && "line-through text-muted-foreground"
                  )}
                >
                  {capture.content}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatTime(capture.createdAt)}
                </p>
              </div>

              <button
                onClick={() => deleteCapture(capture.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-all flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
