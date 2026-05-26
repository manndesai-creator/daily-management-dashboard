"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Linkedin,
  Youtube,
  Film,
  LayoutGrid,
  Image,
  CircleDot,
  FileText,
  Video,
  Zap,
  Clock,
  Tag,
  CheckCircle,
  Pencil,
  Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "instagram" | "linkedin" | "youtube";
type FilterMode = "all" | Platform;

type PostType =
  | "Reel"
  | "Carousel"
  | "Single Image"
  | "Story"
  | "Article"
  | "Video"
  | "Short";

type PostStatus = "draft" | "ready" | "scheduled" | "published";

interface CalendarPost {
  id: string;
  title: string;
  caption: string;
  platform: Platform;
  type: PostType;
  date: string;   // "YYYY-MM-DD"
  time: string;   // "HH:MM"
  status: PostStatus;
  tags: string[];
}

// ─── Platform config ──────────────────────────────────────────────────────────

interface PlatformConfig {
  label: string;
  icon: React.ElementType;
  chipClass: string;      // chip on calendar cell
  dotClass: string;       // colored bar in list
  badgeClass: string;     // icon background
  filterBase: string;     // filter button, inactive
  filterActive: string;   // filter button, active
}

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    icon: Instagram,
    chipClass:
      "bg-pink-500/15 text-pink-300 border-pink-500/30 hover:bg-pink-500/25",
    dotClass: "bg-pink-500",
    badgeClass: "bg-pink-500/15 text-pink-400",
    filterBase:
      "border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/50",
    filterActive:
      "bg-pink-500/20 border-pink-500/60 text-pink-300 ring-1 ring-pink-500/30",
  },
  linkedin: {
    label: "LinkedIn",
    icon: Linkedin,
    chipClass:
      "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25",
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-500/15 text-blue-400",
    filterBase:
      "border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50",
    filterActive:
      "bg-blue-500/20 border-blue-500/60 text-blue-300 ring-1 ring-blue-500/30",
  },
  youtube: {
    label: "YouTube",
    icon: Youtube,
    chipClass:
      "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-500/15 text-red-400",
    filterBase:
      "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50",
    filterActive:
      "bg-red-500/20 border-red-500/60 text-red-300 ring-1 ring-red-500/30",
  },
};

// ─── Post type config ─────────────────────────────────────────────────────────

const POST_TYPE_CONFIG: Record<PostType, { icon: React.ElementType }> = {
  Reel:           { icon: Film },
  Carousel:       { icon: LayoutGrid },
  "Single Image": { icon: Image },
  Story:          { icon: CircleDot },
  Article:        { icon: FileText },
  Video:          { icon: Video },
  Short:          { icon: Zap },
};

const POST_TYPES_BY_PLATFORM: Record<Platform, PostType[]> = {
  instagram: ["Reel", "Carousel", "Single Image", "Story"],
  linkedin:  ["Article", "Single Image", "Video"],
  youtube:   ["Video", "Short"],
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  draft:     { label: "Draft",     badgeClass: "bg-secondary text-muted-foreground border-border",       icon: Pencil },
  ready:     { label: "Ready",     badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",     icon: Check },
  scheduled: { label: "Scheduled", badgeClass: "bg-primary/15 text-primary border-primary/30",           icon: Clock },
  published: { label: "Published", badgeClass: "bg-green-500/15 text-green-400 border-green-500/30",     icon: CheckCircle },
};

// ─── Calendar constants ───────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Anchored to seed data context — April 9, 2026
const TODAY = { year: 2026, month: 3, day: 9 } as const;

// ─── Seed data ────────────────────────────────────────────────────────────────

const INITIAL_POSTS: CalendarPost[] = [
  // ── Instagram ─────────────────────────────────────────────────────────────
  {
    id: "ig-1",
    title: "Glokal Team Intro Reel",
    caption:
      "Introducing the creative minds behind Jaipur's boldest advertising campaigns. Behind-the-scenes footage from our studio, cutting to live campaign installs across Rajasthan. Trending audio, fast cuts, strong hook in first 2 sec.",
    platform: "instagram", type: "Reel",
    date: "2026-04-09", time: "18:00", status: "scheduled",
    tags: ["team", "brand", "reel"],
  },
  {
    id: "ig-2",
    title: "Client Feature Carousel",
    caption:
      "5-slide carousel featuring our top retail client in Jaipur. Product photography, brand story, and customer testimonials woven into a cohesive visual narrative. CTA on the last slide links to their website.",
    platform: "instagram", type: "Carousel",
    date: "2026-04-11", time: "10:00", status: "scheduled",
    tags: ["client", "retail", "carousel"],
  },
  {
    id: "ig-3",
    title: "Weekend Campaign Visual",
    caption:
      "Bold single-image creative for our weekend engagement campaign. Warm Rajasthani colour palette with strong typographic CTA. Target audience: Jaipur millennials aged 22–35.",
    platform: "instagram", type: "Single Image",
    date: "2026-04-14", time: "15:00", status: "ready",
    tags: ["campaign", "weekend"],
  },
  {
    id: "ig-4",
    title: "Product Launch Reel",
    caption:
      "Cinematic 30-second reel for a D2C startup's product launch. 3D packaging reveal, lifestyle shots, and a hook in the first 2 seconds. Trending audio already selected and cleared.",
    platform: "instagram", type: "Reel",
    date: "2026-04-16", time: "12:00", status: "scheduled",
    tags: ["launch", "D2C", "reel"],
  },
  {
    id: "ig-5",
    title: "Monsoon Teaser Story",
    caption:
      "Multi-frame story teasing our upcoming monsoon OOH campaign. Moody dark blues and greens. Swipe-up CTA to our microsite. End card with countdown to reveal date.",
    platform: "instagram", type: "Story",
    date: "2026-04-18", time: "11:00", status: "draft",
    tags: ["monsoon", "teaser", "OOH"],
  },
  {
    id: "ig-6",
    title: "Studio BTS — Holi Brainstorm",
    caption:
      "Raw, candid footage from our design team's Holi campaign brainstorming session. Whiteboard sketches, moodboards, and the final campaign output placed side by side.",
    platform: "instagram", type: "Reel",
    date: "2026-04-22", time: "17:00", status: "draft",
    tags: ["BTS", "design", "holi"],
  },
  {
    id: "ig-7",
    title: "April Monthly Recap",
    caption:
      "Carousel summary of April's top campaigns — reach, impressions, and client wins. Visual data storytelling with branded infographics and a strong closing engagement slide.",
    platform: "instagram", type: "Carousel",
    date: "2026-04-25", time: "14:00", status: "scheduled",
    tags: ["recap", "monthly", "data"],
  },
  {
    id: "ig-8",
    title: "Heritage Jaipur — City Love",
    caption:
      "Single artistic image celebrating Jaipur's architectural heritage. Shot near Hawa Mahal with a soft brand overlay. Part of our ongoing city-love content series with local photographers.",
    platform: "instagram", type: "Single Image",
    date: "2026-04-28", time: "09:00", status: "draft",
    tags: ["jaipur", "heritage", "art"],
  },

  // ── LinkedIn ───────────────────────────────────────────────────────────────
  {
    id: "li-1",
    title: "OOH Case Study: Holi 2026",
    caption:
      "A detailed breakdown of our Holi 2026 out-of-home campaign — from strategy and media planning to creative execution and post-campaign metrics. 4,500+ daily impressions across 12 premium Jaipur sites.",
    platform: "linkedin", type: "Article",
    date: "2026-04-10", time: "09:00", status: "scheduled",
    tags: ["OOH", "case study", "holi"],
  },
  {
    id: "li-2",
    title: "The Future of DOOH in India",
    caption:
      "Opinion piece on how digital out-of-home (DOOH) is reshaping the advertising landscape in tier-2 Indian cities — Jaipur, Jodhpur, and Udaipur. Programmatic buying, dynamic creative, and measurement challenges.",
    platform: "linkedin", type: "Article",
    date: "2026-04-15", time: "10:00", status: "ready",
    tags: ["DOOH", "industry", "opinion"],
  },
  {
    id: "li-3",
    title: "Q1 2026 Growth Infographic",
    caption:
      "Visual summary of Glokal Advertising's Q1 2026 performance — client count, campaign volume, revenue growth, and geographic expansion across Rajasthan. Designed for maximum shareability on LinkedIn.",
    platform: "linkedin", type: "Single Image",
    date: "2026-04-16", time: "11:00", status: "scheduled",
    tags: ["Q1", "growth", "infographic"],
  },
  {
    id: "li-4",
    title: "Team Spotlight: Creative Director",
    caption:
      "Spotlight on our Creative Director, Priya Sharma. Her journey from art school in Delhi to leading campaigns across Rajasthan for 40+ brands over 8 years.",
    platform: "linkedin", type: "Single Image",
    date: "2026-04-20", time: "10:00", status: "draft",
    tags: ["team", "spotlight", "culture"],
  },
  {
    id: "li-5",
    title: "5 Learnings: Jaipur Market",
    caption:
      "What 5 years of running campaigns in Jaipur has taught us about reaching Rajasthani consumers — regional language nuances, festive timing windows, and platform behaviour differences.",
    platform: "linkedin", type: "Article",
    date: "2026-04-23", time: "09:00", status: "draft",
    tags: ["jaipur", "market", "insights"],
  },
  {
    id: "li-6",
    title: "We're Hiring: Senior Designer",
    caption:
      "Glokal Advertising is looking for a Senior Graphic Designer to join our Jaipur studio. 3+ years experience in brand and campaign design required. Portfolio-based evaluation. Apply via our website.",
    platform: "linkedin", type: "Single Image",
    date: "2026-04-27", time: "12:00", status: "ready",
    tags: ["hiring", "design", "careers"],
  },

  // ── YouTube ────────────────────────────────────────────────────────────────
  {
    id: "yt-1",
    title: "Holi Campaign Full Breakdown",
    caption:
      "16-minute deep dive into our Holi 2026 OOH campaign — from initial client brief to final billboard installations. Includes drone footage from 8 sites across Jaipur and a walkthrough of our creative process.",
    platform: "youtube", type: "Video",
    date: "2026-04-12", time: "15:00", status: "scheduled",
    tags: ["holi", "campaign", "OOH"],
  },
  {
    id: "yt-2",
    title: "How We Plan Billboard Campaigns",
    caption:
      "Step-by-step process for planning outdoor advertising campaigns — site selection criteria, audience footfall mapping, creative sizing specifications, and installation logistics in Rajasthan.",
    platform: "youtube", type: "Video",
    date: "2026-04-19", time: "14:00", status: "ready",
    tags: ["process", "billboard", "educational"],
  },
  {
    id: "yt-3",
    title: "Client Success: Rajasthan Tourism",
    caption:
      "Case study video featuring our year-long collaboration with Rajasthan Tourism — campaign strategy, multi-format creative approach, and the measurable outcomes achieved across 3 phases.",
    platform: "youtube", type: "Video",
    date: "2026-04-26", time: "16:00", status: "scheduled",
    tags: ["tourism", "client", "success"],
  },
];

// ─── Post Detail Modal ────────────────────────────────────────────────────────

interface PostDetailModalProps {
  post: CalendarPost;
  onClose: () => void;
}

function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  const pCfg = PLATFORM_CONFIG[post.platform];
  const PlatformIcon = pCfg.icon;
  const typeCfg = POST_TYPE_CONFIG[post.type];
  const TypeIcon = typeCfg.icon;
  const statusCfg = STATUS_CONFIG[post.status];
  const StatusIcon = statusCfg.icon;

  const formattedDate = new Date(post.date + "T00:00:00").toLocaleDateString(
    "en-IN",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto">

          {/* Modal header */}
          <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  pCfg.badgeClass
                )}
              >
                <PlatformIcon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {pCfg.label}
                </p>
                <h2 className="text-sm font-bold text-foreground leading-snug">
                  {post.title}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-3 p-1.5 rounded-md hover:bg-secondary transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Modal body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Caption */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Caption / Notes
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {post.caption || (
                  <span className="text-muted-foreground italic">No caption added.</span>
                )}
              </p>
            </div>

            {/* Type + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Post Type
                </p>
                <div className="flex items-center gap-1.5">
                  <TypeIcon className="w-3.5 h-3.5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {post.type}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Status
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border",
                      statusCfg.badgeClass
                    )}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="p-3 rounded-lg bg-secondary/40 border border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Scheduled For
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">{post.time}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal footer */}
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <Button
              variant="secondary"
              className="w-full"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add Event Panel ──────────────────────────────────────────────────────────

interface AddEventPanelProps {
  onClose: () => void;
  onAdd: (post: Omit<CalendarPost, "id">) => void;
  initialDate?: string;
}

function AddEventPanel({ onClose, onAdd, initialDate = "" }: AddEventPanelProps) {
  const [title, setTitle]         = useState("");
  const [caption, setCaption]     = useState("");
  const [platform, setPlatform]   = useState<Platform>("instagram");
  const [type, setType]           = useState<PostType>("Reel");
  const [date, setDate]           = useState(initialDate);
  const [time, setTime]           = useState("10:00");
  const [status, setStatus]       = useState<PostStatus>("draft");
  const [tagInput, setTagInput]   = useState("");
  const [errors, setErrors]       = useState<Partial<Record<"title" | "date", string>>>({});

  const handlePlatformChange = (p: Platform) => {
    setPlatform(p);
    setType(POST_TYPES_BY_PLATFORM[p][0]);
  };

  const handleSubmit = () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Title is required.";
    if (!date)         next.date  = "Date is required.";
    if (Object.keys(next).length) { setErrors(next); return; }

    const tags = tagInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onAdd({ title: title.trim(), caption: caption.trim(), platform, type, date, time, status, tags });
  };

  const EDITABLE_STATUSES: PostStatus[] = ["draft", "ready", "scheduled"];

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
              <h2 className="text-sm font-semibold text-foreground">
                New Calendar Post
              </h2>
              <p className="text-xs text-muted-foreground">
                Add to the content schedule
              </p>
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
              }}
              placeholder="e.g. Holi Campaign Launch Post"
              className={cn(
                "w-full bg-secondary/40 border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                errors.title
                  ? "border-destructive"
                  : "border-border focus:border-transparent"
              )}
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title}</p>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Caption / Notes{" "}
              <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                (optional)
              </span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe the post concept, key message, or creative direction..."
              rows={3}
              className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none focus:border-transparent"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Platform
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => {
                const cfg = PLATFORM_CONFIG[p];
                const Icon = cfg.icon;
                const isSelected = platform === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePlatformChange(p)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-md border text-xs font-medium transition-all",
                      isSelected
                        ? cn("border-2 text-foreground", {
                            "border-pink-500 bg-pink-500/10": p === "instagram",
                            "border-blue-500 bg-blue-500/10": p === "linkedin",
                            "border-red-500  bg-red-500/10":  p === "youtube",
                          })
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn("w-4 h-4", {
                        "text-pink-400": p === "instagram" && isSelected,
                        "text-blue-400": p === "linkedin"  && isSelected,
                        "text-red-400":  p === "youtube"   && isSelected,
                      })}
                    />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Post Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES_BY_PLATFORM[platform].map((pt) => {
                const cfg = POST_TYPE_CONFIG[pt];
                const Icon = cfg.icon;
                const isSelected = type === pt;
                return (
                  <button
                    key={pt}
                    onClick={() => setType(pt)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-md border text-xs font-medium transition-all text-left",
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

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Date <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errors.date)
                      setErrors((p) => ({ ...p, date: undefined }));
                  }}
                  className={cn(
                    "w-full bg-secondary/40 border rounded-md pl-9 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]",
                    errors.date
                      ? "border-destructive"
                      : "border-border focus:border-transparent"
                  )}
                />
              </div>
              {errors.date && (
                <p className="text-xs text-destructive mt-1">{errors.date}</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md pl-9 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {EDITABLE_STATUSES.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                const isSelected = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md border text-xs font-medium transition-all",
                      isSelected
                        ? cn("border", cfg.badgeClass)
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3 h-3 flex-shrink-0" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Tags{" "}
              <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                (comma-separated)
              </span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. campaign, festive, brand"
                className="w-full bg-secondary/40 border border-border rounded-md pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground"
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
            disabled={!title.trim()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Calendar
          </Button>
        </div>
      </aside>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContentCalendar() {
  const [posts, setPosts] = useState<CalendarPost[]>(INITIAL_POSTS);
  const [viewDate, setViewDate] = useState(() => new Date(2026, 3, 1)); // April 2026
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [prefillDate, setPrefillDate] = useState("");

  // ── Month navigation ────────────────────────────────────────────
  const prevMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleString("en-US", { month: "long" });
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const isViewingToday = year === TODAY.year && month === TODAY.month;

  // ── Derived data ────────────────────────────────────────────────
  const activePlatforms = useMemo<Set<Platform>>(() => {
    if (filterMode === "all") return new Set(["instagram", "linkedin", "youtube"]);
    return new Set([filterMode as Platform]);
  }, [filterMode]);

  // All posts in this month (unfiltered by platform) — for counts
  const monthPosts = useMemo(
    () =>
      posts.filter((p) => {
        const d = new Date(p.date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [posts, year, month]
  );

  // Posts in this month filtered by active platforms — for calendar + list
  const filteredPosts = useMemo(
    () => monthPosts.filter((p) => activePlatforms.has(p.platform)),
    [monthPosts, activePlatforms]
  );

  // Posts for a specific day, sorted by time
  const getPostsForDay = (day: number): CalendarPost[] =>
    filteredPosts
      .filter((p) => new Date(p.date + "T00:00:00").getDate() === day)
      .sort((a, b) => a.time.localeCompare(b.time));

  // Upcoming list — all filtered posts sorted by date then time
  const sortedPosts = useMemo(
    () =>
      [...filteredPosts].sort((a, b) => {
        const dc = a.date.localeCompare(b.date);
        return dc !== 0 ? dc : a.time.localeCompare(b.time);
      }),
    [filteredPosts]
  );

  // Per-platform counts for current month
  const counts = useMemo(
    () => ({
      instagram: monthPosts.filter((p) => p.platform === "instagram").length,
      linkedin:  monthPosts.filter((p) => p.platform === "linkedin").length,
      youtube:   monthPosts.filter((p) => p.platform === "youtube").length,
      total:     monthPosts.length,
    }),
    [monthPosts]
  );

  // ── Handlers ────────────────────────────────────────────────────
  const handleFilterClick = (mode: FilterMode) => {
    // Clicking the active platform filter resets to "all"
    setFilterMode((prev) => (prev === mode && mode !== "all" ? "all" : mode));
  };

  const handleAddFromDay = (day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    setPrefillDate(`${year}-${mm}-${dd}`);
    setShowAddForm(true);
  };

  const handleAddPost = (data: Omit<CalendarPost, "id">) => {
    setPosts((prev) => [{ id: `post-${Date.now()}`, ...data }, ...prev]);
    setShowAddForm(false);
    setPrefillDate("");
  };

  const handleCloseAdd = () => {
    setShowAddForm(false);
    setPrefillDate("");
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-8">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Content Calendar
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts.total} posts scheduled in {monthLabel} {year}
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setPrefillDate("");
            setShowAddForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* ── Filter bar + month navigation ───────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">

        {/* Platform filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* "All" pill */}
          <button
            onClick={() => handleFilterClick("all")}
            className={cn(
              "px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
              filterMode === "all"
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            )}
          >
            All · {counts.total}
          </button>

          {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => {
            const cfg = PLATFORM_CONFIG[p];
            const Icon = cfg.icon;
            const isActive = filterMode === p;
            return (
              <button
                key={p}
                onClick={() => handleFilterClick(p)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
                  isActive ? cfg.filterActive : cfg.filterBase
                )}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none",
                    isActive
                      ? "bg-white/20"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {counts[p]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={prevMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground w-36 text-center">
            {monthLabel} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={nextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Calendar grid ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">

        {/* Day-of-week header row */}
        <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
          {DAYS_OF_WEEK.map((d, i) => (
            <div
              key={d}
              className={cn(
                "py-2.5 text-center text-[11px] font-semibold tracking-wide",
                i === 0 || i === 6
                  ? "text-muted-foreground/50"
                  : "text-muted-foreground"
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells grid */}
        <div className="grid grid-cols-7">

          {/* Leading empty cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => {
            const isLastInRow = (i + 1) % 7 === 0;
            return (
              <div
                key={`pad-${i}`}
                className={cn(
                  "min-h-[110px] bg-secondary/5 border-b border-border/50",
                  !isLastInRow && "border-r border-border/50"
                )}
              />
            );
          })}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayPosts = getPostsForDay(day);
            const isToday  = isViewingToday && day === TODAY.day;
            const cellIndex   = firstDayOfWeek + day - 1;
            const colPosition = cellIndex % 7;               // 0=Sun … 6=Sat
            const isWeekend   = colPosition === 0 || colPosition === 6;
            const isLastCol   = colPosition === 6;
            const lastCellIndex = firstDayOfWeek + daysInMonth - 1;
            const isLastRow   = cellIndex > lastCellIndex - 7;

            const MAX_CHIPS  = 3;
            const visible    = dayPosts.slice(0, MAX_CHIPS);
            const hiddenCnt  = dayPosts.length - MAX_CHIPS;

            return (
              <div
                key={day}
                className={cn(
                  "min-h-[110px] p-2 relative group transition-colors",
                  !isLastRow   && "border-b border-border/50",
                  !isLastCol   && "border-r border-border/50",
                  isWeekend    && !isToday && "bg-secondary/5",
                  isToday      ? "bg-primary/5" : "hover:bg-secondary/20",
                )}
              >
                {/* Day number + quick-add button */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      "text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full leading-none",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : isWeekend
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground"
                    )}
                  >
                    {day}
                  </span>

                  {/* Quick-add button — appears on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddFromDay(day);
                    }}
                    title={`Add post — ${monthLabel} ${day}`}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-secondary transition-all"
                  >
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>

                {/* Post chips */}
                <div className="space-y-0.5">
                  {visible.map((post) => {
                    const pCfg = PLATFORM_CONFIG[post.platform];
                    return (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        title={post.title}
                        className={cn(
                          "w-full text-left text-[10px] px-1.5 py-[3px] rounded border truncate font-medium transition-all block leading-tight",
                          pCfg.chipClass
                        )}
                      >
                        {post.title}
                      </button>
                    );
                  })}

                  {/* "+N more" overflow indicator */}
                  {hiddenCnt > 0 && (
                    <button
                      onClick={() => setSelectedPost(dayPosts[MAX_CHIPS])}
                      className="w-full text-left text-[10px] px-1.5 text-muted-foreground hover:text-foreground transition-colors leading-tight"
                    >
                      +{hiddenCnt} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Platform legend (below calendar) ────────────────────── */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-xs text-muted-foreground">Platforms:</span>
        {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => {
          const cfg = PLATFORM_CONFIG[p];
          const Icon = cfg.icon;
          return (
            <span key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", cfg.dotClass)} />
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* ── Scheduled posts list ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {filterMode === "all"
              ? `All Posts — ${monthLabel} ${year}`
              : `${PLATFORM_CONFIG[filterMode as Platform].label} Posts — ${monthLabel} ${year}`}
          </h2>
          <span className="text-xs text-muted-foreground">
            {sortedPosts.length}{" "}
            {sortedPosts.length === 1 ? "post" : "posts"}
          </span>
        </div>

        {sortedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 border border-dashed border-border rounded-xl">
            <CalendarDays className="w-8 h-8 mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No posts scheduled this month
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add a post
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPosts.map((post) => {
              const pCfg     = PLATFORM_CONFIG[post.platform];
              const PIcon    = pCfg.icon;
              const typeCfg  = POST_TYPE_CONFIG[post.type];
              const TypeIcon = typeCfg.icon;
              const statusCfg = STATUS_CONFIG[post.status];

              const formattedDate = new Date(
                post.date + "T00:00:00"
              ).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });

              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-lg bg-card border border-border hover:border-muted-foreground/30 hover:bg-secondary/20 transition-all group"
                >
                  {/* Platform colour bar */}
                  <div
                    className={cn(
                      "w-[3px] h-9 rounded-full flex-shrink-0",
                      pCfg.dotClass
                    )}
                  />

                  {/* Platform icon badge */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      pCfg.badgeClass
                    )}
                  >
                    <PIcon className="w-4 h-4" />
                  </div>

                  {/* Title + type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TypeIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground">
                        {post.type}
                      </span>
                    </div>
                  </div>

                  {/* Date + time */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-foreground">
                      {formattedDate}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {post.time}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className={cn(
                      "flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      statusCfg.badgeClass
                    )}
                  >
                    {statusCfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Post detail modal ─────────────────────────────────────── */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {/* ── Add event panel ───────────────────────────────────────── */}
      {showAddForm && (
        <AddEventPanel
          onClose={handleCloseAdd}
          onAdd={handleAddPost}
          initialDate={prefillDate}
        />
      )}
    </div>
  );
}
