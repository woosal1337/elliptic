"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { shortcutAllowed } from "./gate";
import { eventKey, isPlainKey, matchesCombo, parseKeys } from "./parse";
import type { KeyboardContextValue, ShortcutBinding } from "./types";

const CHORD_TIMEOUT_MS = 1000;

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return target.closest("[contenteditable='true']") !== null;
}

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const bindingsRef = useRef<Map<string, ShortcutBinding>>(new Map());
  const suppressedRef = useRef(false);
  const prefixRef = useRef<{ key: string; at: number } | null>(null);
  const prefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPrefix = useCallback(() => {
    prefixRef.current = null;
    if (prefixTimerRef.current) {
      clearTimeout(prefixTimerRef.current);
      prefixTimerRef.current = null;
    }
  }, []);

  const register = useCallback((binding: ShortcutBinding) => {
    bindingsRef.current.set(binding.id, binding);
    return () => {
      bindingsRef.current.delete(binding.id);
    };
  }, []);

  const list = useCallback(() => Array.from(bindingsRef.current.values()), []);

  const setSuppressed = useCallback(
    (suppressed: boolean) => {
      suppressedRef.current = suppressed;
      if (suppressed) clearPrefix();
    },
    [clearPrefix]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const blocked = suppressedRef.current || isEditableTarget(event.target);
      const bindings = Array.from(bindingsRef.current.values()).filter((binding) =>
        shortcutAllowed(binding, blocked)
      );

      for (const binding of bindings) {
        const parsed = parseKeys(binding.keys);
        if (parsed.kind === "combo" && matchesCombo(parsed, event)) {
          event.preventDefault();
          clearPrefix();
          binding.run();
          return;
        }
      }

      if (blocked) {
        clearPrefix();
        return;
      }

      if (!isPlainKey(event)) {
        clearPrefix();
        return;
      }

      const key = eventKey(event);
      const pending = prefixRef.current;

      if (pending && Date.now() - pending.at <= CHORD_TIMEOUT_MS) {
        for (const binding of bindings) {
          const parsed = parseKeys(binding.keys);
          if (parsed.kind === "chord" && parsed.prefix === pending.key && parsed.key === key) {
            event.preventDefault();
            clearPrefix();
            binding.run();
            return;
          }
        }
        clearPrefix();
      }

      for (const binding of bindings) {
        const parsed = parseKeys(binding.keys);
        if (parsed.kind === "single" && parsed.key === key) {
          event.preventDefault();
          clearPrefix();
          binding.run();
          return;
        }
      }

      const startsChord = bindings.some((binding) => {
        const parsed = parseKeys(binding.keys);
        return parsed.kind === "chord" && parsed.prefix === key;
      });

      if (startsChord) {
        prefixRef.current = { key, at: Date.now() };
        if (prefixTimerRef.current) clearTimeout(prefixTimerRef.current);
        prefixTimerRef.current = setTimeout(clearPrefix, CHORD_TIMEOUT_MS);
        return;
      }

      clearPrefix();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearPrefix();
    };
  }, [clearPrefix]);

  const value = useMemo<KeyboardContextValue>(
    () => ({ register, list, setSuppressed }),
    [register, list, setSuppressed]
  );

  return <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>;
}

export function useKeyboard(): KeyboardContextValue {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error("useKeyboard must be used within a KeyboardProvider");
  }
  return context;
}
