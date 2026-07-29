import { Option } from "@/components/OptionSheet"

export const PRIORITY_OPTIONS: Option[] = [
  { label: "No priority", value: "none" },
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
]

export const STATUS_OPTIONS: Option[] = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "In progress", value: "in_progress" },
  { label: "In review", value: "in_review" },
  { label: "Done", value: "done" },
  { label: "Cancelled", value: "cancelled" },
]

export function isoInDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Sentinel value: the due OptionSheet should open the native date picker. */
export const CUSTOM_DUE = "__custom__"

export const DUE_OPTIONS: Option[] = [
  { label: "No due date", value: "" },
  { label: "Today", value: isoInDays(0) },
  { label: "Tomorrow", value: isoInDays(1) },
  { label: "Next week", value: isoInDays(7) },
  { label: "Pick a date…", value: CUSTOM_DUE },
]

/** Local-timezone YYYY-MM-DD for a Date (avoids the UTC shift of toISOString). */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Human label for a status/priority enum value (in_progress -> "In progress"). */
export function prettyLabel(value: string, options: Option[]): string {
  return options.find((o) => o.value === value)?.label ?? cap(value)
}

/** A friendly label for a due date ISO string. */
export function dueLabel(due: string | null | undefined): string {
  if (!due) return "No due date"
  const known = DUE_OPTIONS.find((o) => o.value === due)
  return known ? known.label : due
}
