import { z } from 'zod'
import { daysOfWeek } from '@/lib/api/types'

/**
 * Form validation that mirrors the SchedulingApi's own rules (FluentValidation in the API).
 * The API stays the authority: these give instant, field-level feedback, and whatever the API still
 * rejects comes back as ProblemDetails and lands on the same fields.
 */

const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.literal('')])
  .optional()
  .transform((v) => v === 'on' || v === 'true')

export const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'At most 100 characters.'),
  description: z
    .string()
    .trim()
    .max(500, 'At most 500 characters.')
    .transform((v) => (v.length === 0 ? null : v)),
  durationMinutes: z.coerce
    .number({ error: 'Enter the duration in minutes.' })
    .int('Use whole minutes.')
    .min(15, 'At least 15 minutes.')
    .max(480, 'At most 480 minutes (8 hours).')
    .refine((v) => v % 15 === 0, 'Use a multiple of 15 minutes.'),
  price: z.coerce
    .number({ error: 'Enter a price.' })
    .min(0, 'The price cannot be negative.')
    .max(99_999_999.99, 'That price is too high.')
    .refine((v) => Math.round(v * 100) === v * 100, 'At most 2 decimal places.'),
  isActive: checkbox,
})

export type ServiceInput = z.infer<typeof serviceSchema>

export const professionalSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'At most 100 characters.'),
  isActive: checkbox,
})

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the HH:mm format.')

export const workingHoursSchema = z
  .array(z.object({ day: z.enum(daysOfWeek as [string, ...string[]]), start: hhmm, end: hhmm }))
  .superRefine((intervals, ctx) => {
    intervals.forEach((interval, index) => {
      if (interval.start >= interval.end) {
        ctx.addIssue({ code: 'custom', path: [index, 'end'], message: 'End must be after start.' })
      }
    })
    // Two intervals on the same day must not overlap ([start, end) semantics: 12:00-12:00 touching is fine).
    for (const day of daysOfWeek) {
      const sameDay = intervals
        .map((interval, index) => ({ ...interval, index }))
        .filter((i) => i.day === day)
        .sort((a, b) => a.start.localeCompare(b.start))
      for (let i = 1; i < sameDay.length; i++) {
        const previous = sameDay[i - 1]
        const current = sameDay[i]
        if (previous && current && current.start < previous.end) {
          ctx.addIssue({
            code: 'custom',
            path: [current.index, 'start'],
            message: `Overlaps ${previous.start}-${previous.end} on ${day}.`,
          })
        }
      }
    }
  })

export const timeOffSchema = z
  .object({
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Pick the start date and time.'),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Pick the end date and time.'),
    reason: z
      .string()
      .trim()
      .max(200, 'At most 200 characters.')
      .transform((v) => (v.length === 0 ? null : v)),
  })
  .refine((v) => v.endsAt > v.startsAt, { path: ['endsAt'], message: 'End must be after start.' })
