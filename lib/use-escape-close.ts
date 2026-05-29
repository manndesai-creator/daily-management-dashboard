"use client";

import { useEffect } from "react";

/**
 * Calls `onClose` when the user presses Escape, but only while `isOpen` is
 * true. Use this on every modal / drawer / popover so keyboard users can
 * always dismiss with a single keystroke.
 *
 * Keep the handler stable (wrap in `useCallback`) if you don't want the
 * effect to re-bind on every parent render.
 */
export function useEscapeClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);
}
