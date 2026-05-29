"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { useTasks, useClients, useResources } from "@/lib/db";
import {
  Task,
  Client,
  Resource,
  TaskCategory,
  CATEGORY_META,
  AGENCY_TYPES,
  getClientColor,
  generateId,
  today,
  formatDisplayDate,
  addDays,
  getWeekStart,
  formatDuration,
  extractYouTubeId,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Plus, ChevronLeft, ChevronRight, Check, Trash2, Clock,
  Globe2, Heart, BookOpen, ExternalLink, Link as LinkIcon,
  Edit2, Calendar as CalendarIcon, X, Undo2, Youtube, FileText, Wrench, CalendarDays,
} from "lucide-react";

const CATEGORIES: TaskCategory[] = ["client", "learning", "agency", "personal"];
const LEARNING_TYPES = ["YouTube", "Webinar", "Book", "PDF", "Document", "AI Tool", "Other"];
const HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MINUTE_OPTIONS = [0, 15, 30, 45];
const SHORT_WEEK = ["M", "T", "W", "T", "F", "S", "S"];

const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function TaskAvatar({ task, client }: { task: Task; client?: Client }) {
  if (task.category === "client" && client) {
    if (client.image) {
      return (
        <img
          src={client.image}
          alt={client.name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      );
    }
    const colorMeta = getClientColor(client.color);
    return (
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0",
          colorMeta.bg
        )}
      >
        {client.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  if (task.category === "agency") {
    return (
      <img
        src="/agency-logo.png"
        alt="Varion Media"
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  if (task.category === "learning") {
    if (task.url) {
      const ytId = extractYouTubeId(task.url);
      if (ytId) {
        return (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-secondary hover:ring-2 hover:ring-emerald-400 transition-all"
          >
            <img
              src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
              alt={task.title}
              className="w-full h-full object-cover"
            />
          </a>
        );
      }
      return (
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 hover:bg-emerald-600 transition-colors"
        >
          <ExternalLink className="w-5 h-5 text-white" />
        </a>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-5 h-5 text-white" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
      <Heart className="w-5 h-5 text-white" />
    </div>
  );
}

function ResourceAvatar({ resource }: { resource: Resource }) {
  if (resource.thumbnail) {
    return (
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-secondary hover:ring-2 hover:ring-sky-400 transition-all"
      >
        <img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-cover" />
      </a>
    );
  }
  const Icon =
    resource.resourceType === "youtube"
      ? Youtube
      : resource.resourceType === "workshop"
      ? CalendarDays
      : resource.resourceType === "tool"
      ? Wrench
      : FileText;
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 hover:bg-sky-600 transition-colors"
    >
      <Icon className="w-5 h-5 text-white" />
    </a>
  );
}

function DailyLogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateParam = searchParams.get("date");

  const { tasks, addTask, updateTask, deleteTask, loading: tasksLoading } = useTasks();
  const { clients } = useClients();
  const { resources, updateResource } = useResources();

  const [currentDate, setCurrentDate] = useState(dateParam || today());

  // After honouring an inbound ?date= param, drop it from the URL so a reload
  // returns to today instead of being stuck on the deep-linked day.
  useEffect(() => {
    if (dateParam) {
      router.replace("/daily-log");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Roll forward to the new day automatically when IST midnight passes,
  // but only if the user is currently viewing what used to be "today".
  useEffect(() => {
    let lastToday = today();
    const id = setInterval(() => {
      const t = today();
      if (t !== lastToday) {
        setCurrentDate((prev) => (prev === lastToday ? t : prev));
        lastToday = t;
      }
    }, 30000);
    return () => clearInterval(id);
  }, []);
  const [activeFilter, setActiveFilter] = useState<TaskCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(new Set());
  const [recentlyDeleted, setRecentlyDeleted] = useState<Task | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    title: "",
    category: "client" as TaskCategory,
    clientId: "",
    learningType: "",
    agencyType: "",
    url: "",
    date: currentDate,
    hours: "0",
    minutes: "0",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const formDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const isToday = currentDate === today();
  const visibleTasks = tasks.filter((t) => !hiddenTaskIds.has(t.id));
  const dateTasks = visibleTasks.filter((t) => t.date === currentDate);
  const dateResources = resources.filter((r) => r.pinnedDate === currentDate);
  const carryOverTasks = visibleTasks
    .filter((t) => t.date < currentDate && !t.completed)
    .sort((a, b) => a.date.localeCompare(b.date));
  const carryOverResources = resources
    .filter((r) => r.pinnedDate && r.pinnedDate < currentDate && r.status !== "done")
    .sort((a, b) => (a.pinnedDate ?? "").localeCompare(b.pinnedDate ?? ""));

  const filteredTasks =
    activeFilter === "all" ? dateTasks : dateTasks.filter((t) => t.category === activeFilter);
  const filteredResources = activeFilter === "all" ? dateResources : [];

  const doneTasks = dateTasks.filter((t) => t.completed).length;
  const totalMinutes = dateTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0);

  // Weekly stats — includes pinned resources alongside tasks for a true count.
  const weekStart = getWeekStart(today());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekTasks = visibleTasks.filter((t) => weekDays.includes(t.date));
  const weekResources = resources.filter(
    (r) => r.pinnedDate && weekDays.includes(r.pinnedDate)
  );
  const weekTaskDone = weekTasks.filter((t) => t.completed).length;
  const weekResourceDone = weekResources.filter((r) => r.status === "done").length;
  const weekTotal = weekTasks.length + weekResources.length;
  const weekDone = weekTaskDone + weekResourceDone;
  const weekPending = weekTotal - weekDone;
  const dailyProgress = weekDays.map((day, i) => {
    const dayT = visibleTasks.filter((t) => t.date === day);
    const dayR = resources.filter((r) => r.pinnedDate === day);
    return {
      day: SHORT_WEEK[i],
      done:
        dayT.filter((t) => t.completed).length +
        dayR.filter((r) => r.status === "done").length,
      total: dayT.length + dayR.length,
      isToday: day === today(),
    };
  });
  const pieData = [
    { name: "Done", value: weekDone, color: "#10b981" },
    { name: "Pending", value: weekPending, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof anyEl.showPicker === "function") {
      anyEl.showPicker();
    } else {
      el.focus();
      el.click();
    }
  }

  function handleSaveTask() {
    if (!form.title.trim()) return;
    const client = clients.find((c) => c.id === form.clientId);
    const durationMinutes = parseInt(form.hours) * 60 + parseInt(form.minutes);
    const payload = {
      category: form.category,
      clientId: form.category === "client" ? form.clientId || undefined : undefined,
      clientName: form.category === "client" ? client?.name || undefined : undefined,
      learningType: form.category === "learning" ? form.learningType || undefined : undefined,
      agencyType: form.category === "agency" ? form.agencyType || undefined : undefined,
      url: form.category === "learning" ? form.url.trim() || undefined : undefined,
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      duration: durationMinutes > 0 ? durationMinutes : undefined,
    };

    if (editingId) {
      updateTask(editingId, { ...payload, date: form.date });
      setEditingId(null);
    } else {
      const newTask: Task = {
        id: generateId(),
        date: form.date || currentDate,
        ...payload,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      addTask(newTask);
    }
    setForm(emptyForm);
    setShowForm(false);
  }

  function handleEditTask(task: Task) {
    const totalMin = task.duration ?? 0;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const closestM = MINUTE_OPTIONS.reduce(
      (prev, curr) => (Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev),
      0
    );
    setForm({
      title: task.title,
      category: task.category,
      clientId: task.clientId ?? "",
      learningType: task.learningType ?? "",
      agencyType: task.agencyType ?? "",
      url: task.url ?? "",
      date: task.date,
      hours: String(Math.min(h, 8)),
      minutes: String(closestM),
      notes: task.notes ?? "",
    });
    setEditingId(task.id);
    setShowForm(false);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    updateTask(id, { completed: !task.completed });
  }

  function toggleResourceDone(resource: Resource) {
    updateResource(resource.id, {
      status: resource.status === "done" ? "to-watch" : "done",
    });
  }

  function commitPendingDelete() {
    if (recentlyDeleted) {
      deleteTask(recentlyDeleted.id);
      setHiddenTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(recentlyDeleted.id);
        return next;
      });
      setRecentlyDeleted(null);
    }
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  }

  function handleDeleteTask(task: Task) {
    // commit any prior pending delete first
    if (recentlyDeleted && recentlyDeleted.id !== task.id) {
      commitPendingDelete();
    }
    setHiddenTaskIds((prev) => new Set(prev).add(task.id));
    setRecentlyDeleted(task);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => {
      deleteTask(task.id);
      setHiddenTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      setRecentlyDeleted(null);
      deleteTimerRef.current = null;
    }, 6000);
  }

  function handleUndoDelete() {
    if (!recentlyDeleted) return;
    setHiddenTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(recentlyDeleted.id);
      return next;
    });
    setRecentlyDeleted(null);
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  }

  const formBody = (
    <div className="space-y-3">
      <input
        autoFocus
        type="text"
        placeholder="What did you work on?"
        value={form.title}
        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSaveTask();
          if (e.key === "Escape") handleCancelForm();
        }}
        className={INPUT_CLS}
      />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setForm((p) => ({ ...p, category: cat }))}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                form.category === cat
                  ? `${meta.bg} ${meta.color} ${meta.border}`
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {form.category === "client" && (
          <select
            value={form.clientId}
            onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
            className={INPUT_CLS}
          >
            <option value="">Select client</option>
            {clients.length === 0 && <option disabled>Add clients first</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {form.category === "learning" && (
          <>
            <select
              value={form.learningType}
              onChange={(e) => setForm((p) => ({ ...p, learningType: e.target.value }))}
              className={INPUT_CLS}
            >
              <option value="">Source…</option>
              {LEARNING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="col-span-2 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="url"
                placeholder="Link (YouTube, article, course…) — optional"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
          </>
        )}

        {form.category === "agency" && (
          <select
            value={form.agencyType}
            onChange={(e) => setForm((p) => ({ ...p, agencyType: e.target.value }))}
            className={INPUT_CLS}
          >
            <option value="">Agency work type…</option>
            {AGENCY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select
            value={form.hours}
            onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
            className={cn(INPUT_CLS, "w-auto")}
            aria-label="Hours"
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
            aria-label="Minutes"
          >
            {MINUTE_OPTIONS.map((m) => (
              <option key={m} value={String(m)}>
                {m}m
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <button
          type="button"
          onClick={() => {
            const el = formDateInputRef.current;
            if (!el) return;
            const anyEl = el as HTMLInputElement & { showPicker?: () => void };
            if (typeof anyEl.showPicker === "function") anyEl.showPicker();
            else el.focus();
          }}
          className="text-sm text-foreground hover:text-primary px-3 py-1.5 rounded border border-border bg-background flex-1 text-left"
        >
          {formatDisplayDate(form.date)}
        </button>
        <input
          ref={formDateInputRef}
          type="date"
          value={form.date}
          onChange={(e) =>
            e.target.value && setForm((p) => ({ ...p, date: e.target.value }))
          }
          className="sr-only"
          tabIndex={-1}
          aria-label="Task date"
        />
        {form.date !== currentDate && (
          <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
            different day
          </span>
        )}
      </div>

      <textarea
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        rows={2}
        className={cn(INPUT_CLS, "resize-none")}
      />

      <div className="flex gap-2">
        <Button onClick={handleSaveTask} size="sm">
          {editingId ? "Save Changes" : "Add Task"}
        </Button>
        <Button onClick={handleCancelForm} variant="outline" size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );

  function renderTaskRow(task: Task, opts: { showDate?: boolean } = {}) {
    const meta = CATEGORY_META[task.category];
    const taskClient = task.clientId ? clients.find((c) => c.id === task.clientId) : undefined;
    const isEditing = editingId === task.id;
    return (
      <div
        key={task.id}
        className={cn(
          "rounded-lg border bg-card transition-all overflow-hidden",
          isEditing && "ring-2 ring-primary/40 border-primary/40"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 p-3 group",
            task.completed && "opacity-55"
          )}
        >
          <button
            onClick={() => toggleTask(task.id)}
            className={cn(
              "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
              task.completed
                ? "bg-emerald-500 border-emerald-500"
                : "border-border hover:border-emerald-400"
            )}
          >
            {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
          </button>

          <TaskAvatar task={task} client={taskClient} />

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span
                className={cn(
                  "text-[11px] font-medium px-1.5 py-0.5 rounded-full",
                  meta.bg,
                  meta.color
                )}
              >
                {meta.label}
              </span>
              {opts.showDate && (
                <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                  from {new Date(task.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              )}
              {task.clientName && (
                <span className="text-[11px] text-muted-foreground">· {task.clientName}</span>
              )}
              {task.learningType && (
                <span className="text-[11px] text-muted-foreground">· {task.learningType}</span>
              )}
              {task.agencyType && (
                <span className="text-[11px] text-muted-foreground">· {task.agencyType}</span>
              )}
            </div>
            {task.notes && <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {task.duration && (
              <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                {formatDuration(task.duration)}
              </span>
            )}
            <div
              className={cn(
                "flex items-center gap-1 transition-all",
                isEditing ? "opacity-100" : "sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <button
                onClick={() => (isEditing ? handleCancelForm() : handleEditTask(task))}
                className={cn(
                  "tap-target p-1 rounded transition-colors",
                  isEditing
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
                aria-label={isEditing ? "Close editor" : "Edit task"}
              >
                {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleDeleteTask(task)}
                className="tap-target p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors"
                aria-label="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="border-t border-border p-4 bg-secondary/30">{formBody}</div>
        )}
      </div>
    );
  }

  function renderResourceRow(resource: Resource, opts: { showDate?: boolean } = {}) {
    const isDone = resource.status === "done";
    return (
      <div
        key={`r-${resource.id}`}
        className="rounded-lg border bg-card transition-all overflow-hidden"
      >
        <div className={cn("flex items-center gap-3 p-3 group", isDone && "opacity-55")}>
          <button
            onClick={() => toggleResourceDone(resource)}
            className={cn(
              "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
              isDone
                ? "bg-emerald-500 border-emerald-500"
                : "border-border hover:border-emerald-400"
            )}
          >
            {isDone && <Check className="w-2.5 h-2.5 text-white" />}
          </button>

          <ResourceAvatar resource={resource} />

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                isDone && "line-through text-muted-foreground"
              )}
            >
              {resource.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700">
                Resource
              </span>
              {opts.showDate && resource.pinnedDate && (
                <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                  from {new Date(resource.pinnedDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">· {resource.category}</span>
            </div>
            {resource.notes && (
              <p className="text-xs text-muted-foreground mt-1">{resource.notes}</p>
            )}
          </div>

          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            aria-label="Open link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex gap-6">
        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Daily Log</h1>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setCurrentDate(addDays(currentDate, -1))}
                  className="tap-target w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center hover:bg-secondary hover:border-foreground/40 transition-colors"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={openDatePicker}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary px-3 py-1.5 rounded-md hover:bg-secondary transition-colors border border-border bg-card"
                >
                  <CalendarIcon className="w-4 h-4" />
                  {formatDisplayDate(currentDate)}
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={currentDate}
                  onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
                  className="sr-only"
                  aria-label="Pick a date"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  onClick={() => setCurrentDate(addDays(currentDate, 1))}
                  className="tap-target w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center hover:bg-secondary hover:border-foreground/40 transition-colors"
                  aria-label="Next day"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
                {!isToday && (
                  <button
                    type="button"
                    onClick={() => setCurrentDate(today())}
                    className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium hover:bg-primary/20 transition-colors"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
            <Button
              onClick={() => {
                if (showForm || editingId) {
                  handleCancelForm();
                } else {
                  setEditingId(null);
                  setForm({ ...emptyForm, date: currentDate });
                  setShowForm(true);
                }
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-5">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{dateTasks.length}</span> tasks
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-emerald-600">{doneTasks}</span> done
            </span>
            {totalMinutes > 0 && (
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{formatDuration(totalMinutes)}</span>{" "}
                logged
              </span>
            )}
            {dateTasks.length > 0 && (
              <div className="flex-1 max-w-28">
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(doneTasks / dateTasks.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {showForm && !editingId && (
            <div className="mb-5 p-4 bg-card border border-border rounded-lg shadow-sm">
              <h2 className="text-sm font-semibold mb-3">New Task</h2>
              {formBody}
            </div>
          )}

          {/* Category filter */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                activeFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              All ({dateTasks.length + dateResources.length})
            </button>
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const count = dateTasks.filter((t) => t.category === cat).length;
              if (count === 0 && activeFilter !== cat) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    activeFilter === cat
                      ? `${meta.bg} ${meta.color} ${meta.border}`
                      : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {meta.label} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Task & resource list */}
          {tasksLoading && tasks.length === 0 ? (
            <div className="space-y-2" aria-label="Loading tasks">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Skeleton className="w-4 h-4 rounded-sm" />
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 && filteredResources.length === 0 && carryOverTasks.length === 0 && carryOverResources.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-lg border border-dashed border-border bg-card/40">
              <p className="text-sm font-medium text-foreground">
                Your day starts here.
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Log client work, learning, agency tasks or anything personal.
                It all rolls up into the Weekly view automatically.
              </p>
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...emptyForm, date: currentDate });
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add a task
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((t) => renderTaskRow(t))}
              {filteredResources.map((r) => renderResourceRow(r))}

              {(carryOverTasks.length > 0 || carryOverResources.length > 0) && (
                <div className="pt-5 mt-3 border-t border-dashed border-border space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Carry-over from earlier ({carryOverTasks.length + carryOverResources.length})
                  </h3>
                  {carryOverTasks.map((t) => renderTaskRow(t, { showDate: true }))}
                  {carryOverResources.map((r) => renderResourceRow(r, { showDate: true }))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weekly sidebar */}
        <aside className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              This Week
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <p className="text-lg font-bold text-foreground">{weekTotal}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{weekDone}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Done</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{weekPending}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pending</p>
              </div>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid hsl(240 5% 15%)",
                      background: "hsl(240 6% 7%)",
                      color: "hsl(0 0% 95%)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No tasks this week</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Daily Progress
            </h3>
            {weekTotal > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={dailyProgress} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(240 5% 90%)" strokeDasharray="2 2" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid hsl(240 5% 15%)",
                      background: "hsl(240 6% 7%)",
                      color: "hsl(0 0% 95%)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="done"
                    name="Done"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 2, fill: "#94a3b8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No data yet</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Done</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-muted-foreground">Total</span>
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Undo delete toast */}
      {recentlyDeleted && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">
            Deleted &ldquo;{recentlyDeleted.title}&rdquo;
          </span>
          <button
            onClick={handleUndoDelete}
            className="flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default function DailyLogPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Loading…</div>}>
      <DailyLogContent />
    </Suspense>
  );
}
