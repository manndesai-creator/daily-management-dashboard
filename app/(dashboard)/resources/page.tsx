"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useResources } from "@/lib/db";
import { Resource, generateId, extractYouTubeId, today, addDays } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, ExternalLink, Youtube, FileText, CalendarDays, X, Edit2,
  BookOpen, Sparkles, Video, Link as LinkIcon,
} from "lucide-react";

const RESOURCE_CATEGORIES = [
  "YouTube", "Webinar", "Book", "PDF", "Document", "AI Tool", "Other",
];

const CATEGORY_HEX: Record<string, string> = {
  YouTube: "#ef4444",
  Webinar: "#8b5cf6",
  Book: "#f59e0b",
  PDF: "#f43f5e",
  Document: "#3b82f6",
  "AI Tool": "#10b981",
  Other: "#64748b",
  Uncategorised: "#94a3b8",
};

function categoryHex(cat: string): string {
  return CATEGORY_HEX[cat] ?? "#94a3b8";
}

const CategoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  YouTube: Youtube,
  Webinar: Video,
  Book: BookOpen,
  PDF: FileText,
  Document: FileText,
  "AI Tool": Sparkles,
  Other: LinkIcon,
  Uncategorised: LinkIcon,
};

const STATUS_META = {
  "to-watch": { label: "To Watch", bg: "bg-amber-50", color: "text-amber-700", border: "border-amber-200" },
  "in-progress": { label: "In Progress", bg: "bg-blue-50", color: "text-blue-700", border: "border-blue-200" },
  done: { label: "Done", bg: "bg-emerald-50", color: "text-emerald-700", border: "border-emerald-200" },
} as const;

type StatusKey = keyof typeof STATUS_META;

const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function detectType(url: string): Resource["resourceType"] {
  if (extractYouTubeId(url)) return "youtube";
  if (/eventbrite|workshop|webinar|meetup/.test(url)) return "workshop";
  return "article";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function ResourceThumbnail({ resource }: { resource: Resource }) {
  // YouTube — keep the real thumbnail
  if (resource.thumbnail) {
    return (
      <div className="relative h-36 bg-secondary overflow-hidden">
        <img
          src={resource.thumbnail}
          alt={resource.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2">
          <span className="flex items-center gap-1 text-[11px] bg-black/70 text-white px-1.5 py-0.5 rounded">
            <Youtube className="w-3 h-3" />
            YouTube
          </span>
        </div>
      </div>
    );
  }

  const domain = getDomain(resource.url);
  const hex = categoryHex(resource.category);
  const Icon = CategoryIcons[resource.category] ?? LinkIcon;

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative h-36 overflow-hidden flex flex-col justify-between p-3 block hover:opacity-95 transition-opacity"
      style={{
        background: `linear-gradient(135deg, ${hex} 0%, ${hex}cc 100%)`,
      }}
    >
      <div className="flex items-start justify-between">
        <Icon className="w-9 h-9 text-white drop-shadow" />
        {domain && (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt=""
            className="w-7 h-7 rounded bg-white/30 p-1 backdrop-blur-sm"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-[11px] font-medium text-white/95 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
          {resource.category}
        </span>
        {domain && (
          <span className="text-[10px] text-white/85 truncate ml-2 max-w-[60%]" title={domain}>
            {domain}
          </span>
        )}
      </div>
    </a>
  );
}

const emptyForm = {
  url: "",
  title: "",
  category: "YouTube",
  status: "to-watch" as StatusKey,
  notes: "",
  pinnedDate: "",
};

export default function LearningPage() {
  const { resources, addResource, updateResource, deleteResource } = useResources();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusKey | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [clickedDate, setClickedDate] = useState<string | null>(null);

  const youtubeId = extractYouTubeId(form.url);

  function handleSave() {
    if (!form.url.trim() || !form.title.trim()) return;
    const ytId = extractYouTubeId(form.url) ?? undefined;

    if (editingId) {
      updateResource(editingId, {
        url: form.url.trim(),
        title: form.title.trim(),
        category: form.category,
        status: form.status,
        notes: form.notes.trim() || undefined,
      });
      setEditingId(null);
    } else {
      const newResource: Resource = {
        id: generateId(),
        url: form.url.trim(),
        title: form.title.trim(),
        youtubeId: ytId,
        thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined,
        resourceType: detectType(form.url),
        status: form.status,
        category: form.category,
        notes: form.notes.trim() || undefined,
        pinnedDate: form.pinnedDate || undefined,
        createdAt: new Date().toISOString(),
      };
      addResource(newResource);
    }
    setForm(emptyForm);
    setShowNewForm(false);
  }

  function handleEdit(resource: Resource) {
    setForm({
      url: resource.url,
      title: resource.title,
      category: RESOURCE_CATEGORIES.includes(resource.category) ? resource.category : "Other",
      status: resource.status as StatusKey,
      notes: resource.notes ?? "",
      pinnedDate: resource.pinnedDate ?? "",
    });
    setEditingId(resource.id);
    setShowNewForm(false);
  }

  function handleCancel() {
    setShowNewForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleAddClick() {
    if (showNewForm || editingId) {
      handleCancel();
    } else {
      setEditingId(null);
      setForm(emptyForm);
      setShowNewForm(true);
    }
  }

  function handleUpdateStatus(id: string, status: StatusKey) {
    updateResource(id, { status });
  }

  function handleDeleteResource(id: string) {
    if (confirm("Delete this resource?")) {
      deleteResource(id);
      if (editingId === id) handleCancel();
    }
  }

  const filtered =
    filterStatus === "all" ? resources : resources.filter((r) => r.status === filterStatus);

  // Group filtered resources by category
  const knownCategorySet = new Set(RESOURCE_CATEGORIES);
  const groupedByCategory = RESOURCE_CATEGORIES.map((cat) => ({
    category: cat,
    items: filtered.filter((r) => r.category === cat),
  })).filter((g) => g.items.length > 0);
  const legacyItems = filtered.filter((r) => !knownCategorySet.has(r.category));

  // 15-day chart data — also tracks Uncategorised
  const todayStr = today();
  const chartStart = addDays(todayStr, -14);
  const chart15Days = Array.from({ length: 15 }, (_, i) => addDays(chartStart, i));
  const ALL_CATS = [...RESOURCE_CATEGORIES, "Uncategorised"];
  const chartData = chart15Days.map((date) => {
    const [, m, d] = date.split("-");
    const entry: Record<string, string | number> = {
      date,
      label: `${parseInt(d)}/${parseInt(m)}`,
    };
    ALL_CATS.forEach((cat) => {
      entry[cat] = resources.filter((r) => {
        const created = r.createdAt.split("T")[0];
        if (created !== date) return false;
        if (cat === "Uncategorised") return !knownCategorySet.has(r.category);
        return r.category === cat;
      }).length;
    });
    return entry;
  });
  const hasChartData = chartData.some((d) =>
    Object.entries(d).some(
      ([k, v]) => k !== "date" && k !== "label" && typeof v === "number" && v > 0
    )
  );
  const activeCategoriesInChart = ALL_CATS.filter((cat) =>
    chartData.some((d) => typeof d[cat] === "number" && (d[cat] as number) > 0)
  );

  const formBody = (
    <div className="space-y-3">
      <div>
        <input
          autoFocus
          type="url"
          placeholder="Paste URL — YouTube, article, workshop, tool..."
          value={form.url}
          onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
          className={INPUT_CLS}
        />
        {youtubeId && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
            <Youtube className="w-3.5 h-3.5" />
            YouTube detected — thumbnail will be shown automatically
          </p>
        )}
      </div>

      <input
        type="text"
        placeholder="Title (required)"
        value={form.title}
        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        className={INPUT_CLS}
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.category}
          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          className={INPUT_CLS}
        >
          {RESOURCE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as StatusKey }))}
          className={INPUT_CLS}
        >
          <option value="to-watch">To Watch</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {!editingId && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">
            Pin to date (for events/workshops):
          </label>
          <input
            type="date"
            value={form.pinnedDate}
            onChange={(e) => setForm((p) => ({ ...p, pinnedDate: e.target.value }))}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      <textarea
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        rows={2}
        className={cn(INPUT_CLS, "resize-none")}
      />

      <div className="flex gap-2">
        <Button onClick={handleSave} size="sm">
          {editingId ? "Save Changes" : "Save Resource"}
        </Button>
        <Button onClick={handleCancel} variant="outline" size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );

  function renderResourceCard(resource: Resource) {
    const isEditing = editingId === resource.id;
    return (
      <div
        key={resource.id}
        className={cn(
          "bg-card border border-border rounded-lg overflow-hidden group flex flex-col transition-all",
          isEditing && "ring-2 ring-primary/40 border-primary/40 sm:col-span-2 lg:col-span-3"
        )}
      >
        <ResourceThumbnail resource={resource} />

        <div className="p-3 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
              {resource.title}
            </h3>
            <div
              className={cn(
                "flex items-center gap-1 transition-opacity flex-shrink-0",
                isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                aria-label="Open link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => (isEditing ? handleCancel() : handleEdit(resource))}
                className={cn(
                  "p-1 rounded transition-colors",
                  isEditing
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
                aria-label={isEditing ? "Close editor" : "Edit resource"}
              >
                {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleDeleteResource(resource.id)}
                className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
                aria-label="Delete resource"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {resource.pinnedDate && (
              <span className="text-[11px] text-violet-600 flex items-center gap-0.5">
                <CalendarDays className="w-3 h-3" />
                {new Date(resource.pinnedDate + "T00:00:00").toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>

          {resource.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{resource.notes}</p>
          )}

          <div className="mt-auto flex gap-1">
            {(Object.entries(STATUS_META) as [StatusKey, (typeof STATUS_META)[StatusKey]][]).map(
              ([key, meta]) => (
                <button
                  key={key}
                  onClick={() => handleUpdateStatus(resource.id, key)}
                  className={cn(
                    "flex-1 text-[10px] py-1 rounded border font-medium transition-colors",
                    resource.status === key
                      ? `${meta.bg} ${meta.color} ${meta.border}`
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {meta.label}
                </button>
              )
            )}
          </div>
        </div>

        {isEditing && (
          <div className="border-t border-border bg-secondary/30 p-4">{formBody}</div>
        )}
      </div>
    );
  }

  function renderCategorySection(category: string, items: Resource[]) {
    if (items.length === 0) return null;
    const hex = categoryHex(category);
    return (
      <section key={category} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hex }} />
          <h2 className="text-sm font-semibold text-foreground">
            {category} <span className="text-muted-foreground font-normal">· {items.length}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(renderResourceCard)}
        </div>
      </section>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Learning Vault</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Save what you watch, read, attend — organised by source
          </p>
        </div>
        <Button onClick={handleAddClick} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Resource
        </Button>
      </div>

      {/* New form (only when adding new) */}
      {showNewForm && !editingId && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold mb-3">New Resource</h3>
          {formBody}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        <button
          onClick={() => setFilterStatus("all")}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            filterStatus === "all"
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          All ({resources.length})
        </button>
        {(Object.entries(STATUS_META) as [StatusKey, (typeof STATUS_META)[StatusKey]][]).map(
          ([key, meta]) => {
            const count = resources.filter((r) => r.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  filterStatus === key
                    ? `${meta.bg} ${meta.color} ${meta.border}`
                    : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {meta.label} ({count})
              </button>
            );
          }
        )}
      </div>

      {/* Category-grouped resources */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No resources yet.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Add your first resource
          </button>
        </div>
      ) : (
        <>
          {groupedByCategory.map((g) => renderCategorySection(g.category, g.items))}
          {legacyItems.length > 0 && renderCategorySection("Uncategorised", legacyItems)}
        </>
      )}

      {/* 15-day chart */}
      {resources.length > 0 && hasChartData && (
        <div className="mt-10 bg-card border border-border rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Last 15 Days</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Resources added per day, by source. Click a bar to see details.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(240 5% 90%)" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 6,
                  border: "1px solid hsl(240 5% 15%)",
                  background: "hsl(240 6% 7%)",
                  color: "hsl(0 0% 95%)",
                }}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                labelFormatter={(_label, payload) => {
                  const date = payload?.[0]?.payload?.date;
                  if (!date) return _label;
                  const [y, m, d] = date.split("-").map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                }}
              />
              {activeCategoriesInChart.map((cat) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  name={cat}
                  stackId="a"
                  fill={categoryHex(cat)}
                  cursor="pointer"
                  onClick={(data: unknown) => {
                    const d = data as { payload?: { date?: string } };
                    if (d.payload?.date) setClickedDate(d.payload.date);
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
            {activeCategoriesInChart.map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryHex(cat) }} />
                <span className="text-xs text-muted-foreground">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day detail modal */}
      {clickedDate &&
        (() => {
          const [y, m, d] = clickedDate.split("-").map(Number);
          const formattedDate = new Date(y, m - 1, d).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const dayItems = resources.filter(
            (r) => r.createdAt.split("T")[0] === clickedDate
          );
          const byCategory = ALL_CATS.map((cat) => ({
            category: cat,
            items:
              cat === "Uncategorised"
                ? dayItems.filter((r) => !knownCategorySet.has(r.category))
                : dayItems.filter((r) => r.category === cat),
          })).filter((g) => g.items.length > 0);

          return (
            <div
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setClickedDate(null)}
            >
              <div
                className="bg-card rounded-lg max-w-xl w-full p-6 max-h-[80vh] overflow-y-auto shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{formattedDate}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dayItems.length} resource{dayItems.length !== 1 ? "s" : ""} added
                    </p>
                  </div>
                  <button
                    onClick={() => setClickedDate(null)}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nothing added on this day.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {byCategory.map(({ category, items }) => (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: categoryHex(category) }}
                          />
                          <h4 className="font-semibold text-sm">{category}</h4>
                          <span className="text-xs text-muted-foreground">({items.length})</span>
                        </div>
                        <ul className="space-y-2 pl-4">
                          {items.map((r) => (
                            <li key={r.id} className="text-sm">
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-foreground hover:text-primary inline-flex items-center gap-1"
                              >
                                {r.title}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <span
                                className={cn(
                                  "ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                  STATUS_META[r.status as StatusKey].bg,
                                  STATUS_META[r.status as StatusKey].color
                                )}
                              >
                                {STATUS_META[r.status as StatusKey].label}
                              </span>
                              {r.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
