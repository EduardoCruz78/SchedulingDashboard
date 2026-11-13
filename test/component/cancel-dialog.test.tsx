import { useRef, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CancelDialog } from '@/app/(dashboard)/schedule/cancel-dialog'
import type { ActionState } from '@/lib/forms'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function Harness({ action }: { action: (p: ActionState, f: FormData) => Promise<ActionState> }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={trigger}
        onClick={() => {
          setOpen(true)
        }}
      >
        Actions
      </button>
      <CancelDialog
        appointmentId="01a1d1f5-7bf5-7691-b3da-67589fbc729a"
        summary="Haircut at 10:00 for Customer ···81d2"
        open={open}
        onOpenChange={setOpen}
        returnFocusTo={trigger}
        action={action}
      />
    </>
  )
}

describe('CancelDialog', () => {
  it('focuses the reason, shows field errors from the action and keeps the dialog open', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async (): Promise<ActionState> => ({
      status: 'error',
      message: 'Check the highlighted fields.',
      fieldErrors: { reason: ['Tell the customer why (at least 3 characters).'] },
    }))
    render(<Harness action={action} />)

    await user.click(screen.getByRole('button', { name: 'Actions' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancel this appointment?' })
    const reason = screen.getByLabelText('Reason')
    expect(reason).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }))

    await waitFor(() => {
      expect(reason).toHaveAttribute('aria-invalid', 'true')
    })
    expect(reason).toHaveAccessibleDescription('Tell the customer why (at least 3 characters).')
    expect(dialog).toBeInTheDocument()
  })

  it('sends the reason, closes on success and returns focus to the button that opened it', async () => {
    const user = userEvent.setup()
    let sent: FormData | undefined
    const action = vi.fn(async (_p: ActionState, form: FormData): Promise<ActionState> => {
      sent = form
      return { status: 'success', message: 'Appointment cancelled.' }
    })
    render(<Harness action={action} />)

    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.type(await screen.findByLabelText('Reason'), 'The professional is sick')
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }))

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(sent?.get('reason')).toBe('The professional is sick')
    expect(sent?.get('appointmentId')).toBe('01a1d1f5-7bf5-7691-b3da-67589fbc729a')
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus()
  })

  it('closes with Escape without calling the action', async () => {
    const user = userEvent.setup()
    const action = vi.fn()
    render(<Harness action={action} />)

    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(action).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus()
  })
})
