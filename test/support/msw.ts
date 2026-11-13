import { setupServer } from 'msw/node'

/**
 * One MSW server per integration file. Unhandled requests fail the test: a request the test did not
 * describe is a bug (or a forgotten handler), never something to let through to the network.
 */
export function setupMswServer() {
  const server = setupServer()
  beforeAll(() => {
    server.listen({ onUnhandledFrame: 'error' })
  })
  afterEach(() => {
    server.resetHandlers()
  })
  afterAll(() => {
    server.close()
  })
  return server
}
