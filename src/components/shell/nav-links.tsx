'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  type LucideIcon,
  Scissors,
  Send,
  Users,
  Webhook,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Scheduling',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/schedule', label: 'Schedule', icon: CalendarDays },
      { href: '/services', label: 'Services', icon: Scissors },
      { href: '/professionals', label: 'Professionals', icon: Users },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { href: '/integrations/deliveries', label: 'Deliveries', icon: Send },
      { href: '/integrations/subscriptions', label: 'Subscriptions', icon: Webhook },
      { href: '/activity', label: 'Live activity', icon: Activity },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The active link depends on the URL, which on dynamic routes is only known at request time; the
 * fallback is the same list without highlighting, so the static shell still has full navigation.
 */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavList pathname={null} onNavigate={onNavigate} />}>
      <ActiveNavList onNavigate={onNavigate} />
    </Suspense>
  )
}

function ActiveNavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return <NavList pathname={usePathname()} onNavigate={onNavigate} />
}

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string | null
  onNavigate?: (() => void) | undefined
}) {
  return (
    <nav aria-label="Main" className="grid gap-6">
      {navGroups.map((group) => (
        <div key={group.label} className="grid gap-1">
          <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
            {group.label}
          </p>
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = pathname !== null && isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-visible:ring-ring/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus-visible:ring-3',
                  active
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
