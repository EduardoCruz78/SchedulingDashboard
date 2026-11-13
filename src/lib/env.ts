import 'server-only'
import { z } from 'zod'

/**
 * Server environment, validated once. Nothing here is NEXT_PUBLIC_: every value stays on the server.
 * `instrumentation.ts` calls `getEnv()` when the server boots, so a bad value stops the process
 * instead of failing on the first request (the Zod equivalent of .NET's ValidateOnStart).
 */
export const envSchema = z.object({
  SCHEDULING_API_URL: z.url(),
  WEBHOOK_RELAY_URL: z.url(),
  WEBHOOK_RELAY_ADMIN_KEY: z.string().min(20, 'must be the relay admin API key'),
  SESSION_SECRET: z.string().min(32, 'must have at least 32 characters (use 32 random bytes)'),
  DATABASE_URL: z.url().refine((v) => /^postgres(ql)?:\/\//.test(v), 'must be a postgres:// URL'),
  WEBHOOK_SECRET: z.string().startsWith('whsec_', 'must be the whsec_ secret of the relay subscription'),
  DEMO_MODE: z.stringbool().default(false),
  /** The relay subscription that delivers to this dashboard; in demo mode only its deliveries can be replayed. */
  RELAY_SUBSCRIPTION_ID: z.uuid().optional(),
  BUSINESS_TIME_ZONE: z
    .string()
    .default('America/Sao_Paulo')
    .refine((tz) => isValidTimeZone(tz), 'must be an IANA time zone'),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(10_000),
})

export type Env = z.infer<typeof envSchema>

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment: ${details}`)
  }
  return result.data
}

let cached: Env | undefined

export function getEnv(): Env {
  cached ??= parseEnv(process.env)
  return cached
}
