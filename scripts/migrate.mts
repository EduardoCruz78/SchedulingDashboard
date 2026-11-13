// Applies the Drizzle migrations in ./drizzle. Run before the app starts (npm run db:migrate).
// On Vercel it runs in the build of production deployments only (see vercel.json and docs/architecture.md).
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const vercelEnv = process.env.VERCEL_ENV
if (vercelEnv && vercelEnv !== 'production') {
  console.info(`Skipping migrations on a ${vercelEnv} deployment.`)
  process.exit(0)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new Pool({ connectionString: url, max: 1 })
try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' })
  console.info('Migrations applied.')
} finally {
  await pool.end()
}
