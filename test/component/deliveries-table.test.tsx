import { render, screen, within } from '@testing-library/react'
import { DeliveriesTable } from '@/app/(dashboard)/integrations/deliveries/deliveries-table'
import { aDelivery } from '@test/support/builders'

const subscription = '11111111-1111-7111-8111-111111111111'

describe('DeliveriesTable', () => {
  it('lists deliveries with status as text (not color alone) in the business time zone', () => {
    render(
      <DeliveriesTable
        deliveries={[
          aDelivery({
            subscriptionId: subscription,
            status: 'dead',
            attempts: 8,
            lastError: 'HTTP 500',
            createdAt: '2026-11-13T13:00:00.000Z',
          }),
          aDelivery({ subscriptionId: subscription, status: 'succeeded' }),
        ]}
        subscriptionNames={{ [subscription]: 'dashboard' }}
        timeZone="America/Sao_Paulo"
        nextHref={null}
        firstHref={null}
      />,
    )

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    const dead = within(rows[0] as HTMLElement)
    expect(dead.getByText('Dead')).toBeInTheDocument()
    expect(dead.getByText('Nov 13, 10:00:00')).toBeInTheDocument()
    expect(dead.getByText('dashboard')).toBeInTheDocument()
    expect(dead.getByText('HTTP 500')).toBeInTheDocument()
    expect(within(rows[1] as HTMLElement).getByText('Succeeded')).toBeInTheDocument()
  })

  it('pages with the cursor: "Older" carries it, "Newest" goes back to the first page', () => {
    render(
      <DeliveriesTable
        deliveries={[aDelivery()]}
        subscriptionNames={{}}
        timeZone="UTC"
        nextHref="/integrations/deliveries?status=dead&cursor=abc"
        firstHref="/integrations/deliveries?status=dead"
      />,
    )

    expect(screen.getByRole('link', { name: /Older/ })).toHaveAttribute(
      'href',
      '/integrations/deliveries?status=dead&cursor=abc',
    )
    expect(screen.getByRole('link', { name: 'Newest' })).toHaveAttribute(
      'href',
      '/integrations/deliveries?status=dead',
    )
  })

  it('says so when nothing matches and there is no next page', () => {
    render(
      <DeliveriesTable
        deliveries={[]}
        subscriptionNames={{}}
        timeZone="UTC"
        nextHref={null}
        firstHref={null}
      />,
    )
    expect(screen.getByText('No deliveries match these filters.')).toBeInTheDocument()
    expect(screen.getByText('End of the list')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Older/ })).not.toBeInTheDocument()
  })
})
