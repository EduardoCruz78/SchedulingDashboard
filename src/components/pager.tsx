import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Page-number pagination as links (works without JavaScript; every page has a URL). */
export function Pager({
  page,
  pageSize,
  total,
  href,
}: {
  page: number
  pageSize: number
  total: number
  href: (page: number) => string
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4 text-sm">
      <p className="text-muted-foreground">
        {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page - 1)} aria-label="Previous page">
              <ChevronLeft aria-hidden /> Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft aria-hidden /> Previous
          </Button>
        )}
        <span className="text-muted-foreground tabular-nums" aria-current="page">
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page + 1)} aria-label="Next page">
              Next <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight aria-hidden />
          </Button>
        )}
      </div>
    </nav>
  )
}
