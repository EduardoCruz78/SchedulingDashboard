import { canManageSubscriptions, canReplay } from '@/lib/demo'

const own = '11111111-1111-7111-8111-111111111111'
const other = '22222222-2222-7222-8222-222222222222'

describe('demo mode rules', () => {
  it('replays any dead delivery outside demo mode', () => {
    expect(
      canReplay({ demoMode: false, ownSubscriptionId: undefined }, { status: 'dead', subscriptionId: other }),
    ).toEqual({
      allowed: true,
    })
  })

  it('only replays dead deliveries', () => {
    expect(
      canReplay(
        { demoMode: false, ownSubscriptionId: undefined },
        { status: 'failed', subscriptionId: other },
      ),
    ).toMatchObject({
      allowed: false,
    })
  })

  it("in demo mode, replays only the dashboard's own subscription", () => {
    const policy = { demoMode: true, ownSubscriptionId: own }
    expect(canReplay(policy, { status: 'dead', subscriptionId: own }).allowed).toBe(true)
    const refused = canReplay(policy, { status: 'dead', subscriptionId: other })
    expect(refused.allowed).toBe(false)
    expect(!refused.allowed && refused.reason).toMatch(/Public demo/)
  })

  it('in demo mode without a known own subscription, replays nothing', () => {
    expect(
      canReplay({ demoMode: true, ownSubscriptionId: undefined }, { status: 'dead', subscriptionId: own })
        .allowed,
    ).toBe(false)
  })

  it('makes subscriptions read-only in demo mode', () => {
    expect(canManageSubscriptions({ demoMode: true, ownSubscriptionId: own }).allowed).toBe(false)
    expect(canManageSubscriptions({ demoMode: false, ownSubscriptionId: undefined }).allowed).toBe(true)
  })
})
