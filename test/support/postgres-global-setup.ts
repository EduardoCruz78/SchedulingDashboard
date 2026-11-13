import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    postgresUrl: string
  }
}

/**
 * One throwaway PostgreSQL 17 container for the whole integration run, started in the main Vitest
 * process (where MSW is not running, so its interceptors never see the Docker API calls).
 * Each test file then creates its own database inside it (see createTestDatabase).
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').withDatabase('postgres').start()
  project.provide('postgresUrl', container.getConnectionUri())
  return async () => {
    await container.stop()
  }
}
