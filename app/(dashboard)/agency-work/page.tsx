"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useTasks } from "@/lib/db";
import { useEscapeClose } from "@/lib/use-escape-close";
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
  Clock,
} from "lucide-react";

const HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MINUTE_OPTIONS = [0, 15, 30, 45];

const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

// Returns a positive number when `dateStr` is in the past relative to
// `fromStr`, zero when same day, negative when in the future.
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
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
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
  const [activeView, setActiveView] = useState<"this-week" | "upcoming" | "done">("this-week");
  const [chartType, setChartType] = useState<string | "all">("all");
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEscapeClose(clickedDate !== null, () => setClickedDate(null));

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

  // Three top-level buckets:
  //   This Week — pending tasks with date in current ISO week (Mon-Sun),
  //               plus any overdue pending tasks from earlier weeks.
  //   Upcoming Weeks — pending tasks dated after this Sunday.
  //   Done — completed tasks (any date), grouped by completion date.
  const weekStart = getWeekStart(todayStr);
  const weekEnd = addDays(weekStart, 6);

  const thisWeekTasks = agencyTasks
    .filter((t) => !t.completed && t.date <= weekEnd)
    .sort((a, b) => {
      const aOverdue = a.date < todayStr;
      const bOverdue = b.date < todayStr;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return a.date.localeCompare(b.date);
    });

  const upcomingTasks = agencyTasks
    .filter((t) => !t.completed && t.date > weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  const doneTasks = agencyTasks.filter((t) => t.completed);
  const doneByDate: Record<string, Task[]> = {};
  doneTasks.forEach((t) => {
    const key = t.completedAt ?? t.date;
    if (!doneByDate[key]) doneByDate[key] = [];
    doneByDate[key].push(t);
  });
  const doneDateKeys = Object.keys(doneByDate).sort((a, b) => (a < b ? 1 : -1));

  // 30-day stacked chart — only completed tasks, plotted on their completedAt
  // date (the day they were ticked done), falling back to task.date for any
  // legacy completed tasks that don't yet have a completedAt stamp.
  const last30Start = addDays(todayStr, -29);
  const last30Days = Array.from({ length: 30 }, (_, i) => addDays(last30Start, i));
  function effectiveDoneDate(t: Task): string | null {
    if (!t.completed) return null;
    return t.completedAt ?? t.date;
  }
  const chartData = last30Days.map((date) => {
    const [, m, d] = date.split("-");
    const entry: Record<string, string | number> = {
      date,
      label: `${parseInt(d)}/${parseInt(m)}`,
    };
    AGENCY_TYPES.forEach((type) => {
      entry[type] = agencyTasks.filter(
        (t) =>
          effectiveDoneDate(t) === date &&
          normalizeAgencyType(t.agencyType) === type
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

  function TaskRow({
    task,
    isCarryOver,
    noStrike,
  }: {
    task: Task;
    isCarryOver?: boolean;
    noStrike?: boolean;
  }) {
    const type = normalizeAgencyType(task.agencyType);
    const tHex = AGENCY_TYPE_HEX[type] ?? "#94a3b8";
    const emoji = AGENCY_TYPE_EMOJI[type] ?? "🔧";
    const stuckDays = daysSince(task.date, todayStr);
    const isStuck = !task.completed && stuckDays > 7;
    const isEditing = editingId === task.id;
    const [py, pm, pd] = task.date.split("-").map(Number);
    const plannedLabel = new Date(py, pm - 1, pd).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    let completedLabel: string | null = null;
    if (task.completedAt) {
      const [cy, cm, cd] = task.completedAt.split("-").map(Number);
      completedLabel = new Date(cy, cm - 1, cd).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    }
    return (
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors group",
          isEditing && "ring-2 ring-primary/40 border-primary/40",
          task.completed && !noStrike && "opacity-65"
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
                task.completed && !noStrike && "line-through text-muted-foreground"
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
            {isCarryOver && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                from {plannedLabel}
              </span>
            )}
            {isStuck && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Stuck {stuckDays}d
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[11px] text-violet-600 flex items-center gap-0.5">
              <CalendarIcon className="w-3 h-3" />
              Planned {plannedLabel}
            </span>
            {completedLabel && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-0.5">
                <Check className="w-3 h-3" />
                Done {completedLabel}
              </span>
            )}
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
            isEditing ? "opacity-100" : "sm:opacity-0 sm:group-hover:opacity-100"
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

      {/* Tab nav */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1.5">
          {(
            [
              { key: "this-week", label: "This Week", count: thisWeekTasks.length },
              { key: "upcoming", label: "Upcoming Weeks", count: upcomingTasks.length },
              { key: "done", label: "Done", count: doneTasks.length },
            ] as { key: typeof activeView; label: string; count: number }[]
          ).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveView(key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                activeView === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {label} <span className="opacity-70 ml-1">({count})</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {activeView === "this-week" && "today → this Sunday, overdue first"}
          {activeView === "upcoming" && "anything beyond this Sunday"}
          {activeView === "done" && "grouped by the day you ticked it off"}
        </p>
      </div>

      {/* This Week */}
      {activeView === "this-week" && (
        <section className="mb-7">
          {thisWeekTasks.length === 0 ? (
            <div className="border border-dashed border-border bg-card/40 rounded-lg p-8 text-center">
              <p className="text-sm font-medium text-foreground">
                All clear for this week.
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Anything internal — outreach, branding, hiring, SOPs — goes
                here. Overdue items will also surface in this tab.
              </p>
              <button
                onClick={handleAddClick}
                className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add a task
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {thisWeekTasks.map((t) => (
                <TaskRow key={t.id} task={t} isCarryOver={t.date < todayStr} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Upcoming Weeks */}
      {activeView === "upcoming" && (
        <section className="mb-7">
          {upcomingTasks.length === 0 ? (
            <div className="border border-dashed border-border bg-card/40 rounded-lg p-6 text-center">
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Nothing planned beyond this Sunday. Tasks with a future date
                will park here until the week they land in.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Done */}
      {activeView === "done" && (
        <section className="mb-7">
          {doneTasks.length === 0 ? (
            <div className="border border-dashed border-border bg-card/40 rounded-lg p-6 text-center">
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Tasks you tick off will gather here, grouped by the day they
                were completed. The chart below tracks the same data.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {doneDateKeys.map((d) => (
                <div key={d}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {dateHeading(d, todayStr)}
                  </p>
                  <div className="space-y-2">
                    {doneByDate[d].map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 30-day chart */}
      {hasChartData && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Last 30 days</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed agency tasks per day, by type. Click any bar for details.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setChartType("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  chartType === "all"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                )}
              >
                All work
              </button>
              {activeTypesInChart.map((type) => {
                const hex = AGENCY_TYPE_HEX[type];
                const active = chartType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setChartType(type)}
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
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(240 5% 90%)" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
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
              {activeTypesInChart
                .filter((type) => chartType === "all" || type === chartType)
                .map((type) => (
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
          {chartType === "all" && (
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
              {activeTypesInChart.map((type) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: AGENCY_TYPE_HEX[type] }}
                  />
                  <span className="text-xs text-muted-foreground">{type}</span>
                </div>
              ))}
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
          const dayTasks = agencyTasks.filter(
            (t) => effectiveDoneDate(t) === clickedDate
          );
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
                      {dayTasks.length} agency task{dayTasks.length !== 1 ? "s" : ""} completed
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
