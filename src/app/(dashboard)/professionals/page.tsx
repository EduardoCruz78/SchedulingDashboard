import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { ApiProblem } from '@/components/api-problem'
import { PageHeader } from '@/components/page-header'
import { SectionBoundary } from '@/components/section-boundary'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { daysOfWeek } from '@/lib/api/types'
import { load } from '@/lib/data/load'
import { listProfessionals } from '@/lib/data/scheduling'
import { NewProfessionalButton } from './new-professional-button'

export const metadata: Metadata = { title: 'Professionals' }

export default function ProfessionalsPage() {
  return (
    <>
      <PageHeader
        title="Professionals"
        description="Who works here, what they do and when."
        actions={<NewProfessionalButton />}
      />
      <SectionBoundary>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <ProfessionalsTable />
        </Suspense>
      </SectionBoundary>
    </>
  )
}

async function ProfessionalsTable() {
  const result = await load(listProfessionals)
  if (!result.ok) return <ApiProblem problem={result.problem} />
  if (result.data.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No professionals yet. Add the first one with “New professional”.
      </p>
    )
  }
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Services</TableHead>
            <TableHead>Working days</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((p) => {
            const days = daysOfWeek.filter((d) => p.workingHours.some((w) => w.day === d))
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    href={`/professionals/${p.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                    prefetch={true}
                  >
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.serviceIds.length}</TableCell>
                <TableCell className="text-muted-foreground">
                  {days.length === 0 ? 'No hours set' : days.map((d) => d.slice(0, 3)).join(', ')}
                </TableCell>
                <TableCell>
                  {p.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
