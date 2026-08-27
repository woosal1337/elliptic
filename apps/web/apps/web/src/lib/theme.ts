export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "elliptic:theme";

export function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : "dark";
}

export function resolveDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Flip the theme with every transition switched off.
 *
 * A theme change rewrites the colour, background, border and shadow of nearly
 * every element at once. Each one carries a 150ms colour transition, so they
 * all run together and the switch reads as a slow smear instead of a change.
 * The override goes in, a forced reflow commits the new colours while it still
 * applies, and the next frame takes it out again.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const dark = resolveDark(theme);
  const root = document.documentElement;

  const style = document.createElement("style");
  style.append(document.createTextNode("*,*::before,*::after{transition:none !important}"));
  document.head.append(style);

  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);

  // Read a layout property for its side effect: it flushes the new colours
  // while the override still stands, so nothing starts a transition.
  void document.body?.offsetHeight;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => style.remove());
  });
}

export function setTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'&&t!=='system')t='dark';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;
