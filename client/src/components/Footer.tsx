import { Mail, MapPin, Phone } from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'
import { Link } from '../lib/router'
import { SITE } from '../lib/site'
import { SocialLinks } from './SocialLinks'
import './Footer.css'

const YEAR = new Date().getFullYear()

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/platform', label: 'Platform' },
      { href: '/solutions', label: 'Solutions' },
      { href: '/features', label: 'Features' },
      { href: '/resources', label: 'Resources' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/contact', label: 'Book a demo' },
      { href: '/login', label: 'Log in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/security', label: 'Security' },
    ],
  },
]

export function Footer() {
  const contact = [
    SITE.email && { icon: Mail, label: SITE.email, href: `mailto:${SITE.email}` },
    SITE.phone && { icon: Phone, label: SITE.phone, href: `tel:${SITE.phone.replace(/\s+/g, '')}` },
    SITE.address && { icon: MapPin, label: SITE.address, href: null },
  ].filter(Boolean) as { icon: typeof Mail; label: string; href: string | null }[]

  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__brand">
          <img className="footer__wordmark" src={wordmark} alt="Shigjetademy" width={192} height={48} />
          <p>Education management for schools, academies, training centres and educators.</p>

          <div className="footer__contact">
            {contact.length ? (
              contact.map(({ icon: Icon, label, href }) =>
                href ? (
                  <a key={label} href={href}>
                    <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                    {label}
                  </a>
                ) : (
                  <span key={label}>
                    <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                    {label}
                  </span>
                ),
              )
            ) : (
              <Link href="/contact">
                <Mail size={16} strokeWidth={1.9} aria-hidden="true" />
                Get in touch
              </Link>
            )}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} className="footer__col" aria-label={col.title}>
            <p>{col.title}</p>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="footer__bottom">
        <p className="footer__legal">© {YEAR} Shigjetademy. All rights reserved.</p>
        <SocialLinks />
      </div>
    </footer>
  )
}
