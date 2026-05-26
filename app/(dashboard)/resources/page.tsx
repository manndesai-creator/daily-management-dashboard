"use client";

import { useState } from "react";
import { useResources } from "@/lib/db";
import { Resource, generateId, extractYouTubeId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ExternalLink, Youtube, FileText, Wrench, CalendarDays } from "lucide-react";

const RESOURCE_CATEGORIES = [
  "Learning", "Meta Ads", "Google Ads", "Content Strategy",
  "Design", "SEO", "Tools", "Inspiration", "Workshop", "Other",
];

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

function TypeIcon({ type }: { type: Resource["resourceType"] }) {
  if (type === "youtube") return <Youtube className="w-5 h-5 text-rose-500" />;
  if (type === "workshop") return <CalendarDays className="w-5 h-5 text-violet-500" />;
  if (type === "tool") return <Wrench className="w-5 h-5 text-amber-500" />;
  return <FileText className="w-5 h-5 text-blue-500" />;
}

const emptyForm = {
  url: "",
  title: "",
  category: "Learning",
  status: "to-watch" as StatusKey,
  notes: "",
  pinnedDate: "",
};

export default function ResourcesPage() {
  const { resources, addResource, updateResource, deleteResource } = useResources();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StatusKey | "all">("all");
  const [form, setForm] = useState(emptyForm);

  const youtubeId = extractYouTubeId(form.url);

  function handleAdd() {
    if (!form.url.trim() || !form.title.trim()) return;
    const ytId = extractYouTubeId(form.url) ?? undefined;
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
    setForm(emptyForm);
    setShowForm(false);
  }

  function handleUpdateStatus(id: string, status: StatusKey) {
    updateResource(id, { status });
  }

  function handleDeleteResource(id: string) {
    if (confirm("Delete this resource?")) {
      deleteResource(id);
    }
  }

  const filtered =
    filterStatus === "all" ? resources : resources.filter((r) => r.status === filterStatus);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resource Vault</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Save links, videos, and workshops — all in one place
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Resource
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm">
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

            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className={cn(INPUT_CLS, "resize-none")}
            />

            <div className="flex gap-2">
              <Button onClick={handleAdd} size="sm">
                Save Resource
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
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

      {/* Resource grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No resources yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Add your first resource
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource) => {
            const statusMeta = STATUS_META[resource.status as StatusKey];
            return (
              <div
                key={resource.id}
                className="bg-card border border-border rounded-lg overflow-hidden group flex flex-col"
              >
                {/* Thumbnail */}
                {resource.thumbnail ? (
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
                ) : (
                  <div className="h-14 bg-secondary/60 flex items-center justify-center">
                    <TypeIcon type={resource.resourceType} />
                  </div>
                )}

                <div className="p-3 flex-1 flex flex-col">
                  {/* Title + actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                      {resource.title}
                    </h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteResource(resource.id)}
                        className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {resource.category}
                    </span>
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
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {resource.notes}
                    </p>
                  )}

                  {/* Status switcher */}
                  <div className="mt-auto flex gap-1">
                    {(
                      Object.entries(STATUS_META) as [StatusKey, (typeof STATUS_META)[StatusKey]][]
                    ).map(([key, meta]) => (
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
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
