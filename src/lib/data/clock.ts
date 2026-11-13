import 'server-only'
import { connection } from 'next/server'
import { getEnv } from '@/lib/env'
import { type LocalDate, toLocalDate } from '@/lib/time'

/** "Today" in the business time zone. Request-time (reads the clock), so call it inside Suspense. */
export async function businessToday(): Promise<{ today: LocalDate; timeZone: string; now: Date }> {
  await connection()
  const timeZone = getEnv().BUSINESS_TIME_ZONE
  const now = new Date()
  return { today: toLocalDate(now, timeZone), timeZone, now }
}
