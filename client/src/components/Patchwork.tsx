import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'

const PAIRS = [
  { topic: 'Enrolment', before: 'Enrolments kept in a spreadsheet', after: 'One record per student, from enquiry to report' },
  { topic: 'Attendance', before: 'Registers on paper, typed up later', after: 'Registers tied to the timetable, taken in class' },
  { topic: 'Fees', before: 'Fees tracked from bank statements', after: 'Invoices tied to each enrolment, status at a glance' },
  { topic: 'Reports', before: 'Reports written from scratch each term', after: 'Reports built from grades already recorded' },
  { topic: 'Messages', before: 'Parents reached through group chats', after: 'Messages sent from the same place as everything else' },
]

const pair =
  'group/pair relative flex min-h-[clamp(320px,42vh,380px)] w-[clamp(280px,28vw,380px)] flex-none snap-start flex-col rounded-[22px] bg-haze p-[clamp(22px,2.4vw,30px)] text-ink transition-[background-color,color,translate,box-shadow] duration-(--dur) ease-out [--dur:560ms] data-active:bg-navy data-active:bg-[radial-gradient(90%_60%_at_100%_100%,rgba(31,176,139,0.18),transparent_70%)] data-active:text-white data-active:shadow-[0_30px_60px_-34px_rgba(10,22,34,0.7)] data-passed:bg-white data-passed:shadow-[inset_0_0_0_1px_var(--rule)] motion-reduce:duration-1 max-[640px]:h-[min(52svh,380px)] max-[640px]:min-h-0 max-[640px]:w-[min(82vw,320px)]'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Scroll-driven horizontal slider. The section is as tall as the track is wide;
 * its inner frame sticks to the viewport while vertical scroll moves the cards sideways.
 * Reduced motion (or no JS) gets a plain horizontal scroller instead.
 */
export function Patchwork() {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const update = () => setPinned(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const el = section.current
    const row = track.current
    if (!pinned || !el || !row) return

    let distance = 0
    let frame = 0
    let last = -1

    const measure = () => {
      distance = Math.max(0, row.scrollWidth - window.innerWidth)
      el.style.setProperty('--slider-distance', `${distance}px`)
      apply()
    }

    const apply = () => {
      frame = 0
      // Measured against the section's real scroll length, so the end always reads 100%
      const runway = el.offsetHeight - window.innerHeight
      const progress = runway > 0 ? clamp(-el.getBoundingClientRect().top / runway, 0, 1) : 0
      const x = progress * distance
      row.style.transform = `translate3d(${-x}px, 0, 0)`
      bar.current?.style.setProperty('transform', `scaleX(${progress})`)

      // The card in focus is the one nearest the left margin; the last pair is reached at the end.
      // Written straight to the DOM in the same frame as the movement: no re-render per scroll step.
      const cards = row.querySelectorAll<HTMLElement>('[data-pair]')
      const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 1
      const next = Math.min(PAIRS.length - 1, Math.max(0, Math.round((progress * distance) / step)))
      if (next !== last) {
        last = next
        row.querySelectorAll<HTMLElement>('[data-pair]').forEach((card, n) => {
          card.toggleAttribute('data-active', n === next)
          card.toggleAttribute('data-passed', n < next)
        })
        if (count.current) count.current.textContent = `${next + 1} / ${PAIRS.length}`
      }
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      row.style.transform = ''
      el.style.removeProperty('--slider-distance')
    }
  }, [pinned])

  return (
    <section
      ref={section}
      // Default (reduced motion / no JS): a native horizontal scroller with snap.
      // Pinned: the section grows by the track's overflow and its frame sticks while cards travel.
      className="group/slider band-white relative py-[clamp(96px,13vw,160px)] data-pinned:h-[calc(100svh+var(--slider-distance,0px))] data-pinned:py-0"
      data-pinned={pinned || undefined}
      aria-labelledby="patchwork-title"
    >
      <div className="flex flex-col justify-center gap-[clamp(28px,4vh,48px)] group-data-pinned/slider:sticky group-data-pinned/slider:top-0 group-data-pinned/slider:h-svh group-data-pinned/slider:overflow-hidden group-data-pinned/slider:pt-[72px] max-[640px]:group-data-pinned/slider:gap-5 max-[640px]:group-data-pinned/slider:pt-16">
        <div className="shell grid w-full grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end gap-[clamp(20px,4vw,64px)] max-[900px]:grid-cols-1">
          <h2 id="patchwork-title" className="text-[clamp(2rem,3.8vw,3.4rem)] font-[680] tracking-[-0.032em] max-[640px]:text-[1.9rem]">Replace the patchwork your term runs on.</h2>
          <div>
            <p className="max-w-[48ch] text-ink-2 max-[640px]:text-[0.95rem]">
              Most teaching organizations run on five tools that don’t talk to each other. Shigjetademy puts the same
              work in one place, so each step feeds the next.
            </p>
            {pinned && (
              <div className="mt-5 flex items-center gap-3.5" aria-hidden="true">
                <span ref={count} className="tabular min-w-[3.4em] font-data text-[0.74rem] text-ink-2">
                  1 / {PAIRS.length}
                </span>
                <span className="h-[3px] max-w-[280px] flex-1 overflow-hidden rounded-full bg-mist-deep">
                  <span ref={bar} className="block h-full origin-left scale-x-0 bg-ink" />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Track: starts on the container's left edge, runs off the right */}
        <div
          ref={track}
          className="flex snap-x snap-mandatory scroll-px-(--inset) gap-[clamp(16px,2vw,24px)] overflow-x-auto px-(--inset) [--inset:max(var(--gutter),calc((100vw-var(--max))/2+var(--gutter)))] [scrollbar-width:none] group-data-pinned/slider:w-max group-data-pinned/slider:overflow-visible group-data-pinned/slider:will-change-transform [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {PAIRS.map((p, n) => (
            <article
              key={p.topic}
              role="listitem"
              // Waiting: a light card showing only the old way. In focus: the card turns navy, the old way
              // shrinks into a struck caption and the new way rises in. Passed: keeps its answer, quietly.
              className={pair}
              data-pair
              data-active={(pinned && n === 0) || undefined}
              data-passed={!pinned || undefined}
              style={{ '--i': n } as CSSProperties}
              aria-label={p.topic}
            >
              <span className="inline-flex items-center gap-2.5 text-[0.8rem] font-[650] text-ink-2 transition-colors duration-(--dur) group-data-active/pair:text-white">
                <span className="tabular font-data text-[0.72rem] text-ink-3 transition-colors duration-(--dur) group-data-active/pair:text-kraft">{String(n + 1).padStart(2, '0')}</span>
                {p.topic}
              </span>
              {/* One stage, two lines: the old way gives way to the new one as the card takes focus */}
              <div className="relative mt-6 flex-1">
                <p className="absolute inset-x-0 top-0 origin-top-left font-display text-[clamp(1.35rem,2vw,1.7rem)] leading-[1.12] font-[650] tracking-[-0.025em] text-ink-2 transition-[scale,opacity,color] duration-(--dur) ease-out group-data-active/pair:scale-[0.56] group-data-active/pair:text-on-navy-2 group-data-active/pair:opacity-85 group-data-passed/pair:scale-[0.56] group-data-passed/pair:text-ink-3 motion-reduce:duration-1">
                  <span className="visually-hidden">Without Shigjetademy: </span>
                  <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-[0_56%] bg-no-repeat transition-[background-size] delay-[160ms] duration-500 ease-out group-data-active/pair:bg-[length:100%_2px] group-data-passed/pair:bg-[length:100%_2px] motion-reduce:delay-0 motion-reduce:duration-1">{p.before}</span>
                </p>
                <p className="absolute inset-x-0 bottom-0 grid translate-y-[18px] gap-3.5 font-display text-[clamp(1.45rem,2.1vw,1.85rem)] leading-[1.12] font-[680] tracking-[-0.025em] text-white opacity-0 blur-[4px] transition-[translate,opacity,filter,color] delay-[120ms] duration-(--dur) ease-out group-data-active/pair:translate-y-0 group-data-active/pair:opacity-100 group-data-active/pair:blur-none group-data-passed/pair:translate-y-0 group-data-passed/pair:text-ink group-data-passed/pair:opacity-100 group-data-passed/pair:blur-none motion-reduce:blur-none motion-reduce:delay-0 motion-reduce:duration-1">
                  <span className="grid size-7 place-items-center rounded-full bg-green text-navy" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="visually-hidden">With Shigjetademy: </span>
                  {p.after}
                </p>
              </div>
              <span className="mt-[18px] text-[0.74rem] font-[650] text-green opacity-0 transition-opacity delay-200 duration-(--dur) group-data-active/pair:opacity-100 group-data-passed/pair:text-green-deep group-data-passed/pair:opacity-100 motion-reduce:delay-0 motion-reduce:duration-1">With Shigjetademy</span>
            </article>
          ))}

          {/* Closing card: just the mark and the line */}
          <div className="relative flex min-h-[clamp(320px,42vh,380px)] w-[clamp(280px,28vw,380px)] flex-none snap-start flex-col items-start justify-end gap-4 rounded-[22px] p-[clamp(22px,2.4vw,30px)] max-[640px]:h-[min(52svh,380px)] max-[640px]:min-h-0 max-[640px]:w-[min(82vw,320px)]" role="listitem">
            <img src={wordmark} alt="" width={144} height={36} />
            <p className="max-w-[12ch] font-display text-[clamp(1.6rem,2.4vw,2.1rem)] leading-[1.08] font-[680] tracking-[-0.03em] text-ink">Five tools become one place.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
