import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Scroll-driven horizontal track. The section grows by the track's overflow and its inner frame
 * sticks while vertical scroll slides the track sideways. Returns whether pinning is on
 * (off for reduced motion, where the track stays a native horizontal scroller).
 * onFrame runs inside the same animation frame as the movement, with progress 0–1.
 */
export function usePinnedTrack(
  section: RefObject<HTMLElement | null>,
  track: RefObject<HTMLElement | null>,
  onFrame?: (progress: number) => void,
) {
  const [pinned, setPinned] = useState(false)
  // Latest callback without re-binding the scroll listener on every render
  const callback = useRef(onFrame)
  useEffect(() => {
    callback.current = onFrame
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const update = () => setPinned(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const el = section.current
    const row = track.current
    if (!pinned || !el || !row) return

    let distance = 0
    let frame = 0

    const apply = () => {
      frame = 0
      const runway = el.offsetHeight - window.innerHeight
      const progress = runway > 0 ? clamp(-el.getBoundingClientRect().top / runway, 0, 1) : 0
      row.style.transform = `translate3d(${-progress * distance}px, 0, 0)`
      callback.current?.(progress)
    }

    const measure = () => {
      distance = Math.max(0, row.scrollWidth - window.innerWidth)
      el.style.setProperty('--track-distance', `${distance}px`)
      apply()
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      row.style.transform = ''
      el.style.removeProperty('--track-distance')
    }
  }, [pinned, section, track])

  return pinned
}
