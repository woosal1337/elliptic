import { useCallback, useMemo, useState } from "react"
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
 *
 * `collapsedOnMount` names sections that should start closed every time the
 * screen opens, whatever they were left as. Expanding one still works and holds
 * for as long as you stay on the screen — it just does not carry to the next
 * visit. That is deliberately different from the remembered behaviour above:
 * these are the noisy, always-long sections you want folded away by default,
 * not a preference the user is expressing.
 */
export function useCollapsedSections(key: string, collapsedOnMount: readonly string[] = []) {
  const [raw, setRaw] = useMMKVString(`sections.collapsed.${key}`)

  // Which of the mount-collapsed sections the user has since touched. Reset on
  // every mount, which is what makes the default reassert itself next visit.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())

  // Memoised on the stored string so the identity is stable between renders —
  // callers put this in dependency arrays, and a fresh Set every render would
  // either defeat their memoisation or, if omitted, stop them re-rendering when
  // a section is toggled.
  const collapsed: ReadonlySet<string> = useMemo(() => {
    const next = new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
    for (const id of collapsedOnMount) if (!touched.has(id)) next.add(id)
    return next
  }, [raw, touched, collapsedOnMount])

  const toggle = useCallback(
    (id: string) => {
      hapticSelection()
      setTouched((current) => (current.has(id) ? current : new Set(current).add(id)))
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
