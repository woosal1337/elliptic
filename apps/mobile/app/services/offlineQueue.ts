import { load, save } from "@/utils/storage"

/** apisauce "problem" values that mean "we're offline / couldn't reach the server". */
export const NETWORK_PROBLEMS = ["NETWORK_ERROR", "CONNECTION_ERROR", "TIMEOUT_ERROR"]

export type QueuedMethod = "post" | "patch" | "put" | "delete"

export interface QueuedMutation {
  id: string
  method: QueuedMethod
  path: string
  body?: unknown
}

const KEY = "offline.queue"
const listeners = new Set<(count: number) => void>()
let seq = 0

function read(): QueuedMutation[] {
  return load<QueuedMutation[]>(KEY) ?? []
}

function write(queue: QueuedMutation[]): void {
  save(KEY, queue)
  listeners.forEach((l) => l(queue.length))
}

/** Append a mutation to the durable queue (persists across relaunches). */
export function enqueue(m: Omit<QueuedMutation, "id">): void {
  const queue = read()
  queue.push({ ...m, id: `${Date.now()}-${seq++}` })
  write(queue)
}

export function pendingCount(): number {
  return read().length
}

/** Subscribe to queue-length changes; fires immediately with the current count. */
export function subscribe(l: (count: number) => void): () => void {
  listeners.add(l)
  l(read().length)
  return () => {
    listeners.delete(l)
  }
}

type ReplayResult = { ok: boolean; problem?: string | null }

/**
 * Replay queued mutations in order. Stops at the first network failure (still
 * offline) so order is preserved; drops a mutation the server rejects (4xx) to
 * avoid a poison item blocking the queue forever.
 */
export async function flushQueue(
  replay: (m: QueuedMutation) => Promise<ReplayResult>,
): Promise<void> {
  let queue = read()
  while (queue.length > 0) {
    const res = await replay(queue[0])
    if (!res.ok && res.problem && NETWORK_PROBLEMS.includes(res.problem)) break
    queue = read()
    queue.shift()
    write(queue)
  }
}
