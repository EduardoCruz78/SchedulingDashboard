import { Suspense } from 'react'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { MobileNav } from '@/components/shell/mobile-nav'
import { NavLinks } from '@/components/shell/nav-links'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { UserMenu } from '@/components/shell/user-menu'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The shell (sidebar, header) is static and prerendered; only the user menu reads the session, behind
 * its own Suspense boundary, so navigation and page headings show instantly.
 */
export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-svh">
      <a
        href="#main"
        className="bg-background sr-only z-50 rounded-md border px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <aside className="bg-sidebar hidden w-60 shrink-0 border-r p-4 md:block">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 font-semibold">
          <CalendarClock className="size-5" aria-hidden />
          SchedulingDashboard
        </Link>
        <NavLinks />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
          <MobileNav />
          <div className="flex-1" />
          <ThemeToggle />
          <Suspense fallback={<Skeleton className="h-8 w-40" />}>
            <UserMenu />
          </Suspense>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
