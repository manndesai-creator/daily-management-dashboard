"use client";

import { useMemo, useRef, useState } from "react";
import { useCaptures, useClients } from "@/lib/db";
import { useEscapeClose } from "@/lib/use-escape-close";
import { useAutoSize } from "@/lib/use-autosize";
import {
  Capture,
  CaptureAttachment,
  CaptureType,
  CaptureTimeframe,
  CaptureRelatedTo,
  AGENCY_TYPES,
  AGENCY_TYPE_HEX,
  getClientColor,
  generateId,
  today,
  addDays,
  extractYouTubeId,
} from "@/lib/store";
import {
  uploadCaptureFile,
  deleteCaptureFile,
  isImageType,
  isPdfType,
  formatFileSize,
} from "@/lib/storage";
import { readableOnTint, tintedBg } from "@/lib/contrast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Zap, Check, Trash2, Lightbulb, Bell, NotebookPen,
  Calendar as CalendarIcon, Edit2, X, Paperclip, FileText,
  Link as LinkIcon, Upload, ExternalLink, Youtube, Image as ImageIcon,
  Download, Loader2,
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

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function daysUntil(dateStr: string): number {
  const todayStr = today();
  const [y1, m1, d1] = todayStr.split("-").map(Number);
  const [y2, m2, d2] = dateStr.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

function AttachmentEditor({
  attachment,
  onChange,
  onRemove,
}: {
  attachment: CaptureAttachment;
  onChange: (patch: Partial<CaptureAttachment>) => void;
  onRemove: () => void;
}) {
  const a = attachment;

  if (a.type === "text") {
    return (
      <div className="border border-border rounded-md p-3 bg-background">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <FileText className="w-3 h-3" />
            Note
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="tap-target p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
            aria-label="Remove note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          type="text"
          placeholder="Note title (optional)"
          value={a.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium mb-2 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <textarea
          placeholder="Paste long notes, doc content, snippets…"
          value={a.content}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-y"
        />
      </div>
    );
  }

  if (a.type === "link") {
    const domain = a.content ? getDomain(a.content) : "";
    return (
      <div className="border border-border rounded-md p-3 bg-background">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {a.youtubeId ? (
              <Youtube className="w-3 h-3 text-rose-500" />
            ) : (
              <LinkIcon className="w-3 h-3" />
            )}
            Link
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="tap-target p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
            aria-label="Remove link"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          type="text"
          placeholder="Optional label (e.g. Reference doc)"
          value={a.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="url"
          placeholder="Paste any URL — YouTube, article, doc, anywhere"
          value={a.content}
          onChange={(e) => onChange({ content: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {a.youtubeId && a.thumbnail && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={a.thumbnail}
              alt=""
              className="w-20 h-12 object-cover rounded border border-border"
            />
            <span className="text-[11px] text-muted-foreground">
              YouTube · preview will show in the saved view
            </span>
          </div>
        )}
        {!a.youtubeId && a.content && domain && (
          <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
              alt=""
              className="w-3 h-3 rounded"
            />
            {domain}
          </p>
        )}
      </div>
    );
  }

  // file
  const fileIsImage = isImageType(a.fileType);
  const fileIsPdf = isPdfType(a.fileType);
  return (
    <div className="border border-border rounded-md p-3 bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {fileIsImage ? (
            <ImageIcon className="w-3 h-3" />
          ) : (
            <FileText className="w-3 h-3" />
          )}
          File
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="tap-target p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
          aria-label="Remove file"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        {fileIsImage ? (
          <img
            src={a.content}
            alt=""
            className="w-14 h-14 object-cover rounded border border-border flex-shrink-0"
          />
        ) : (
          <div
            className={cn(
              "w-14 h-14 rounded flex items-center justify-center flex-shrink-0",
              fileIsPdf ? "bg-rose-50 text-rose-600" : "bg-secondary text-muted-foreground"
            )}
          >
            <FileText className="w-6 h-6" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{a.fileName ?? "File"}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatFileSize(a.fileSize)}
            {a.fileType && ` · ${a.fileType}`}
          </p>
        </div>
        <a
          href={a.content}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          aria-label="Open file"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function QuickCapturePage() {
  const { captures, addCapture, updateCapture, deleteCapture, clearProcessed } = useCaptures();
  const { clients } = useClients();
  const [mode, setMode] = useState<CaptureType>("quick");
  const [filter, setFilter] = useState<"notes" | "ideas" | "reminders" | "processed" | "all">("all");
  const [filterRelated, setFilterRelated] = useState<CaptureRelatedTo | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingCaptureId, setViewingCaptureId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<CaptureAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEscapeClose(viewingCaptureId !== null, () => setViewingCaptureId(null));

  const quickTextRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state (per-mode)
  const [quickInput, setQuickInput] = useState("");
  useAutoSize(quickTextRef, quickInput);
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
    setAttachments([]);
    setUploadError(null);
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
    const attachmentPayload = attachments.length > 0 ? attachments : undefined;

    if (editingId) {
      updateCapture(editingId, { ...base, ...related, attachments: attachmentPayload });
      setEditingId(null);
    } else {
      const c: Capture = {
        id: generateId(),
        content: "",
        type: (base.type ?? "quick") as CaptureType,
        ...base,
        ...related,
        attachments: attachmentPayload,
        createdAt: new Date().toISOString(),
        processed: false,
      };
      addCapture(c);
    }
    resetForms();
  }

  function addTextAttachment() {
    setAttachments((prev) => [
      ...prev,
      {
        id: generateId(),
        type: "text",
        content: "",
        title: "",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function addLinkAttachment() {
    setAttachments((prev) => [
      ...prev,
      {
        id: generateId(),
        type: "link",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  async function uploadFileAttachment(file: File) {
    setUploadError(null);
    setUploading(true);
    const attachmentId = generateId();
    const result = await uploadCaptureFile(attachmentId, file);
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    setAttachments((prev) => [
      ...prev,
      {
        id: attachmentId,
        type: "file",
        content: result.url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storagePath: result.path,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await uploadFileAttachment(files[i]);
    }
    e.target.value = "";
  }

  async function removeAttachment(attachmentId: string) {
    const target = attachments.find((a) => a.id === attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    if (target?.type === "file" && target.storagePath) {
      await deleteCaptureFile(target.storagePath);
    }
  }

  function updateAttachment(attachmentId: string, patch: Partial<CaptureAttachment>) {
    setAttachments((prev) =>
      prev.map((a) => {
        if (a.id !== attachmentId) return a;
        const next = { ...a, ...patch };
        // For links, refresh derived YouTube id when URL changes
        if (next.type === "link" && "content" in patch) {
          const ytId = extractYouTubeId(next.content) ?? undefined;
          next.youtubeId = ytId;
          next.thumbnail = ytId
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            : undefined;
        }
        return next;
      })
    );
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
    setAttachments(capture.attachments ? [...capture.attachments] : []);
    setUploadError(null);
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

  // Filters and counts only depend on the captures list + the related-to
  // filter. Memoising keeps form inputs from re-deriving 9 arrays on every
  // keystroke.
  const filteredAll = useMemo(
    () =>
      captures.filter((c) => {
        if (filterRelated === "all") return true;
        return c.relatedToCategory === filterRelated;
      }),
    [captures, filterRelated]
  );

  const { quickItems, ideaItems, reminderItems } = useMemo(
    () => ({
      quickItems: filteredAll.filter((c) => c.type === "quick"),
      ideaItems: filteredAll.filter((c) => c.type === "idea"),
      reminderItems: filteredAll.filter((c) => c.type === "reminder"),
    }),
    [filteredAll]
  );

  const { notesCount, allActiveCount, ideasCount, remindersCount, processedCount } =
    useMemo(
      () => ({
        notesCount: filteredAll.filter(
          (c) => !c.processed && c.type === "quick"
        ).length,
        allActiveCount: filteredAll.filter((c) => !c.processed).length,
        ideasCount: ideaItems.filter((c) => !c.processed).length,
        remindersCount: reminderItems.filter((c) => !c.processed).length,
        processedCount: filteredAll.filter((c) => c.processed).length,
      }),
      [filteredAll, ideaItems, reminderItems]
    );

  // ─── UI bits ───────────────────────────────────────────────────────────────

  function RelatedBadge({ capture }: { capture: Capture }) {
    if (!capture.relatedToCategory) return null;
    const cat = capture.relatedToCategory;
    let label = capture.relatedToValue ?? "";
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
      hex = AGENCY_TYPE_HEX[capture.relatedToValue ?? "Others"] ?? RELATED_HEX.agency;
    } else if (cat === "learning") {
      hex = RELATED_HEX.learning;
    } else if (cat === "other") {
      hex = RELATED_HEX.other;
    }

    return (
      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
        style={{ backgroundColor: tintedBg(hex), color: readableOnTint(hex) }}
        title={`Related to: ${RELATED_LABEL[cat]} — ${label || ""}`}
      >
        <span>{label || RELATED_LABEL[cat]}</span>
      </span>
    );
  }

  function ActionButtons({ capture }: { capture: Capture }) {
    const count = capture.attachments?.length ?? 0;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center items-end gap-0.5 sm:gap-1 flex-shrink-0">
        {count > 0 && (
          <button
            onClick={() => setViewingCaptureId(capture.id)}
            className="tap-target flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            aria-label={`${count} attachment${count !== 1 ? "s" : ""}`}
            title={`${count} attachment${count !== 1 ? "s" : ""} — click to view`}
          >
            <Paperclip className="w-3 h-3" />
            {count}
          </button>
        )}
        <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
          <button
            onClick={() => handleEdit(capture)}
            className="tap-target p-0.5 sm:p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Edit"
          >
            <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={async () => {
              for (const a of capture.attachments ?? []) {
                if (a.type === "file" && a.storagePath) {
                  await deleteCaptureFile(a.storagePath);
                }
              }
              deleteCapture(capture.id);
            }}
            className="tap-target p-0.5 sm:p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
            aria-label="Delete"
          >
            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  function renderQuickCard(capture: Capture) {
    return (
      <div
        key={capture.id}
        className={cn(
          "flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-card group",
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
          "flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-card group",
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
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary text-lg sm:text-xl flex-shrink-0">
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
          "flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-card group",
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
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary text-lg sm:text-xl flex-shrink-0">
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
    if (filter === "notes") {
      const items = quickItems.filter((c) => !c.processed);
      if (items.length === 0) {
        return (
          <div className="text-center py-12 px-4 rounded-lg border border-dashed border-border bg-card/40 emil-fade-up">
            <p className="text-sm font-medium text-foreground">No active notes.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Switch to Quick note above and dump anything that&apos;s on your
              mind. Sort it later.
            </p>
          </div>
        );
      }
      return <div className="space-y-2">{items.map(renderQuickCard)}</div>;
    }
    if (filter === "ideas") {
      const active = ideaItems.filter((c) => !c.processed);
      if (active.length === 0) {
        return (
          <div className="text-center py-12 px-4 rounded-lg border border-dashed border-border bg-card/40 emil-fade-up">
            <p className="text-sm font-medium text-foreground">No ideas yet.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Pick Idea above and capture a rough thought. Tag it with a
              timeframe so it sorts itself when you come back.
            </p>
          </div>
        );
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
        return (
          <div className="text-center py-12 px-4 rounded-lg border border-dashed border-border bg-card/40 emil-fade-up">
            <p className="text-sm font-medium text-foreground">No reminders.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Subscription renewals, birthdays, follow-ups. Pick Reminder
              above and give it a date.
            </p>
          </div>
        );
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
    // "all" tab — everything that's still active (not yet ticked off)
    const allActive = filteredAll.filter((c) => !c.processed);
    if (allActive.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nothing active. Check the Done tab to see completed captures.
        </div>
      );
    }
    return <div className="space-y-2">{allActive.map(renderCard)}</div>;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
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

      {/* Capture form + Related-to panel */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4">
      <div
        className={cn(
          "flex-1 p-4 bg-card border rounded-lg shadow-sm",
          editingId ? "border-primary/40 ring-2 ring-primary/30" : "border-border"
        )}
      >
        {editingId && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Editing capture</h2>
            <button
              onClick={handleCancelEdit}
              className="tap-target p-1 rounded hover:bg-secondary text-muted-foreground"
              aria-label="Cancel edit"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {mode === "quick" && (
          <>
            <textarea
              ref={quickTextRef}
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

        {/* Related-to picker — inline in the form for the capture being saved */}
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
            {(["client", "agency", "learning", "other"] as CaptureRelatedTo[]).map((cat) => {
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
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
                    active ? "border-transparent" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                  style={active ? { backgroundColor: `${hex}22`, color: hex } : undefined}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: hex }}
                  />
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
                  {t}
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

        {/* Attachments — applies to any capture type */}
        <div className="mt-4 pt-3 border-t border-border space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="w-3 h-3" />
              Attachments{" "}
              <span className="text-muted-foreground/70">({attachments.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={addTextAttachment}
                className="text-[11px] px-2 py-1 rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                Note
              </button>
              <button
                type="button"
                onClick={addLinkAttachment}
                className="text-[11px] px-2 py-1 rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1"
              >
                <LinkIcon className="w-3 h-3" />
                Link
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[11px] px-2 py-1 rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                {uploading ? "Uploading…" : "File"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {uploadError && (
            <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
              {uploadError}
            </div>
          )}

          {attachments.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 italic">
              Add long notes, links, PDFs or images you want to keep with this capture.
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((a) => (
                <AttachmentEditor
                  key={a.id}
                  attachment={a}
                  onChange={(patch) => updateAttachment(a.id, patch)}
                  onRemove={() => removeAttachment(a.id)}
                />
              ))}
            </div>
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

      {/* Right-side Search panel — filter the list by Related to */}
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Search by related
            </h3>
            {filterRelated !== "all" && (
              <button
                type="button"
                onClick={() => setFilterRelated("all")}
                className="text-[10px] text-primary hover:underline"
              >
                clear
              </button>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setFilterRelated("all")}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs text-left transition-colors",
                filterRelated === "all"
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <span className="truncate">All captures</span>
              </span>
              <span className="text-[10px] tabular-nums opacity-70">
                {captures.length}
              </span>
            </button>

            {(["client", "agency", "learning", "other"] as CaptureRelatedTo[]).map((cat) => {
              const hex = RELATED_HEX[cat];
              const active = filterRelated === cat;
              const count = captures.filter((c) => c.relatedToCategory === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterRelated(cat)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs text-left transition-colors",
                    active ? "font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                  style={active ? { backgroundColor: `${hex}1a`, color: hex } : undefined}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="truncate">{RELATED_LABEL[cat]}</span>
                  </span>
                  <span className="text-[10px] tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          {filterRelated !== "all" && (
            <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border">
              Showing captures connected to{" "}
              <span className="font-medium">{RELATED_LABEL[filterRelated as CaptureRelatedTo]}</span> only.
            </p>
          )}
        </div>
      </aside>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "all", label: `All (${allActiveCount})` },
            { key: "notes", label: `Notes (${notesCount})` },
            { key: "ideas", label: `Ideas (${ideasCount})` },
            { key: "reminders", label: `Reminders (${remindersCount})` },
            { key: "processed", label: `Done (${processedCount})` },
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


      {/* Captures list */}
      {renderList()}

      {/* View attachments modal */}
      {viewingCaptureId &&
        (() => {
          const cap = captures.find((c) => c.id === viewingCaptureId);
          if (!cap) return null;
          const list = cap.attachments ?? [];
          const heading = cap.title ?? cap.description ?? cap.content ?? "Capture";
          return (
            <div
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 emil-modal-backdrop"
              onClick={() => setViewingCaptureId(null)}
            >
              <div
                className="bg-card rounded-lg max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto shadow-xl emil-modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {cap.emoji && (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl flex-shrink-0">
                        {cap.emoji}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-foreground break-words">
                        {heading}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(cap.createdAt)}
                        {cap.timeframe && ` · ${cap.timeframe}`}
                        {cap.reminderDate && ` · due ${formatDate(cap.reminderDate)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingCaptureId(null)}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {cap.description && cap.type !== "quick" && (
                  <div className="mb-4 p-3 bg-secondary/40 rounded-md text-sm whitespace-pre-wrap text-foreground/90">
                    {cap.description}
                  </div>
                )}

                <div className="mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Attachments ({list.length})
                  </p>
                </div>

                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No attachments yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {list.map((a) => (
                      <AttachmentViewer key={a.id} attachment={a} />
                    ))}
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-border flex justify-end gap-2">
                  <Button
                    onClick={() => setViewingCaptureId(null)}
                    variant="outline"
                    size="sm"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setViewingCaptureId(null);
                      handleEdit(cap);
                    }}
                    size="sm"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

function AttachmentViewer({ attachment }: { attachment: CaptureAttachment }) {
  const a = attachment;

  if (a.type === "text") {
    return (
      <div className="border border-border rounded-md bg-background overflow-hidden">
        <div className="px-3 py-2 bg-secondary/40 border-b border-border flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{a.title || "Note"}</span>
        </div>
        <div className="p-3 text-sm whitespace-pre-wrap break-words text-foreground/90">
          {a.content || (
            <span className="text-muted-foreground italic">Empty note</span>
          )}
        </div>
      </div>
    );
  }

  if (a.type === "link") {
    const domain = getDomain(a.content);
    if (a.youtubeId && a.thumbnail) {
      return (
        <a
          href={a.content}
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-border rounded-md overflow-hidden hover:border-foreground/30 transition-colors group"
        >
          <div className="relative h-40 bg-secondary">
            <img
              src={a.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 text-[11px] bg-black/70 text-white px-1.5 py-0.5 rounded">
              <Youtube className="w-3 h-3" />
              YouTube
            </div>
          </div>
          <div className="p-2.5 flex items-center justify-between gap-2 bg-background">
            <span className="text-xs truncate">
              {a.title || a.content}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
          </div>
        </a>
      );
    }
    return (
      <a
        href={a.content}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 border border-border rounded-md p-3 bg-background hover:border-foreground/30 transition-colors group"
      >
        {domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt=""
            className="w-8 h-8 rounded bg-secondary p-1 flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0">
            <LinkIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {a.title && (
            <p className="text-xs font-medium truncate text-foreground">{a.title}</p>
          )}
          <p className="text-[11px] text-muted-foreground truncate">
            {domain || a.content}
          </p>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
      </a>
    );
  }

  // file
  const fileIsImage = isImageType(a.fileType);
  const fileIsPdf = isPdfType(a.fileType);

  if (fileIsImage) {
    return (
      <div className="border border-border rounded-md overflow-hidden bg-background">
        <a href={a.content} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={a.content}
            alt={a.fileName ?? ""}
            className="w-full max-h-80 object-contain bg-secondary/40"
          />
        </a>
        <div className="p-2.5 flex items-center justify-between gap-2 border-t border-border">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{a.fileName ?? "Image"}</p>
            <p className="text-[11px] text-muted-foreground">{formatFileSize(a.fileSize)}</p>
          </div>
          <a
            href={a.content}
            download={a.fileName}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border border-border rounded-md p-3 bg-background">
      <div
        className={cn(
          "w-12 h-12 rounded flex items-center justify-center flex-shrink-0",
          fileIsPdf ? "bg-rose-50 text-rose-600" : "bg-secondary text-muted-foreground"
        )}
      >
        <FileText className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{a.fileName ?? "File"}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatFileSize(a.fileSize)}
          {a.fileType && ` · ${a.fileType}`}
        </p>
      </div>
      <a
        href={a.content}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
        aria-label="Open"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <a
        href={a.content}
        download={a.fileName}
        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
        aria-label="Download"
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
