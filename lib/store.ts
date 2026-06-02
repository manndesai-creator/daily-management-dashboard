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
  agencyType?: string;
  url?: string;
  title: string;
  notes?: string;
  duration?: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export type CaptureType = "quick" | "idea" | "reminder";
export type CaptureTimeframe = "1-2 weeks" | "2-3 weeks" | "after a month";
export type CaptureRelatedTo = "client" | "agency" | "learning" | "other";

export type CaptureAttachmentType = "text" | "link" | "file";

export interface CaptureAttachment {
  id: string;
  type: CaptureAttachmentType;
  // For "text": the note body
  // For "link": the URL
  // For "file": the public URL from Supabase Storage
  content: string;
  // Optional label for the attachment (e.g. note heading, link label, file display name)
  title?: string;
  // file-specific
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  storagePath?: string;
  // link-specific cached metadata
  youtubeId?: string;
  thumbnail?: string;
  createdAt: string;
}

export interface Capture {
  id: string;
  content: string;
  type: CaptureType;
  title?: string;
  description?: string;
  emoji?: string;
  timeframe?: CaptureTimeframe;
  reminderDate?: string;
  relatedToCategory?: CaptureRelatedTo;
  relatedToValue?: string;
  attachments?: CaptureAttachment[];
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
  completedAt?: string;
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
  { name: "blue",    bg: "bg-blue-500",    light: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    hex: "#3b82f6" },
  { name: "emerald", bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", hex: "#10b981" },
  { name: "rose",    bg: "bg-rose-500",    light: "bg-rose-100",    text: "text-rose-700",    border: "border-rose-200",    hex: "#f43f5e" },
  { name: "amber",   bg: "bg-amber-500",   light: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   hex: "#f59e0b" },
  { name: "violet",  bg: "bg-violet-500",  light: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-200",  hex: "#8b5cf6" },
  { name: "teal",    bg: "bg-teal-500",    light: "bg-teal-100",    text: "text-teal-700",    border: "border-teal-200",    hex: "#14b8a6" },
  { name: "orange",  bg: "bg-orange-500",  light: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-200",  hex: "#f97316" },
  { name: "pink",    bg: "bg-pink-500",    light: "bg-pink-100",    text: "text-pink-700",    border: "border-pink-200",    hex: "#ec4899" },
  { name: "red",     bg: "bg-red-500",     light: "bg-red-100",     text: "text-red-700",     border: "border-red-200",     hex: "#ef4444" },
  { name: "yellow",  bg: "bg-yellow-400",  light: "bg-yellow-100",  text: "text-yellow-700",  border: "border-yellow-200",  hex: "#facc15" },
  { name: "olive",   bg: "bg-lime-700",    light: "bg-lime-100",    text: "text-lime-800",    border: "border-lime-200",    hex: "#4d7c0f" },
  { name: "navy",    bg: "bg-blue-900",    light: "bg-blue-100",    text: "text-blue-900",    border: "border-blue-300",    hex: "#1e3a8a" },
  { name: "brown",   bg: "bg-amber-800",   light: "bg-amber-100",   text: "text-amber-900",   border: "border-amber-300",   hex: "#92400e" },
  { name: "cyan",    bg: "bg-cyan-500",    light: "bg-cyan-100",    text: "text-cyan-700",    border: "border-cyan-200",    hex: "#06b6d4" },
  { name: "indigo",  bg: "bg-indigo-500",  light: "bg-indigo-100",  text: "text-indigo-700",  border: "border-indigo-200",  hex: "#6366f1" },
  { name: "slate",   bg: "bg-slate-500",   light: "bg-slate-100",   text: "text-slate-700",   border: "border-slate-200",   hex: "#64748b" },
];

export function getClientColor(colorName: string) {
  return CLIENT_COLORS.find((c) => c.name === colorName) ?? CLIENT_COLORS[0];
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const IST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function today(): string {
  // Always returns the current calendar date in IST, regardless of the
  // browser's local timezone. The agency operates in IST so the day rolls
  // over at IST midnight.
  return IST_FORMATTER.format(new Date());
}

export function currentMonth(): string {
  return today().slice(0, 7);
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function getWeekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export const AGENCY_TYPES = [
  "Outreach",
  "Branding",
  "Business Management",
  "Shoots",
  "Hiring",
  "Team Management",
  "SOPs & Dashboards",
  "Others",
];

export const AGENCY_TYPE_HEX: Record<string, string> = {
  Outreach: "#3b82f6",
  Branding: "#ec4899",
  "Business Management": "#6366f1",
  Shoots: "#f43f5e",
  Hiring: "#10b981",
  "Team Management": "#8b5cf6",
  "SOPs & Dashboards": "#f59e0b",
  Others: "#64748b",
};

export const AGENCY_TYPE_EMOJI: Record<string, string> = {
  Outreach: "📣",
  Branding: "🎨",
  "Business Management": "💼",
  Shoots: "🎬",
  Hiring: "👥",
  "Team Management": "🤝",
  "SOPs & Dashboards": "📋",
  Others: "🔧",
};

export function normalizeAgencyType(type: string | undefined): string {
  if (!type) return "Others";
  if (AGENCY_TYPES.includes(type)) return type;
  if (type === "Other") return "Others";
  if (type === "SOPs") return "SOPs & Dashboards";
  if (type === "SOPs, Skills and Dashboards") return "SOPs & Dashboards";
  return "Others";
}

export function extractYouTubeId(url: string): string | null {
  const pattern =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

// ─── Fitness ───────────────────────────────────────────────────────────────

export type ActivityType = "gym" | "swimming" | "running" | "cycling" | "sports" | "yoga" | "other";

export const ACTIVITY_TYPE_META: Record<ActivityType, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  gym:      { label: "Gym",      emoji: "🏋️", color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200" },
  swimming: { label: "Swimming", emoji: "🏊", color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  running:  { label: "Running",  emoji: "🏃", color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200" },
  cycling:  { label: "Cycling",  emoji: "🚴", color: "text-yellow-700", bg: "bg-yellow-50",  border: "border-yellow-200" },
  sports:   { label: "Sports",   emoji: "⚽", color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200" },
  yoga:     { label: "Yoga",     emoji: "🧘", color: "text-pink-700",   bg: "bg-pink-50",    border: "border-pink-200" },
  other:    { label: "Other",    emoji: "💪", color: "text-slate-700",  bg: "bg-slate-50",   border: "border-slate-200" },
};

export interface FitnessActivity {
  id: string;
  date: string;
  type: ActivityType;
  name: string;
  duration?: number; // minutes
  notes?: string;
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  templateId?: string;
  notes?: string;
  durationMinutes?: number;
  createdAt: string;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseName: string;
  muscleGroup?: string;
  setNumber: number;
  weight: number; // kg
  reps: number;
  isWarmup?: boolean;
  createdAt: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: string[]; // ordered list of exercise names
  notes?: string;
  createdAt: string;
}

export interface DailySteps {
  id: string;
  date: string;
  steps: number;
  createdAt: string;
}

export interface BodyWeightLog {
  id: string;
  date: string;
  weight: number; // kg
  notes?: string;
  createdAt: string;
}

export const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Legs", "Glutes", "Core", "Cardio", "Full Body", "Other",
];

export const COMMON_EXERCISES: Record<string, string[]> = {
  Chest:      ["Bench Press", "Incline Bench Press", "Decline Bench Press", "Dumbbell Fly", "Push Ups", "Cable Fly", "Chest Dips"],
  Back:       ["Pull Ups", "Lat Pulldown", "Barbell Row", "Dumbbell Row", "Seated Cable Row", "T-Bar Row", "Face Pull", "Deadlift"],
  Shoulders:  ["Overhead Press", "Dumbbell Shoulder Press", "Lateral Raise", "Front Raise", "Rear Delt Fly", "Arnold Press", "Upright Row"],
  Biceps:     ["Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl", "Cable Curl", "Concentration Curl", "Incline Dumbbell Curl"],
  Triceps:    ["Tricep Pushdown", "Close Grip Bench Press", "Skull Crusher", "Overhead Tricep Extension", "Dips", "Diamond Push Ups", "Kickback"],
  Legs:       ["Squat", "Leg Press", "Romanian Deadlift", "Leg Curl", "Leg Extension", "Lunges", "Calf Raise", "Bulgarian Split Squat"],
  Glutes:     ["Hip Thrust", "Glute Bridge", "Cable Kickback", "Sumo Squat"],
  Core:       ["Plank", "Crunches", "Leg Raise", "Russian Twist", "Ab Wheel", "Cable Crunch", "Hanging Knee Raise"],
  Cardio:     ["Treadmill", "Elliptical", "Rowing Machine", "Stair Climber", "Jump Rope", "Stationary Bike"],
  "Full Body":["Deadlift", "Clean and Press", "Burpees", "Kettlebell Swing", "Thruster"],
  Other:      [],
};

export function formatDuration(minutes: number): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
