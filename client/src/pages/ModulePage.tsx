import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ClosingCta } from '../components/ClosingCta'
import { Link, useTitle } from '../lib/router'
import { MODULES, moduleBySlug } from '../lib/modules'
import type { Module } from '../lib/modules'
import { NotFound } from './NotFound'

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
        <Link className="inline-flex items-center gap-2 font-semibold text-on-navy no-underline hover:underline" href="/platform">
          <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          All modules
        </Link>
      </PageHeader>

      <section className="section shell pb-[clamp(80px,10vw,128px)] [&_h2]:mb-5 [&_h2]:text-[clamp(1.4rem,2.2vw,1.8rem)] [&_h2]:font-[650] [&_h2]:tracking-[-0.02em]" aria-labelledby="module-does">
        <div className="mb-[clamp(40px,6vw,72px)] flex items-center gap-5 max-[760px]:flex-col max-[760px]:items-start" data-reveal>
          <span className="grid size-16 flex-none place-items-center rounded-[18px] bg-green-wash text-green-deep" aria-hidden="true">
            <Icon size={28} strokeWidth={1.75} />
          </span>
          <p className="max-w-[28ch] font-display text-[clamp(1.5rem,3vw,2.4rem)] font-semibold tracking-[-0.025em]">
            {mod.tagline}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-[clamp(32px,5vw,80px)] max-[760px]:grid-cols-1">
          <div data-reveal>
            <h2 id="module-does">What you can do</h2>
            <ul className="[&_li]:flex [&_li]:gap-3 [&_li]:border-t [&_li]:border-rule [&_li]:py-3.5 [&_svg]:mt-1 [&_svg]:flex-none [&_svg]:text-green-deep">
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
            <dl className="[&_div]:border-t [&_div]:border-rule [&_div]:py-3.5 [&_dt]:font-[650] [&_dd]:mt-1 [&_dd]:text-ink-2">
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
          <div className="mt-[clamp(56px,8vw,96px)]" data-reveal>
            <h2>Works with</h2>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {related.map((m) => (
                <li key={m.slug}>
                  <ModuleCard mod={m} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          className="group mt-[clamp(56px,8vw,96px)] flex flex-col gap-1.5 border-t border-rule-strong pt-7 text-ink no-underline"
          href={`/platform/${next.slug}`}
          data-reveal
        >
          <span className="text-ink-3">Next module</span>
          <strong className="inline-flex items-center gap-3 font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-[650] tracking-[-0.03em]">
            {next.name}
            <ArrowRight className="transition-transform duration-200 ease-out group-hover:translate-x-1" size={20} strokeWidth={2.2} aria-hidden="true" />
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
    <Link
      className="flex h-full flex-col gap-2.5 rounded-card border border-rule bg-white p-6 text-ink no-underline transition-[border-color,box-shadow,translate] duration-200 ease-out hover:-translate-y-0.5 hover:border-rule-strong hover:shadow-card focus-visible:outline-green-deep"
      href={`/platform/${mod.slug}`}
    >
      <span className="mb-1.5 grid size-11 place-items-center rounded-xl bg-green-wash text-green-deep" aria-hidden="true">
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <strong className="font-display text-[1.2rem] font-[650] tracking-[-0.015em]">{mod.name}</strong>
      <span className="flex-1 text-ink-2">{mod.tagline}</span>
    </Link>
  )
}
