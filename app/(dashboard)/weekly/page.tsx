"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useTasks, useResources } from "@/lib/db";
import { TaskCategory, CATEGORY_META, today, addDays, formatDuration } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CATEGORIES: TaskCategory[] = ["client", "learning", "agency", "personal"];

const CAT_HEX: Record<TaskCategory, string> = {
  client: "#3b82f6",
  learning: "#10b981",
  agency: "#f59e0b",
  admin: "#f43f5e",
  personal: "#8b5cf6",
};

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
  const { tasks } = useTasks();
  const { resources } = useResources();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today()));

  const weekDays = getWeekDays(weekStart);
  const todayStr = today();
  const isCurrentWeek = weekStart === getWeekStart(todayStr);

  const tasksByDate: Record<string, typeof tasks> = {};
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

  const activeCategories = CATEGORIES.filter((cat) =>
    allWeekTasks.some((t) => t.category === cat)
  );

  const weekDoneResources = resources.filter(
    (r) => r.pinnedDate && weekDays.includes(r.pinnedDate) && r.status === "done"
  );
  const hasResourceData = weekDoneResources.length > 0;

  // Stacked bar chart: task count per day per category + done resources
  const barData = weekDays.map((day, i) => {
    const dayTasks = tasksByDate[day];
    const entry: Record<string, string | number> = { day: SHORT_DAYS[i] };
    CATEGORIES.forEach((cat) => {
      entry[cat] = dayTasks.filter((t) => t.category === cat).length;
    });
    entry["resources"] = resources.filter((r) => r.pinnedDate === day && r.status === "done").length;
    return entry;
  });

  // Donut chart: weekly totals per category + done resources
  const pieData = categoryBreakdown.map(({ cat, count, minutes }) => ({
    name: CATEGORY_META[cat].label,
    value: count,
    displayValue: minutes > 0 ? formatDuration(minutes) : `${count} tasks`,
    color: CAT_HEX[cat],
  }));
  if (hasResourceData) {
    pieData.push({
      name: "Resources Done",
      value: weekDoneResources.length,
      displayValue: `${weekDoneResources.length} done`,
      color: "#0ea5e9",
    });
  }

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
              const dayResources = resources.filter((r) => r.pinnedDate === day);
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
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5 flex-shrink-0", meta.dot)} />
                          <span className={cn(meta.color, "truncate", task.completed && "line-through")}>
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                    {dayResources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-start gap-1 p-1.5 rounded text-[10px] leading-snug bg-violet-50 hover:bg-violet-100 transition-colors",
                          resource.status === "done" && "opacity-40"
                        )}
                      >
                        <BookOpen className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 text-violet-500" />
                        <span className={cn("text-violet-700 truncate", resource.status === "done" && "line-through")}>
                          {resource.title}
                        </span>
                      </a>
                    ))}
                    {dayTasks.length === 0 && dayResources.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/30 text-center pt-6">—</p>
                    )}
                  </div>

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

        {/* Completion stat */}
        {allWeekTasks.length > 0 && (
          <div className="w-44 flex-shrink-0">
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
          </div>
        )}
      </div>

      {/* Charts */}
      {(allWeekTasks.length > 0 || hasResourceData) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Stacked bar — tasks per day */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Tasks per Day
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "hsl(240 5% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(240 5% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(240 5% 15%)",
                    background: "hsl(240 6% 7%)",
                    color: "hsl(0 0% 95%)",
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value) =>
                    value === "resources"
                      ? "Resources Done"
                      : CATEGORY_META[value as TaskCategory]?.label ?? value
                  }
                />
                {activeCategories.map((cat) => (
                  <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={CAT_HEX[cat]} />
                ))}
                {hasResourceData && (
                  <Bar dataKey="resources" name="resources" stackId="a" fill="#0ea5e9" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut — weekly distribution */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Weekly Distribution
            </h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(240 5% 15%)",
                      background: "hsl(240 6% 7%)",
                      color: "hsl(0 0% 95%)",
                    }}
                    formatter={(value, name) => [
                      pieData.find((d) => d.name === name)?.displayValue ?? value,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-muted-foreground flex-1">{entry.name}</span>
                    <span className="text-xs font-semibold text-foreground">{entry.displayValue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
