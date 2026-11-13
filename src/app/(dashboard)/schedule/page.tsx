import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CalendarX2 } from 'lucide-react'
import { ApiProblem } from '@/components/api-problem'
import { PageHeader } from '@/components/page-header'
import { SectionBoundary } from '@/components/section-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { businessToday } from '@/lib/data/clock'
import { load } from '@/lib/data/load'
import { listAppointments, listProfessionals, listServices } from '@/lib/data/scheduling'
import { buildTimeline, customerLabel, parseScheduleFilters, type Timeline } from '@/lib/schedule'
import { dayRange, formatLocalDate, formatTime } from '@/lib/time'
import { type AppointmentView, AppointmentCard } from './appointment-card'
import { ScheduleFilters } from './schedule-filters'

export const metadata: Metadata = { title: 'Schedule' }

const PX_PER_MINUTE = 1.6

export default function SchedulePage({ searchParams }: PageProps<'/schedule'>) {
  return (
    <>
      <PageHeader
        title="Schedule"
        description="The day per professional. Times are in the business time zone."
      />
      <SectionBoundary>
        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleView searchParams={searchParams} />
        </Suspense>
      </SectionBoundary>
    </>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full max-w-2xl" />
      <Skeleton className="h-[480px] w-full" />
    </div>
  )
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL' })

async function ScheduleView({ searchParams }: Pick<PageProps<'/schedule'>, 'searchParams'>) {
  const [{ today, timeZone }, params] = await Promise.all([businessToday(), searchParams])
  const filters = parseScheduleFilters(params, today)
  const { from, to } = dayRange(filters.date, timeZone)

  const [professionals, services, appointments] = await Promise.all([
    load(listProfessionals),
    load(listServices),
    load(() => listAppointments({ from, to, professionalId: filters.professionalId })),
  ])
  if (!professionals.ok) return <ApiProblem problem={professionals.problem} />
  if (!services.ok) return <ApiProblem problem={services.problem} />
  if (!appointments.ok) return <ApiProblem problem={appointments.problem} />

  const serviceNames = new Map(services.data.map((s) => [s.id, s.name]))
  const timeline = buildTimeline(professionals.data, appointments.data, filters, timeZone)
  const toView = (a: (typeof appointments.data)[number]): AppointmentView => ({
    appointment: a,
    time: formatTime(a.startsAt, timeZone),
    serviceName: serviceNames.get(a.serviceId) ?? 'Service',
    customer: customerLabel(a.customerId),
    price: money.format(a.priceAtBooking),
  })

  return (
    <>
      <ScheduleFilters
        filters={filters}
        today={today}
        professionals={professionals.data.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name }))}
      />
      <h2 className="mb-3 text-lg font-medium">
        {formatLocalDate(filters.date, 'long')}
        <span className="text-muted-foreground ml-2 text-sm font-normal">
          {appointments.data.length} appointment{appointments.data.length === 1 ? '' : 's'}
        </span>
      </h2>
      {timeline.columns.length === 0 ? <EmptyState /> : <TimelineGrid timeline={timeline} toView={toView} />}
    </>
  )
}

function EmptyState() {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-sm">
      <CalendarX2 className="size-6" aria-hidden />
      No professional matches these filters.
    </div>
  )
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

function TimelineGrid({
  timeline,
  toView,
}: {
  timeline: Timeline
  toView: (a: Timeline['columns'][number]['blocks'][number]['appointment']) => AppointmentView
}) {
  const height = (timeline.end - timeline.start) * PX_PER_MINUTE
  const hours: number[] = []
  for (let m = timeline.start; m <= timeline.end; m += 60) hours.push(m)
  const y = (minutes: number) => (minutes - timeline.start) * PX_PER_MINUTE

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="flex min-w-fit">
        <div className="bg-muted/30 w-14 shrink-0 border-r" aria-hidden>
          <div className="h-10 border-b" />
          <div className="relative" style={{ height }}>
            {hours.map((m) => (
              <span
                key={m}
                className="text-muted-foreground absolute right-2 -translate-y-1/2 text-[11px] tabular-nums"
                style={{ top: y(m) }}
              >
                {hhmm(m)}
              </span>
            ))}
          </div>
        </div>
        {timeline.columns.map((column) => (
          <section
            key={column.professional.id}
            aria-label={column.professional.name}
            className="w-56 shrink-0 border-r last:border-r-0 md:w-auto md:min-w-56 md:flex-1"
          >
            <h3 className="flex h-10 items-center border-b px-3 text-sm font-medium">
              {column.professional.name}
              {column.professional.isActive ? null : (
                <span className="text-muted-foreground ml-2 text-xs font-normal">(inactive)</span>
              )}
            </h3>
            <div className="bg-muted/40 relative" style={{ height }}>
              {/* Working hours are the light areas; outside them the column stays shaded. */}
              {column.working.map((w) => (
                <div
                  key={`${w.start}-${w.end}`}
                  className="bg-background absolute inset-x-0"
                  style={{ top: y(w.start), height: (w.end - w.start) * PX_PER_MINUTE }}
                  aria-hidden
                />
              ))}
              {hours.map((m) => (
                <div
                  key={m}
                  className="border-border/60 absolute inset-x-0 border-t"
                  style={{ top: y(m) }}
                  aria-hidden
                />
              ))}
              <ol aria-label={`Appointments for ${column.professional.name}`}>
                {column.blocks.map((block) => (
                  <li
                    key={block.appointment.id}
                    className="absolute inset-x-1"
                    style={{
                      top: y(block.start) + 1,
                      height: Math.max(22, (block.end - block.start) * PX_PER_MINUTE - 2),
                    }}
                  >
                    <AppointmentCard
                      view={toView(block.appointment)}
                      compact={block.end - block.start < 60}
                    />
                  </li>
                ))}
              </ol>
              {column.blocks.length === 0 ? (
                <p className="text-muted-foreground absolute inset-x-0 top-4 text-center text-xs">
                  No appointments
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
