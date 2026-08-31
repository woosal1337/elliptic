import type { ShortcutBinding } from "./types";

/**
 * Whether one shortcut may fire right now.
 *
 * A combo used to run before anything checked where the caret was. So `mod+a`
 * on the board selected every task while a person was selecting the text in the
 * command palette, and `mod+b` took bold away from the description editor.
 *
 * The rule: while the caret sits in a field, or an overlay suppresses the
 * shortcuts, only a `global` binding runs. `global` means "this key belongs to
 * the app wherever the reader is", which today is the palette toggle alone.
 * Everything else waits until the reader leaves the field.
 */
export function shortcutAllowed(binding: ShortcutBinding, blocked: boolean): boolean {
  if (binding.enabled === false) return false;
  return !blocked || binding.scope === "global";
}
