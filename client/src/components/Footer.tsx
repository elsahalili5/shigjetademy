import { Mail, MapPin, Phone } from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'
import { Link } from '../lib/router'
import { SITE } from '../lib/site'
import { SocialLinks } from './SocialLinks'

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
    <footer className="mx-auto max-w-(--max) px-(--gutter) pt-16 pb-9">
      <div className="grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] gap-x-[clamp(24px,4vw,64px)] gap-y-10 max-[900px]:grid-cols-3 max-[520px]:grid-cols-2">
        <div className="max-[900px]:col-span-full">
          <img className="block h-11 w-auto" src={wordmark} alt="Shigjetademy" width={192} height={48} />
          <p className="mt-4 max-w-[32ch] text-[0.92rem] text-ink-2">Education management for schools, academies, training centres and educators.</p>

          <div className="mt-[22px] grid justify-items-start gap-2.5 [&_:is(a,span)]:inline-flex [&_:is(a,span)]:items-center [&_:is(a,span)]:gap-2 [&_:is(a,span)]:text-[0.92rem] [&_:is(a,span)]:font-[550] [&_:is(a,span)]:text-ink [&_:is(a,span)]:no-underline [&_a:hover]:underline [&_svg]:text-green-deep">
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
          <nav key={col.title} aria-label={col.title}>
            <p className="text-[0.8rem] font-bold text-ink">{col.title}</p>
            <ul className="mt-3.5 grid gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[0.92rem] text-ink-2 no-underline transition-colors duration-150 hover:text-ink hover:underline aria-[current=page]:text-green-deep"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
        <p className="text-[0.82rem] text-ink-3">© {YEAR} Shigjetademy. All rights reserved.</p>
        <SocialLinks />
      </div>
    </footer>
  )
}
