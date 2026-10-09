import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { ArrowRight, MessageSquareQuote, Quote } from 'lucide-react'
import illustration from '../assets/illustrations/teaching.jpg'
import { Link } from '../lib/router'
import './Testimonials.css'

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
    <section className="section band-white testimonials" aria-labelledby="testimonials-title">
      <div className="container testimonials__grid">
        <div className="testimonials__intro" data-reveal>
          <h2 id="testimonials-title">What they say.</h2>
          <p>
            {count
              ? 'Schools, academies and educators on running their term in Shigjetademy.'
              : 'Shigjetademy is new, and the first schools, academies and educators are joining now.'}
          </p>
        </div>

        <div className="testimonials__media" data-reveal>
            <img
              className="testimonials__art"
              src={illustration}
              alt="Illustration: a teacher on a screen explaining a lesson while a student follows along on a laptop"
              width={800}
              height={800}
              loading="lazy"
            />
        </div>

        <div
          className="deck"
          data-reveal
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false)
          }}
        >
          <div
            className="deck__stack"
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
                    className="deck__card"
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
                    <div className="deck__top">
                      <Quote className="deck__mark" size={26} strokeWidth={2} aria-hidden="true" />
                      {IS_SAMPLE && <span className="quote__sample">Sample · dev only</span>}
                    </div>
                    <blockquote>
                      <p>{t.quote}</p>
                    </blockquote>
                    <figcaption className="quote__who">
                      <span className="quote__avatar" aria-hidden="true">
                        {initials(t.name)}
                      </span>
                      <span>
                        <strong>{t.name}</strong>
                        <span>
                          {t.role} · {t.organization}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                )
              })
            ) : (
              <>
                <div className="deck__card deck__card--invite" data-depth={0}>
                  <span className="testimonials__first-icon" aria-hidden="true">
                    <MessageSquareQuote size={24} strokeWidth={1.9} />
                  </span>
                  <p className="testimonials__first-title">Your story could be the first one here.</p>
                  <p className="deck__invite-body">
                    We are working closely with our first organizations. Run your term in Shigjetademy, tell us how it
                    goes, and your words could be what the next school reads.
                  </p>
                  <Link className="button testimonials__cta" href="/contact">
                    Become an early partner
                    <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
                {/* Two blank cards behind, so the invitation reads as the top of a deck still being filled */}
                <div className="deck__card deck__card--blank" data-depth={1} aria-hidden="true" />
                <div className="deck__card deck__card--blank" data-depth={2} aria-hidden="true" />
              </>
            )}
          </div>

          {count > 1 && (
            <div className="deck__controls">
              <div className="deck__dots" role="group" aria-label="Choose a quote">
                {TESTIMONIALS.map((t, n) => (
                  <button
                    key={t.name}
                    type="button"
                    aria-label={`Quote ${n + 1} of ${count}, ${t.name}`}
                    aria-current={n === index}
                    onClick={() => choose(n)}
                    style={{ '--tone': TONES[n % TONES.length] } as CSSProperties}
                  >
                    <span
                      key={n === index ? index : undefined}
                      data-run={(n === index && !paused) || undefined}
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
