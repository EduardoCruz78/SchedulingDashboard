// Integration tests talk to fake APIs (MSW) and a real Postgres (Testcontainers).
// Each file sets up what it needs; this file only pins the process time zone so date
// formatting is tested against the business zone, not the machine running the tests.
process.env.TZ = 'UTC'
