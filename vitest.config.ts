import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const shared = {
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${r('./src')}/$1` },
      { find: /^@test\/(.*)$/, replacement: `${r('./test')}/$1` },
      // `server-only` throws outside the React Server Components bundler; tests run in plain Node.
      { find: /^server-only$/, replacement: r('./test/support/empty-module.ts') },
    ],
  },
}

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        ...shared,
        test: { name: 'unit', environment: 'node', include: ['test/unit/**/*.test.ts'] },
      },
      {
        ...shared,
        plugins: [react()],
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['test/component/**/*.test.tsx'],
          setupFiles: ['test/support/setup-dom.ts'],
        },
      },
      {
        ...shared,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.test.ts'],
          setupFiles: ['test/support/setup-integration.ts'],
          testTimeout: 30_000,
          hookTimeout: 120_000,
          fileParallelism: false,
        },
      },
    ],
  },
})
