import { useCallback, useMemo } from "react"
import { useMMKVString } from "react-native-mmkv"

import { hapticSelection } from "@/utils/haptics"

/**
 * Which sections a screen has collapsed, remembered across navigation.
 *
 * Component state was losing this on every unmount, so collapsing "Done" and
 * walking into a task reopened it on the way back — the setting looked like it
 * had not taken. MMKV is synchronous, so the list renders already collapsed on
 * the first frame rather than flashing open.
 *
 * `key` scopes the memory: one screen's collapsed statuses must not restore
 * onto another's.
 */
export function useCollapsedSections(key: string) {
  const [raw, setRaw] = useMMKVString(`sections.collapsed.${key}`)

  // Memoised on the stored string so the identity is stable between renders —
  // callers put this in dependency arrays, and a fresh Set every render would
  // either defeat their memoisation or, if omitted, stop them re-rendering when
  // a section is toggled.
  const collapsed: ReadonlySet<string> = useMemo(
    () => new Set(raw ? (JSON.parse(raw) as string[]) : []),
    [raw],
  )

  const toggle = useCallback(
    (id: string) => {
      hapticSelection()
      setRaw((current) => {
        const next = new Set<string>(current ? (JSON.parse(current) as string[]) : [])
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return JSON.stringify([...next])
      })
    },
    [setRaw],
  )

  return { collapsed, toggle }
}
