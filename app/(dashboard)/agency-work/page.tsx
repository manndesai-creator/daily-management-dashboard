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
  getWeekStart,
  formatDuration,
  formatDisplayDate,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Check, X, Edit2, AlertTriangle, Calendar as CalendarIcon,
  Clock, ChevronRight,
} from "lucide-react";

const HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MINUTE_OPTIONS = [0, 15, 30, 45];
const SHORT_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function formatShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function daysSince(dateStr: string, fromStr: string): number {
  const [y1, m1, d1] = dateStr.split("-").map(Number);
  const [y2, m2, d2] = fromStr.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

export default function AgencyWorkPage() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | "all">("all");
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
  const weekStart = getWeekStart(todayStr);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthPrefix = todayStr.slice(0, 7); // YYYY-MM

  // All agency tasks
  const agencyTasks = tasks.filter((t) => t.category === "agency");

  // Header stats
  const monthTasks = agencyTasks.filter((t) => t.date.startsWith(monthPrefix));
  const doneThisMonth = monthTasks.filter((t) => t.completed).length;
  const minutesThisMonth = monthTasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (t.duration ?? 0), 0);
  const activeNow = agencyTasks.filter((t) => !t.completed).length;

  // Filtered tasks (when a card is clicked)
  const filteredTasks =
    activeType === "all"
      ? agencyTasks
      : agencyTasks.filter((t) => normalizeAgencyType(t.agencyType) === activeType);

  // 30-day chart data — completed agency tasks per day by type
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

  // Recent activity (last 14 days, all agency tasks)
  const recentStart = addDays(todayStr, -13);
  const recentTasks = agencyTasks
    .filter((t) => t.date >= recentStart)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Per-type stats
  function getTypeStats(type: string) {
    const all = agencyTasks.filter((t) => normalizeAgencyType(t.agencyType) === type);
    const active = all.filter((t) => !t.completed);
    const monthDone = all.filter((t) => t.completed && t.date.startsWith(monthPrefix)).length;
    const weekData = weekDays.map((day, i) => {
      const dayT = all.filter((t) => t.date === day);
      return {
        label: SHORT_DAYS[i],
        date: day,
        isToday: day === todayStr,
        total: dayT.length,
        done: dayT.filter((t) => t.completed).length,
        titles: dayT.map((t) => `${t.completed ? "✓ " : "○ "}${t.title}`),
      };
    });
    const recent = all
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, 3);
    const stuck = active.filter((t) => daysSince(t.date, todayStr) > 7);
    return { all, active, monthDone, weekData, recent, stuck };
  }

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

  function handleAddClick(prefillType?: string) {
    if (showForm && !editingId && prefillType && form.agencyType === prefillType) {
      handleCancelForm();
      return;
    }
    setEditingId(null);
    setForm({ ...emptyForm, agencyType: prefillType ?? "Outreach" });
    setShowForm(true);
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

  // ─── Reusable bits ─────────────────────────────────────────────────────────

  function TypeChip({ type }: { type: string }) {
    const hex = AGENCY_TYPE_HEX[type] ?? "#94a3b8";
    return (
      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: `${hex}1f`, color: hex }}
      >
        {type}
      </span>
    );
  }

  function TaskRow({ task }: { task: Task }) {
    const tHex = AGENCY_TYPE_HEX[normalizeAgencyType(task.agencyType)] ?? "#94a3b8";
    const days = daysSince(task.date, todayStr);
    const isStuck = !task.completed && days > 7;
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-md hover:bg-secondary/40 transition-colors group">
        <button
          onClick={() => toggleTaskDone(task)}
          className={cn(
            "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
            task.completed
              ? "bg-emerald-500 border-emerald-500"
              : "border-border hover:border-emerald-400"
          )}
        >
          {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
        <span
          className="w-1.5 h-6 rounded-sm flex-shrink-0"
          style={{ backgroundColor: tHex }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>
            <TypeChip type={normalizeAgencyType(task.agencyType)} />
            {isStuck && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Stuck {days}d
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
            <CalendarIcon className="w-3 h-3" />
            {formatShort(task.date)}
            {task.duration ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(task.duration)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <button
            onClick={() => handleEdit(task)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agency Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Everything internal to Varion Media — tracked, sorted, charted.
          </p>
        </div>
        <Button onClick={() => handleAddClick()} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Top stat strip */}
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
                        active ? "border-transparent" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      style={
                        active ? { backgroundColor: `${hex}22`, color: hex } : undefined
                      }
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

      {/* Per-type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <button
          type="button"
          onClick={() => setActiveType("all")}
          className={cn(
            "text-left rounded-lg border bg-card p-4 transition-all hover:border-foreground/30",
            activeType === "all" && "ring-2 ring-primary/40 border-primary/40"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">All agency work</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground">{activeNow}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">active across all types</p>
        </button>

        {AGENCY_TYPES.map((type) => {
          const hex = AGENCY_TYPE_HEX[type];
          const stats = getTypeStats(type);
          const maxCount = Math.max(...stats.weekData.map((d) => d.total), 1);
          const isActive = activeType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(isActive ? "all" : type)}
              className={cn(
                "text-left rounded-lg border bg-card overflow-hidden transition-all hover:border-foreground/30 flex flex-col",
                isActive && "ring-2 border-transparent"
              )}
              style={isActive ? { boxShadow: `0 0 0 2px ${hex}88` } : undefined}
            >
              <div
                className="h-1.5"
                style={{ backgroundColor: hex }}
              />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0">
                      {AGENCY_TYPE_EMOJI[type]}
                    </span>
                    <span className="text-sm font-semibold truncate">{type}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${hex}22`, color: hex }}
                  >
                    {stats.active.length}
                  </span>
                </div>

                {/* Mini weekly bars */}
                <div className="flex items-end gap-1 h-8 mb-3">
                  {stats.weekData.map((d, i) => {
                    const tip =
                      d.total > 0
                        ? `${d.label} — ${d.done}/${d.total} done\n${d.titles.join("\n")}`
                        : `${d.label} — no tasks`;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full h-6 flex items-end" title={tip}>
                          {d.total > 0 ? (
                            <div
                              className="w-full rounded-t-sm"
                              style={{
                                height: `${(d.total / maxCount) * 100}%`,
                                minHeight: 4,
                                backgroundColor: d.done === d.total ? hex : `${hex}55`,
                              }}
                            />
                          ) : (
                            <div className="w-full bg-border rounded-t-sm" style={{ height: 2 }} />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[9px] leading-none",
                            d.isToday
                              ? "font-bold"
                              : "text-muted-foreground/50"
                          )}
                          style={d.isToday ? { color: hex } : undefined}
                        >
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Recent */}
                <div className="flex-1 space-y-1">
                  {stats.recent.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 italic">
                      Nothing logged yet
                    </p>
                  ) : (
                    stats.recent.map((t) => (
                      <p
                        key={t.id}
                        className={cn(
                          "text-[11px] truncate flex items-center gap-1",
                          t.completed && "text-muted-foreground line-through"
                        )}
                      >
                        <span className="flex-shrink-0">{t.completed ? "✓" : "○"}</span>
                        {t.title}
                      </p>
                    ))
                  )}
                </div>

                {/* Stuck badge + month done */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground">
                    {stats.monthDone} done this month
                  </span>
                  {stats.stuck.length > 0 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {stats.stuck.length} stuck
                    </span>
                  )}
                </div>

                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddClick(type);
                  }}
                  role="button"
                  tabIndex={0}
                  className="mt-3 text-[11px] text-center py-1.5 rounded border border-dashed border-border hover:border-foreground/40 hover:bg-secondary/50 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Quick add
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 30-day chart */}
      {hasChartData && (
        <div className="bg-card border border-border rounded-lg p-6 mb-7">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Last 30 days</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed agency tasks per day, by type. Click any bar for details.
              </p>
            </div>
            {activeType !== "all" && (
              <button
                type="button"
                onClick={() => setActiveType("all")}
                className="text-xs text-primary hover:underline"
              >
                Show all types
              </button>
            )}
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
              {(activeType === "all" ? activeTypesInChart : [activeType]).map((type) => (
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

      {/* Recent activity list */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeType === "all"
                ? "Last 14 days of agency tasks"
                : `Last 14 days — ${activeType} only`}
            </p>
          </div>
        </div>
        {(() => {
          const list =
            activeType === "all"
              ? recentTasks
              : recentTasks.filter((t) => normalizeAgencyType(t.agencyType) === activeType);
          if (list.length === 0) {
            return (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No agency tasks in the last 14 days.
              </div>
            );
          }
          // Group by date desc
          const byDate: Record<string, Task[]> = {};
          list.forEach((t) => {
            if (!byDate[t.date]) byDate[t.date] = [];
            byDate[t.date].push(t);
          });
          const dates = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1));
          return (
            <div className="space-y-4">
              {dates.map((d) => (
                <div key={d}>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    {formatShort(d)} ·{" "}
                    {new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" })}
                  </p>
                  <div className="space-y-1">
                    {byDate[d].map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

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
