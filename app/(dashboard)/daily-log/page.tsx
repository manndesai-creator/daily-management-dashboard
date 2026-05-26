"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTasks, useClients } from "@/lib/db";
import {
  Task,
  Client,
  TaskCategory,
  CATEGORY_META,
  getClientColor,
  generateId,
  today,
  formatDisplayDate,
  addDays,
  formatDuration,
  extractYouTubeId,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, ChevronLeft, ChevronRight, Check, Trash2, Clock,
  Globe2, Heart, BookOpen, ExternalLink, Link as LinkIcon,
  Edit2, Calendar as CalendarIcon,
} from "lucide-react";

const CATEGORIES: TaskCategory[] = ["client", "learning", "agency", "personal"];
const LEARNING_TYPES = ["YouTube", "Webinar", "Book", "PDF", "Document", "AI Tool", "Other"];
const AGENCY_TYPES = ["Outreach", "Hiring", "Team Management", "SOPs", "Other"];
const HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MINUTE_OPTIONS = [0, 15, 30, 45];

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
      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
        <Globe2 className="w-5 h-5 text-white" />
      </div>
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

function DailyLogContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const { clients } = useClients();

  const [currentDate, setCurrentDate] = useState(dateParam || today());
  const [activeFilter, setActiveFilter] = useState<TaskCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    title: "",
    category: "client" as TaskCategory,
    clientId: "",
    learningType: "",
    agencyType: "",
    url: "",
    hours: "0",
    minutes: "0",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const isToday = currentDate === today();
  const dateTasks = tasks.filter((t) => t.date === currentDate);
  const filteredTasks =
    activeFilter === "all" ? dateTasks : dateTasks.filter((t) => t.category === activeFilter);

  const doneTasks = dateTasks.filter((t) => t.completed).length;
  const totalMinutes = dateTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0);

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
      updateTask(editingId, payload);
      setEditingId(null);
    } else {
      const newTask: Task = {
        id: generateId(),
        date: currentDate,
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
    const closestM = MINUTE_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev
    , 0);
    setForm({
      title: task.title,
      category: task.category,
      clientId: task.clientId ?? "",
      learningType: task.learningType ?? "",
      agencyType: task.agencyType ?? "",
      url: task.url ?? "",
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

  function handleDeleteTask(id: string) {
    deleteTask(id);
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

      {/* Category pills */}
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

      {/* Conditional fields */}
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

        {/* Duration: hours + minutes */}
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Log</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              type="button"
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
              className="p-1.5 rounded hover:bg-secondary transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={openDatePicker}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary transition-colors"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
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
              className="p-1.5 rounded hover:bg-secondary transition-colors"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => setCurrentDate(today())}
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium hover:bg-primary/20 transition-colors"
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
              setForm(emptyForm);
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

      {/* New task form (top, only when adding) */}
      {showForm && !editingId && (
        <div className="mb-5 p-4 bg-card border border-border rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold mb-3">New Task</h3>
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
          All ({dateTasks.length})
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

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No tasks yet for this day.</p>
          <button
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
            }}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Add your first task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const meta = CATEGORY_META[task.category];
            const taskClient = task.clientId
              ? clients.find((c) => c.id === task.clientId)
              : undefined;
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
                      {task.clientName && (
                        <span className="text-[11px] text-muted-foreground">
                          · {task.clientName}
                        </span>
                      )}
                      {task.learningType && (
                        <span className="text-[11px] text-muted-foreground">
                          · {task.learningType}
                        </span>
                      )}
                      {task.agencyType && (
                        <span className="text-[11px] text-muted-foreground">
                          · {task.agencyType}
                        </span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>
                    )}
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
                        isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <button
                        onClick={() =>
                          isEditing ? handleCancelForm() : handleEditTask(task)
                        }
                        className={cn(
                          "p-1 rounded transition-colors",
                          isEditing
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                        aria-label={isEditing ? "Close editor" : "Edit task"}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline accordion edit form */}
                {isEditing && (
                  <div className="border-t border-border p-4 bg-secondary/30">
                    {formBody}
                  </div>
                )}
              </div>
            );
          })}
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
