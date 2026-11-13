/** Fake endpoints and throwaway secrets used by integration tests. MSW intercepts these hosts. */
export const SCHEDULING_API = 'http://scheduling.test'
export const WEBHOOK_RELAY = 'http://relay.test'
export const RELAY_ADMIN_KEY = 'test-admin-key-0123456789abcdefghij'
// Standard Webhooks secret: whsec_ + base64 of the signing key.
export const WEBHOOK_SECRET = 'whsec_dGVzdC1vbmx5LXdlYmhvb2stc2VjcmV0LTEyMzQ1Njc4OTA='

export const testEnv = {
  SCHEDULING_API_URL: SCHEDULING_API,
  WEBHOOK_RELAY_URL: WEBHOOK_RELAY,
  WEBHOOK_RELAY_ADMIN_KEY: RELAY_ADMIN_KEY,
  SESSION_SECRET: 'test-session-secret-0123456789abcdefghij',
  DATABASE_URL: 'postgres://placeholder:placeholder@localhost:1/placeholder',
  WEBHOOK_SECRET,
  DEMO_MODE: 'false',
  BUSINESS_TIME_ZONE: 'America/Sao_Paulo',
  UPSTREAM_TIMEOUT_MS: '1000',
} satisfies Record<string, string>
