"use client";

import { useRef, useState } from "react";
import { useClients, useTasks } from "@/lib/db";
import { Client, CLIENT_COLORS, getClientColor, generateId, today, addDays } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Edit2, Camera, User } from "lucide-react";

const SHORT_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split("T")[0];
}

const PLATFORMS = [
  "Instagram", "Facebook", "LinkedIn", "YouTube",
  "Twitter/X", "Pinterest", "TikTok", "WhatsApp",
];

const CLIENT_TASKS = [
  "Scripting", "Video Editing", "Graphic Designing", "Comment Automation",
  "YT Publishing", "SMM", "Strategy", "Content Calendar",
  "Reel Editing", "Thumbnail Design", "Caption Writing", "Others",
];

const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

const emptyForm = {
  name: "",
  color: "blue",
  image: "",
  platforms: [] as string[],
  tasks: [] as string[],
  niche: "",
  notes: "",
};

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 240;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ClientAvatar({
  client,
  size = "md",
}: {
  client: Pick<Client, "name" | "image" | "color">;
  size?: "sm" | "md" | "lg";
}) {
  const colorMeta = getClientColor(client.color);
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-16 h-16 text-xl" : "w-11 h-11 text-sm";

  if (client.image) {
    return (
      <img
        src={client.image}
        alt={client.name}
        className={cn("rounded-full object-cover flex-shrink-0", sizeClass)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white flex-shrink-0",
        sizeClass,
        colorMeta.bg
      )}
    >
      {client.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const { tasks } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = today();
  const weekStart = getWeekStart(todayStr);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function togglePlatform(platform: string) {
    setForm((p) => ({
      ...p,
      platforms: p.platforms.includes(platform)
        ? p.platforms.filter((x) => x !== platform)
        : [...p.platforms, platform],
    }));
  }

  function toggleTask(task: string) {
    setForm((p) => ({
      ...p,
      tasks: p.tasks.includes(task)
        ? p.tasks.filter((x) => x !== task)
        : [...p.tasks, task],
    }));
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm((p) => ({ ...p, image: compressed }));
    } catch {
      alert("Could not load image. Try another file.");
    }
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateClient(editingId, { ...form, name: form.name.trim(), image: form.image || undefined });
      setEditingId(null);
    } else {
      const newClient: Client = {
        id: generateId(),
        ...form,
        name: form.name.trim(),
        image: form.image || undefined,
        createdAt: new Date().toISOString(),
      };
      addClient(newClient);
    }
    setForm(emptyForm);
    setShowForm(false);
  }

  function handleEdit(client: Client) {
    setForm({
      name: client.name,
      color: client.color,
      image: client.image ?? "",
      platforms: client.platforms,
      tasks: client.tasks ?? [],
      niche: client.niche,
      notes: client.notes,
    });
    setEditingId(client.id);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (confirm("Delete this client? This won't delete their logged tasks.")) {
      deleteClient(id);
    }
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Client
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold mb-4">
            {editingId ? "Edit Client" : "New Client"}
          </h3>
          <div className="flex gap-5">
            {/* Image upload */}
            <div className="flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden group"
              >
                {form.image ? (
                  <>
                    <img
                      src={form.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px]">Add photo</span>
                  </div>
                )}
              </button>
              {form.image && (
                <button
                  onClick={() => setForm((p) => ({ ...p, image: "" }))}
                  className="mt-1 text-[11px] text-rose-500 hover:underline w-full text-center block"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="Client name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Escape") handleCancel(); }}
                className={INPUT_CLS}
              />
              <input
                type="text"
                placeholder="Niche / Industry (e.g. Fashion, Real Estate)"
                value={form.niche}
                onChange={(e) => setForm((p) => ({ ...p, niche: e.target.value }))}
                className={INPUT_CLS}
              />

              {/* Color picker */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Client color</p>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setForm((p) => ({ ...p, color: c.name }))}
                      title={c.name}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform",
                        c.bg,
                        form.color === c.name &&
                          "ring-2 ring-offset-2 ring-foreground scale-110"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Platforms</p>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        form.platforms.includes(p)
                          ? "bg-foreground text-background border-foreground"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tasks */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Tasks</p>
                <div className="flex flex-wrap gap-1.5">
                  {CLIENT_TASKS.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleTask(t)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        form.tasks.includes(t)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                placeholder="Notes — tone of voice, target audience, key contacts, what's working..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                className={cn(INPUT_CLS, "resize-none")}
              />

              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  {editingId ? "Save Changes" : "Add Client"}
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client grid */}
      {clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No clients yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Add your first client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const colorMeta = getClientColor(client.color);
            return (
              <div
                key={client.id}
                className="bg-card border border-border rounded-lg overflow-hidden group"
              >
                <div className={cn("h-1.5", colorMeta.bg)} />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ClientAvatar client={client} size="md" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {client.name}
                        </h3>
                        {client.niche && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {client.niche}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-1.5 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {client.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {client.platforms.map((p) => (
                        <span
                          key={p}
                          className={cn(
                            "text-[11px] px-1.5 py-0.5 rounded-full font-medium",
                            colorMeta.light,
                            colorMeta.text
                          )}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {client.tasks?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {client.tasks.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {client.notes && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {client.notes}
                    </p>
                  )}

                  {/* Weekly task chart */}
                  {(() => {
                    const weekData = weekDays.map((day, i) => {
                      const dayTasks = tasks.filter(
                        (t) => t.clientId === client.id && t.date === day
                      );
                      return {
                        label: SHORT_DAYS[i],
                        isToday: day === todayStr,
                        total: dayTasks.length,
                        done: dayTasks.filter((t) => t.completed).length,
                      };
                    });
                    const hasAny = weekData.some((d) => d.total > 0);
                    if (!hasAny) return null;
                    const maxCount = Math.max(...weekData.map((d) => d.total), 1);
                    return (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] text-muted-foreground mb-1.5">This week</p>
                        <div className="flex items-end gap-1 h-8">
                          {weekData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <div className="w-full flex items-end" style={{ height: 24 }}>
                                {d.total > 0 ? (
                                  <div
                                    className="w-full rounded-t-sm transition-all"
                                    style={{
                                      height: `${(d.total / maxCount) * 100}%`,
                                      minHeight: 4,
                                      backgroundColor:
                                        d.done === d.total
                                          ? "#10b981"
                                          : d.done > 0
                                          ? "#f59e0b"
                                          : "#94a3b8",
                                    }}
                                  />
                                ) : (
                                  <div className="w-full bg-border rounded-t-sm" style={{ height: 2 }} />
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-[9px] leading-none",
                                  d.isToday ? "text-primary font-bold" : "text-muted-foreground/50"
                                )}
                              >
                                {d.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
