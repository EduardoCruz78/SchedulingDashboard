import { randomUUID } from 'node:crypto'
import type { Appointment, Delivery, Professional, Service } from '@/lib/api/types'

/** Test data builders: valid defaults, override only what the test is about. */

export function anAppointment(overrides: Partial<Appointment> = {}): Appointment {
  const startsAt = overrides.startsAt ?? '2026-11-13T13:00:00Z'
  return {
    id: randomUUID(),
    customerId: 'c0ffee00-0000-7000-8000-000000000001',
    professionalId: 'pro-1',
    serviceId: 'svc-1',
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString(),
    localStartsAt: startsAt,
    priceAtBooking: 50,
    status: 'Scheduled',
    cancelledAt: null,
    cancellationReason: null,
    createdAt: '2026-11-12T12:00:00Z',
    ...overrides,
  }
}

export function aService(overrides: Partial<Service> = {}): Service {
  return {
    id: randomUUID(),
    name: 'Haircut',
    description: 'Classic cut.',
    durationMinutes: 30,
    price: 50,
    isActive: true,
    ...overrides,
  }
}

export function aProfessional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: randomUUID(),
    name: 'Ana Costa',
    isActive: true,
    serviceIds: [],
    workingHours: [],
    timeOffs: null,
    ...overrides,
  }
}

export function aDelivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: randomUUID(),
    eventId: randomUUID(),
    subscriptionId: randomUUID(),
    status: 'succeeded',
    attempts: 1,
    nextAttemptAt: null,
    lastError: null,
    createdAt: '2026-11-13T12:00:00.000Z',
    updatedAt: '2026-11-13T12:00:01.000Z',
    ...overrides,
  }
}
