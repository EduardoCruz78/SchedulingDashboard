import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom has no layout engine; Radix primitives (checkbox, select) only need these to exist.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// The types say these always exist; in jsdom they do not, hence the plain `in` checks.
if (!('ResizeObserver' in globalThis)) Object.assign(globalThis, { ResizeObserver: ResizeObserverStub })
if (!('hasPointerCapture' in Element.prototype))
  Object.assign(Element.prototype, { hasPointerCapture: () => false })
if (!('scrollIntoView' in Element.prototype))
  Object.assign(Element.prototype, { scrollIntoView: () => undefined })
