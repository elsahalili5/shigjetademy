import { useEffect } from 'react'

/** Marks the page as motion-capable and reveals [data-reveal] elements once as they enter.
    Pass the current path so a new page's sections are observed too. */
export function useReveal(key?: string) {
  useEffect(() => {
    const root = document.documentElement
    if (!('IntersectionObserver' in window)) return
    root.classList.add('motion')

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-inview', '')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )
    const observe = () =>
      document.querySelectorAll('[data-reveal]:not([data-inview])').forEach((el) => io.observe(el))
    observe()

    // Sections that mount later (lazy content, hot reloads) would otherwise stay hidden
    const mo = new MutationObserver(observe)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [key])
}
