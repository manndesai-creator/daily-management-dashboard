export interface Client {
  id: string;
  name: string;
  color: string;
  image?: string;
  platforms: string[];
  tasks: string[];
  niche: string;
  notes: string;
  createdAt: string;
}

export type TaskCategory = "client" | "learning" | "agency" | "admin" | "personal";

export interface Task {
  id: string;
  date: string;
  category: TaskCategory;
  clientId?: string;
  clientName?: string;
  learningType?: string;
  title: string;
  notes?: string;
  duration?: number;
  completed: boolean;
  createdAt: string;
}

export interface Capture {
  id: string;
  content: string;
  createdAt: string;
  processed: boolean;
}

export interface Resource {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  youtubeId?: string;
  resourceType: "youtube" | "article" | "workshop" | "tool" | "other";
  status: "to-watch" | "in-progress" | "done";
  category: string;
  notes?: string;
  pinnedDate?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  category: TaskCategory;
  month: string;
  progress: number;
  notes?: string;
  createdAt: string;
}

export const CATEGORY_META: Record<
  TaskCategory,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  client: {
    label: "Client Work",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  learning: {
    label: "Learning",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  agency: {
    label: "Agency Work",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  admin: {
    label: "Admin",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  personal: {
    label: "Personal",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
};

export const CLIENT_COLORS = [
  { name: "blue",    bg: "bg-blue-500",    light: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200" },
  { name: "emerald", bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { name: "rose",    bg: "bg-rose-500",    light: "bg-rose-100",    text: "text-rose-700",    border: "border-rose-200" },
  { name: "amber",   bg: "bg-amber-500",   light: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200" },
  { name: "violet",  bg: "bg-violet-500",  light: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-200" },
  { name: "teal",    bg: "bg-teal-500",    light: "bg-teal-100",    text: "text-teal-700",    border: "border-teal-200" },
  { name: "orange",  bg: "bg-orange-500",  light: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-200" },
  { name: "pink",    bg: "bg-pink-500",    light: "bg-pink-100",    text: "text-pink-700",    border: "border-pink-200" },
  { name: "red",     bg: "bg-red-500",     light: "bg-red-100",     text: "text-red-700",     border: "border-red-200" },
  { name: "yellow",  bg: "bg-yellow-400",  light: "bg-yellow-100",  text: "text-yellow-700",  border: "border-yellow-200" },
  { name: "olive",   bg: "bg-lime-700",    light: "bg-lime-100",    text: "text-lime-800",    border: "border-lime-200" },
  { name: "navy",    bg: "bg-blue-900",    light: "bg-blue-100",    text: "text-blue-900",    border: "border-blue-300" },
  { name: "brown",   bg: "bg-amber-800",   light: "bg-amber-100",   text: "text-amber-900",   border: "border-amber-300" },
  { name: "cyan",    bg: "bg-cyan-500",    light: "bg-cyan-100",    text: "text-cyan-700",    border: "border-cyan-200" },
  { name: "indigo",  bg: "bg-indigo-500",  light: "bg-indigo-100",  text: "text-indigo-700",  border: "border-indigo-200" },
  { name: "slate",   bg: "bg-slate-500",   light: "bg-slate-100",   text: "text-slate-700",   border: "border-slate-200" },
];

export function getClientColor(colorName: string) {
  return CLIENT_COLORS.find((c) => c.name === colorName) ?? CLIENT_COLORS[0];
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function extractYouTubeId(url: string): string | null {
  const pattern =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

export function formatDuration(minutes: number): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
