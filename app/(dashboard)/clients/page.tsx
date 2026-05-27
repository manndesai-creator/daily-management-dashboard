"use client";

import { useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useClients, useTasks } from "@/lib/db";
import {
  Client,
  CLIENT_COLORS,
  getClientColor,
  generateId,
  today,
  addDays,
  getWeekStart,
  formatDuration,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Edit2, Camera, User, X } from "lucide-react";

const PLATFORMS = [
  "Instagram", "Facebook", "LinkedIn", "YouTube",
  "Twitter/X", "Pinterest", "TikTok", "WhatsApp",
];

const CLIENT_TASKS = [
  "Scripting", "Video Editing", "Graphic Designing", "Comment Automation",
  "YT Publishing", "SMM", "Strategy", "Content Calendar",
  "Reel Editing", "Thumbnail Design", "Caption Writing", "Others",
];

const SHORT_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

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
  const sizeClass =
    size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-16 h-16 text-xl" : "w-11 h-11 text-sm";

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
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const [chartClientId, setChartClientId] = useState<string | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = today();
  const weekStart = getWeekStart(todayStr);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 30-day chart data
  const last30Start = addDays(todayStr, -29);
  const last30Days = Array.from({ length: 30 }, (_, i) => addDays(last30Start, i));
  const clientsWithActivity = clients.filter((c) =>
    tasks.some((t) => t.clientId === c.id && last30Days.includes(t.date) && t.completed)
  );
  const chartData = last30Days.map((date) => {
    const [, m, d] = date.split("-");
    const entry: Record<string, string | number> = {
      date,
      label: `${parseInt(d)}/${parseInt(m)}`,
    };
    clientsWithActivity.forEach((c) => {
      entry[c.id] = tasks.filter(
        (t) => t.clientId === c.id && t.date === date && t.completed
      ).length;
    });
    return entry;
  });
  const hasChartData = chartData.some((d) =>
    Object.entries(d).some(
      ([k, v]) => k !== "date" && k !== "label" && typeof v === "number" && v > 0
    )
  );

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
      tasks: p.tasks.includes(task) ? p.tasks.filter((x) => x !== task) : [...p.tasks, task],
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
      updateClient(editingId, {
        ...form,
        name: form.name.trim(),
        image: form.image || undefined,
      });
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
    setShowNewForm(false);
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
    setShowNewForm(false);
  }

  function handleDelete(id: string) {
    if (confirm("Delete this client? This won't delete their logged tasks.")) {
      deleteClient(id);
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
    }
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

  const formBody = (
    <div className="flex gap-5">
      <div className="flex-shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden group"
        >
          {form.image ? (
            <>
              <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
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
            type="button"
            onClick={() => setForm((p) => ({ ...p, image: "" }))}
            className="mt-1 text-[11px] text-rose-500 hover:underline w-full text-center block"
          >
            Remove
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        <input
          autoFocus
          type="text"
          placeholder="Client name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
          }}
          className={INPUT_CLS}
        />
        <input
          type="text"
          placeholder="Niche / Industry (e.g. Fashion, Real Estate)"
          value={form.niche}
          onChange={(e) => setForm((p) => ({ ...p, niche: e.target.value }))}
          className={INPUT_CLS}
        />

        <div>
          <p className="text-xs text-muted-foreground mb-2">Client color</p>
          <div className="flex flex-wrap gap-2">
            {CLIENT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setForm((p) => ({ ...p, color: c.name }))}
                title={c.name}
                className={cn(
                  "w-6 h-6 rounded-full transition-transform",
                  c.bg,
                  form.color === c.name && "ring-2 ring-offset-2 ring-foreground scale-110"
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Platforms</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
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

        <div>
          <p className="text-xs text-muted-foreground mb-2">Tasks</p>
          <div className="flex flex-wrap gap-1.5">
            {CLIENT_TASKS.map((t) => (
              <button
                key={t}
                type="button"
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
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleAddClick} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Client
        </Button>
      </div>

      {/* New client form (only when explicitly creating) */}
      {showNewForm && !editingId && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold mb-4">New Client</h3>
          {formBody}
        </div>
      )}

      {/* Client grid */}
      {clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No clients yet.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Add your first client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const colorMeta = getClientColor(client.color);
            const isEditing = editingId === client.id;
            return (
              <div
                key={client.id}
                className={cn(
                  "bg-card border border-border rounded-lg overflow-hidden group transition-all",
                  isEditing && "ring-2 ring-primary/40 border-primary/40 sm:col-span-2 lg:col-span-3"
                )}
              >
                <div className={cn("h-1.5", colorMeta.bg)} />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ClientAvatar client={client} size="md" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                        {client.niche && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {client.niche}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => (isEditing ? handleCancel() : handleEdit(client))}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          isEditing
                            ? "bg-primary/10 text-primary"
                            : "opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                        aria-label={isEditing ? "Close editor" : "Edit client"}
                      >
                        {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          isEditing
                            ? "hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
                            : "opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
                        )}
                        aria-label="Delete client"
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
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{client.notes}</p>
                  )}

                  {/* Weekly mini chart with hover details — always visible */}
                  {!isEditing &&
                    (() => {
                      const weekData = weekDays.map((day, i) => {
                        const dayTasks = tasks.filter(
                          (t) => t.clientId === client.id && t.date === day
                        );
                        return {
                          label: SHORT_DAYS[i],
                          isToday: day === todayStr,
                          date: day,
                          total: dayTasks.length,
                          done: dayTasks.filter((t) => t.completed).length,
                          titles: dayTasks.map(
                            (t) => `${t.completed ? "✓ " : "○ "}${t.title}`
                          ),
                        };
                      });
                      const maxCount = Math.max(...weekData.map((d) => d.total), 1);
                      return (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-[10px] text-muted-foreground mb-1.5">This week</p>
                          <div className="flex items-end gap-1 h-8">
                            {weekData.map((d, i) => {
                              const tooltipText =
                                d.total > 0
                                  ? `${d.label} — ${d.done}/${d.total} done\n${d.titles.join(
                                      "\n"
                                    )}`
                                  : `${d.label} — no tasks`;
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div
                                    className="w-full flex items-end"
                                    style={{ height: 24 }}
                                    title={tooltipText}
                                  >
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
                                      <div
                                        className="w-full bg-border rounded-t-sm"
                                        style={{ height: 2 }}
                                      />
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      "text-[9px] leading-none",
                                      d.isToday
                                        ? "text-primary font-bold"
                                        : "text-muted-foreground/50"
                                    )}
                                  >
                                    {d.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                  {/* Inline edit accordion */}
                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-border bg-secondary/20 -mx-4 -mb-4 px-4 pb-4">
                      {formBody}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 30-day overview chart */}
      {clients.length > 0 && hasChartData && (
        <div className="mt-8 bg-card border border-border rounded-lg p-6">
          <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Last 30 Days</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed client tasks per day. Click a bar to see details.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setChartClientId("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  chartClientId === "all"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                )}
              >
                All Work
              </button>
              {clientsWithActivity.map((c) => {
                const hex = CLIENT_COLORS.find((cc) => cc.name === c.color)?.hex ?? "#3b82f6";
                const active = chartClientId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChartClientId(c.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5",
                      active ? "border-transparent" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                    style={active ? { backgroundColor: `${hex}22`, color: hex } : undefined}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(240 5% 90%)" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                axisLine={false}
                tickLine={false}
                interval={2}
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
                formatter={(value, name) => {
                  const client = clients.find((c) => c.id === name);
                  return [value, client?.name ?? String(name)];
                }}
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
              {clientsWithActivity
                .filter((c) => chartClientId === "all" || c.id === chartClientId)
                .map((c) => {
                  const hex = CLIENT_COLORS.find((cc) => cc.name === c.color)?.hex ?? "#3b82f6";
                  return (
                    <Bar
                      key={c.id}
                      dataKey={c.id}
                      name={c.id}
                      stackId="a"
                      fill={hex}
                      cursor="pointer"
                      onClick={(data: unknown) => {
                        const d = data as { payload?: { date?: string } };
                        if (d.payload?.date) setClickedDate(d.payload.date);
                      }}
                    />
                  );
                })}
            </BarChart>
          </ResponsiveContainer>

          {chartClientId === "all" && (
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
              {clientsWithActivity.map((c) => {
                const hex = CLIENT_COLORS.find((cc) => cc.name === c.color)?.hex ?? "#3b82f6";
                return (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-xs text-muted-foreground">{c.name}</span>
                  </div>
                );
              })}
            </div>
          )}
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
          const dayTasks = tasks.filter((t) => t.date === clickedDate && t.clientId);
          const byClient = clients
            .map((c) => ({
              client: c,
              tasks: dayTasks.filter((t) => t.clientId === c.id),
            }))
            .filter((g) => g.tasks.length > 0);

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
                      {dayTasks.length} client task{dayTasks.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setClickedDate(null)}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {byClient.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No client tasks this day.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {byClient.map(({ client, tasks: ts }) => {
                      const colorMeta = getClientColor(client.color);
                      const doneCount = ts.filter((t) => t.completed).length;
                      return (
                        <div key={client.id}>
                          <div className="flex items-center gap-2 mb-2">
                            <ClientAvatar client={client} size="sm" />
                            <h4 className={cn("font-semibold text-sm", colorMeta.text)}>
                              {client.name}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              ({doneCount}/{ts.length} done)
                            </span>
                          </div>
                          <ul className="space-y-2 pl-10">
                            {ts.map((t) => (
                              <li key={t.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "flex-shrink-0",
                                      t.completed ? "text-emerald-600" : "text-muted-foreground"
                                    )}
                                  >
                                    {t.completed ? "✓" : "○"}
                                  </span>
                                  <span className="text-foreground font-medium">{t.title}</span>
                                  {t.duration && (
                                    <span className="text-xs text-muted-foreground">
                                      · {formatDuration(t.duration)}
                                    </span>
                                  )}
                                </div>
                                {t.notes && (
                                  <p className="text-xs text-muted-foreground mt-0.5 pl-6 leading-snug">
                                    {t.notes}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
