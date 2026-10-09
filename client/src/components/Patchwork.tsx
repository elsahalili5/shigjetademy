import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'
import './Patchwork.css'

const PAIRS = [
  { topic: 'Enrolment', before: 'Enrolments kept in a spreadsheet', after: 'One record per student, from enquiry to report' },
  { topic: 'Attendance', before: 'Registers on paper, typed up later', after: 'Registers tied to the timetable, taken in class' },
  { topic: 'Fees', before: 'Fees tracked from bank statements', after: 'Invoices tied to each enrolment, status at a glance' },
  { topic: 'Reports', before: 'Reports written from scratch each term', after: 'Reports built from grades already recorded' },
  { topic: 'Messages', before: 'Parents reached through group chats', after: 'Messages sent from the same place as everything else' },
]

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
      className="band-white slider"
      data-pinned={pinned || undefined}
      aria-labelledby="patchwork-title"
    >
      <div className="slider__sticky">
        <div className="container slider__head">
          <h2 id="patchwork-title">Replace the patchwork your term runs on.</h2>
          <div className="slider__aside">
            <p>
              Most teaching organizations run on five tools that don’t talk to each other. Shigjetademy puts the same
              work in one place, so each step feeds the next.
            </p>
            {pinned && (
              <div className="slider__progress" aria-hidden="true">
                <span ref={count} className="slider__count tabular">
                  1 / {PAIRS.length}
                </span>
                <span className="slider__rail">
                  <span ref={bar} />
                </span>
              </div>
            )}
          </div>
        </div>

        <div ref={track} className="slider__track" role="list">
          {PAIRS.map((p, n) => (
            <article
              key={p.topic}
              role="listitem"
              className="pair"
              data-pair
              data-active={(pinned && n === 0) || undefined}
              data-passed={!pinned || undefined}
              style={{ '--i': n } as CSSProperties}
              aria-label={p.topic}
            >
              <span className="pair__topic">
                <span className="tabular">{String(n + 1).padStart(2, '0')}</span>
                {p.topic}
              </span>
              {/* One stage, two lines: the old way gives way to the new one as the card takes focus */}
              <div className="pair__stage">
                <p className="pair__before">
                  <span className="visually-hidden">Without Shigjetademy: </span>
                  <span className="pair__strike">{p.before}</span>
                </p>
                <p className="pair__after">
                  <span className="pair__check" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="visually-hidden">With Shigjetademy: </span>
                  {p.after}
                </p>
              </div>
              <span className="pair__foot">With Shigjetademy</span>
            </article>
          ))}

          <div className="pair pair--end" role="listitem">
            <img src={wordmark} alt="" width={144} height={36} />
            <p className="pair__end-title">Five tools become one place.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
