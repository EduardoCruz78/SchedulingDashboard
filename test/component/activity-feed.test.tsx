import { act, render, screen } from '@testing-library/react'
import { ActivityFeed, POLL_INTERVAL_MS } from '@/app/(dashboard)/activity/activity-feed'
import type { ActivityItem } from '@/lib/data/activity'

const item = (id: string, type = 'appointment.created'): ActivityItem => ({
  webhookId: id,
  eventType: type,
  occurredAt: '2026-11-13T13:00:00.000Z',
  signedAt: '2026-11-13T13:00:01.000Z',
  receivedAt: '2026-11-13T13:00:02.000Z',
  payload: { id, type },
})

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('ActivityFeed', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const respond = (items: ActivityItem[]) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ items }), { status: 200 }))
  }

  it('shows the initial items in the business time zone with the verified badge', () => {
    render(<ActivityFeed initial={[item('a')]} timeZone="America/Sao_Paulo" />)
    expect(screen.getByText('appointment.created')).toBeInTheDocument()
    expect(screen.getByText('Signature verified')).toBeInTheDocument()
    expect(screen.getByText('Received Nov 13, 10:00:02')).toBeInTheDocument()
  })

  it('polls, adds new events on top and announces them', async () => {
    render(<ActivityFeed initial={[item('a')]} timeZone="UTC" />)
    respond([item('b', 'appointment.cancelled'), item('a')])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/activity', { cache: 'no-store' })
    const entries = screen.getAllByRole('listitem')
    expect(entries).toHaveLength(2)
    expect(entries[0]).toHaveTextContent('appointment.cancelled')
    expect(screen.getByText('1 new event received')).toBeInTheDocument()
  })

  it('does not poll while the tab is hidden, and catches up when it is visible again', async () => {
    render(<ActivityFeed initial={[]} timeZone="UTC" />)
    setVisibility('hidden')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText('Paused while this tab is hidden')).toBeInTheDocument()

    respond([item('c')])
    await act(async () => {
      setVisibility('visible')
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('explains how events arrive when there are none yet', () => {
    render(<ActivityFeed initial={[]} timeZone="UTC" />)
    expect(screen.getByText(/No webhooks yet/)).toBeInTheDocument()
  })
})
