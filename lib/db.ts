"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { Client, Task, Capture, Resource, Goal, today } from "./store";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTask(row: any): Task {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    clientId: row.client_id ?? undefined,
    clientName: row.client_name ?? undefined,
    learningType: row.learning_type ?? undefined,
    agencyType: row.agency_type ?? undefined,
    url: row.url ?? undefined,
    title: row.title,
    notes: row.notes ?? undefined,
    duration: row.duration ?? undefined,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

// Structured captures (Idea / Reminder) are serialised as JSON inside the
// content column so we don't need a schema change. A legacy plain string
// is treated as a "quick" capture.
type CaptureMeta = {
  __cap: 1;
  type: "idea" | "reminder";
  title?: string;
  description?: string;
  emoji?: string;
  timeframe?: Capture["timeframe"];
  reminderDate?: string;
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
  if (c.type === "quick") return c.description ?? c.content ?? "";
  const meta: CaptureMeta = {
    __cap: 1,
    type: c.type,
    title: c.title,
    description: c.description,
    emoji: c.emoji,
    timeframe: c.timeframe,
    reminderDate: c.reminderDate,
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
        if (error) console.error("useClients fetch error:", error);
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
    }).then(({ error }) => { if (error) console.error("addClient error:", error); });
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
      .then(({ error }) => { if (error) console.error("updateClient error:", error); });
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    supabase.from("clients").delete().eq("id", id)
      .then(({ error }) => { if (error) console.error("deleteClient error:", error); });
  }, []);

  return { clients, loading, addClient, updateClient, deleteClient };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("useTasks fetch error:", error);
        if (data) setTasks(data.map(mapTask));
        setLoading(false);
      });
  }, []);

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev]);
    supabase.from("tasks").insert({
      id: task.id,
      date: task.date,
      category: task.category,
      client_id: task.clientId ?? null,
      client_name: task.clientName ?? null,
      learning_type: task.learningType ?? null,
      agency_type: task.agencyType ?? null,
      url: task.url ?? null,
      title: task.title,
      notes: task.notes ?? null,
      duration: task.duration ?? null,
      completed: task.completed,
      created_at: task.createdAt,
    }).then(({ error }) => { if (error) console.error("addTask error:", error); });
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    const db: Record<string, unknown> = {};
    if (updates.completed !== undefined) db.completed = updates.completed;
    if (updates.title !== undefined) db.title = updates.title;
    if (updates.notes !== undefined) db.notes = updates.notes ?? null;
    if (updates.duration !== undefined) db.duration = updates.duration ?? null;
    if (updates.url !== undefined) db.url = updates.url ?? null;
    if (updates.category !== undefined) db.category = updates.category;
    if (updates.clientId !== undefined) db.client_id = updates.clientId ?? null;
    if (updates.clientName !== undefined) db.client_name = updates.clientName ?? null;
    if (updates.learningType !== undefined) db.learning_type = updates.learningType ?? null;
    if (updates.agencyType !== undefined) db.agency_type = updates.agencyType ?? null;
    if (updates.date !== undefined) db.date = updates.date;
    supabase.from("tasks").update(db).eq("id", id)
      .then(({ error }) => { if (error) console.error("updateTask error:", error); });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    supabase.from("tasks").delete().eq("id", id)
      .then(({ error }) => { if (error) console.error("deleteTask error:", error); });
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
        if (error) console.error("useCaptures fetch error:", error);
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
    }).then(({ error }) => { if (error) console.error("addCapture error:", error); });
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
          "reminderDate" in updates;
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
      "reminderDate" in updates;
    if (structuredFieldsTouched) {
      const current = captures.find((c) => c.id === id);
      if (current) {
        const merged: Capture = { ...current, ...updates };
        db.content = packCaptureContent(merged);
      }
    }

    supabase.from("captures").update(db).eq("id", id)
      .then(({ error }) => { if (error) console.error("updateCapture error:", error); });
  }, [captures]);

  const deleteCapture = useCallback((id: string) => {
    setCaptures((prev) => prev.filter((c) => c.id !== id));
    supabase.from("captures").delete().eq("id", id)
      .then(({ error }) => { if (error) console.error("deleteCapture error:", error); });
  }, []);

  const clearProcessed = useCallback(() => {
    setCaptures((prev) => prev.filter((c) => !c.processed));
    supabase.from("captures").delete().eq("processed", true)
      .then(({ error }) => { if (error) console.error("clearProcessed error:", error); });
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
        if (error) console.error("useResources fetch error:", error);
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
    }).then(({ error }) => { if (error) console.error("addResource error:", error); });
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
      .then(({ error }) => { if (error) console.error("updateResource error:", error); });
  }, []);

  const deleteResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    supabase.from("resources").delete().eq("id", id)
      .then(({ error }) => { if (error) console.error("deleteResource error:", error); });
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
        if (error) console.error("useGoals fetch error:", error);
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
    }).then(({ error }) => { if (error) console.error("addGoal error:", error); });
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    const db: Record<string, unknown> = {};
    if (updates.progress !== undefined) db.progress = updates.progress;
    if (updates.title !== undefined) db.title = updates.title;
    if (updates.notes !== undefined) db.notes = updates.notes ?? null;
    supabase.from("goals").update(db).eq("id", id)
      .then(({ error }) => { if (error) console.error("updateGoal error:", error); });
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    supabase.from("goals").delete().eq("id", id)
      .then(({ error }) => { if (error) console.error("deleteGoal error:", error); });
  }, []);

  return { goals, loading, addGoal, updateGoal, deleteGoal };
}
