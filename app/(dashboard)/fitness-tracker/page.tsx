"use client";

import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE_COMPACT, CHART_TICK_FILL,
  CHART_GRID_STROKE, CHART_CURSOR_FILL,
} from "@/lib/chart-theme";
import {
  useFitnessActivities, useWorkoutSessions, useWorkoutSets,
  useWorkoutTemplates, useDailySteps, useBodyWeightLogs,
} from "@/lib/db";
import {
  FitnessActivity, WorkoutSession, WorkoutSet, WorkoutTemplate,
  DailySteps, BodyWeightLog,
  ActivityType, ACTIVITY_TYPE_META,
  MUSCLE_GROUPS, COMMON_EXERCISES,
  generateId, today, addDays, getWeekStart, formatDisplayDate, formatDuration,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Edit2, X, Check, Trophy, Dumbbell,
  Footprints, Activity, Scale, ClipboardList, ChevronDown, ChevronUp,
  Flame, TrendingUp, TrendingDown, Calendar,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────

const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";
const TABS = [
  { key: "overview",   label: "Overview",   icon: Activity },
  { key: "activities", label: "Activities", icon: Flame },
  { key: "gym",        label: "Gym",        icon: Dumbbell },
  { key: "plans",      label: "Plans",      icon: ClipboardList },
  { key: "steps",      label: "Steps",      icon: Footprints },
  { key: "body",       label: "Body",       icon: Scale },
] as const;
type Tab = (typeof TABS)[number]["key"];

const STEP_GOAL = 10000;

// ─── Helpers ───────────────────────────────────────────────────────────────

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${parseInt(day)} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]}`;
}

function isoMonth(d: string) { return d.slice(0, 7); }
function isoYear(d: string)  { return d.slice(0, 4); }

function sessionVolume(sets: WorkoutSet[], sessionId: string): number {
  return sets
    .filter((s) => s.sessionId === sessionId && !s.isWarmup)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);
}

function exercisePR(sets: WorkoutSet[], name: string): number {
  const ex = sets.filter((s) => s.exerciseName === name && !s.isWarmup);
  return ex.length ? Math.max(...ex.map((s) => s.weight)) : 0;
}

function lastSessionSetsForExercise(
  sets: WorkoutSet[], sessions: WorkoutSession[], name: string, excludeSessionId?: string
): { session: WorkoutSession; sets: WorkoutSet[] } | null {
  const relevantSets = sets.filter(
    (s) => s.exerciseName === name && s.sessionId !== excludeSessionId
  );
  if (!relevantSets.length) return null;
  const lastSessionId = relevantSets.slice().sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )[0].sessionId;
  const session = sessions.find((s) => s.id === lastSessionId);
  if (!session) return null;
  return { session, sets: relevantSets.filter((s) => s.sessionId === lastSessionId) };
}

// ─── Small shared UI ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub, onAdd, addLabel }: {
  icon: React.ElementType; title: string; sub: string;
  onAdd?: () => void; addLabel?: string;
}) {
  return (
    <div className="text-center py-14 px-4 rounded-lg border border-dashed border-border bg-card/40">
      <Icon className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{sub}</p>
      {onAdd && (
        <button onClick={onAdd} className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" />{addLabel ?? "Add"}
        </button>
      )}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────

function OverviewTab({
  activities, sessions, sets, stepLogs, weightLogs,
  onTabChange,
}: {
  activities: FitnessActivity[];
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
  stepLogs: DailySteps[];
  weightLogs: BodyWeightLog[];
  onTabChange: (t: Tab) => void;
}) {
  const t = today();
  const weekStart = getWeekStart(t);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekActivities = activities.filter((a) => weekDays.includes(a.date));
  const weekSessions   = sessions.filter((s) => weekDays.includes(s.date));
  const todaySteps     = stepLogs.find((s) => s.date === t);
  const latestWeight   = weightLogs[0];

  const totalWorkouts  = weekSessions.length;
  const totalDuration  = weekActivities.reduce((sum, a) => sum + (a.duration ?? 0), 0);

  // Weekly step bar
  const stepBarData = weekDays.map((d, i) => {
    const entry = stepLogs.find((s) => s.date === d);
    return { day: ["M","T","W","T","F","S","S"][i], steps: entry?.steps ?? 0, isToday: d === t };
  });

  // Recent activity list
  const recent = [...activities, ...sessions.map((s) => ({ ...s, type: "gym" as ActivityType, name: s.name, duration: s.durationMinutes }))]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Workouts this week" value={totalWorkouts} sub="sessions logged" color="text-primary" />
        <StatCard label="Active time" value={totalDuration ? formatDuration(totalDuration) : "—"} sub="this week" />
        <StatCard
          label="Today's steps"
          value={todaySteps ? todaySteps.steps.toLocaleString() : "—"}
          sub={todaySteps ? `${Math.round((todaySteps.steps / STEP_GOAL) * 100)}% of goal` : "not logged"}
          color={todaySteps && todaySteps.steps >= STEP_GOAL ? "text-emerald-600" : "text-foreground"}
        />
        <StatCard label="Body weight" value={latestWeight ? `${latestWeight.weight} kg` : "—"} sub={latestWeight ? shortDate(latestWeight.date) : "not logged"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Weekly steps */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Steps This Week</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stepBarData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: CHART_TICK_FILL }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_TICK_FILL }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE_COMPACT} cursor={{ fill: CHART_CURSOR_FILL }} />
              <Bar dataKey="steps" name="Steps" radius={[3,3,0,0]}>
                {stepBarData.map((d, i) => (
                  <Cell key={i} fill={d.steps >= STEP_GOAL ? "#10b981" : d.isToday ? "hsl(25 40% 36%)" : "#d1c5b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recent Activity</p>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No activities yet</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((a, i) => {
                const meta = ACTIVITY_TYPE_META[a.type as ActivityType] ?? ACTIVITY_TYPE_META.other;
                return (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="text-base">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground">{shortDate(a.date)}{a.duration ? ` · ${formatDuration(a.duration)}` : ""}</p>
                    </div>
                    <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded-full", meta.bg, meta.color)}>{meta.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick-access buttons */}
      <div className="flex flex-wrap gap-2">
        {(["gym","steps","body","activities"] as Tab[]).map((tab) => {
          const t2 = TABS.find((t) => t.key === tab)!;
          const Icon = t2.icon;
          return (
            <button key={tab} onClick={() => onTabChange(tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-secondary transition-colors">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Log {t2.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Activities Tab ────────────────────────────────────────────────────────

function ActivitiesTab({
  activities, addActivity, updateActivity, deleteActivity,
}: {
  activities: FitnessActivity[];
  addActivity: (a: FitnessActivity) => void;
  updateActivity: (id: string, u: Partial<FitnessActivity>) => void;
  deleteActivity: (id: string) => void;
}) {
  const emptyForm = { name: "", type: "gym" as ActivityType, date: today(), hours: "0", minutes: "0", notes: "" };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function save() {
    if (!form.name.trim()) return;
    const duration = parseInt(form.hours) * 60 + parseInt(form.minutes);
    const payload = {
      type: form.type, name: form.name.trim(), date: form.date,
      duration: duration > 0 ? duration : undefined, notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      updateActivity(editingId, payload);
      setEditingId(null);
    } else {
      addActivity({ id: generateId(), ...payload, createdAt: new Date().toISOString() });
    }
    setForm(emptyForm);
    setShowForm(false);
  }

  function startEdit(a: FitnessActivity) {
    const h = Math.floor((a.duration ?? 0) / 60);
    const m = (a.duration ?? 0) % 60;
    setForm({ name: a.name, type: a.type, date: a.date, hours: String(h), minutes: String(m), notes: a.notes ?? "" });
    setEditingId(a.id);
    setShowForm(true);
  }

  // Pie chart data
  const typeCounts = Object.fromEntries(
    (Object.keys(ACTIVITY_TYPE_META) as ActivityType[]).map((k) => [k, activities.filter((a) => a.type === k).length])
  );
  const pieData = (Object.keys(ACTIVITY_TYPE_META) as ActivityType[])
    .filter((k) => typeCounts[k] > 0)
    .map((k) => ({ name: ACTIVITY_TYPE_META[k].label, value: typeCounts[k], key: k }));
  const PIE_COLORS: Record<string, string> = {
    gym: "#f97316", swimming: "#3b82f6", running: "#10b981", cycling: "#eab308",
    sports: "#8b5cf6", yoga: "#ec4899", other: "#94a3b8",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Activity Log</h2>
        <Button size="sm" onClick={() => { setEditingId(null); setForm({ ...emptyForm, date: today() }); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-1" />Log Activity
        </Button>
      </div>

      {showForm && (
        <div className="p-4 bg-card border border-border rounded-lg shadow-sm space-y-3">
          <h3 className="text-sm font-semibold">{editingId ? "Edit Activity" : "New Activity"}</h3>
          <input autoFocus type="text" placeholder="Activity name (e.g. Morning Run, Chest Day)" value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={INPUT} />
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACTIVITY_TYPE_META) as ActivityType[]).map((k) => {
              const m = ACTIVITY_TYPE_META[k];
              return (
                <button key={k} type="button" onClick={() => setForm((p) => ({ ...p, type: k }))}
                  className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    form.type === k ? `${m.bg} ${m.color} ${m.border}` : "bg-secondary border-border text-muted-foreground hover:text-foreground")}>
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={(e) => e.target.value && setForm((p) => ({ ...p, date: e.target.value }))}
                className={INPUT} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
              <div className="flex gap-2">
                <select value={form.hours} onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))} className={cn(INPUT, "w-auto")}>
                  {Array.from({ length: 9 }, (_, i) => <option key={i} value={i}>{i}h</option>)}
                </select>
                <select value={form.minutes} onChange={(e) => setForm((p) => ({ ...p, minutes: e.target.value }))} className={cn(INPUT, "w-auto")}>
                  {[0,15,30,45].map((m) => <option key={m} value={m}>{m}m</option>)}
                </select>
              </div>
            </div>
          </div>
          <textarea placeholder="Notes (optional)" value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className={cn(INPUT, "resize-none")} />
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>{editingId ? "Save" : "Add"}</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* List */}
        <div className="md:col-span-2 space-y-2">
          {activities.length === 0 ? (
            <EmptyState icon={Flame} title="No activities logged" sub="Track your gym sessions, runs, swims and more." onAdd={() => setShowForm(true)} addLabel="Log activity" />
          ) : (
            activities.map((a) => {
              const meta = ACTIVITY_TYPE_META[a.type];
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card group">
                  <span className="text-xl">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.name}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded-full", meta.bg, meta.color)}>{meta.label}</span>
                      <span className="text-[11px] text-muted-foreground">{shortDate(a.date)}</span>
                      {a.duration && <span className="text-[11px] text-muted-foreground">· {formatDuration(a.duration)}</span>}
                    </div>
                    {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(a)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteActivity(a.id)} className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chart */}
        {pieData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">By Type</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {pieData.map((d, i) => <Cell key={i} fill={PIE_COLORS[d.key] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE_COMPACT} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {pieData.map((d) => (
                <div key={d.key} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[d.key] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Gym Tracker Tab ───────────────────────────────────────────────────────

function GymTab({
  sessions, addSession, deleteSession,
  sets, addSet, updateSet, deleteSet,
  templates,
}: {
  sessions: WorkoutSession[];
  addSession: (s: WorkoutSession) => void;
  deleteSession: (id: string) => void;
  sets: WorkoutSet[];
  addSet: (s: WorkoutSet) => void;
  updateSet: (id: string, u: Partial<WorkoutSet>) => void;
  deleteSet: (id: string) => void;
  templates: WorkoutTemplate[];
}) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState(today());
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [showExerciseSuggestions, setShowExerciseSuggestions] = useState(false);
  const [setForm, setSetForm] = useState({ weight: "", reps: "", isWarmup: false });
  const exerciseInputRef = useRef<HTMLInputElement>(null);

  const todaySessions = sessions.filter((s) => s.date === today());
  const pastSessions  = sessions.filter((s) => s.date !== today());

  // All exercise names ever used (for autocomplete)
  const allExerciseNames = useMemo(() => {
    const fromSets = [...new Set(sets.map((s) => s.exerciseName))];
    const fromLibrary = Object.values(COMMON_EXERCISES).flat();
    return [...new Set([...fromSets, ...fromLibrary])].sort();
  }, [sets]);

  const exerciseSuggestions = useMemo(() => {
    if (!selectedExercise) return selectedMuscle ? (COMMON_EXERCISES[selectedMuscle] ?? []) : [];
    return allExerciseNames.filter((n) => n.toLowerCase().includes(selectedExercise.toLowerCase())).slice(0, 8);
  }, [selectedExercise, selectedMuscle, allExerciseNames]);

  function startNewSession() {
    if (!sessionName.trim()) return;
    const s: WorkoutSession = { id: generateId(), date: sessionDate, name: sessionName.trim(), createdAt: new Date().toISOString() };
    addSession(s);
    setActiveSessionId(s.id);
    setExpandedSessionId(s.id);
    setShowNewSession(false);
    setSessionName("");
    setSessionDate(today());
  }

  function addSetToSession() {
    if (!activeSessionId || !selectedExercise.trim() || !setForm.weight || !setForm.reps) return;
    const sessionSets = sets.filter((s) => s.sessionId === activeSessionId && s.exerciseName === selectedExercise);
    const setNumber = sessionSets.length + 1;
    const newSet: WorkoutSet = {
      id: generateId(), sessionId: activeSessionId, exerciseName: selectedExercise.trim(),
      muscleGroup: selectedMuscle || undefined, setNumber,
      weight: parseFloat(setForm.weight), reps: parseInt(setForm.reps),
      isWarmup: setForm.isWarmup, createdAt: new Date().toISOString(),
    };
    addSet(newSet);
    setSetForm({ weight: "", reps: "", isWarmup: false });
  }

  // Group sets by exercise within a session
  function getSessionExercises(sessionId: string) {
    const sessionSets = sets.filter((s) => s.sessionId === sessionId);
    const byExercise: Record<string, WorkoutSet[]> = {};
    for (const s of sessionSets) {
      if (!byExercise[s.exerciseName]) byExercise[s.exerciseName] = [];
      byExercise[s.exerciseName].push(s);
    }
    return byExercise;
  }

  function isPR(exerciseName: string, weight: number, excludeSessionId?: string): boolean {
    const prev = sets.filter((s) => s.exerciseName === exerciseName && !s.isWarmup && s.sessionId !== excludeSessionId);
    if (!prev.length) return false; // only flag PR if there's prior data
    return weight > Math.max(...prev.map((s) => s.weight));
  }

  function renderSessionCard(session: WorkoutSession, isActive: boolean) {
    const isExpanded = expandedSessionId === session.id;
    const exerciseMap = getSessionExercises(session.id);
    const exerciseNames = Object.keys(exerciseMap);
    const vol = sessionVolume(sets, session.id);

    return (
      <div key={session.id} className={cn("rounded-lg border bg-card transition-all", isActive && "ring-2 ring-primary/40 border-primary/40")}>
        <div className="flex items-center gap-3 p-3">
          <button onClick={() => setExpandedSessionId(isExpanded ? null : session.id)} className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{session.name}</p>
              {isActive && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">Active</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {shortDate(session.date)} · {exerciseNames.length} exercise{exerciseNames.length !== 1 ? "s" : ""}{vol > 0 ? ` · ${vol.toLocaleString()} kg volume` : ""}
            </p>
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isActive && (
              <button onClick={() => { setActiveSessionId(session.id); setExpandedSessionId(session.id); }}
                className="text-[11px] font-medium text-primary px-2 py-1 rounded hover:bg-primary/10 transition-colors">
                Resume
              </button>
            )}
            {isActive && (
              <button onClick={() => setActiveSessionId(null)} className="text-[11px] text-muted-foreground px-2 py-1 rounded hover:bg-secondary transition-colors">
                Finish
              </button>
            )}
            <button onClick={() => { deleteSession(session.id); if (activeSessionId === session.id) setActiveSessionId(null); }}
              className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setExpandedSessionId(isExpanded ? null : session.id)} className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-border p-4 space-y-4">
            {/* Exercise rows */}
            {exerciseNames.map((exName) => {
              const exSets = exerciseMap[exName];
              const pr = exercisePR(sets, exName);
              const lastSession = lastSessionSetsForExercise(sets, sessions, exName, session.id);
              return (
                <div key={exName}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold">{exName}</p>
                    {pr > 0 && <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">PR: {pr} kg</span>}
                  </div>
                  {lastSession && (
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Last ({shortDate(lastSession.session.date)}):&nbsp;
                      {lastSession.sets.map((s, i) => `${s.weight}kg×${s.reps}`).join(" · ")}
                    </p>
                  )}
                  <div className="space-y-1">
                    {exSets.map((s) => {
                      const isNewPR = !s.isWarmup && isPR(s.exerciseName, s.weight, undefined);
                      return (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                          <span className="w-5 text-center text-[11px] text-muted-foreground font-medium">{s.setNumber}</span>
                          {s.isWarmup && <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 rounded">W</span>}
                          <span className="font-medium">{s.weight} kg</span>
                          <span className="text-muted-foreground">×</span>
                          <span>{s.reps} reps</span>
                          {isNewPR && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                          <button onClick={() => deleteSet(s.id)} className="ml-auto p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Add set form (only if active) */}
            {isActive && (
              <div className="pt-3 border-t border-dashed border-border space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Set</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={selectedMuscle} onChange={(e) => { setSelectedMuscle(e.target.value); setSelectedExercise(""); }}
                    className={INPUT}>
                    <option value="">Muscle group…</option>
                    {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div className="relative">
                    <input ref={exerciseInputRef} type="text" placeholder="Exercise name"
                      value={selectedExercise}
                      onChange={(e) => { setSelectedExercise(e.target.value); setShowExerciseSuggestions(true); }}
                      onFocus={() => setShowExerciseSuggestions(true)}
                      className={INPUT} />
                    {showExerciseSuggestions && exerciseSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {exerciseSuggestions.map((name) => (
                          <button key={name} type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            onClick={() => { setSelectedExercise(name); setShowExerciseSuggestions(false); }}>
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Weight (kg)</label>
                    <input type="number" min="0" step="0.5" placeholder="60" value={setForm.weight}
                      onChange={(e) => setSetForm((p) => ({ ...p, weight: e.target.value }))} className={INPUT} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                    <input type="number" min="1" placeholder="10" value={setForm.reps}
                      onChange={(e) => setSetForm((p) => ({ ...p, reps: e.target.value }))} className={INPUT} />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={setForm.isWarmup} onChange={(e) => setSetForm((p) => ({ ...p, isWarmup: e.target.checked }))} className="rounded" />
                    Warmup
                  </label>
                  <Button size="sm" onClick={addSetToSession} className="mb-0.5">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Gym Tracker</h2>
        <Button size="sm" onClick={() => setShowNewSession(!showNewSession)}>
          <Plus className="w-4 h-4 mr-1" />New Workout
        </Button>
      </div>

      {showNewSession && (
        <div className="p-4 bg-card border border-border rounded-lg space-y-3">
          <h3 className="text-sm font-semibold">Start Workout</h3>
          <input autoFocus type="text" placeholder="Workout name (e.g. Push Day, Chest & Triceps)"
            value={sessionName} onChange={(e) => setSessionName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startNewSession()}
            className={INPUT} />
          <div className="flex gap-2 flex-wrap">
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => setSessionName(t.name)}
                className={cn("px-2.5 py-1 rounded-md border text-xs transition-colors",
                  sessionName === t.name ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground")}>
                {t.name}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <input type="date" value={sessionDate} onChange={(e) => e.target.value && setSessionDate(e.target.value)} className={cn(INPUT, "w-auto")} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={startNewSession}>Start</Button>
            <Button size="sm" variant="outline" onClick={() => setShowNewSession(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Today */}
      {todaySessions.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Today</p>
          <div className="space-y-2">
            {todaySessions.map((s) => renderSessionCard(s, activeSessionId === s.id))}
          </div>
        </div>
      )}

      {/* Past */}
      {pastSessions.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">History</p>
          <div className="space-y-2">
            {pastSessions.map((s) => renderSessionCard(s, false))}
          </div>
        </div>
      )}

      {sessions.length === 0 && !showNewSession && (
        <EmptyState icon={Dumbbell} title="No workouts logged yet" sub="Start a workout to begin tracking your lifts, sets, reps and weight." onAdd={() => setShowNewSession(true)} addLabel="Start first workout" />
      )}
    </div>
  );
}

// ─── Plans Tab ─────────────────────────────────────────────────────────────

function PlansTab({
  templates, addTemplate, updateTemplate, deleteTemplate,
  onStartWorkout,
}: {
  templates: WorkoutTemplate[];
  addTemplate: (t: WorkoutTemplate) => void;
  updateTemplate: (id: string, u: Partial<WorkoutTemplate>) => void;
  deleteTemplate: (id: string) => void;
  onStartWorkout?: (name: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<string[]>([""]);

  function save() {
    if (!name.trim()) return;
    const exList = exercises.map((e) => e.trim()).filter(Boolean);
    if (editingId) {
      updateTemplate(editingId, { name: name.trim(), exercises: exList, notes: notes.trim() || undefined });
      setEditingId(null);
    } else {
      addTemplate({ id: generateId(), name: name.trim(), exercises: exList, notes: notes.trim() || undefined, createdAt: new Date().toISOString() });
    }
    setShowForm(false); setName(""); setNotes(""); setExercises([""]);
  }

  function startEdit(t: WorkoutTemplate) {
    setName(t.name); setNotes(t.notes ?? ""); setExercises(t.exercises.length ? [...t.exercises, ""] : [""]);
    setEditingId(t.id); setShowForm(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Workout Plans</h2>
        <Button size="sm" onClick={() => { setEditingId(null); setName(""); setNotes(""); setExercises([""]); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-1" />New Plan
        </Button>
      </div>

      {showForm && (
        <div className="p-4 bg-card border border-border rounded-lg space-y-3">
          <h3 className="text-sm font-semibold">{editingId ? "Edit Plan" : "New Plan"}</h3>
          <input autoFocus type="text" placeholder="Plan name (e.g. Push Day, Pull Day, Leg Day)" value={name}
            onChange={(e) => setName(e.target.value)} className={INPUT} />
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Exercises</label>
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" placeholder={`Exercise ${i + 1}`} value={ex}
                    onChange={(e) => { const next = [...exercises]; next[i] = e.target.value; setExercises(next); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { const next = [...exercises]; next.splice(i + 1, 0, ""); setExercises(next); } }}
                    className={INPUT} />
                  {exercises.length > 1 && (
                    <button onClick={() => setExercises(exercises.filter((_, j) => j !== i))} className="p-2 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
              <button onClick={() => setExercises([...exercises, ""])} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" />Add exercise
              </button>
            </div>
          </div>
          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cn(INPUT, "resize-none")} />
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>{editingId ? "Save" : "Create"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showForm ? (
        <EmptyState icon={ClipboardList} title="No plans yet" sub="Create workout plans to quickly start a session. E.g. Push Day, Pull Day, Leg Day." onAdd={() => setShowForm(true)} addLabel="Create first plan" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(t)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteTemplate(t.id)} className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <ol className="space-y-1 mb-4">
                {t.exercises.map((ex, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full bg-secondary text-muted-foreground text-[10px] flex items-center justify-center font-medium flex-shrink-0">{i+1}</span>
                    <span className="text-foreground">{ex}</span>
                  </li>
                ))}
              </ol>
              {onStartWorkout && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => onStartWorkout(t.name)}>
                  Start Workout
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Steps Tab ─────────────────────────────────────────────────────────────

function StepsTab({ stepLogs, logSteps, deleteSteps }: {
  stepLogs: DailySteps[];
  logSteps: (e: DailySteps) => void;
  deleteSteps: (id: string) => void;
}) {
  const [stepsInput, setStepsInput] = useState("");
  const [dateInput, setDateInput] = useState(today());
  const [range, setRange] = useState<"week"|"month"|"year">("week");

  function save() {
    const n = parseInt(stepsInput);
    if (!n || n < 0) return;
    logSteps({ id: generateId(), date: dateInput, steps: n, createdAt: new Date().toISOString() });
    setStepsInput("");
  }

  const t = today();
  const todayEntry = stepLogs.find((s) => s.date === t);

  // Build chart data
  const chartData = useMemo(() => {
    if (range === "week") {
      const ws = getWeekStart(t);
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(ws, i);
        const entry = stepLogs.find((s) => s.date === d);
        return { label: ["M","T","W","T","F","S","S"][i], steps: entry?.steps ?? 0, date: d, isToday: d === t };
      });
    }
    if (range === "month") {
      // Last 30 days
      return Array.from({ length: 30 }, (_, i) => {
        const d = addDays(t, -(29 - i));
        const entry = stepLogs.find((s) => s.date === d);
        const [,, day] = d.split("-");
        return { label: parseInt(day) % 5 === 1 ? parseInt(day).toString() : "", steps: entry?.steps ?? 0, date: d, isToday: d === t };
      });
    }
    // Year: last 12 months, sum per month
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return d.toISOString().slice(0, 7);
    });
    return months.map((m) => {
      const total = stepLogs.filter((s) => s.date.startsWith(m)).reduce((sum, s) => sum + s.steps, 0);
      const [, mon] = m.split("-");
      return { label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(mon)-1], steps: total, date: m, isToday: false };
    });
  }, [stepLogs, range, t]);

  const weeklyAvg = useMemo(() => {
    const ws = getWeekStart(t);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const weekEntries = stepLogs.filter((s) => weekDays.includes(s.date));
    return weekEntries.length ? Math.round(weekEntries.reduce((sum, s) => sum + s.steps, 0) / weekEntries.length) : 0;
  }, [stepLogs, t]);

  const monthlyTotal = useMemo(() => {
    const m = isoMonth(t);
    return stepLogs.filter((s) => isoMonth(s.date) === m).reduce((sum, s) => sum + s.steps, 0);
  }, [stepLogs, t]);

  const allTimeMax = stepLogs.length ? Math.max(...stepLogs.map((s) => s.steps)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Steps Tracker</h2>
      </div>

      {/* Log form */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Log Steps</p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date</label>
            <input type="date" value={dateInput} onChange={(e) => e.target.value && setDateInput(e.target.value)} className={cn(INPUT, "w-auto")} />
          </div>
          <div className="flex-1 min-w-32">
            <label className="text-xs text-muted-foreground block mb-1">Steps</label>
            <input type="number" min="0" placeholder="e.g. 8500" value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className={INPUT} />
          </div>
          <Button size="sm" onClick={save}><Check className="w-4 h-4 mr-1" />Save</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today" value={todayEntry ? todayEntry.steps.toLocaleString() : "—"}
          sub={todayEntry ? `${Math.round((todayEntry.steps / STEP_GOAL) * 100)}% of ${STEP_GOAL.toLocaleString()} goal` : "not logged"}
          color={todayEntry && todayEntry.steps >= STEP_GOAL ? "text-emerald-600" : "text-foreground"} />
        <StatCard label="Weekly avg" value={weeklyAvg ? weeklyAvg.toLocaleString() : "—"} sub="per day this week" />
        <StatCard label="This month" value={monthlyTotal ? monthlyTotal.toLocaleString() : "—"} sub="total steps" />
        <StatCard label="Best day" value={allTimeMax ? allTimeMax.toLocaleString() : "—"} sub="all time" color="text-primary" />
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Steps Chart</p>
          <div className="flex gap-1">
            {(["week","month","year"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize",
                  range === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                {r}
              </button>
            ))}
          </div>
        </div>
        {chartData.some((d) => d.steps > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_TICK_FILL }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_TICK_FILL }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE_COMPACT} cursor={{ fill: CHART_CURSOR_FILL }} />
              <Bar dataKey="steps" name="Steps" radius={[3,3,0,0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.steps >= STEP_GOAL ? "#10b981" : "hsl(25 40% 36%)"} fillOpacity={d.steps === 0 ? 0.2 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">No step data for this period</div>
        )}
        <div className="flex items-center gap-3 mt-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-muted-foreground">≥ {STEP_GOAL.toLocaleString()} goal</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /><span className="text-muted-foreground">Below goal</span></span>
        </div>
      </div>

      {/* Log list */}
      {stepLogs.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recent Logs</p>
          <div className="space-y-2">
            {stepLogs.slice(0, 14).map((s) => (
              <div key={s.id} className="flex items-center gap-3 group">
                <Footprints className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-sm font-medium">{s.steps.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">{shortDate(s.date)}</span>
                  {s.steps >= STEP_GOAL && <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Goal hit ✓</span>}
                </div>
                <button onClick={() => deleteSteps(s.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Body Weight Tab ───────────────────────────────────────────────────────

function BodyTab({ logs, addWeightLog, deleteWeightLog }: {
  logs: BodyWeightLog[];
  addWeightLog: (l: BodyWeightLog) => void;
  deleteWeightLog: (id: string) => void;
}) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  function save() {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    addWeightLog({ id: generateId(), date, weight: w, notes: notes.trim() || undefined, createdAt: new Date().toISOString() });
    setWeight(""); setNotes("");
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latest  = logs[0];
  const earliest = sorted[0];
  const change  = latest && earliest && latest.id !== earliest.id ? latest.weight - earliest.weight : null;
  const minW    = sorted.length ? Math.min(...sorted.map((l) => l.weight)) : null;
  const maxW    = sorted.length ? Math.max(...sorted.map((l) => l.weight)) : null;

  const chartData = sorted.slice(-60).map((l) => ({ date: shortDate(l.date), weight: l.weight }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Body Weight</h2>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Log Weight</p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={cn(INPUT, "w-auto")} />
          </div>
          <div className="flex-1 min-w-28">
            <label className="text-xs text-muted-foreground block mb-1">Weight (kg)</label>
            <input type="number" min="0" step="0.1" placeholder="e.g. 72.5" value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className={INPUT} />
          </div>
          <div className="flex-1 min-w-32">
            <label className="text-xs text-muted-foreground block mb-1">Notes (optional)</label>
            <input type="text" placeholder="Morning, post-workout…" value={notes} onChange={(e) => setNotes(e.target.value)} className={INPUT} />
          </div>
          <Button size="sm" onClick={save}><Check className="w-4 h-4 mr-1" />Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Current" value={latest ? `${latest.weight} kg` : "—"} sub={latest ? shortDate(latest.date) : "not logged"} />
        <StatCard label="Change"
          value={change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(1)} kg` : "—"}
          sub={earliest && latest ? `${shortDate(earliest.date)} → ${shortDate(latest.date)}` : ""}
          color={change !== null ? (change < 0 ? "text-emerald-600" : change > 0 ? "text-rose-600" : "text-foreground") : "text-foreground"} />
        <StatCard label="Lowest" value={minW !== null ? `${minW} kg` : "—"} color="text-emerald-600" />
        <StatCard label="Highest" value={maxW !== null ? `${maxW} kg` : "—"} color="text-rose-600" />
      </div>

      {chartData.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Progress</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: CHART_TICK_FILL }} axisLine={false} tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 10, fill: CHART_TICK_FILL }} axisLine={false} tickLine={false}
                domain={["auto","auto"]} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE_COMPACT} />
              <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="hsl(25 40% 36%)" strokeWidth={2}
                dot={{ r: 3, fill: "hsl(25 40% 36%)" }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Log History</p>
          <div className="space-y-2">
            {logs.slice(0, 20).map((l, i) => {
              const prev = logs[i + 1];
              const diff = prev ? l.weight - prev.weight : null;
              return (
                <div key={l.id} className="flex items-center gap-3 group">
                  <Scale className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">{l.weight} kg</span>
                    <span className="text-xs text-muted-foreground">{shortDate(l.date)}</span>
                    {diff !== null && (
                      <span className={cn("text-[11px] font-medium flex items-center gap-0.5", diff < 0 ? "text-emerald-600" : diff > 0 ? "text-rose-600" : "text-muted-foreground")}>
                        {diff < 0 ? <TrendingDown className="w-3 h-3" /> : diff > 0 ? <TrendingUp className="w-3 h-3" /> : null}
                        {diff !== 0 ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg` : "—"}
                      </span>
                    )}
                    {l.notes && <span className="text-xs text-muted-foreground">· {l.notes}</span>}
                  </div>
                  <button onClick={() => deleteWeightLog(l.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <EmptyState icon={Scale} title="No weight logs yet" sub="Track your body weight over time to see your progress." />
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FitnessTrackerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { activities, loading: actLoading, addActivity, updateActivity, deleteActivity } = useFitnessActivities();
  const { sessions, addSession, deleteSession } = useWorkoutSessions();
  const { sets, addSet, updateSet, deleteSet } = useWorkoutSets();
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useWorkoutTemplates();
  const { stepLogs, logSteps, deleteSteps } = useDailySteps();
  const { logs: weightLogs, addWeightLog, deleteWeightLog } = useBodyWeightLogs();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Fitness Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">Track workouts, steps, body weight and activity.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab activities={activities} sessions={sessions} sets={sets}
          stepLogs={stepLogs} weightLogs={weightLogs} onTabChange={setActiveTab} />
      )}
      {activeTab === "activities" && (
        <ActivitiesTab activities={activities} addActivity={addActivity}
          updateActivity={updateActivity} deleteActivity={deleteActivity} />
      )}
      {activeTab === "gym" && (
        <GymTab sessions={sessions} addSession={addSession} deleteSession={deleteSession}
          sets={sets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet}
          templates={templates} />
      )}
      {activeTab === "plans" && (
        <PlansTab templates={templates} addTemplate={addTemplate}
          updateTemplate={updateTemplate} deleteTemplate={deleteTemplate} />
      )}
      {activeTab === "steps" && (
        <StepsTab stepLogs={stepLogs} logSteps={logSteps} deleteSteps={deleteSteps} />
      )}
      {activeTab === "body" && (
        <BodyTab logs={weightLogs} addWeightLog={addWeightLog} deleteWeightLog={deleteWeightLog} />
      )}
    </div>
  );
}
