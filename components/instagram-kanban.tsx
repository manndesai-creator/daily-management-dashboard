"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Film,
  Image,
  LayoutGrid,
  CircleDot,
  Users,
  Heart,
  TrendingUp,
  ImageIcon,
  Clock,
  Trash2,
  Tag,
  MoveRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type PostType = "Reel" | "Carousel" | "Single Image" | "Story";
type ColumnId =
  | "backlog"
  | "in-progress"
  | "ready"
  | "scheduled"
  | "published";

interface Post {
  id: string;
  caption: string;
  type: PostType;
  column: ColumnId;
  scheduledDate: string;
  tags: string[];
}

// ─── Column config ───────────────────────────────────────────────────────────

interface ColumnConfig {
  id: ColumnId;
  label: string;
  accentClass: string;   // colored dot / top bar
  ringClass: string;     // border color for card hover
  pillClass: string;     // count pill bg + text
  headerClass: string;   // column header bg
  bodyClass: string;     // column body bg
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "backlog",
    label: "Backlog",
    accentClass: "bg-zinc-500",
    ringClass: "hover:border-zinc-500/40",
    pillClass: "bg-zinc-500/20 text-zinc-300",
    headerClass: "border-zinc-500/25 bg-zinc-500/5",
    bodyClass: "bg-zinc-500/5",
  },
  {
    id: "in-progress",
    label: "In Progress",
    accentClass: "bg-blue-500",
    ringClass: "hover:border-blue-500/40",
    pillClass: "bg-blue-500/20 text-blue-300",
    headerClass: "border-blue-500/25 bg-blue-500/5",
    bodyClass: "bg-blue-500/5",
  },
  {
    id: "ready",
    label: "Ready to Create",
    accentClass: "bg-amber-500",
    ringClass: "hover:border-amber-500/40",
    pillClass: "bg-amber-500/20 text-amber-300",
    headerClass: "border-amber-500/25 bg-amber-500/5",
    bodyClass: "bg-amber-500/5",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    accentClass: "bg-primary",
    ringClass: "hover:border-primary/40",
    pillClass: "bg-primary/20 text-primary",
    headerClass: "border-primary/25 bg-primary/5",
    bodyClass: "bg-primary/5",
  },
  {
    id: "published",
    label: "Published",
    accentClass: "bg-green-500",
    ringClass: "hover:border-green-500/40",
    pillClass: "bg-green-500/20 text-green-300",
    headerClass: "border-green-500/25 bg-green-500/5",
    bodyClass: "bg-green-500/5",
  },
];

// ─── Post type config ────────────────────────────────────────────────────────

const POST_TYPES: PostType[] = ["Reel", "Carousel", "Single Image", "Story"];

const POST_TYPE_CONFIG: Record<
  PostType,
  { icon: React.ElementType; badgeClass: string; label: string }
> = {
  Reel: {
    icon: Film,
    badgeClass:
      "bg-purple-500/15 text-purple-400 border-purple-500/25",
    label: "Reel",
  },
  Carousel: {
    icon: LayoutGrid,
    badgeClass:
      "bg-blue-500/15 text-blue-400 border-blue-500/25",
    label: "Carousel",
  },
  "Single Image": {
    icon: Image,
    badgeClass:
      "bg-teal-500/15 text-teal-400 border-teal-500/25",
    label: "Single Image",
  },
  Story: {
    icon: CircleDot,
    badgeClass:
      "bg-pink-500/15 text-pink-400 border-pink-500/25",
    label: "Story",
  },
};

// ─── Seed data ───────────────────────────────────────────────────────────────

const INITIAL_POSTS: Post[] = [
  // Backlog
  {
    id: "1",
    caption:
      "Holi Festival Campaign — showcase our outdoor hoardings across Jaipur's key intersections with vibrant colour bursts.",
    type: "Reel",
    column: "backlog",
    scheduledDate: "2026-04-20",
    tags: ["festival", "OOH"],
  },
  {
    id: "2",
    caption:
      "Behind the scenes at our design studio — how we ideate bold brand campaigns from a blank canvas.",
    type: "Single Image",
    column: "backlog",
    scheduledDate: "",
    tags: ["BTS", "branding"],
  },
  // In Progress
  {
    id: "3",
    caption:
      "Jaipur Heritage Tour promotion for our hotel client — 5 stunning locations captured in 60 seconds.",
    type: "Reel",
    column: "in-progress",
    scheduledDate: "2026-04-16",
    tags: ["tourism", "client"],
  },
  {
    id: "4",
    caption:
      "Summer drink campaign for F&B client. Vibrant colours, beat-drop transition, lifestyle-focused storytelling.",
    type: "Carousel",
    column: "in-progress",
    scheduledDate: "2026-04-18",
    tags: ["F&B", "summer"],
  },
  {
    id: "5",
    caption:
      "Rajasthan craft brands spotlight — a 5-slide carousel celebrating local artisans we've partnered with.",
    type: "Carousel",
    column: "in-progress",
    scheduledDate: "2026-04-19",
    tags: ["local", "craft"],
  },
  // Ready to Create
  {
    id: "6",
    caption:
      "Glokal 5th Anniversary — thank-you post highlighting milestones, client wins, and team achievements.",
    type: "Carousel",
    column: "ready",
    scheduledDate: "2026-04-10",
    tags: ["milestone", "team"],
  },
  {
    id: "7",
    caption:
      "Client testimonial from Rajasthan Motors — short-form story with quote card and logo reveal.",
    type: "Story",
    column: "ready",
    scheduledDate: "2026-04-11",
    tags: ["testimonial", "client"],
  },
  // Scheduled
  {
    id: "8",
    caption:
      "Glokal team introduction reel — meet the creative minds behind Jaipur's boldest advertising campaigns.",
    type: "Reel",
    column: "scheduled",
    scheduledDate: "2026-04-09",
    tags: ["team", "brand"],
  },
  {
    id: "9",
    caption:
      "Product launch post for a Jaipur-based D2C startup — teaser with 3D-rendered packaging reveal.",
    type: "Carousel",
    column: "scheduled",
    scheduledDate: "2026-04-12",
    tags: ["launch", "D2C"],
  },
  {
    id: "10",
    caption:
      "Monsoon Campaign teaser — moody, cinematic visuals building anticipation for our upcoming billboard reveal.",
    type: "Single Image",
    column: "scheduled",
    scheduledDate: "2026-04-15",
    tags: ["monsoon", "teaser"],
  },
  // Published
  {
    id: "11",
    caption:
      "New Year 2026 Campaign reel — a bold year-in-review of our best outdoor campaigns across Rajasthan.",
    type: "Reel",
    column: "published",
    scheduledDate: "2026-01-01",
    tags: ["newyear"],
  },
  {
    id: "12",
    caption:
      "Republic Day creative — patriotic colour palette celebrating Rajasthan's rich cultural heritage.",
    type: "Single Image",
    column: "published",
    scheduledDate: "2026-01-26",
    tags: ["republic day"],
  },
  {
    id: "13",
    caption:
      "Women's Day — spotlighting the talented women who lead our creative and client success teams.",
    type: "Story",
    column: "published",
    scheduledDate: "2026-03-08",
    tags: ["womensday", "team"],
  },
  {
    id: "14",
    caption:
      "Glokal Portfolio Showcase — a carousel of our top 10 campaigns from Q1 2026, from concept to completion.",
    type: "Carousel",
    column: "published",
    scheduledDate: "2026-03-15",
    tags: ["portfolio"],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post;
  colIndex: number;
  onMove: (id: string, direction: "left" | "right") => void;
  onDelete: (id: string) => void;
}

function PostCard({ post, colIndex, onMove, onDelete }: PostCardProps) {
  const typeConfig = POST_TYPE_CONFIG[post.type];
  const TypeIcon = typeConfig.icon;
  const isFirst = colIndex === 0;
  const isLast = colIndex === COLUMNS.length - 1;
  const prevColLabel = !isFirst ? COLUMNS[colIndex - 1].label.split(" ")[0] : "";
  const nextColLabel = !isLast ? COLUMNS[colIndex + 1].label.split(" ")[0] : "";
  const col = COLUMNS[colIndex];

  const formattedDate = post.scheduledDate
    ? new Date(post.scheduledDate + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={cn(
        "group relative bg-card border border-border rounded-lg p-3.5 transition-all duration-150",
        col.ringClass
      )}
    >
      {/* Top row: type badge + delete */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0",
            typeConfig.badgeClass
          )}
        >
          <TypeIcon className="w-2.5 h-2.5" />
          {post.type}
        </span>

        <button
          onClick={() => onDelete(post.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/15 flex-shrink-0"
          title="Delete post"
        >
          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {/* Caption */}
      <p className="text-xs text-foreground leading-relaxed line-clamp-3 mb-3">
        {post.caption}
      </p>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
            >
              <Tag className="w-2 h-2" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Scheduled date */}
      {formattedDate && (
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarDays className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
        </div>
      )}

      {/* Move arrows */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
        <button
          onClick={() => onMove(post.id, "left")}
          disabled={isFirst}
          className={cn(
            "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-1 rounded transition-colors",
            isFirst
              ? "text-muted-foreground/25 cursor-not-allowed"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <ChevronLeft className="w-3 h-3" />
          {prevColLabel}
        </button>

        <button
          onClick={() => onMove(post.id, "right")}
          disabled={isLast}
          className={cn(
            "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-1 rounded transition-colors",
            isLast
              ? "text-muted-foreground/25 cursor-not-allowed"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {nextColLabel}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Add Post Slide-over ─────────────────────────────────────────────────────

interface AddPostPanelProps {
  onClose: () => void;
  onAdd: (post: Omit<Post, "id">) => void;
}

function AddPostPanel({ onClose, onAdd }: AddPostPanelProps) {
  const [caption, setCaption] = useState("");
  const [type, setType] = useState<PostType>("Reel");
  const [column, setColumn] = useState<ColumnId>("backlog");
  const [date, setDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!caption.trim()) {
      setError("Caption is required.");
      return;
    }
    const tags = tagInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onAdd({ caption: caption.trim(), type, column, scheduledDate: date, tags });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">New Post Idea</h2>
              <p className="text-xs text-muted-foreground">Add to your content pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Caption */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Caption / Idea
              <span className="text-destructive ml-1">*</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                if (error) setError("");
              }}
              placeholder="Describe the post concept, caption, or key creative direction..."
              rows={4}
              className={cn(
                "w-full bg-secondary/40 border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors",
                error ? "border-destructive" : "border-border focus:border-transparent"
              )}
            />
            {error && (
              <p className="text-xs text-destructive mt-1">{error}</p>
            )}
          </div>

          {/* Post Type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Post Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map((pt) => {
                const config = POST_TYPE_CONFIG[pt];
                const Icon = config.icon;
                const isSelected = type === pt;
                return (
                  <button
                    key={pt}
                    onClick={() => setType(pt)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-xs font-medium transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5 flex-shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    {pt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Start in Column
            </label>
            <div className="space-y-1.5">
              {COLUMNS.map((col) => {
                const isSelected = column === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setColumn(col.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        col.accentClass
                      )}
                    />
                    <span className="flex-1">{col.label}</span>
                    {isSelected && (
                      <span className="text-[10px] text-primary font-semibold">
                        selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Target Date{" "}
              <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">
                (optional)
              </span>
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-secondary/40 border border-border rounded-md pl-9 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent [color-scheme:dark] transition-colors"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Tags{" "}
              <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">
                (comma-separated)
              </span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. festival, client, brand"
                className="w-full bg-secondary/40 border border-border rounded-md pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />
            </div>
            {tagInput && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tagInput
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                    >
                      <Tag className="w-2 h-2" />
                      {t.toLowerCase()}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!caption.trim()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Post
          </Button>
        </div>
      </aside>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const STATS = [
  { label: "Followers", value: "—", note: "Sync pending", icon: Users },
  { label: "Total Posts", value: "—", note: "Sync pending", icon: ImageIcon },
  { label: "Avg. Engagement", value: "—", note: "Sync pending", icon: Heart },
  { label: "Reach (30d)", value: "—", note: "Sync pending", icon: TrendingUp },
];

export function InstagramKanban() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [showForm, setShowForm] = useState(false);

  const handleAddPost = (data: Omit<Post, "id">) => {
    setPosts((prev) => [{ id: String(Date.now()), ...data }, ...prev]);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMove = (id: string, direction: "left" | "right") => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const idx = COLUMNS.findIndex((c) => c.id === p.column);
        const next = direction === "left" ? idx - 1 : idx + 1;
        if (next < 0 || next >= COLUMNS.length) return p;
        return { ...p, column: COLUMNS[next].id };
      })
    );
  };

  const totalPosts = posts.length;
  const scheduledCount = posts.filter((p) => p.column === "scheduled").length;
  const publishedCount = posts.filter((p) => p.column === "published").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 pt-7 pb-5 border-b border-border bg-background">

        {/* Title row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Instagram Manager
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plan, create, schedule and publish content
              </p>
            </div>
          </div>

          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border"
              >
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {COLUMNS.map((col) => {
              const count = posts.filter((p) => p.column === col.id).length;
              return (
                <div
                  key={col.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card"
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", col.accentClass)} />
                  <span className="text-[11px] text-muted-foreground">
                    {col.label}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                      col.pillClass
                    )}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {scheduledCount} scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <MoveRight className="w-3 h-3 text-green-400" />
              {publishedCount} published
            </span>
            <span>{totalPosts} total</span>
          </div>
        </div>
      </div>

      {/* ── Kanban board ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-5">
        <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
          {COLUMNS.map((col, colIndex) => {
            const colPosts = posts.filter((p) => p.column === col.id);

            return (
              <div key={col.id} className="w-[272px] flex flex-col flex-shrink-0 h-full">

                {/* Column header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-t-xl border border-b-0",
                    col.headerClass
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", col.accentClass)} />
                    <span className="text-sm font-semibold text-foreground">
                      {col.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      col.pillClass
                    )}
                  >
                    {colPosts.length}
                  </span>
                </div>

                {/* Column body — scrolls independently */}
                <div
                  className={cn(
                    "flex-1 rounded-b-xl border border-border overflow-y-auto p-2 space-y-2",
                    col.bodyClass
                  )}
                >
                  {colPosts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border/40 rounded-lg mx-1 mt-1">
                      <p className="text-xs text-muted-foreground/40 text-center px-4">
                        No posts here yet
                      </p>
                    </div>
                  )}

                  {colPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      colIndex={colIndex}
                      onMove={handleMove}
                      onDelete={handleDelete}
                    />
                  ))}

                  {/* Add card shortcut at bottom of column */}
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/40 text-muted-foreground/50 hover:text-muted-foreground hover:border-border transition-colors text-xs mt-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add post
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Slide-over form ──────────────────────────────────────────── */}
      {showForm && (
        <AddPostPanel onClose={() => setShowForm(false)} onAdd={handleAddPost} />
      )}
    </div>
  );
}
