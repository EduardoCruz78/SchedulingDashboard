import type { Appointment, Delivery } from '@/lib/api/types'
import { appointmentsOn, countByStatus, dailyStatusSeries, deliveryHealth, noShowRate } from '@/lib/overview'
import { anAppointment, aDelivery } from '@test/support/builders'

const SP = 'America/Sao_Paulo'

describe('overview calculations', () => {
  const appointments: Appointment[] = [
    anAppointment({ startsAt: '2026-11-13T13:00:00Z', status: 'Completed' }),
    anAppointment({ startsAt: '2026-11-13T14:00:00Z', status: 'NoShow' }),
    anAppointment({ startsAt: '2026-11-13T15:00:00Z', status: 'Cancelled' }),
    anAppointment({ startsAt: '2026-11-13T16:00:00Z', status: 'Scheduled' }),
    // 01:30 UTC on the 14th is still the 13th in São Paulo (22:30).
    anAppointment({ startsAt: '2026-11-14T01:30:00Z', status: 'Scheduled' }),
    anAppointment({ startsAt: '2026-11-15T13:00:00Z', status: 'Scheduled' }),
  ]

  it('counts by status', () => {
    expect(countByStatus(appointments)).toEqual({ Scheduled: 3, Cancelled: 1, Completed: 1, NoShow: 1 })
  })

  it('computes the no-show rate over appointments that happened, ignoring cancellations', () => {
    expect(noShowRate({ Scheduled: 9, Cancelled: 5, Completed: 3, NoShow: 1 })).toBe(0.25)
    expect(noShowRate({ Scheduled: 2, Cancelled: 1, Completed: 0, NoShow: 0 })).toBeNull()
  })

  it('groups by the local day in the business zone', () => {
    expect(appointmentsOn(appointments, '2026-11-13', SP)).toHaveLength(5)
  })

  it('builds a dense daily series, including empty days', () => {
    const series = dailyStatusSeries(appointments, '2026-11-13', 3, SP)
    expect(series.map((r) => r.date)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15'])
    expect(series[0]).toMatchObject({ Scheduled: 2, Completed: 1, NoShow: 1, Cancelled: 1 })
    expect(series[1]).toMatchObject({ Scheduled: 0, Completed: 0, NoShow: 0, Cancelled: 0 })
    expect(series[2]).toMatchObject({ Scheduled: 1 })
  })

  it('summarizes delivery health; retries in flight do not count against the success rate', () => {
    const deliveries: Delivery[] = [
      aDelivery({ status: 'succeeded' }),
      aDelivery({ status: 'succeeded' }),
      aDelivery({ status: 'succeeded' }),
      aDelivery({ status: 'dead' }),
      aDelivery({ status: 'failed' }),
    ]
    expect(deliveryHealth(deliveries)).toEqual({
      total: 5,
      byStatus: { pending: 0, failed: 1, succeeded: 3, dead: 1 },
      successRate: 0.75,
    })
    expect(deliveryHealth([]).successRate).toBeNull()
  })
})
