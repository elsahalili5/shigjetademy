import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ClosingCta } from '../components/ClosingCta'
import { Link, useTitle } from '../lib/router'
import { MODULES, moduleBySlug } from '../lib/modules'
import type { Module } from '../lib/modules'
import { NotFound } from './NotFound'
import './Platform.css'

export function ModulePage({ slug }: { slug: string }) {
  const mod = moduleBySlug(slug)
  if (!mod) return <NotFound />
  return <ModuleDetail mod={mod} />
}

function ModuleDetail({ mod }: { mod: Module }) {
  useTitle(`${mod.name} · Shigjetademy`)
  const Icon = mod.icon
  const index = MODULES.indexOf(mod)
  const next = MODULES[(index + 1) % MODULES.length]
  const related = mod.related.map(moduleBySlug).filter((m): m is Module => !!m)

  return (
    <>
      <PageHeader id="module-title" title={mod.name} intro={mod.intro}>
        <Link className="module-back" href="/platform">
          <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          All modules
        </Link>
      </PageHeader>

      <section className="section container module" aria-labelledby="module-does">
        <div className="module__lead" data-reveal>
          <span className="module__icon" aria-hidden="true">
            <Icon size={28} strokeWidth={1.75} />
          </span>
          <p>{mod.tagline}</p>
        </div>

        <div className="module__grid">
          <div data-reveal>
            <h2 id="module-does">What you can do</h2>
            <ul className="module__does">
              {mod.does.map((d) => (
                <li key={d}>
                  <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal>
            <h2>Who uses it</h2>
            <dl className="module__who">
              {mod.who.map((w) => (
                <div key={w.role}>
                  <dt>{w.role}</dt>
                  <dd>{w.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {related.length > 0 && (
          <div className="module__related" data-reveal>
            <h2>Works with</h2>
            <ul className="modules-grid modules-grid--compact">
              {related.map((m) => (
                <li key={m.slug}>
                  <ModuleCard mod={m} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link className="module__next" href={`/platform/${next.slug}`} data-reveal>
          <span>Next module</span>
          <strong>
            {next.name}
            <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
          </strong>
        </Link>
      </section>

      <ClosingCta />
    </>
  )
}

export function ModuleCard({ mod }: { mod: Module }) {
  const Icon = mod.icon
  return (
    <Link className="module-card" href={`/platform/${mod.slug}`}>
      <span className="module-card__icon" aria-hidden="true">
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <strong>{mod.name}</strong>
      <span className="module-card__text">{mod.tagline}</span>
      <span className="module-card__more">
        Explore
        <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
      </span>
    </Link>
  )
}
