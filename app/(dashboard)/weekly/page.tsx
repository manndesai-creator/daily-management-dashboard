"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocalStorage } from "@/lib/hooks";
import { Task, TaskCategory, CATEGORY_META, today, addDays, formatDuration } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CATEGORIES: TaskCategory[] = ["client", "learning", "agency", "admin", "personal"];

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split("T")[0];
}

function getWeekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function WeeklyPage() {
  const [tasks] = useLocalStorage<Task[]>("glokal_tasks", []);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today()));

  const weekDays = getWeekDays(weekStart);
  const todayStr = today();
  const isCurrentWeek = weekStart === getWeekStart(todayStr);

  const tasksByDate: Record<string, Task[]> = {};
  weekDays.forEach((d) => {
    tasksByDate[d] = tasks.filter((t) => t.date === d);
  });

  const allWeekTasks = weekDays.flatMap((d) => tasksByDate[d]);
  const doneTasks = allWeekTasks.filter((t) => t.completed).length;
  const totalMinutes = allWeekTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0);

  const categoryBreakdown = CATEGORIES.map((cat) => {
    const catTasks = allWeekTasks.filter((t) => t.category === cat);
    return {
      cat,
      count: catTasks.length,
      minutes: catTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
    };
  }).filter((c) => c.count > 0);

  const maxMinutes = Math.max(...categoryBreakdown.map((c) => c.minutes), 1);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly View</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm text-muted-foreground">
              {shortDate(weekDays[0])} — {shortDate(weekDays[6])}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekStart(getWeekStart(todayStr))}
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium hover:bg-primary/20 transition-colors"
              >
                This Week
              </button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{allWeekTasks.length}</span> tasks
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-emerald-600">{doneTasks}</span> done
          </span>
          {totalMinutes > 0 && (
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{formatDuration(totalMinutes)}</span>{" "}
              logged
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Week grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[640px]">
            {weekDays.map((day, i) => {
              const dayTasks = tasksByDate[day];
              const isToday = day === todayStr;
              const dayDone = dayTasks.filter((t) => t.completed).length;

              return (
                <div
                  key={day}
                  className={cn(
                    "rounded-lg border bg-card flex flex-col overflow-hidden",
                    isToday && "ring-2 ring-primary/25 border-primary/30"
                  )}
                >
                  {/* Day header */}
                  <div
                    className={cn(
                      "px-2.5 py-2 border-b",
                      isToday ? "bg-primary/5" : "bg-secondary/30"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-wide",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {SHORT_DAYS[i]}
                    </p>
                    <p
                      className={cn(
                        "text-base font-bold leading-tight",
                        isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {new Date(day + "T00:00:00").getDate()}
                    </p>
                    {dayTasks.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {dayDone}/{dayTasks.length}
                      </p>
                    )}
                  </div>

                  {/* Tasks */}
                  <div className="p-1.5 flex-1 space-y-1 min-h-28">
                    {dayTasks.map((task) => {
                      const meta = CATEGORY_META[task.category];
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-start gap-1 p-1.5 rounded text-[10px] leading-snug",
                            meta.bg,
                            task.completed && "opacity-40"
                          )}
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full mt-0.5 flex-shrink-0",
                              meta.dot
                            )}
                          />
                          <span className={cn(meta.color, "truncate", task.completed && "line-through")}>
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                    {dayTasks.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/30 text-center pt-6">—</p>
                    )}
                  </div>

                  {/* Open in daily log */}
                  <Link
                    href={`/daily-log?date=${day}`}
                    className="block text-[10px] text-muted-foreground hover:text-primary text-center py-1.5 border-t hover:bg-secondary/50 transition-colors"
                  >
                    Open
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="w-48 flex-shrink-0 space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              By Category
            </h3>
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks logged</p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map(({ cat, minutes, count }) => {
                  const meta = CATEGORY_META[cat];
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs font-medium", meta.color)}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {minutes ? formatDuration(minutes) : `${count}t`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", meta.dot)}
                          style={{ width: `${(minutes / maxMinutes) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {allWeekTasks.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Completion
              </h3>
              <div className="text-2xl font-bold text-foreground">
                {Math.round((doneTasks / allWeekTasks.length) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {doneTasks} of {allWeekTasks.length} done
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(doneTasks / allWeekTasks.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
