'use client'

import { useState, useTransition } from 'react'
import { Loader2, MoreHorizontal, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Service } from '@/lib/api/types'
import { saveService, setServiceActive } from './actions'
import { ServiceForm } from './service-form'

export function NewServiceButton() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> New service
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service</DialogTitle>
          <DialogDescription>Customers can book active services.</DialogDescription>
        </DialogHeader>
        <ServiceForm
          action={saveService}
          onSaved={() => {
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

export function ServiceRowActions({ service }: { service: Service }) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const setActive = (active: boolean) => {
    startTransition(async () => {
      const result = await setServiceActive(service.id, active)
      if (result.status === 'success') toast.success(result.message)
      else if (result.status === 'error') toast.error(result.message)
      setConfirmOpen(false)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${service.name}`}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setEditOpen(true)
            }}
          >
            <Pencil aria-hidden /> Edit
          </DropdownMenuItem>
          {service.isActive ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setConfirmOpen(true)
              }}
            >
              <PowerOff aria-hidden /> Deactivate…
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => {
                setActive(true)
              }}
            >
              <Power aria-hidden /> Reactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit service</DialogTitle>
            <DialogDescription>Price changes apply to new bookings only.</DialogDescription>
          </DialogHeader>
          <ServiceForm
            service={service}
            action={saveService}
            onSaved={() => {
              setEditOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {service.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Customers can no longer book it. Existing appointments are kept, and you can reactivate it
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it active</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setActive(false)
              }}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Deactivate
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
