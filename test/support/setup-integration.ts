import { testEnv } from './test-env'

// Integration tests talk to fake APIs (MSW) and a real Postgres (Testcontainers). The process time zone
// is pinned to UTC so date formatting is tested against the business zone, not the test machine's.
process.env.TZ = 'UTC'
Object.assign(process.env, testEnv)
