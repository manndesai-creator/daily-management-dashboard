"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocalStorage } from "@/lib/hooks";
import {
  Client,
  Task,
  TaskCategory,
  CATEGORY_META,
  generateId,
  today,
  formatDisplayDate,
  addDays,
  formatDuration,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, Check, Trash2, Clock } from "lucide-react";

const CATEGORIES: TaskCategory[] = ["client", "learning", "agency", "admin", "personal"];
const LEARNING_TYPES = [
  "Meta Ads", "Google Ads", "Reels & Video", "SEO", "Copywriting",
  "Design", "Analytics", "Email Marketing", "Strategy", "Other",
];

const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function DailyLogContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [tasks, setTasks] = useLocalStorage<Task[]>("glokal_tasks", []);
  const [clients] = useLocalStorage<Client[]>("glokal_clients", []);

  const [currentDate, setCurrentDate] = useState(dateParam || today());
  const [activeFilter, setActiveFilter] = useState<TaskCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);

  const emptyForm = {
    title: "",
    category: "client" as TaskCategory,
    clientId: "",
    learningType: "",
    duration: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const isToday = currentDate === today();
  const dateTasks = tasks.filter((t) => t.date === currentDate);
  const filteredTasks =
    activeFilter === "all" ? dateTasks : dateTasks.filter((t) => t.category === activeFilter);

  const doneTasks = dateTasks.filter((t) => t.completed).length;
  const totalMinutes = dateTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0);

  function handleAddTask() {
    if (!form.title.trim()) return;
    const client = clients.find((c) => c.id === form.clientId);
    const newTask: Task = {
      id: generateId(),
      date: currentDate,
      category: form.category,
      clientId: form.category === "client" ? form.clientId || undefined : undefined,
      clientName: form.category === "client" ? client?.name || undefined : undefined,
      learningType: form.category === "learning" ? form.learningType || undefined : undefined,
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      duration: form.duration ? parseInt(form.duration) : undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Log</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm text-muted-foreground">
              {formatDisplayDate(currentDate)}
            </span>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            {!isToday && (
              <button
                onClick={() => setCurrentDate(today())}
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium hover:bg-primary/20 transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
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

      {/* Add task form */}
      {showForm && (
        <div className="mb-5 p-4 bg-card border border-border rounded-lg shadow-sm">
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              placeholder="What did you work on?"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask();
                if (e.key === "Escape") setShowForm(false);
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
                  {clients.length === 0 && (
                    <option disabled>Add clients first</option>
                  )}
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              {form.category === "learning" && (
                <>
                  <input
                    type="text"
                    placeholder="Learning type (e.g. Meta Ads)"
                    value={form.learningType}
                    onChange={(e) => setForm((p) => ({ ...p, learningType: e.target.value }))}
                    list="learning-types"
                    className={INPUT_CLS}
                  />
                  <datalist id="learning-types">
                    {LEARNING_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </>
              )}

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="number"
                  placeholder="Duration (min)"
                  value={form.duration}
                  onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                  min="1"
                  className={INPUT_CLS}
                />
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
              <Button onClick={handleAddTask} size="sm">
                Add Task
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
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
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Add your first task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const meta = CATEGORY_META[task.category];
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border bg-card transition-opacity group",
                  task.completed && "opacity-55"
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                    task.completed
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-border hover:border-emerald-400"
                  )}
                >
                  {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
                </button>

                {/* Content */}
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
                  </div>
                  {task.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>
                  )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {task.duration && (
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {formatDuration(task.duration)}
                    </span>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
