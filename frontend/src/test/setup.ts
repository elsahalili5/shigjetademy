import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'react-hot-toast'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './server'

// jsdom has no scrolling; the router's scroll restoration calls it
window.scrollTo = vi.fn()
// jsdom has no media queries; the toaster asks for prefers-reduced-motion
window.matchMedia = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
}))

// jsdom has no modal dialogs; opening sets `open`, which is what the page relies on
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.open = false
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  toast.remove()
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())
