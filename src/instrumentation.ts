export async function register() {
  // Validate configuration when the Node.js server boots, not on the first request.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getEnv } = await import('@/lib/env')
    getEnv()
  }
}
