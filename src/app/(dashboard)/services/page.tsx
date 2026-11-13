import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { ApiProblem } from '@/components/api-problem'
import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { SectionBoundary } from '@/components/section-boundary'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { load } from '@/lib/data/load'
import { listServicesPage } from '@/lib/data/scheduling'
import { NewServiceButton, ServiceRowActions } from './service-dialogs'

export const metadata: Metadata = { title: 'Services' }

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL' })

export default function ServicesPage({ searchParams }: PageProps<'/services'>) {
  return (
    <>
      <PageHeader
        title="Services"
        description="What customers can book, how long it takes and what it costs."
        actions={<NewServiceButton />}
      />
      <SectionBoundary>
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <ServicesTable searchParams={searchParams} />
        </Suspense>
      </SectionBoundary>
    </>
  )
}

async function ServicesTable({ searchParams }: Pick<PageProps<'/services'>, 'searchParams'>) {
  const params = await searchParams
  const page = Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)
  const showInactive = params.inactive === '1'
  const result = await load(() => listServicesPage(page, showInactive))
  if (!result.ok) return <ApiProblem problem={result.problem} />
  const { items, totalCount, pageSize } = result.data

  const href = (p: number, inactive = showInactive) => {
    const q = new URLSearchParams()
    if (p > 1) q.set('page', String(p))
    if (inactive) q.set('inactive', '1')
    const s = q.toString()
    return s ? `/services?${s}` : '/services'
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-4 border-b p-3 text-sm">
        <p className="text-muted-foreground">
          {showInactive ? 'Showing active and inactive services.' : 'Showing active services.'}
        </p>
        <Link
          href={href(1, !showInactive)}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          {showInactive ? 'Hide inactive' : 'Show inactive'}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">
          No services yet. Create the first one with “New service”.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="max-w-md">
                  <p className="font-medium">{service.name}</p>
                  {service.description ? (
                    <p className="text-muted-foreground truncate text-xs">{service.description}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{service.durationMinutes} min</TableCell>
                <TableCell className="text-right tabular-nums">{money.format(service.price)}</TableCell>
                <TableCell>
                  {service.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <ServiceRowActions service={service} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="border-t px-3 pb-3">
        <Pager page={page} pageSize={pageSize} total={totalCount} href={(p) => href(p)} />
      </div>
    </div>
  )
}
