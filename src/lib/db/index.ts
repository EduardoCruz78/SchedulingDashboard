import 'server-only'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { getEnv } from '@/lib/env'
import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema>

export function createDatabase(connectionString: string): { db: Database; pool: Pool } {
  // Serverless functions are many small processes: keep each pool tiny and let Neon's pooler fan in.
  const pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000 })
  return { db: drizzle(pool, { schema }), pool }
}

let database: Database | undefined

/** Lazily created, one per server process. */
export function getDb(): Database {
  database ??= createDatabase(getEnv().DATABASE_URL).db
  return database
}

export { schema }
