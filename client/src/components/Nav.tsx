import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import mark from '../assets/brand/shigjetademy-mark.png'
import './Nav.css'

const LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#workflow', label: 'How it works' },
  { href: '#roles', label: 'Who it’s for' },
  { href: '#faq', label: 'FAQ' },
]

export function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="nav" data-scrolled={scrolled} data-open={open}>
      <div className="nav__bar">
        <a className="nav__brand" href="#top" aria-label="Shigjetademy home">
          <img src={mark} alt="" width={34} height={31} />
          <span>Shigjetademy</span>
        </a>

        <nav className="nav__links" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <a className="button button--primary nav__cta" href="#demo">
          Book a demo
        </a>

        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
        </button>
      </div>

      <div id="mobile-menu" className="nav__sheet" hidden={!open}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a className="button button--primary" href="#demo" onClick={() => setOpen(false)}>
          Book a demo
        </a>
      </div>
    </header>
  )
}
