"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabase";
import {
  Client, Task, Capture, Resource, Goal, today,
  FitnessActivity, WorkoutSession, WorkoutSet, WorkoutTemplate,
  DailySteps, BodyWeightLog,
} from "./store";
import { pushAppError } from "./app-errors";

function reportError(scope: string, error: unknown, fallback?: string) {
  const message =
    (error as { message?: string } | null)?.message ?? fallback ?? "Unexpected error";
  // Console keeps the developer signal; the bus pushes to the in-app toast.
  console.error(`${scope}:`, error);
  pushAppError(scope, message);
}

// ─── Row → TypeScript mappers ──────────────────────────────────────────────

// Tasks are stored alongside platforms in the existing `platforms` text[]
// column with this prefix, so we don't need a separate column in Supabase.
const TASK_PREFIX = "@task:";

function unpackPlatforms(raw: unknown): { platforms: string[]; tasks: string[] } {
  const arr = Array.isArray(raw) ? (raw as string[]) : [];
  const platforms: string[] = [];
  const tasks: string[] = [];
  for (const entry of arr) {
    if (typeof entry !== "string") continue;
    if (entry.startsWith(TASK_PREFIX)) {
      tasks.push(entry.slice(TASK_PREFIX.length));
    } else {
      platforms.push(entry);
    }
  }
  return { platforms, tasks };
}

function packPlatforms(platforms: string[], tasks: string[]): string[] {
  return [...platforms, ...tasks.map((t) => `${TASK_PREFIX}${t}`)];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClient(row: any): Client {
  const { platforms, tasks } = unpackPlatforms(row.platforms);
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    image: row.image ?? undefined,
    platforms,
    tasks,
    niche: row.niche ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

// Task notes column can hold two optional structured prefixes followed by the
// real notes. Order is AGENCY then DONE, both optional:
//   ##AGENCY:Branding##\n##DONE:2026-05-28##\nReal notes here
// Storing structured metadata inside notes avoids needing extra Supabase
// columns. Agency type and completion date are the two pieces we track.
const TASK_AGENCY_RE = /^##AGENCY:([^#\n]+)##\n?/;
const TASK_DONE_RE = /^##DONE:(\d{4}-\d{2}-\d{2})##\n?/;

function unpackTaskNotes(stored: string | null | undefined): {
  notes: string | undefined;
  agencyType: string | undefined;
  completedAt: string | undefined;
} {
  if (!stored) return { notes: undefined, agencyType: undefined, completedAt: undefined };
  let rest = stored;
  let agencyType: string | undefined;
  let completedAt: string | undefined;

  const agencyMatch = rest.match(TASK_AGENCY_RE);
  if (agencyMatch) {
    agencyType = agencyMatch[1];
    rest = rest.slice(agencyMatch[0].length);
  }

  const doneMatch = rest.match(TASK_DONE_RE);
  if (doneMatch) {
    completedAt = doneMatch[1];
    rest = rest.slice(doneMatch[0].length);
  }

  return {
    notes: rest.length > 0 ? rest : undefined,
    agencyType,
    completedAt,
  };
}

function packTaskNotes(
  notes: string | undefined,
  agencyType: string | undefined,
  completedAt: string | undefined
): string | null {
  let prefix = "";
  if (agencyType) prefix += `##AGENCY:${agencyType}##\n`;
  if (completedAt) prefix += `##DONE:${completedAt}##\n`;
  const full = prefix + (notes ?? "");
  return full.length > 0 ? full : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTask(row: any): Task {
  const { notes, agencyType, completedAt } = unpackTaskNotes(row.notes);
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    clientId: row.client_id ?? undefined,
    clientName: row.client_name ?? undefined,
    learningType: row.learning_type ?? undefined,
    agencyType: agencyType ?? row.agency_type ?? undefined,
    url: row.url ?? undefined,
    title: row.title,
    notes,
    duration: row.duration ?? undefined,
    completed: row.completed,
    completedAt,
    createdAt: row.created_at,
  };
}

// Structured captures (Idea / Reminder) are serialised as JSON inside the
// content column so we don't need a schema change. A legacy plain string
// is treated as a "quick" capture.
type CaptureMeta = {
  __cap: 1;
  type: Capture["type"];
  title?: string;
  description?: string;
  emoji?: string;
  timeframe?: Capture["timeframe"];
  reminderDate?: string;
  relatedToCategory?: Capture["relatedToCategory"];
  relatedToValue?: string;
  attachments?: Capture["attachments"];
};

function unpackCaptureContent(content: string): Omit<Capture, "id" | "createdAt" | "processed" | "content"> {
  if (typeof content === "string" && content.startsWith('{"__cap":')) {
    try {
      const parsed = JSON.parse(content) as CaptureMeta;
      if (parsed && parsed.__cap === 1) {
        return {
          type: parsed.type,
          title: parsed.title,
          description: parsed.description,
          emoji: parsed.emoji,
          timeframe: parsed.timeframe,
          reminderDate: parsed.reminderDate,
          relatedToCategory: parsed.relatedToCategory,
          relatedToValue: parsed.relatedToValue,
          attachments: parsed.attachments,
        };
      }
    } catch {
      /* fall through to plain */
    }
  }
  return {
    type: "quick",
    description: content,
  };
}

function packCaptureContent(c: Capture): string {
  const hasAttachments = c.attachments && c.attachments.length > 0;
  // Plain quick captures with no category and no attachments stay as plain
  // text for backward compatibility.
  if (c.type === "quick" && !c.relatedToCategory && !hasAttachments) {
    return c.description ?? c.content ?? "";
  }
  const meta: CaptureMeta = {
    __cap: 1,
    type: c.type,
    title: c.title,
    description: c.description,
    emoji: c.emoji,
    timeframe: c.timeframe,
    reminderDate: c.reminderDate,
    relatedToCategory: c.relatedToCategory,
    relatedToValue: c.relatedToValue,
    attachments: hasAttachments ? c.attachments : undefined,
  };
  return JSON.stringify(meta);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCapture(row: any): Capture {
  const unpacked = unpackCaptureContent(row.content);
  return {
    id: row.id,
    content: row.content,
    processed: row.processed,
    createdAt: row.created_at,
    ...unpacked,
  };
}

// Completion date is piggybacked inside the notes column with a sentinel
// header so we don't need a new Supabase column. Format:
//   ##DONE:2026-05-28##\n<real notes>
const DONE_PREFIX_RE = /^##DONE:(\d{4}-\d{2}-\d{2})##\n?/;

function unpackNotes(stored: string | null | undefined): {
  notes: string | undefined;
  completedAt: string | undefined;
} {
  if (!stored) return { notes: undefined, completedAt: undefined };
  const match = stored.match(DONE_PREFIX_RE);
  if (match) {
    const rest = stored.slice(match[0].length);
    return { completedAt: match[1], notes: rest.length > 0 ? rest : undefined };
  }
  return { notes: stored, completedAt: undefined };
}

function packNotes(notes: string | undefined, completedAt: string | undefined): string | null {
  const n = notes ?? "";
  if (completedAt) return `##DONE:${completedAt}##\n${n}`;
  return n.length > 0 ? n : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResource(row: any): Resource {
  const { notes, completedAt } = unpackNotes(row.notes);
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    thumbnail: row.thumbnail ?? undefined,
    youtubeId: row.youtube_id ?? undefined,
    resourceType: row.resource_type,
    status: row.status,
    category: row.category,
    notes,
    pinnedDate: row.pinned_date ?? undefined,
    completedAt,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGoal(row: any): Goal {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    month: row.month,
    progress: row.progress,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const clientsRef = useRef<Client[]>([]);

  useEffect(() => {
    clientsRef.current = clients;
  }, [clients]);

  useEffect(() => {
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) reportError("useClients fetch", error);
        if (data) setClients(data.map(mapClient));
        setLoading(false);
      });
  }, []);

  const addClient = useCallback((client: Client) => {
    setClients((prev) => [...prev, client]);
    supabase.from("clients").insert({
      id: client.id,
      name: client.name,
      color: client.color,
      image: client.image ?? null,
      platforms: packPlatforms(client.platforms, client.tasks),
      niche: client.niche,
      notes: client.notes,
      created_at: client.createdAt,
    }).then(({ error }) => { if (error) reportError("addClient", error); });
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    const current = clientsRef.current.find((c) => c.id === id);
    if (!current) return;
    const merged: Client = { ...current, ...updates };
    setClients((prev) => prev.map((c) => (c.id === id ? merged : c)));

    const db: Record<string, unknown> = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.color !== undefined) db.color = updates.color;
    if ("image" in updates) db.image = updates.image ?? null;
    if (updates.platforms !== undefined || updates.tasks !== undefined) {
      db.platforms = packPlatforms(merged.platforms, merged.tasks);
    }
    if (updates.niche !== undefined) db.niche = updates.niche;
    if (updates.notes !== undefined) db.notes = updates.notes;

    supabase.from("clients").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateClient", error); });
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    supabase.from("clients").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteClient", error); });
  }, []);

  return { clients, loading, addClient, updateClient, deleteClient };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) reportError("useTasks fetch", error);
        if (data) setTasks(data.map(mapTask));
        setLoading(false);
      });
  }, []);

  const addTask = useCallback((task: Task) => {
    // Auto-stamp completedAt if the task is being created already completed.
    const completedAt =
      task.completedAt ?? (task.completed ? today() : undefined);
    const finalTask: Task = { ...task, completedAt };
    setTasks((prev) => [finalTask, ...prev]);
    // Only send columns that have values. Some optional columns (url) may not
    // exist in older Supabase schemas, and sending even a null value would
    // crash the insert with a "column does not exist" 400.
    const row: Record<string, unknown> = {
      id: finalTask.id,
      date: finalTask.date,
      category: finalTask.category,
      title: finalTask.title,
      completed: finalTask.completed,
      created_at: finalTask.createdAt,
    };
    if (finalTask.clientId) row.client_id = finalTask.clientId;
    if (finalTask.clientName) row.client_name = finalTask.clientName;
    if (finalTask.learningType) row.learning_type = finalTask.learningType;
    if (finalTask.url) row.url = finalTask.url;
    if (finalTask.duration) row.duration = finalTask.duration;
    const packedNotes = packTaskNotes(
      finalTask.notes,
      finalTask.agencyType,
      finalTask.completedAt
    );
    if (packedNotes) row.notes = packedNotes;
    supabase.from("tasks").insert(row).then(({ error }) => {
      if (error) reportError("addTask", error);
    });
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;

    // Auto-manage completedAt when the task is ticked done or un-ticked.
    let nextCompletedAt = current.completedAt;
    if ("completedAt" in updates) {
      nextCompletedAt = updates.completedAt;
    } else if (updates.completed !== undefined) {
      if (updates.completed) {
        if (!current.completedAt) nextCompletedAt = today();
      } else {
        nextCompletedAt = undefined;
      }
    }

    const merged: Task = { ...current, ...updates, completedAt: nextCompletedAt };
    setTasks((prev) => prev.map((t) => (t.id === id ? merged : t)));

    const db: Record<string, unknown> = {};
    if (updates.completed !== undefined) db.completed = updates.completed;
    if (updates.title !== undefined) db.title = updates.title;
    if (updates.duration !== undefined) db.duration = updates.duration ?? null;
    if (updates.url !== undefined) db.url = updates.url ?? null;
    if (updates.category !== undefined) db.category = updates.category;
    if (updates.clientId !== undefined) db.client_id = updates.clientId ?? null;
    if (updates.clientName !== undefined) db.client_name = updates.clientName ?? null;
    if (updates.learningType !== undefined) db.learning_type = updates.learningType ?? null;
    if (updates.date !== undefined) db.date = updates.date;

    // Re-pack notes whenever notes, agencyType or completedAt could have changed
    const notesChanged = "notes" in updates;
    const agencyChanged = "agencyType" in updates;
    const completedAtChanged = nextCompletedAt !== current.completedAt;
    if (notesChanged || agencyChanged || completedAtChanged) {
      db.notes = packTaskNotes(merged.notes, merged.agencyType, merged.completedAt);
    }

    supabase.from("tasks").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateTask", error); });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    supabase.from("tasks").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteTask", error); });
  }, []);

  return { tasks, loading, addTask, updateTask, deleteTask };
}

export function useCaptures() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("captures")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) reportError("useCaptures fetch", error);
        if (data) setCaptures(data.map(mapCapture));
        setLoading(false);
      });
  }, []);

  const addCapture = useCallback((capture: Capture) => {
    const packed = packCaptureContent(capture);
    const stored: Capture = { ...capture, content: packed };
    setCaptures((prev) => [stored, ...prev]);
    supabase.from("captures").insert({
      id: stored.id,
      content: packed,
      processed: stored.processed,
      created_at: stored.createdAt,
    }).then(({ error }) => { if (error) reportError("addCapture", error); });
  }, []);

  const updateCapture = useCallback((id: string, updates: Partial<Capture>) => {
    setCaptures((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const merged: Capture = { ...c, ...updates };
        // Re-pack content if structured fields changed
        const structuredFieldsTouched =
          "type" in updates ||
          "title" in updates ||
          "description" in updates ||
          "emoji" in updates ||
          "timeframe" in updates ||
          "reminderDate" in updates ||
          "relatedToCategory" in updates ||
          "relatedToValue" in updates ||
          "attachments" in updates;
        if (structuredFieldsTouched) {
          merged.content = packCaptureContent(merged);
        }
        return merged;
      })
    );

    const db: Record<string, unknown> = {};
    if (updates.processed !== undefined) db.processed = updates.processed;

    const structuredFieldsTouched =
      "type" in updates ||
      "title" in updates ||
      "description" in updates ||
      "emoji" in updates ||
      "timeframe" in updates ||
      "reminderDate" in updates ||
      "relatedToCategory" in updates ||
      "relatedToValue" in updates ||
      "attachments" in updates;
    if (structuredFieldsTouched) {
      const current = captures.find((c) => c.id === id);
      if (current) {
        const merged: Capture = { ...current, ...updates };
        db.content = packCaptureContent(merged);
      }
    }

    supabase.from("captures").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateCapture", error); });
  }, [captures]);

  const deleteCapture = useCallback((id: string) => {
    setCaptures((prev) => prev.filter((c) => c.id !== id));
    supabase.from("captures").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteCapture", error); });
  }, []);

  const clearProcessed = useCallback(() => {
    setCaptures((prev) => prev.filter((c) => !c.processed));
    supabase.from("captures").delete().eq("processed", true)
      .then(({ error }) => { if (error) reportError("clearProcessed", error); });
  }, []);

  return { captures, loading, addCapture, updateCapture, deleteCapture, clearProcessed };
}

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const resourcesRef = useRef<Resource[]>([]);

  useEffect(() => {
    resourcesRef.current = resources;
  }, [resources]);

  useEffect(() => {
    supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) reportError("useResources fetch", error);
        if (data) setResources(data.map(mapResource));
        setLoading(false);
      });
  }, []);

  const addResource = useCallback((resource: Resource) => {
    // If the resource is being added already marked as done, stamp completedAt
    const completedAt =
      resource.completedAt ?? (resource.status === "done" ? today() : undefined);
    const finalResource: Resource = { ...resource, completedAt };
    setResources((prev) => [finalResource, ...prev]);
    supabase.from("resources").insert({
      id: finalResource.id,
      url: finalResource.url,
      title: finalResource.title,
      thumbnail: finalResource.thumbnail ?? null,
      youtube_id: finalResource.youtubeId ?? null,
      resource_type: finalResource.resourceType,
      status: finalResource.status,
      category: finalResource.category,
      notes: packNotes(finalResource.notes, finalResource.completedAt),
      pinned_date: finalResource.pinnedDate ?? null,
      created_at: finalResource.createdAt,
    }).then(({ error }) => { if (error) reportError("addResource", error); });
  }, []);

  const updateResource = useCallback((id: string, updates: Partial<Resource>) => {
    const current = resourcesRef.current.find((r) => r.id === id);
    if (!current) return;

    // Auto-manage completedAt when status changes, unless caller specifies it
    let nextCompletedAt = current.completedAt;
    if ("completedAt" in updates) {
      nextCompletedAt = updates.completedAt;
    } else if (updates.status !== undefined) {
      if (updates.status === "done") {
        if (!current.completedAt) nextCompletedAt = today();
      } else {
        nextCompletedAt = undefined;
      }
    }

    const merged: Resource = { ...current, ...updates, completedAt: nextCompletedAt };
    setResources((prev) => prev.map((r) => (r.id === id ? merged : r)));

    const db: Record<string, unknown> = {};
    if (updates.url !== undefined) db.url = updates.url;
    if (updates.title !== undefined) db.title = updates.title;
    if (updates.status !== undefined) db.status = updates.status;
    if (updates.category !== undefined) db.category = updates.category;
    if ("pinnedDate" in updates) db.pinned_date = updates.pinnedDate ?? null;
    if (updates.thumbnail !== undefined) db.thumbnail = updates.thumbnail ?? null;
    if (updates.youtubeId !== undefined) db.youtube_id = updates.youtubeId ?? null;
    if (updates.resourceType !== undefined) db.resource_type = updates.resourceType;

    // Re-pack notes whenever either notes or completedAt could have changed
    const notesChanged = "notes" in updates;
    const completedAtChanged = nextCompletedAt !== current.completedAt;
    if (notesChanged || completedAtChanged) {
      db.notes = packNotes(merged.notes, merged.completedAt);
    }

    supabase.from("resources").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateResource", error); });
  }, []);

  const deleteResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    supabase.from("resources").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteResource", error); });
  }, []);

  return { resources, loading, addResource, updateResource, deleteResource };
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) reportError("useGoals fetch", error);
        if (data) setGoals(data.map(mapGoal));
        setLoading(false);
      });
  }, []);

  const addGoal = useCallback((goal: Goal) => {
    setGoals((prev) => [...prev, goal]);
    supabase.from("goals").insert({
      id: goal.id,
      title: goal.title,
      category: goal.category,
      month: goal.month,
      progress: goal.progress,
      notes: goal.notes ?? null,
      created_at: goal.createdAt,
    }).then(({ error }) => { if (error) reportError("addGoal", error); });
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    const db: Record<string, unknown> = {};
    if (updates.progress !== undefined) db.progress = updates.progress;
    if (updates.title !== undefined) db.title = updates.title;
    if (updates.notes !== undefined) db.notes = updates.notes ?? null;
    supabase.from("goals").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateGoal", error); });
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    supabase.from("goals").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteGoal", error); });
  }, []);

  return { goals, loading, addGoal, updateGoal, deleteGoal };
}

// ─── Fitness Activities ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFitnessActivity(row: any): FitnessActivity {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    name: row.name,
    duration: row.duration ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function useFitnessActivities() {
  const [activities, setActivities] = useState<FitnessActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("fitness_activities").select("*")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) reportError("useFitnessActivities fetch", error);
        if (data) setActivities(data.map(mapFitnessActivity));
        setLoading(false);
      });
  }, []);

  const addActivity = useCallback((a: FitnessActivity) => {
    setActivities((prev) => [a, ...prev]);
    supabase.from("fitness_activities").insert({
      id: a.id, date: a.date, type: a.type, name: a.name,
      duration: a.duration ?? null, notes: a.notes ?? null, created_at: a.createdAt,
    }).then(({ error }) => { if (error) reportError("addFitnessActivity", error); });
  }, []);

  const updateActivity = useCallback((id: string, updates: Partial<FitnessActivity>) => {
    setActivities((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    const db: Record<string, unknown> = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.type !== undefined) db.type = updates.type;
    if (updates.date !== undefined) db.date = updates.date;
    if (updates.duration !== undefined) db.duration = updates.duration ?? null;
    if (updates.notes !== undefined) db.notes = updates.notes ?? null;
    supabase.from("fitness_activities").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateFitnessActivity", error); });
  }, []);

  const deleteActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    supabase.from("fitness_activities").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteFitnessActivity", error); });
  }, []);

  return { activities, loading, addActivity, updateActivity, deleteActivity };
}

// ─── Workout Sessions ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkoutSession(row: any): WorkoutSession {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    templateId: row.template_id ?? undefined,
    notes: row.notes ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    createdAt: row.created_at,
  };
}

export function useWorkoutSessions() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("workout_sessions").select("*")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) reportError("useWorkoutSessions fetch", error);
        if (data) setSessions(data.map(mapWorkoutSession));
        setLoading(false);
      });
  }, []);

  const addSession = useCallback((s: WorkoutSession) => {
    setSessions((prev) => [s, ...prev]);
    supabase.from("workout_sessions").insert({
      id: s.id, date: s.date, name: s.name,
      template_id: s.templateId ?? null,
      notes: s.notes ?? null,
      duration_minutes: s.durationMinutes ?? null,
      created_at: s.createdAt,
    }).then(({ error }) => { if (error) reportError("addWorkoutSession", error); });
  }, []);

  const updateSession = useCallback((id: string, updates: Partial<WorkoutSession>) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
    const db: Record<string, unknown> = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.notes !== undefined) db.notes = updates.notes ?? null;
    if (updates.durationMinutes !== undefined) db.duration_minutes = updates.durationMinutes ?? null;
    supabase.from("workout_sessions").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateWorkoutSession", error); });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    supabase.from("workout_sessions").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteWorkoutSession", error); });
  }, []);

  return { sessions, loading, addSession, updateSession, deleteSession };
}

// ─── Workout Sets ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkoutSet(row: any): WorkoutSet {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group ?? undefined,
    setNumber: row.set_number,
    weight: parseFloat(row.weight),
    reps: row.reps,
    isWarmup: row.is_warmup ?? false,
    createdAt: row.created_at,
  };
}

export function useWorkoutSets() {
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("workout_sets").select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) reportError("useWorkoutSets fetch", error);
        if (data) setSets(data.map(mapWorkoutSet));
        setLoading(false);
      });
  }, []);

  const addSet = useCallback((s: WorkoutSet) => {
    setSets((prev) => [...prev, s]);
    supabase.from("workout_sets").insert({
      id: s.id, session_id: s.sessionId, exercise_name: s.exerciseName,
      muscle_group: s.muscleGroup ?? null, set_number: s.setNumber,
      weight: s.weight, reps: s.reps, is_warmup: s.isWarmup ?? false,
      created_at: s.createdAt,
    }).then(({ error }) => { if (error) reportError("addWorkoutSet", error); });
  }, []);

  const updateSet = useCallback((id: string, updates: Partial<WorkoutSet>) => {
    setSets((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
    const db: Record<string, unknown> = {};
    if (updates.weight !== undefined) db.weight = updates.weight;
    if (updates.reps !== undefined) db.reps = updates.reps;
    if (updates.isWarmup !== undefined) db.is_warmup = updates.isWarmup;
    supabase.from("workout_sets").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateWorkoutSet", error); });
  }, []);

  const deleteSet = useCallback((id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
    supabase.from("workout_sets").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteWorkoutSet", error); });
  }, []);

  return { sets, loading, addSet, updateSet, deleteSet };
}

// ─── Workout Templates ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkoutTemplate(row: any): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function useWorkoutTemplates() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("workout_templates").select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) reportError("useWorkoutTemplates fetch", error);
        if (data) setTemplates(data.map(mapWorkoutTemplate));
        setLoading(false);
      });
  }, []);

  const addTemplate = useCallback((t: WorkoutTemplate) => {
    setTemplates((prev) => [...prev, t]);
    supabase.from("workout_templates").insert({
      id: t.id, name: t.name, exercises: t.exercises,
      notes: t.notes ?? null, created_at: t.createdAt,
    }).then(({ error }) => { if (error) reportError("addWorkoutTemplate", error); });
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<WorkoutTemplate>) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    const db: Record<string, unknown> = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.exercises !== undefined) db.exercises = updates.exercises;
    if (updates.notes !== undefined) db.notes = updates.notes ?? null;
    supabase.from("workout_templates").update(db).eq("id", id)
      .then(({ error }) => { if (error) reportError("updateWorkoutTemplate", error); });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    supabase.from("workout_templates").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteWorkoutTemplate", error); });
  }, []);

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate };
}

// ─── Daily Steps ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDailySteps(row: any): DailySteps {
  return { id: row.id, date: row.date, steps: row.steps, createdAt: row.created_at };
}

export function useDailySteps() {
  const [stepLogs, setStepLogs] = useState<DailySteps[]>([]);
  const [loading, setLoading] = useState(true);
  const stepLogsRef = useRef<DailySteps[]>([]);

  useEffect(() => { stepLogsRef.current = stepLogs; }, [stepLogs]);

  useEffect(() => {
    supabase.from("daily_steps").select("*")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) reportError("useDailySteps fetch", error);
        if (data) setStepLogs(data.map(mapDailySteps));
        setLoading(false);
      });
  }, []);

  const logSteps = useCallback((entry: DailySteps) => {
    // Upsert by date — replace existing entry if same date
    const existing = stepLogsRef.current.find((s) => s.date === entry.date);
    if (existing) {
      setStepLogs((prev) => prev.map((s) => s.date === entry.date ? { ...s, steps: entry.steps } : s));
      supabase.from("daily_steps").update({ steps: entry.steps }).eq("id", existing.id)
        .then(({ error }) => { if (error) reportError("logSteps update", error); });
    } else {
      setStepLogs((prev) => [entry, ...prev]);
      supabase.from("daily_steps").insert({
        id: entry.id, date: entry.date, steps: entry.steps, created_at: entry.createdAt,
      }).then(({ error }) => { if (error) reportError("logSteps insert", error); });
    }
  }, []);

  const deleteSteps = useCallback((id: string) => {
    setStepLogs((prev) => prev.filter((s) => s.id !== id));
    supabase.from("daily_steps").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteSteps", error); });
  }, []);

  return { stepLogs, loading, logSteps, deleteSteps };
}

// ─── Body Weight Logs ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBodyWeightLog(row: any): BodyWeightLog {
  return {
    id: row.id, date: row.date, weight: parseFloat(row.weight),
    notes: row.notes ?? undefined, createdAt: row.created_at,
  };
}

export function useBodyWeightLogs() {
  const [logs, setLogs] = useState<BodyWeightLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("body_weight_logs").select("*")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) reportError("useBodyWeightLogs fetch", error);
        if (data) setLogs(data.map(mapBodyWeightLog));
        setLoading(false);
      });
  }, []);

  const addWeightLog = useCallback((log: BodyWeightLog) => {
    setLogs((prev) => [log, ...prev]);
    supabase.from("body_weight_logs").insert({
      id: log.id, date: log.date, weight: log.weight,
      notes: log.notes ?? null, created_at: log.createdAt,
    }).then(({ error }) => { if (error) reportError("addWeightLog", error); });
  }, []);

  const deleteWeightLog = useCallback((id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    supabase.from("body_weight_logs").delete().eq("id", id)
      .then(({ error }) => { if (error) reportError("deleteWeightLog", error); });
  }, []);

  return { logs, loading, addWeightLog, deleteWeightLog };
}
