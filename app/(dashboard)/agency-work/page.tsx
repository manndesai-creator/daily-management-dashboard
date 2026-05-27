"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useTasks } from "@/lib/db";
import {
  Task,
  AGENCY_TYPES,
  AGENCY_TYPE_HEX,
  AGENCY_TYPE_EMOJI,
  normalizeAgencyType,
  generateId,
  today,
  addDays,
  formatDuration,
  formatDisplayDate,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Check, X, Edit2, AlertTriangle, Calendar as CalendarIcon,
  Clock,
} from "lucide-react";

const HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MINUTE_OPTIONS = [0, 15, 30, 45];

const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function daysSince(dateStr: string, fromStr: string): number {
  const [y1, m1, d1] = dateStr.split("-").map(Number);
  const [y2, m2, d2] = fromStr.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

function dateHeading(dateStr: string, todayStr: string): string {
  const diff = daysSince(dateStr, todayStr);
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function AgencyWorkPage() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    title: "",
    agencyType: "Outreach",
    date: today(),
    hours: "0",
    minutes: "0",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const todayStr = today();
  const monthPrefix = todayStr.slice(0, 7);

  const agencyTasks = tasks.filter((t) => t.category === "agency");

  // Header stats
  const monthTasks = agencyTasks.filter((t) => t.date.startsWith(monthPrefix));
  const doneThisMonth = monthTasks.filter((t) => t.completed).length;
  const minutesThisMonth = monthTasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (t.duration ?? 0), 0);
  const activeNow = agencyTasks.filter((t) => !t.completed).length;

  // Group all agency tasks by date (descending). Tasks within a date are sorted
  // with active items first, then completed.
  const sortedTasks = agencyTasks.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  const byDate: Record<string, Task[]> = {};
  sortedTasks.forEach((t) => {
    if (!byDate[t.date]) byDate[t.date] = [];
    byDate[t.date].push(t);
  });
  const dateKeys = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1));

  // 30-day stacked chart — only completed tasks, by their task.date
  const last30Start = addDays(todayStr, -29);
  const last30Days = Array.from({ length: 30 }, (_, i) => addDays(last30Start, i));
  const chartData = last30Days.map((date) => {
    const [, m, d] = date.split("-");
    const entry: Record<string, string | number> = {
      date,
      label: `${parseInt(d)}/${parseInt(m)}`,
    };
    AGENCY_TYPES.forEach((type) => {
      entry[type] = agencyTasks.filter(
        (t) => t.date === date && t.completed && normalizeAgencyType(t.agencyType) === type
      ).length;
    });
    return entry;
  });
  const hasChartData = chartData.some((d) =>
    Object.entries(d).some(
      ([k, v]) => k !== "date" && k !== "label" && typeof v === "number" && v > 0
    )
  );
  const activeTypesInChart = AGENCY_TYPES.filter((type) =>
    chartData.some((d) => typeof d[type] === "number" && (d[type] as number) > 0)
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleSave() {
    if (!form.title.trim()) return;
    const durationMinutes = parseInt(form.hours) * 60 + parseInt(form.minutes);
    const payload = {
      title: form.title.trim(),
      category: "agency" as const,
      agencyType: form.agencyType,
      notes: form.notes.trim() || undefined,
      duration: durationMinutes > 0 ? durationMinutes : undefined,
    };

    if (editingId) {
      updateTask(editingId, { ...payload, date: form.date });
    } else {
      const newTask: Task = {
        id: generateId(),
        date: form.date,
        ...payload,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      addTask(newTask);
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(task: Task) {
    const totalMin = task.duration ?? 0;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const closestM = MINUTE_OPTIONS.reduce(
      (prev, curr) => (Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev),
      0
    );
    setForm({
      title: task.title,
      agencyType: normalizeAgencyType(task.agencyType),
      date: task.date,
      hours: String(Math.min(h, 8)),
      minutes: String(closestM),
      notes: task.notes ?? "",
    });
    setEditingId(task.id);
    setShowForm(true);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleAddClick() {
    if (showForm || editingId) {
      handleCancelForm();
    } else {
      setEditingId(null);
      setForm(emptyForm);
      setShowForm(true);
    }
  }

  function toggleTaskDone(task: Task) {
    updateTask(task.id, { completed: !task.completed });
  }

  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof anyEl.showPicker === "function") anyEl.showPicker();
    else el.focus();
  }

  // ─── UI bits ───────────────────────────────────────────────────────────────

  function TaskRow({ task }: { task: Task }) {
    const type = normalizeAgencyType(task.agencyType);
    const tHex = AGENCY_TYPE_HEX[type] ?? "#94a3b8";
    const emoji = AGENCY_TYPE_EMOJI[type] ?? "🔧";
    const stuckDays = daysSince(task.date, todayStr);
    const isStuck = !task.completed && stuckDays > 7;
    const isEditing = editingId === task.id;
    return (
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors group",
          isEditing && "ring-2 ring-primary/40 border-primary/40",
          task.completed && "opacity-65"
        )}
      >
        <button
          onClick={() => toggleTaskDone(task)}
          className={cn(
            "mt-1 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
            task.completed
              ? "bg-emerald-500 border-emerald-500"
              : "border-border hover:border-emerald-400"
          )}
        >
          {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
        </button>

        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${tHex}22` }}
        >
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={cn(
                "text-sm font-medium",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${tHex}1f`, color: tHex }}
            >
              {type}
            </span>
            {isStuck && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Stuck {stuckDays}d
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {task.duration ? (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(task.duration)}
              </span>
            ) : null}
          </div>
          {task.notes && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{task.notes}</p>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-1 transition-opacity flex-shrink-0",
            isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <button
            onClick={() => (isEditing ? handleCancelForm() : handleEdit(task))}
            className={cn(
              "p-1 rounded transition-colors",
              isEditing
                ? "bg-primary/10 text-primary"
                : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            )}
            aria-label={isEditing ? "Close editor" : "Edit"}
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agency Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Everything internal to Varion Media — tracked, sorted, charted.
          </p>
        </div>
        <Button onClick={handleAddClick} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-foreground mt-1">{activeNow}</p>
          <p className="text-xs text-muted-foreground mt-0.5">tasks open right now</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Done this month
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{doneThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            of {monthTasks.length} logged
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Time logged
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {minutesThisMonth > 0 ? formatDuration(minutesThisMonth) : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">this month</p>
        </div>
      </div>

      {/* Add / edit form */}
      {showForm && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold mb-3">
            {editingId ? "Edit Agency Task" : "New Agency Task"}
          </h3>
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              placeholder="What are you working on?"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancelForm();
              }}
              className={INPUT_CLS}
            />

            <div>
              <p className="text-xs text-muted-foreground mb-2">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {AGENCY_TYPES.map((t) => {
                  const hex = AGENCY_TYPE_HEX[t];
                  const active = form.agencyType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, agencyType: t }))}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1",
                        active
                          ? "border-transparent"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      style={active ? { backgroundColor: `${hex}22`, color: hex } : undefined}
                    >
                      <span>{AGENCY_TYPE_EMOJI[t]}</span>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <button
                  type="button"
                  onClick={openDatePicker}
                  className="text-sm text-foreground hover:text-primary px-2 py-1.5 rounded border border-border bg-background flex-1 text-left"
                >
                  {formatDisplayDate(form.date)}
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.date}
                  onChange={(e) => e.target.value && setForm((p) => ({ ...p, date: e.target.value }))}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <select
                  value={form.hours}
                  onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                  className={cn(INPUT_CLS, "w-auto")}
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={String(h)}>
                      {h}h
                    </option>
                  ))}
                </select>
                <select
                  value={form.minutes}
                  onChange={(e) => setForm((p) => ({ ...p, minutes: e.target.value }))}
                  className={cn(INPUT_CLS, "w-auto")}
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={String(m)}>
                      {m}m
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className={cn(INPUT_CLS, "resize-none")}
            />

            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                {editingId ? "Save changes" : "Save task"}
              </Button>
              <Button onClick={handleCancelForm} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks grouped by date */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Tasks
        </h2>
        {dateKeys.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-10 text-center text-muted-foreground text-sm">
            No agency tasks yet.
            <br />
            <button onClick={handleAddClick} className="mt-2 text-primary hover:underline">
              Add your first one
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {dateKeys.map((date) => {
              const list = byDate[date];
              const doneCount = list.filter((t) => t.completed).length;
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">
                      {dateHeading(date, todayStr)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {doneCount}/{list.length} done
                    </p>
                  </div>
                  <div className="space-y-2">
                    {list.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 30-day chart */}
      {hasChartData && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Last 30 days</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed agency tasks per day, by type. Click any bar for details.
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
              {activeTypesInChart.map((type) => (
                <Bar
                  key={type}
                  dataKey={type}
                  name={type}
                  stackId="a"
                  fill={AGENCY_TYPE_HEX[type] ?? "#94a3b8"}
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
            {activeTypesInChart.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: AGENCY_TYPE_HEX[type] }}
                />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{AGENCY_TYPE_EMOJI[type]}</span>
                  {type}
                </span>
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
          const dayTasks = agencyTasks.filter((t) => t.date === clickedDate);
          const byType = AGENCY_TYPES.map((type) => ({
            type,
            items: dayTasks.filter((t) => normalizeAgencyType(t.agencyType) === type),
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
                      {dayTasks.length} agency task{dayTasks.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setClickedDate(null)}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {byType.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No agency tasks on this day.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {byType.map(({ type, items }) => {
                      const hex = AGENCY_TYPE_HEX[type];
                      const doneCount = items.filter((t) => t.completed).length;
                      return (
                        <div key={type}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{AGENCY_TYPE_EMOJI[type]}</span>
                            <h4 className="font-semibold text-sm" style={{ color: hex }}>
                              {type}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              ({doneCount}/{items.length} done)
                            </span>
                          </div>
                          <ul className="space-y-2 pl-8">
                            {items.map((t) => (
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
                                  {t.duration ? (
                                    <span className="text-xs text-muted-foreground">
                                      · {formatDuration(t.duration)}
                                    </span>
                                  ) : null}
                                </div>
                                {t.notes && (
                                  <p className="text-xs text-muted-foreground mt-0.5 pl-6">
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

                <div className="mt-4 pt-3 border-t border-border text-center">
                  <Link
                    href={`/daily-log?date=${clickedDate}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Open this day in Daily Log →
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
