"use client";

import { useState } from "react";
import { useGoals } from "@/lib/db";
import { Goal, TaskCategory, CATEGORY_META, generateId, currentMonth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORIES: TaskCategory[] = ["client", "learning", "agency", "admin", "personal"];
const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function getMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();
  const [month, setMonth] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "learning" as TaskCategory,
    notes: "",
  });

  const isCurrentMonth = month === currentMonth();
  const monthGoals = goals.filter((g) => g.month === month);
  const avgProgress =
    monthGoals.length > 0
      ? Math.round(monthGoals.reduce((sum, g) => sum + g.progress, 0) / monthGoals.length)
      : 0;

  function handleAdd() {
    if (!form.title.trim()) return;
    const newGoal: Goal = {
      id: generateId(),
      title: form.title.trim(),
      category: form.category,
      month,
      progress: 0,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    addGoal(newGoal);
    setForm({ title: "", category: "learning", notes: "" });
    setShowForm(false);
  }

  function handleUpdateProgress(id: string, progress: number) {
    updateGoal(id, { progress });
  }

  function handleDeleteGoal(id: string) {
    deleteGoal(id);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goals</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm text-muted-foreground">{getMonthLabel(month)}</span>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => setMonth(currentMonth())}
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium hover:bg-primary/20 transition-colors"
              >
                This Month
              </button>
            )}
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Goal
        </Button>
      </div>

      {/* Month summary */}
      {monthGoals.length > 0 && (
        <div className="mb-5 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {monthGoals.length} goal{monthGoals.length !== 1 ? "s" : ""} this month
            </span>
            <span className="text-sm font-semibold">{avgProgress}% avg progress</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-5 p-4 bg-card border border-border rounded-lg shadow-sm">
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              placeholder="What do you want to achieve this month?"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setShowForm(false);
              }}
              className={INPUT_CLS}
            />

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

            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className={cn(INPUT_CLS, "resize-none")}
            />

            <div className="flex gap-2">
              <Button onClick={handleAdd} size="sm">
                Add Goal
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Goals list */}
      {monthGoals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No goals set for {getMonthLabel(month)}.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Set your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {monthGoals.map((goal) => {
            const meta = CATEGORY_META[goal.category];
            return (
              <div key={goal.id} className="p-4 bg-card border border-border rounded-lg group">
                <div className="flex items-start gap-3">
                  <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", meta.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{goal.title}</p>
                        <span
                          className={cn(
                            "text-[11px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block",
                            meta.bg,
                            meta.color
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold tabular-nums text-foreground">
                          {goal.progress}%
                        </span>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {goal.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{goal.notes}</p>
                    )}

                    {/* Progress bar + slider */}
                    <div className="mt-3 space-y-1.5">
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-200", meta.dot)}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={goal.progress}
                        onChange={(e) => handleUpdateProgress(goal.id, Number(e.target.value))}
                        className="w-full h-1 cursor-pointer accent-current"
                      />
                    </div>
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
