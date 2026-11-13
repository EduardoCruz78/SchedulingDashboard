import { cn } from '@/lib/utils'

const tones = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  error: 'bg-red-500',
  pending: 'bg-sky-500 animate-pulse',
  muted: 'bg-muted-foreground/40',
} as const

export function StatusDot({ tone, className }: { tone: keyof typeof tones; className?: string }) {
  return (
    <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', tones[tone], className)} />
  )
}
