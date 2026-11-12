import { useSyncExternalStore } from 'react'

/** Whether the viewport matches a CSS media query right now, and again whenever that changes */
export function useMediaQuery(query: string) {
  const subscribe = (onChange: () => void) => {
    const list = window.matchMedia(query)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
