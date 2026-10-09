import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Link, useTitle } from '../lib/router'
import { MODULES, moduleBySlug } from '../lib/modules'
import type { Module } from '../lib/modules'

// Each module takes a tone from the palette, cycling in sidebar order
const TONES = [
  { fill: 'var(--green)', ink: 'var(--green-deep)', wash: 'var(--green-wash)' },
  { fill: 'var(--kraft)', ink: 'var(--kraft-ink)', wash: 'var(--kraft-wash)' },
  { fill: 'var(--coral)', ink: 'var(--coral-deep)', wash: 'var(--coral-wash)' },
]
const tone = (n: number) => {
  const t = TONES[n % TONES.length]
  return { '--tone': t.fill, '--tone-ink': t.ink, '--tone-wash': t.wash } as CSSProperties
}

export function PlatformPage() {
  useTitle('Platform · Shigjetademy')
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent) => {
    const step =
      e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (active + step + MODULES.length) % MODULES.length
    setActive(next)
    tabs.current[next]?.focus()
  }

  const mod = MODULES[active]

  return (
    <>
      <PageHeader
        id="platform-page-title"
        title={
          <>
            One platform for the <em>whole term.</em>
          </>
        }
        intro="Enrolment, timetables, attendance, fees, grades and messages share the same students and the same classes, so every step feeds the next."
      />

      <section className="section shell pb-[clamp(96px,13vw,160px)]" aria-labelledby="modules-title">
        <div className="section-head" data-reveal>
          <h2 id="modules-title">Every module in the dashboard.</h2>
          <p>
            This is the sidebar your team will work from. Pick a module to see what it does, or open its page for the
            full picture.
          </p>
        </div>

        <div
          className="grid grid-cols-[minmax(240px,300px)_minmax(0,1fr)] rounded-panel bg-navy p-(--frame) shadow-card max-[860px]:grid-cols-1"
          data-reveal
        >
          <div
            className="flex flex-col gap-0.5 py-5 pr-3 pl-2 max-[860px]:flex-row max-[860px]:gap-1.5 max-[860px]:overflow-x-auto max-[860px]:px-1 max-[860px]:pt-1.5 max-[860px]:pb-3.5 max-[860px]:[scrollbar-width:none] max-[860px]:[&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Dashboard modules"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
          >
            <span
              className="px-3.5 pb-3.5 font-data text-[0.72rem] tracking-[0.06em] text-on-navy-2 uppercase max-[860px]:hidden"
              aria-hidden="true"
            >
              Dashboard
            </span>
            {MODULES.map((m, n) => {
              const Icon = m.icon
              return (
                <button
                  key={m.slug}
                  ref={(el) => {
                    tabs.current[n] = el
                  }}
                  type="button"
                  role="tab"
                  id={`mod-tab-${m.slug}`}
                  aria-selected={n === active}
                  aria-controls="mod-panel"
                  tabIndex={n === active ? 0 : -1}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-[11px] text-left font-[550] text-on-navy-2 transition-colors duration-[180ms] ease-out hover:text-white focus-visible:outline-(--tone) focus-visible:-outline-offset-2 aria-selected:bg-navy-2 aria-selected:text-white max-[860px]:w-auto max-[860px]:flex-none max-[860px]:whitespace-nowrap [&_svg]:flex-none [&_svg]:transition-colors aria-selected:[&_svg]:text-(--tone)"
                  style={tone(n)}
                  onClick={() => setActive(n)}
                >
                  <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                  {m.name}
                </button>
              )
            })}
          </div>

          <div
            id="mod-panel"
            role="tabpanel"
            aria-labelledby={`mod-tab-${mod.slug}`}
            className="min-h-[560px] overflow-hidden rounded-[calc(var(--panel-radius)-var(--frame))] bg-white max-[860px]:min-h-0"
            style={tone(active)}
          >
            <ModulePreview key={mod.slug} mod={mod} />
          </div>
        </div>
      </section>
    </>
  )
}

function ModulePreview({ mod }: { mod: Module }) {
  const Icon = mod.icon
  const related = mod.related.map(moduleBySlug).filter((m): m is Module => !!m)

  return (
    <div className="flex h-full flex-col gap-[clamp(28px,4vw,44px)] bg-linear-to-b from-(--tone-wash) to-white to-46% p-[clamp(28px,4.5vw,56px)] motion-safe:animate-preview-in">
      <div className="flex items-start gap-[22px] max-[860px]:flex-col max-[860px]:gap-4">
        <span
          className="grid size-[68px] flex-none place-items-center rounded-[18px] bg-white text-(--tone-ink) shadow-[0_1px_2px_rgba(22,34,46,0.06),0_10px_24px_-12px_rgba(22,34,46,0.3)]"
          aria-hidden="true"
        >
          <Icon size={30} strokeWidth={1.6} />
        </span>
        <div>
          <h3 className="font-display text-[clamp(1.8rem,3.4vw,2.8rem)] leading-[1.05] font-[680] tracking-[-0.03em] text-balance">
            {mod.name}
          </h3>
          <p className="mt-2.5 max-w-[46ch] text-[1.15rem] text-ink-2">{mod.tagline}</p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-[clamp(28px,4vw,56px)] max-[860px]:grid-cols-1">
        <ul>
          {mod.does.map((d) => (
            <li key={d} className="flex gap-3 border-t border-rule py-[13px]">
              <Check className="mt-1 flex-none text-(--tone-ink)" size={15} strokeWidth={2.6} aria-hidden="true" />
              {d}
            </li>
          ))}
        </ul>

        <div>
          <p className="mb-2.5 text-[0.85rem] font-[650] text-ink-3">Used by</p>
          <ul className="flex flex-wrap gap-2">
            {mod.who.map((w) => (
              <li key={w.role} className="rounded-full bg-(--tone-wash) px-3 py-1.5 text-[0.9rem] font-semibold text-(--tone-ink)">
                {w.role}
              </li>
            ))}
          </ul>

          {related.length > 0 && (
            <>
              <p className="mt-6 mb-2.5 text-[0.85rem] font-[650] text-ink-3">Works with</p>
              <p className="text-ink-2">
                {related.map((r, n) => (
                  <span key={r.slug}>
                    {n > 0 && ', '}
                    <Link
                      href={`/platform/${r.slug}`}
                      className="font-semibold text-ink decoration-(--tone) underline-offset-[3px]"
                    >
                      {r.name}
                    </Link>
                  </span>
                ))}
              </p>
            </>
          )}
        </div>
      </div>

      <Link className="button button--primary self-start" href={`/platform/${mod.slug}`}>
        Open {mod.name}
        <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
      </Link>
    </div>
  )
}
