'use client'

import { useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { appointmentStatuses, statusLabels } from '@/lib/api/types'
import type { ScheduleFilters as Filters } from '@/lib/schedule'
import { addDays, type LocalDate } from '@/lib/time'

const ALL = 'all'

/**
 * Filters live in the URL (?date=&professional=&status=): a view can be shared, bookmarked and survives
 * a reload, and the Server Component reads them directly. Changing one is a navigation.
 */
export function ScheduleFilters({
  filters,
  today,
  professionals,
}: {
  filters: Filters
  today: LocalDate
  professionals: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  const go = (patch: Partial<Record<'date' | 'professional' | 'status', string | undefined>>) => {
    const params = new URLSearchParams()
    const next = {
      date: filters.date,
      professional: filters.professionalId,
      status: filters.status,
      ...patch,
    }
    if (next.date && next.date !== today) params.set('date', next.date)
    if (next.professional) params.set('professional', next.professional)
    if (next.status) params.set('status', next.status)
    const query = params.toString()
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3" role="group" aria-label="Schedule filters">
      <div className="flex items-end gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          onClick={() => {
            go({ date: addDays(filters.date, -1) })
          }}
        >
          <ChevronLeft />
        </Button>
        <div className="grid gap-1.5">
          <Label htmlFor="schedule-date">Date</Label>
          <Input
            id="schedule-date"
            type="date"
            className="w-40"
            value={filters.date}
            onChange={(e) => {
              if (e.target.value) go({ date: e.target.value })
            }}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next day"
          onClick={() => {
            go({ date: addDays(filters.date, 1) })
          }}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          disabled={filters.date === today}
          onClick={() => {
            go({ date: today })
          }}
        >
          Today
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="schedule-professional">Professional</Label>
        <Select
          value={filters.professionalId ?? ALL}
          onValueChange={(v) => {
            go({ professional: v === ALL ? undefined : v })
          }}
        >
          <SelectTrigger id="schedule-professional" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All professionals</SelectItem>
            {professionals.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="schedule-status">Status</Label>
        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) => {
            go({ status: v === ALL ? undefined : v })
          }}
        >
          <SelectTrigger id="schedule-status" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {appointmentStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {pending ? (
        <Loader2 className="text-muted-foreground mb-2 size-4 animate-spin" aria-label="Loading" />
      ) : null}
    </div>
  )
}
