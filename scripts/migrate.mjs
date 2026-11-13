// Applies the Drizzle migrations in ./drizzle (npm run db:migrate). Plain JavaScript so it also runs
// inside the Docker build image, where there is no TypeScript runner.
// On Vercel it runs in the build of production deployments only (see vercel.json).
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

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

const pool = new pg.Pool({ connectionString: url, max: 1 })
try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' })
  console.info('Migrations applied.')
} finally {
  await pool.end()
}
