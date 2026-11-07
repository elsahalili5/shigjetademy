import { useState } from 'react'

/** The moment the page opened, read once, so rendering stays pure */
export function useNow() {
  const [now] = useState(() => new Date())
  return now
}
