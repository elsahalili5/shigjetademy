import { PageHeader } from '../components/PageHeader'
import { Link, useTitle } from '../lib/router'
import './Legal.css'

type Kind = 'privacy' | 'terms' | 'security'

const COPY: Record<Kind, { title: string; heading: string; intro: string }> = {
  privacy: {
    title: 'Privacy Policy',
    heading: 'Privacy Policy',
    intro: 'How Shigjetademy collects, uses and protects personal information.',
  },
  terms: {
    title: 'Terms of Service',
    heading: 'Terms of Service',
    intro: 'The terms that apply when you use Shigjetademy.',
  },
  security: {
    title: 'Security',
    heading: 'Security',
    intro: 'How Shigjetademy keeps your organization’s data safe.',
  },
}

/**
 * Placeholder for legal documents. The real text must come from the business (ideally reviewed
 * by a lawyer); until then the page says so plainly rather than showing invented terms.
 */
export function LegalPage({ kind }: { kind: Kind }) {
  const c = COPY[kind]
  useTitle(`${c.title} · Shigjetademy`)
  return (
    <>
      <PageHeader id={`${kind}-title`} title={c.heading} intro={c.intro} />
      <section className="section container legal">
        <div className="legal__body">
          <p>
            Our full {c.title.toLowerCase()} is being finalised and will be published here before Shigjetademy opens to
            organizations.
          </p>
          <p>
            If you have a question in the meantime, <Link href="/contact">contact us</Link> and we’ll answer it
            directly.
          </p>
        </div>
      </section>
    </>
  )
}
