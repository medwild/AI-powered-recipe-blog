import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

type DbType = NodePgDatabase<typeof schema>

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

function createMockDb(): DbType {
  console.warn("[AI Studio] DATABASE_URL not set — using in-memory mock database")
  let nextId = 1

  const makeChainable = (resolveValue: () => unknown): unknown => {
    const chain: Record<string, unknown> = {}
    const proxy: unknown = new Proxy(chain, {
      get(_target, prop) {
        if (prop === "then") {
          const p = Promise.resolve(resolveValue())
          return p.then.bind(p)
        }
        if (prop === "catch") {
          const p = Promise.resolve(resolveValue())
          return p.catch.bind(p)
        }
        if (prop === "finally") {
          const p = Promise.resolve(resolveValue())
          return p.finally.bind(p)
        }
        return (..._args: unknown[]) => proxy
      },
    })
    return proxy
  }

  const noOpQueryTable = {
    findMany: async () => [],
    findFirst: async () => null,
  }

  const mock = {
    select: () => makeChainable(() => []),
    selectDistinct: () => makeChainable(() => []),
    insert: () => ({
      values: (vals: unknown) => {
        const items = Array.isArray(vals) ? vals : [vals]
        const inserted = items.map((v) => ({
          id: nextId++,
          ...(typeof v === "object" && v !== null ? v : {}),
        }))
        return makeChainable(() => inserted)
      },
    }),
    update: () => ({
      set: () => makeChainable(() => []),
    }),
    delete: () => makeChainable(() => []),
    execute: async () => ({ rows: [] }),
    query: new Proxy(
      {},
      {
        get: () => noOpQueryTable,
      },
    ),
  }

  return mock as unknown as DbType
}

let pool: Pool
let db: DbType

if (process.env.DATABASE_URL) {
  try {
    pool =
      globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL })
    if (process.env.NODE_ENV !== "production") globalForDb.pool = pool
    db = drizzle(pool, { schema })
  } catch {
    pool = {
      query: async () => ({ rows: [] }),
      connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
    } as unknown as Pool
    db = createMockDb()
  }
} else {
  pool = {
    query: async () => ({ rows: [] }),
    connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
  } as unknown as Pool
  db = createMockDb()
}

export { pool, db }
