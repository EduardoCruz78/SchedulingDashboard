import { randomUUID } from 'node:crypto'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import { inject } from 'vitest'
import { createDatabase, type Database } from '@/lib/db'

export interface TestDatabase {
  readonly db: Database
  readonly url: string
  /** Deletes every row, keeping the schema. Call in beforeEach for isolation within a file. */
  reset(): Promise<void>
  close(): Promise<void>
}

/** A fresh database with the real migrations applied, dedicated to the calling test file. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const serverUrl = inject('postgresUrl')
  const name = `test_${randomUUID().replaceAll('-', '')}`

  const admin = new Client({ connectionString: serverUrl })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${name}`)
  await admin.end()

  const url = new URL(serverUrl)
  url.pathname = `/${name}`
  const { db, pool } = createDatabase(url.toString())
  await migrate(db, { migrationsFolder: './drizzle' })

  return {
    db,
    url: url.toString(),
    async reset() {
      await pool.query('TRUNCATE received_webhooks, login_attempts RESTART IDENTITY')
    },
    async close() {
      await pool.end()
    },
  }
}
