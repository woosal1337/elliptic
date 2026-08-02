import { patchCachedEntity, queryClient, queryKeys, removeCachedEntity } from "./query"

interface Row {
  id: string
  title: string
  status: string
}

const ORG = "org-1"
const row = (id: string, status = "todo"): Row => ({ id, title: `task ${id}`, status })

describe("cache patching", () => {
  beforeEach(() => queryClient.clear())

  it("updates the row in every list that holds it", () => {
    const all = queryKeys.tasks(ORG, "all")
    const assigned = queryKeys.tasks(ORG, "assigned")
    queryClient.setQueryData<Row[]>(all, [row("a"), row("b")])
    queryClient.setQueryData<Row[]>(assigned, [row("a")])

    patchCachedEntity<Row>(ORG, "tasks", "a", { status: "done" })

    expect(queryClient.getQueryData<Row[]>(all)?.[0]?.status).toBe("done")
    expect(queryClient.getQueryData<Row[]>(all)?.[1]?.status).toBe("todo")
    expect(queryClient.getQueryData<Row[]>(assigned)?.[0]?.status).toBe("done")
  })

  it("restores every touched list on rollback, and only those", () => {
    const all = queryKeys.tasks(ORG, "all")
    const other = queryKeys.tasks(ORG, "recent")
    queryClient.setQueryData<Row[]>(all, [row("a")])
    queryClient.setQueryData<Row[]>(other, [row("z")])

    const rollback = patchCachedEntity<Row>(ORG, "tasks", "a", { status: "done" })
    expect(queryClient.getQueryData<Row[]>(all)?.[0]?.status).toBe("done")

    rollback()
    expect(queryClient.getQueryData<Row[]>(all)?.[0]?.status).toBe("todo")
    expect(queryClient.getQueryData<Row[]>(other)).toEqual([row("z")])
  })

  // The bug this file exists for: a prefix filter matches several real keys, so
  // recording the *filter* as the rollback key would leave the real entries
  // patched and invent a junk entry at the prefix.
  it("rolls back to the real query keys, not the prefix", () => {
    const all = queryKeys.tasks(ORG, "all")
    queryClient.setQueryData<Row[]>(all, [row("a")])

    patchCachedEntity<Row>(ORG, "tasks", "a", { status: "done" })()

    expect(queryClient.getQueryData<Row[]>(all)).toEqual([row("a")])
    expect(queryClient.getQueryData([ORG, "tasks"])).toBeUndefined()
  })

  it("leaves lists that do not hold the row untouched", () => {
    const key = queryKeys.tasks(ORG, "all")
    queryClient.setQueryData<Row[]>(key, [row("b")])
    const before = queryClient.getQueryData<Row[]>(key)

    patchCachedEntity<Row>(ORG, "tasks", "missing", { status: "done" })

    expect(queryClient.getQueryData<Row[]>(key)).toBe(before)
  })

  it("does not leak across organisations", () => {
    const mine = queryKeys.tasks(ORG, "all")
    const theirs = queryKeys.tasks("org-2", "all")
    queryClient.setQueryData<Row[]>(mine, [row("a")])
    queryClient.setQueryData<Row[]>(theirs, [row("a")])

    patchCachedEntity<Row>(ORG, "tasks", "a", { status: "done" })

    expect(queryClient.getQueryData<Row[]>(theirs)?.[0]?.status).toBe("todo")
  })

  it("removes a row from every list, and restores it", () => {
    const all = queryKeys.tasks(ORG, "all")
    queryClient.setQueryData<Row[]>(all, [row("a"), row("b")])

    const rollback = removeCachedEntity<Row>(ORG, "tasks", "a")
    expect(queryClient.getQueryData<Row[]>(all)).toHaveLength(1)

    rollback()
    expect(queryClient.getQueryData<Row[]>(all)).toHaveLength(2)
  })

  it("is a no-op when nothing is cached yet", () => {
    expect(() => patchCachedEntity<Row>(ORG, "tasks", "a", { status: "done" })()).not.toThrow()
  })
})
