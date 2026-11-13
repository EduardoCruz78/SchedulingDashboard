import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ServiceForm } from '@/app/(dashboard)/services/service-form'
import type { ActionState } from '@/lib/forms'
import { aService } from '@test/support/builders'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

describe('ServiceForm', () => {
  it('shows each field error next to its field, as the API returned them', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async (): Promise<ActionState> => ({
      status: 'error',
      message: 'One or more fields are invalid.',
      fieldErrors: {
        name: ["'Name' must not be empty."],
        durationMinutes: ['Duration must be a multiple of 15 minutes.'],
      },
    }))
    render(<ServiceForm action={action} />)

    await user.click(screen.getByRole('button', { name: 'Create service' }))

    const name = screen.getByLabelText('Name')
    await waitFor(() => {
      expect(name).toHaveAttribute('aria-invalid', 'true')
    })
    expect(name).toHaveAccessibleDescription("'Name' must not be empty.")
    expect(screen.getByLabelText('Duration (minutes)')).toHaveAccessibleDescription(
      '15 to 480, in steps of 15. Duration must be a multiple of 15 minutes.',
    )
    expect(screen.getByLabelText('Price (BRL)')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('alert')).toHaveTextContent('One or more fields are invalid.')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('pre-fills an existing service and sends its id', async () => {
    const user = userEvent.setup()
    let sent: FormData | undefined
    const onSaved = vi.fn()
    const service = aService({ name: 'Beard trim', durationMinutes: 15, price: 30, isActive: false })
    render(
      <ServiceForm
        service={service}
        onSaved={onSaved}
        action={async (_p, form) => {
          sent = form
          return { status: 'success', message: 'Service updated.' }
        }}
      />,
    )

    expect(screen.getByLabelText('Name')).toHaveValue('Beard trim')
    expect(screen.getByRole('checkbox', { name: /Active/ })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled()
    })
    expect(sent?.get('id')).toBe(service.id)
    expect(sent?.get('durationMinutes')).toBe('15')
    expect(toast.success).toHaveBeenCalledWith('Service updated.')
  })

  it('toasts an error that is not about a field', async () => {
    const user = userEvent.setup()
    render(
      <ServiceForm
        action={async () => ({
          status: 'error',
          message: 'The API is waking up.',
          fieldErrors: {},
          transient: true,
        })}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Create service' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('The API is waking up.')
    })
  })
})
