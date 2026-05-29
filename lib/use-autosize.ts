"use client";

import { useEffect } from "react";

/**
 * Grows a `<textarea>` to fit its content. Pass a ref and the string value
 * you want it to track (we resize whenever the value changes).
 *
 * Use as:
 *   const ref = useRef<HTMLTextAreaElement>(null);
 *   useAutoSize(ref, value);
 *   <textarea ref={ref} value={value} ... />
 */
export function useAutoSize(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeight = 480
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [ref, value, maxHeight]);
}
