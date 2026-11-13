import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ApiProblem } from '@/components/api-problem'
import { SectionBoundary } from '@/components/section-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getEnv } from '@/lib/env'
import { load } from '@/lib/data/load'
import { getProfessional, listServices } from '@/lib/data/scheduling'
import { formatDateTime } from '@/lib/time'
import {
  AddTimeOffForm,
  ProfessionalForm,
  RemoveTimeOffButton,
  ServicesForm,
  WorkingHoursEditor,
} from '../professional-forms'

export const metadata: Metadata = { title: 'Professional' }

export default function ProfessionalPage({ params }: PageProps<'/professionals/[id]'>) {
  return (
    <>
      <Link
        href="/professionals"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden /> Professionals
      </Link>
      <SectionBoundary>
        <Suspense fallback={<DetailSkeleton />}>
          <ProfessionalDetail params={params} />
        </Suspense>
      </SectionBoundary>
    </>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  )
}

async function ProfessionalDetail({ params }: Pick<PageProps<'/professionals/[id]'>, 'params'>) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [professional, services] = await Promise.all([load(() => getProfessional(id)), load(listServices)])
  if (!professional.ok) {
    if (professional.problem.kind === 'not-found') notFound()
    return <ApiProblem problem={professional.problem} />
  }
  if (!services.ok) return <ApiProblem problem={services.problem} />
  const p = professional.data
  const timeZone = getEnv().BUSINESS_TIME_ZONE
  const timeOffs = [...(p.timeOffs ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Profile</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfessionalForm professional={p} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Services</h2>
            </CardTitle>
            <CardDescription>Customers can book these with {p.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ServicesForm professional={p} services={services.data} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Working hours</h2>
          </CardTitle>
          <CardDescription>
            Weekly, in the business time zone ({timeZone}). Split a day for breaks: 09:00–12:00 and
            13:00–18:00.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkingHoursEditor professional={p} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Time off</h2>
          </CardTitle>
          <CardDescription>No bookings are offered in these periods.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {timeOffs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No time off scheduled.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {timeOffs.map((t) => {
                const label = `${formatDateTime(t.startsAt, timeZone)} – ${formatDateTime(t.endsAt, timeZone)}`
                return (
                  <li key={t.id} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                    <div>
                      <p className="tabular-nums">{label}</p>
                      {t.reason ? <p className="text-muted-foreground text-xs">{t.reason}</p> : null}
                    </div>
                    <RemoveTimeOffButton professionalId={p.id} timeOffId={t.id} label={label} />
                  </li>
                )
              })}
            </ul>
          )}
          <AddTimeOffForm professionalId={p.id} />
        </CardContent>
      </Card>
    </div>
  )
}
