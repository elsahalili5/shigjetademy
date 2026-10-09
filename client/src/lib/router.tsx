import { useEffect, useSyncExternalStore } from 'react'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'

// A small history-API router: each nav item is its own address, no extra dependency.

const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  window.addEventListener('popstate', fn)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('popstate', fn)
  }
}

const getPath = () => window.location.pathname.replace(/\/+$/, '') || '/'

export function usePath() {
  return useSyncExternalStore(subscribe, getPath, () => '/')
}

export function navigate(to: string) {
  const url = new URL(to, window.location.href)
  const samePage = (url.pathname.replace(/\/+$/, '') || '/') === getPath()

  if (samePage && url.hash) {
    document.querySelector(url.hash)?.scrollIntoView()
    window.history.pushState(null, '', url)
    return
  }

  window.history.pushState(null, '', url)
  listeners.forEach((fn) => fn())

  // New page: start at the top, or at its anchor once the page has rendered
  requestAnimationFrame(() => {
    const target = url.hash ? document.querySelector(url.hash) : null
    if (target) target.scrollIntoView()
    else window.scrollTo({ top: 0, behavior: 'instant' })
  })
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

/** An anchor that changes page without a reload; modifier-clicks still open new tabs. */
export function Link({ href, onClick, ...rest }: LinkProps) {
  const path = usePath()
  const isPage = href.startsWith('/')
  const current = isPage && (href.replace(/#.*$/, '') || '/') === path

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || !isPage) return
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(href)
  }

  return <a href={href} aria-current={current && !href.includes('#') ? 'page' : undefined} onClick={handle} {...rest} />
}

/** Keeps the tab title in step with the page. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
