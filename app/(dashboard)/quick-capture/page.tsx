"use client";

import { useState } from "react";
import { useCaptures, useClients } from "@/lib/db";
import {
  Capture,
  CaptureType,
  CaptureTimeframe,
  CaptureRelatedTo,
  AGENCY_TYPES,
  AGENCY_TYPE_HEX,
  AGENCY_TYPE_EMOJI,
  getClientColor,
  generateId,
  today,
  addDays,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Zap, Check, Trash2, Lightbulb, Bell, NotebookPen,
  Calendar as CalendarIcon, Edit2, X,
} from "lucide-react";

const IDEA_EMOJIS = ["💡", "🎯", "🚀", "⭐", "✨", "🔥", "📝", "💭", "🌟", "💪", "🎨", "📈"];
const REMINDER_EMOJIS = ["🔔", "⏰", "📅", "🎉", "💳", "📌", "⚠️", "🎂", "📞", "💰", "🏦", "📧"];

const TIMEFRAMES: CaptureTimeframe[] = ["1-2 weeks", "2-3 weeks", "after a month"];
const TIMEFRAME_HEX: Record<CaptureTimeframe, string> = {
  "1-2 weeks": "#10b981",
  "2-3 weeks": "#f59e0b",
  "after a month": "#8b5cf6",
};

const LEARNING_SOURCES = ["YouTube", "Webinar", "Book", "PDF", "Document", "AI Tool", "Other"];

const RELATED_LABEL: Record<CaptureRelatedTo, string> = {
  client: "Client",
  agency: "Agency Work",
  learning: "Learning",
  other: "Other",
};

const RELATED_HEX: Record<CaptureRelatedTo, string> = {
  client: "#3b82f6",
  agency: "#f59e0b",
  learning: "#10b981",
  other: "#64748b",
};

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const todayStr = today();
  const [y1, m1, d1] = todayStr.split("-").map(Number);
  const [y2, m2, d2] = dateStr.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

export default function QuickCapturePage() {
  const { captures, addCapture, updateCapture, deleteCapture, clearProcessed } = useCaptures();
  const { clients } = useClients();
  const [mode, setMode] = useState<CaptureType>("quick");
  const [filter, setFilter] = useState<"inbox" | "ideas" | "reminders" | "processed" | "all">("inbox");
  const [filterRelated, setFilterRelated] = useState<CaptureRelatedTo | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state (per-mode)
  const [quickInput, setQuickInput] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc, setIdeaDesc] = useState("");
  const [ideaEmoji, setIdeaEmoji] = useState("💡");
  const [ideaTimeframe, setIdeaTimeframe] = useState<CaptureTimeframe>("1-2 weeks");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDesc, setReminderDesc] = useState("");
  const [reminderEmoji, setReminderEmoji] = useState("🔔");
  const [reminderDate, setReminderDate] = useState(addDays(today(), 7));

  // Shared "Related to" state
  const [relCat, setRelCat] = useState<CaptureRelatedTo | "">("");
  const [relVal, setRelVal] = useState<string>("");

  function resetForms() {
    setQuickInput("");
    setIdeaTitle("");
    setIdeaDesc("");
    setIdeaEmoji("💡");
    setIdeaTimeframe("1-2 weeks");
    setReminderTitle("");
    setReminderDesc("");
    setReminderEmoji("🔔");
    setReminderDate(addDays(today(), 7));
    setRelCat("");
    setRelVal("");
  }

  function buildPayload(): Partial<Capture> | null {
    if (mode === "quick") {
      if (!quickInput.trim()) return null;
      return {
        type: "quick",
        description: quickInput.trim(),
      };
    }
    if (mode === "idea") {
      if (!ideaTitle.trim()) return null;
      return {
        type: "idea",
        title: ideaTitle.trim(),
        description: ideaDesc.trim() || undefined,
        emoji: ideaEmoji,
        timeframe: ideaTimeframe,
      };
    }
    // reminder
    if (!reminderTitle.trim() || !reminderDate) return null;
    return {
      type: "reminder",
      title: reminderTitle.trim(),
      description: reminderDesc.trim() || undefined,
      emoji: reminderEmoji,
      reminderDate,
    };
  }

  function handleSave() {
    const base = buildPayload();
    if (!base) return;
    const related =
      relCat && relVal
        ? { relatedToCategory: relCat as CaptureRelatedTo, relatedToValue: relVal }
        : { relatedToCategory: undefined, relatedToValue: undefined };

    if (editingId) {
      updateCapture(editingId, { ...base, ...related });
      setEditingId(null);
    } else {
      const c: Capture = {
        id: generateId(),
        content: "",
        type: (base.type ?? "quick") as CaptureType,
        ...base,
        ...related,
        createdAt: new Date().toISOString(),
        processed: false,
      };
      addCapture(c);
    }
    resetForms();
  }

  function handleEdit(capture: Capture) {
    setEditingId(capture.id);
    setMode(capture.type);
    if (capture.type === "quick") {
      setQuickInput(capture.description ?? capture.content ?? "");
    } else if (capture.type === "idea") {
      setIdeaTitle(capture.title ?? "");
      setIdeaDesc(capture.description ?? "");
      setIdeaEmoji(capture.emoji ?? "💡");
      setIdeaTimeframe(capture.timeframe ?? "1-2 weeks");
    } else if (capture.type === "reminder") {
      setReminderTitle(capture.title ?? "");
      setReminderDesc(capture.description ?? "");
      setReminderEmoji(capture.emoji ?? "🔔");
      setReminderDate(capture.reminderDate ?? addDays(today(), 7));
    }
    setRelCat((capture.relatedToCategory ?? "") as CaptureRelatedTo | "");
    setRelVal(capture.relatedToValue ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    resetForms();
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

  // Filter
  const matchesRelated = (c: Capture) => {
    if (filterRelated === "all") return true;
    return c.relatedToCategory === filterRelated;
  };

  const filteredAll = captures.filter(matchesRelated);

  const quickItems = filteredAll.filter((c) => c.type === "quick");
  const ideaItems = filteredAll.filter((c) => c.type === "idea");
  const reminderItems = filteredAll.filter((c) => c.type === "reminder");

  const inboxCount = filteredAll.filter((c) => !c.processed && c.type === "quick").length;
  const ideasCount = ideaItems.filter((c) => !c.processed).length;
  const remindersCount = reminderItems.filter((c) => !c.processed).length;
  const processedCount = filteredAll.filter((c) => c.processed).length;

  // ─── UI bits ───────────────────────────────────────────────────────────────

  function RelatedBadge({ capture }: { capture: Capture }) {
    if (!capture.relatedToCategory) return null;
    const cat = capture.relatedToCategory;
    let label = capture.relatedToValue ?? "";
    let emoji = "";
    let hex = RELATED_HEX[cat];

    if (cat === "client") {
      const c = clients.find((cl) => cl.id === capture.relatedToValue);
      label = c?.name ?? "Client";
      if (c) hex = getClientColor(c.color).bg.replace("bg-", "").replace("-500", "");
      const color = c ? c.color : "blue";
      const colorMeta = getClientColor(color);
      // colorMeta.bg is the tailwind class; we'll use the hex from CLIENT_COLORS via getClientColor
      // For simplicity use a fixed mapping below
      hex = (() => {
        const found = ["blue","emerald","rose","amber","violet","teal","orange","pink","red","yellow","olive","navy","brown","cyan","indigo","slate"].includes(color)
          ? colorMeta : null;
        return found ? RELATED_HEX.client : RELATED_HEX.client;
      })();
      // simpler: just use a fixed blue chip for client; we'll show the actual client name
      hex = "#3b82f6";
    } else if (cat === "agency") {
      emoji = AGENCY_TYPE_EMOJI[capture.relatedToValue ?? "Others"] ?? "🔧";
      hex = AGENCY_TYPE_HEX[capture.relatedToValue ?? "Others"] ?? RELATED_HEX.agency;
    } else if (cat === "learning") {
      hex = RELATED_HEX.learning;
    } else if (cat === "other") {
      hex = RELATED_HEX.other;
    }

    return (
      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
        style={{ backgroundColor: `${hex}1f`, color: hex }}
        title={`Related to: ${RELATED_LABEL[cat]} — ${label || ""}`}
      >
        {emoji && <span>{emoji}</span>}
        <span>{label || RELATED_LABEL[cat]}</span>
      </span>
    );
  }

  function ActionButtons({ capture }: { capture: Capture }) {
    return (
      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
        <button
          onClick={() => handleEdit(capture)}
          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          aria-label="Edit"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => deleteCapture(capture.id)}
          className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  function renderQuickCard(capture: Capture) {
    return (
      <div
        key={capture.id}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border bg-card group",
          capture.processed && "opacity-60"
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
            {capture.description ?? capture.content}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-muted-foreground">
              {formatTime(capture.createdAt)}
            </span>
            <RelatedBadge capture={capture} />
          </div>
        </div>
        <ActionButtons capture={capture} />
      </div>
    );
  }

  function renderIdeaCard(capture: Capture) {
    const tfHex = capture.timeframe ? TIMEFRAME_HEX[capture.timeframe] : "#94a3b8";
    return (
      <div
        key={capture.id}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border bg-card group",
          capture.processed && "opacity-60"
        )}
      >
        <button
          onClick={() => toggleProcessed(capture.id)}
          className={cn(
            "mt-1 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
            capture.processed
              ? "bg-emerald-500 border-emerald-500"
              : "border-border hover:border-emerald-400"
          )}
        >
          {capture.processed && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-xl flex-shrink-0">
          {capture.emoji ?? "💡"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={cn(
                "text-sm font-semibold text-foreground",
                capture.processed && "line-through text-muted-foreground"
              )}
            >
              {capture.title}
            </h3>
            {capture.timeframe && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${tfHex}22`, color: tfHex }}
              >
                {capture.timeframe}
              </span>
            )}
            <RelatedBadge capture={capture} />
          </div>
          {capture.description && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {capture.description}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">{formatTime(capture.createdAt)}</p>
        </div>
        <ActionButtons capture={capture} />
      </div>
    );
  }

  function renderReminderCard(capture: Capture) {
    const days = capture.reminderDate ? daysUntil(capture.reminderDate) : null;
    const dueClass =
      days === null
        ? "text-muted-foreground"
        : days < 0
        ? "text-rose-600 font-semibold"
        : days === 0
        ? "text-amber-600 font-semibold"
        : days <= 3
        ? "text-amber-600 font-medium"
        : "text-emerald-600";
    const dueLabel =
      days === null
        ? ""
        : days < 0
        ? `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`
        : days === 0
        ? "Today"
        : days === 1
        ? "Tomorrow"
        : `In ${days} days`;
    return (
      <div
        key={capture.id}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border bg-card group",
          capture.processed && "opacity-60"
        )}
      >
        <button
          onClick={() => toggleProcessed(capture.id)}
          className={cn(
            "mt-1 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
            capture.processed
              ? "bg-emerald-500 border-emerald-500"
              : "border-border hover:border-emerald-400"
          )}
        >
          {capture.processed && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-xl flex-shrink-0">
          {capture.emoji ?? "🔔"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={cn(
                "text-sm font-semibold text-foreground",
                capture.processed && "line-through text-muted-foreground"
              )}
            >
              {capture.title}
            </h3>
            {dueLabel && <span className={cn("text-[11px]", dueClass)}>{dueLabel}</span>}
            <RelatedBadge capture={capture} />
          </div>
          {capture.description && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {capture.description}
            </p>
          )}
          {capture.reminderDate && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {formatDate(capture.reminderDate)}
            </p>
          )}
        </div>
        <ActionButtons capture={capture} />
      </div>
    );
  }

  function renderCard(c: Capture) {
    if (c.type === "idea") return renderIdeaCard(c);
    if (c.type === "reminder") return renderReminderCard(c);
    return renderQuickCard(c);
  }

  function renderList() {
    if (filter === "inbox") {
      const items = quickItems.filter((c) => !c.processed);
      if (items.length === 0) {
        return <div className="text-center py-16 text-muted-foreground text-sm">Inbox is clear.</div>;
      }
      return <div className="space-y-2">{items.map(renderQuickCard)}</div>;
    }
    if (filter === "ideas") {
      const active = ideaItems.filter((c) => !c.processed);
      if (active.length === 0) {
        return <div className="text-center py-16 text-muted-foreground text-sm">No ideas yet.</div>;
      }
      return (
        <div className="space-y-6">
          {TIMEFRAMES.map((tf) => {
            const items = active.filter((c) => c.timeframe === tf);
            if (items.length === 0) return null;
            const tfHex = TIMEFRAME_HEX[tf];
            return (
              <div key={tf}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tfHex }} />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {tf}{" "}
                    <span className="text-muted-foreground/60 normal-case font-normal">
                      · {items.length}
                    </span>
                  </h3>
                </div>
                <div className="space-y-2">{items.map(renderIdeaCard)}</div>
              </div>
            );
          })}
        </div>
      );
    }
    if (filter === "reminders") {
      const active = reminderItems
        .filter((c) => !c.processed)
        .sort((a, b) => (a.reminderDate ?? "").localeCompare(b.reminderDate ?? ""));
      if (active.length === 0) {
        return <div className="text-center py-16 text-muted-foreground text-sm">No reminders.</div>;
      }
      return <div className="space-y-2">{active.map(renderReminderCard)}</div>;
    }
    if (filter === "processed") {
      const items = filteredAll.filter((c) => c.processed);
      if (items.length === 0) {
        return (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Nothing marked done yet.
          </div>
        );
      }
      return <div className="space-y-2">{items.map(renderCard)}</div>;
    }
    if (filteredAll.length === 0) {
      return <div className="text-center py-16 text-muted-foreground text-sm">Nothing here.</div>;
    }
    return <div className="space-y-2">{filteredAll.map(renderCard)}</div>;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Quick Capture</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dump thoughts, ideas, or reminders. Sort later.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1.5 mb-3">
        {(
          [
            { key: "quick", label: "Quick note", icon: NotebookPen },
            { key: "idea", label: "Idea", icon: Lightbulb },
            { key: "reminder", label: "Reminder", icon: Bell },
          ] as { key: CaptureType; label: string; icon: typeof NotebookPen }[]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
              mode === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Capture form */}
      <div
        className={cn(
          "mb-6 p-4 bg-card border rounded-lg shadow-sm",
          editingId ? "border-primary/40 ring-2 ring-primary/30" : "border-border"
        )}
      >
        {editingId && (
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Editing capture</h3>
            <button
              onClick={handleCancelEdit}
              className="p-1 rounded hover:bg-secondary text-muted-foreground"
              aria-label="Cancel edit"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {mode === "quick" && (
          <>
            <textarea
              autoFocus
              placeholder="What's on your mind? Paste a link, jot an idea, note a task, anything..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave();
              }}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </>
        )}

        {mode === "idea" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Emoji:</span>
              {IDEA_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIdeaEmoji(e)}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors",
                    ideaEmoji === e ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-secondary"
                  )}
                >
                  {e}
                </button>
              ))}
              <input
                type="text"
                value={ideaEmoji}
                onChange={(e) => setIdeaEmoji(e.target.value.slice(0, 4))}
                placeholder="✏️"
                className="w-10 h-7 rounded-md border border-border bg-background text-base text-center focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Idea title (required)"
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              placeholder="Description (optional)"
              value={ideaDesc}
              onChange={(e) => setIdeaDesc(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">When to execute</p>
              <div className="flex flex-wrap gap-2">
                {TIMEFRAMES.map((tf) => {
                  const hex = TIMEFRAME_HEX[tf];
                  const active = ideaTimeframe === tf;
                  return (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setIdeaTimeframe(tf)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                        active ? "border-transparent" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      style={active ? { backgroundColor: `${hex}22`, color: hex } : undefined}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {mode === "reminder" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Emoji:</span>
              {REMINDER_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setReminderEmoji(e)}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors",
                    reminderEmoji === e ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-secondary"
                  )}
                >
                  {e}
                </button>
              ))}
              <input
                type="text"
                value={reminderEmoji}
                onChange={(e) => setReminderEmoji(e.target.value.slice(0, 4))}
                placeholder="✏️"
                className="w-10 h-7 rounded-md border border-border bg-background text-base text-center focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Reminder title (e.g. Notion subscription renewal)"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              placeholder="Description (optional)"
              value={reminderDesc}
              onChange={(e) => setReminderDesc(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-muted-foreground whitespace-nowrap">When:</label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Related-to picker — shared across modes */}
        <div className="mt-4 pt-3 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground">Related to (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRelCat("");
                setRelVal("");
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                relCat === ""
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              )}
            >
              None
            </button>
            {(Object.keys(RELATED_LABEL) as CaptureRelatedTo[]).map((cat) => {
              const hex = RELATED_HEX[cat];
              const active = relCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setRelCat(cat);
                    setRelVal("");
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    active ? "border-transparent" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                  style={active ? { backgroundColor: `${hex}22`, color: hex } : undefined}
                >
                  {RELATED_LABEL[cat]}
                </button>
              );
            })}
          </div>

          {relCat === "client" && (
            <select
              value={relVal}
              onChange={(e) => setRelVal(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Pick a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {relCat === "agency" && (
            <select
              value={relVal}
              onChange={(e) => setRelVal(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Pick an agency type…</option>
              {AGENCY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {AGENCY_TYPE_EMOJI[t]} {t}
                </option>
              ))}
            </select>
          )}

          {relCat === "learning" && (
            <select
              value={relVal}
              onChange={(e) => setRelVal(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Pick a source…</option>
              {LEARNING_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {relCat === "other" && (
            <input
              type="text"
              placeholder="What is it related to?"
              value={relVal}
              onChange={(e) => setRelVal(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">
            {mode === "quick" ? "Ctrl + Enter to capture" : "Click Save when ready"}
          </span>
          <div className="flex gap-2">
            {editingId && (
              <Button onClick={handleCancelEdit} variant="outline" size="sm">
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} size="sm">
              {mode === "quick" && !editingId && <Zap className="w-3.5 h-3.5 mr-1" />}
              {mode === "idea" && !editingId && <Lightbulb className="w-3.5 h-3.5 mr-1" />}
              {mode === "reminder" && !editingId && <Bell className="w-3.5 h-3.5 mr-1" />}
              {editingId ? "Save changes" : mode === "quick" ? "Capture" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "inbox", label: `Inbox (${inboxCount})` },
            { key: "ideas", label: `Ideas (${ideasCount})` },
            { key: "reminders", label: `Reminders (${remindersCount})` },
            { key: "processed", label: `Done (${processedCount})` },
            { key: "all", label: `All (${filteredAll.length})` },
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
            Clear all
          </button>
        )}
      </div>

      {/* Related-to filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[11px] text-muted-foreground">Related to:</span>
        <button
          onClick={() => setFilterRelated("all")}
          className={cn(
            "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
            filterRelated === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Any
        </button>
        {(Object.keys(RELATED_LABEL) as CaptureRelatedTo[]).map((cat) => {
          const hex = RELATED_HEX[cat];
          const active = filterRelated === cat;
          const count = captures.filter((c) => c.relatedToCategory === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterRelated(cat)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                active ? "border-transparent" : "border-border text-muted-foreground hover:text-foreground"
              )}
              style={active ? { backgroundColor: `${hex}22`, color: hex } : undefined}
            >
              {RELATED_LABEL[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Captures list */}
      {renderList()}
    </div>
  );
}
