import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useReveal } from '#/hooks/useReveal'
import { Footer } from './Footer'
import { Nav } from './Nav'

interface SiteLayoutProps {
  children: ReactNode
}

/** The marketing site's frame: nav, the page, footer. */
export function SiteLayout({ children }: SiteLayoutProps) {
  const pathname = useLocation({ select: (location) => location.pathname })
  useReveal(pathname)

  return (
    <>
      <Nav />
      {/* Keyed by path so each page mounts fresh and its reveal animations run again */}
      <main key={pathname}>{children}</main>
      <Footer />
    </>
  )
}
