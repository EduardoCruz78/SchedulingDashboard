'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ProfessionalForm } from './professional-forms'

export function NewProfessionalButton() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> New professional
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New professional</DialogTitle>
          <DialogDescription>Then choose their services and working hours.</DialogDescription>
        </DialogHeader>
        <ProfessionalForm
          onSaved={() => {
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
