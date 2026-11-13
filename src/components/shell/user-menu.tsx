import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/(auth)/login/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { requireAdmin } from '@/lib/auth/session'
import { getEnv } from '@/lib/env'

/** Reads the session, so it renders behind a Suspense boundary in the dashboard layout. */
export async function UserMenu() {
  const session = await requireAdmin()
  const demo = getEnv().DEMO_MODE
  return (
    <div className="flex items-center gap-3">
      {demo ? (
        <Badge variant="outline" title="Public demo: relay write actions are disabled">
          Demo
        </Badge>
      ) : null}
      <div className="hidden text-right text-sm leading-tight sm:block">
        <p className="font-medium">{session.user.name}</p>
        <p className="text-muted-foreground text-xs">{session.user.email}</p>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
          <LogOut />
        </Button>
      </form>
    </div>
  )
}
