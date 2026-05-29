"use client";

/**
 * A tiny in-app error bus. Pub/sub, no deps. Any layer can call
 * `pushAppError("addTask", "Could not save task")` and the toast listener at
 * the top of the dashboard layout will surface it for ~6 seconds.
 *
 * Mostly used by the Supabase wrappers in `lib/db.ts` so silent write
 * failures stop being silent.
 */
export interface AppErrorEvent {
  id: string;
  scope?: string;
  message: string;
  at: number;
}

type Subscriber = (event: AppErrorEvent) => void;

const subscribers = new Set<Subscriber>();

export function pushAppError(scope: string | undefined, message: string) {
  const event: AppErrorEvent = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    scope,
    message,
    at: Date.now(),
  };
  subscribers.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* swallow subscriber errors so one broken listener can't break the bus */
    }
  });
}

export function subscribeAppErrors(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
