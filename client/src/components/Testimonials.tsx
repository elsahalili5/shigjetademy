import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { ArrowRight, MessageSquareQuote, Quote } from 'lucide-react'
import illustration from '../assets/illustrations/teaching.jpg'
import { Link } from '../lib/router'

type Testimonial = {
  quote: string
  name: string
  role: string
  organization: string
}

/**
 * Real quotes only, used with the person's permission.
 * Shigjetademy has no published reviews yet; until this list has entries the section shows an
 * honest invitation to be among the first, never invented quotes.
 */
const REAL: Testimonial[] = []

/**
 * Design previews for local development only. Vite drops this branch from production builds,
 * so these never reach the live site. Replace with REAL entries before launch.
 */
const DEV_SAMPLES: Testimonial[] = [
  {
    quote: 'Taking the register used to eat the first ten minutes of every lesson. Now it is done before the class settles.',
    name: 'Sample teacher',
    role: 'Mathematics teacher',
    organization: 'Example secondary school',
  },
  {
    quote: 'For the first time I can see who has paid, who is due and who has missed class, all on one screen.',
    name: 'Sample director',
    role: 'Director',
    organization: 'Example language academy',
  },
  {
    quote: 'I get a message the moment my son is marked absent, and his grades are there when I want them.',
    name: 'Sample parent',
    role: 'Parent',
    organization: 'Example primary school',
  },
]

const IS_SAMPLE = REAL.length === 0 && import.meta.env.DEV
const TESTIMONIALS: Testimonial[] = REAL.length ? REAL : import.meta.env.DEV ? DEV_SAMPLES : []

const TONES = ['var(--green)', 'var(--kraft)', 'var(--coral)']
const EVERY = 5500
const LEAVE_MS = 260 // exit is quicker than the arrival behind it
const VISIBLE = 3 // front card plus two peeking behind

// Every card shares one cell; depth decides where it sits. Cards behind show only their colour edge.
// Leaving: off to the side, quickly, then back to the rear of the deck. Reduced motion: a quiet fade.
const deckCard =
  "z-0 [grid-area:1/1] grid origin-top content-start gap-[22px] rounded-3xl bg-white p-[clamp(28px,3.4vw,40px)] opacity-0 [transform:translateY(calc(var(--peek)*-2))_scale(0.88)] shadow-[0_1px_2px_rgba(20,42,61,0.08),0_24px_48px_-30px_rgba(20,42,61,0.45)] transition-[transform,opacity,background-color] duration-[460ms,300ms,300ms] ease-out *:opacity-0 *:transition-opacity *:duration-[160ms] data-[depth='0']:z-[3] data-[depth='0']:opacity-100 data-[depth='0']:[transform:translateX(var(--drag,0px))_rotate(var(--tilt,0deg))] data-[depth='0']:*:opacity-100 data-[depth='0']:*:delay-[120ms] data-[depth='0']:*:duration-[260ms] data-[depth='1']:z-[2] data-[depth='1']:bg-mist data-[depth='1']:opacity-100 data-[depth='1']:[transform:translateY(calc(var(--peek)*-1))_scale(0.95)] data-[depth='2']:z-[1] data-[depth='2']:bg-mist-deep data-[depth='2']:opacity-100 data-[depth='2']:[transform:translateY(calc(var(--peek)*-2))_scale(0.9)] data-[depth=leaving]:z-[4] data-[depth=leaving]:opacity-0 data-[depth=leaving]:duration-[260ms,220ms,300ms] data-[depth=leaving]:[transform:translateX(calc(-40%*var(--dir,1)))_rotate(calc(-6deg*var(--dir,1)))] data-[dir='-1']:[--dir:-1] group-data-dragging/stack:data-[depth='0']:transition-none motion-reduce:transition-[opacity,background-color] motion-reduce:data-[depth='0']:transform-none motion-reduce:data-[depth=leaving]:transform-none"

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

/**
 * A deck of quote cards. The front card holds the current quote; the next two peek out behind it.
 * Advancing sends the front card off to the side, and it returns quietly to the back of the deck.
 * Drag or flick the front card to change it; it pauses on hover or keyboard focus.
 */
export function Testimonials() {
  const count = TESTIMONIALS.length
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState<{ n: number; dir: 1 | -1 } | null>(null)
  const [hovered, setHovered] = useState(false)
  // Reduced-motion visitors never get automatic changes; they browse with the dots
  const [stopped] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  )
  const [picked, setPicked] = useState(false)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<{ x: number; t: number; id: number } | null>(null)
  const leaveTimer = useRef(0)
  const paused = hovered || stopped || drag !== 0

  const go = (to: number, dir: 1 | -1 = 1) => {
    if (count < 2) return
    const next = ((to % count) + count) % count
    if (next === index) return
    window.clearTimeout(leaveTimer.current)
    setLeaving({ n: index, dir })
    setIndex(next)
    leaveTimer.current = window.setTimeout(() => setLeaving(null), LEAVE_MS)
  }

  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  useEffect(() => {
    if (count < 2 || paused) return
    const id = window.setInterval(() => {
      if (!document.hidden) go(index + 1)
    }, EVERY)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, paused, index])

  const choose = (n: number) => {
    setPicked(true)
    go(n, n > index ? 1 : -1)
  }

  // Drag the front card: it follows the pointer, and a far enough drag or a quick flick changes the quote
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (count < 2 || e.button !== 0 || dragStart.current) return // ignore second fingers
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX, t: performance.now(), id: e.pointerId }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.id !== e.pointerId) return
    setDrag(e.clientX - dragStart.current.x)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    if (start?.id !== e.pointerId) return
    const dx = e.clientX - start.x
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - start.t)
    dragStart.current = null
    setDrag(0)
    if (Math.abs(dx) > 90 || (Math.abs(dx) > 12 && velocity > 0.11)) {
      setPicked(true)
      go(dx < 0 ? index + 1 : index - 1, dx < 0 ? 1 : -1)
    }
  }

  return (
    <section className="section band-white" aria-labelledby="testimonials-title">
      {/* Heading across the top; illustration and the quote deck share the row beneath */}
      <div className="shell grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-x-[clamp(32px,6vw,96px)] gap-y-[clamp(32px,5vw,56px)] max-[900px]:grid-cols-1">
        <div className="col-span-full" data-reveal>
          <h2 id="testimonials-title" className="text-[clamp(2rem,3.8vw,3.4rem)] font-[680] tracking-[-0.032em]">What they say.</h2>
          <p className="mt-3.5 max-w-[40ch] text-ink-2">
            {count
              ? 'Schools, academies and educators on running their term in Shigjetademy.'
              : 'Shigjetademy is new, and the first schools, academies and educators are joining now.'}
          </p>
        </div>

        <div className="grid justify-items-center" data-reveal>
            <img
              // The illustration's white ground melts into the band
              className="h-auto w-[min(100%,420px)] mix-blend-multiply max-[900px]:w-[min(100%,280px)]"
              src={illustration}
              alt="Illustration: a teacher on a screen explaining a lesson while a student follows along on a laptop"
              width={800}
              height={800}
              loading="lazy"
            />
        </div>

        <div
          className="grid gap-[18px]"
          data-reveal
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false)
          }}
        >
          <div
            className="group/stack relative grid cursor-grab touch-pan-y pt-[calc(var(--peek)*2)] select-none [--peek:16px] data-dragging:cursor-grabbing"
            data-dragging={drag !== 0 || undefined}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-live={picked ? 'polite' : 'off'}
          >
            {count ? (
              TESTIMONIALS.map((t, n) => {
                const depth = (n - index + count) % count
                const isLeaving = leaving?.n === n
                return (
                  <figure
                    key={t.name}
                    className={deckCard}
                    data-depth={isLeaving ? 'leaving' : depth < VISIBLE ? depth : 'hidden'}
                    data-dir={isLeaving ? leaving.dir : undefined}
                    aria-hidden={depth !== 0}
                    style={
                      {
                        '--tone': TONES[n % TONES.length],
                        '--drag': depth === 0 ? `${drag}px` : '0px',
                        '--tilt': depth === 0 ? `${drag / 40}deg` : '0deg',
                      } as CSSProperties
                    }
                  >
                    <div className="flex items-center justify-between">
                      <Quote className="text-(--tone)" size={26} strokeWidth={2} aria-hidden="true" />
                      {IS_SAMPLE && // Sample marker: impossible to mistake for a real review
                        <span className="rounded-full bg-coral-wash px-2.5 py-[3px] text-[0.7rem] font-bold text-coral-deep">Sample · dev only</span>}
                    </div>
                    <blockquote>
                      <p className="font-display text-[clamp(1.35rem,2.2vw,1.9rem)] leading-[1.28] font-[620] tracking-[-0.02em] text-pretty text-ink">{t.quote}</p>
                    </blockquote>
                    <figcaption className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-full bg-(--tone) text-[0.78rem] font-bold text-navy" aria-hidden="true">
                        {initials(t.name)}
                      </span>
                      <span>
                        <strong className="block font-[650]">{t.name}</strong>
                        <span className="text-[0.86rem] text-ink-3">
                          {t.role} · {t.organization}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                )
              })
            ) : (
              <>
                {/* Invitation: same card, navy, with blank cards waiting behind it */}
                <div
                  className={`${deckCard} cursor-default justify-items-start gap-4 bg-navy! bg-[radial-gradient(70%_70%_at_100%_100%,rgba(31,176,139,0.2),transparent_70%)] text-on-navy-2`}
                  data-depth={0}
                >
                  <span className="grid size-[52px] place-items-center rounded-2xl bg-kraft text-navy" aria-hidden="true">
                    <MessageSquareQuote size={24} strokeWidth={1.9} />
                  </span>
                  <p className="mt-2 max-w-[16ch] font-display text-[clamp(1.6rem,2.6vw,2.2rem)] leading-[1.08] font-[680] tracking-[-0.03em] text-white">Your story could be the first one here.</p>
                  <p className="max-w-[46ch]">
                    We are working closely with our first organizations. Run your term in Shigjetademy, tell us how it
                    goes, and your words could be what the next school reads.
                  </p>
                  <Link
                    className="button mt-2 bg-green text-navy shadow-[0_1px_2px_rgba(0,0,0,0.2),0_14px_28px_-12px_rgba(31,176,139,0.55)] hover:bg-[#2bc49c]"
                    href="/contact"
                  >
                    Become an early partner
                    <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
                {/* Two blank cards behind, so the invitation reads as the top of a deck still being filled */}
                <div className={`${deckCard} min-h-full`} data-depth={1} aria-hidden="true" />
                <div className={`${deckCard} min-h-full`} data-depth={2} aria-hidden="true" />
              </>
            )}
          </div>

          {count > 1 && (
            <div className="flex items-center gap-4">
              <div className="flex gap-0.5" role="group" aria-label="Choose a quote">
                {TESTIMONIALS.map((t, n) => (
                  <button
                    key={t.name}
                    type="button"
                    aria-label={`Quote ${n + 1} of ${count}, ${t.name}`}
                    aria-current={n === index}
                    onClick={() => choose(n)}
                    className="group/dot grid h-9 min-w-7 place-items-center p-0"
                    style={{ '--tone': TONES[n % TONES.length] } as CSSProperties}
                  >
                    <span
                      key={n === index ? index : undefined}
                      data-run={(n === index && !paused) || undefined}
                      className="block h-2 w-2 rounded-full bg-rule-strong transition-[width,background-color] duration-300 ease-out group-[:hover:not([aria-current=true])]/dot:bg-ink-3 group-aria-[current=true]/dot:w-7 group-aria-[current=true]/dot:[background:linear-gradient(var(--tone),var(--tone))_no-repeat_0_0/100%_100%,var(--rule-strong)] motion-safe:data-run:animate-deck-fill"
                      style={{ animationDuration: `${EVERY}ms` }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
