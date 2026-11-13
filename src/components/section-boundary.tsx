'use client'

import { catchError, type ErrorInfo } from 'next/error'
import { AlertCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Component-level error boundary for unexpected failures (bugs). API failures do not get here: they are
 * rendered as values by `load()`. `redirect()` and `notFound()` pass through untouched.
 */
function SectionError(_props: object, { retry }: ErrorInfo) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <AlertCircle className="size-4" aria-hidden /> Something went wrong in this section.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          retry()
        }}
      >
        <RotateCw aria-hidden /> Try again
      </Button>
    </div>
  )
}

export const SectionBoundary = catchError(SectionError)
