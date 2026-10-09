import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { BookOpenCheck, CalendarDays, ClipboardCheck, FileText, MessageSquare, Wallet } from 'lucide-react'
import './DayTimeline.css'

const MOMENTS = [
  {
    time: '07:30',
    icon: CalendarDays,
    tag: 'Timetable',
    tone: 'navy',
    title: 'Teachers open today’s classes',
    body: 'Every teacher sees their classes, rooms and times for the day. No printed rota to chase.',
    meta: '6 classes · 4 rooms',
  },
  {
    time: '09:05',
    icon: ClipboardCheck,
    tag: 'Attendance',
    tone: 'green',
    title: 'Register taken in Room 204',
    body: 'Grade 9 Mathematics: attendance is marked in class, straight into the student records.',
    meta: '24 of 26 present',
  },
  {
    time: '09:10',
    icon: MessageSquare,
    tag: 'Messages',
    tone: 'coral',
    title: 'Two families hear about an absence',
    body: 'Parents of the two absent students get a message from the school, from the same register.',
    meta: '2 messages sent',
  },
  {
    time: '12:40',
    icon: Wallet,
    tag: 'Payments',
    tone: 'kraft',
    title: 'A tuition invoice is paid',
    body: 'The office sees INV-0412 marked paid. The class fee overview updates for everyone who needs it.',
    meta: '€60 · Paid',
  },
  {
    time: '15:15',
    icon: BookOpenCheck,
    tag: 'Grades',
    tone: 'green',
    title: 'Unit 3 test scores go in',
    body: 'Scores are entered once, into the class gradebook, where the term report will read them.',
    meta: 'Class average 7.8',
  },
  {
    time: '17:30',
    icon: FileText,
    tag: 'Reports',
    tone: 'navy',
    title: 'Progress notes are ready',
    body: 'Grades and attendance are already in place for the end-of-term progress report.',
    meta: 'Term report · draft',
  },
]

// The sun's arc spans 07:00 to 18:00
const START = 7 * 60
const SPAN = 11 * 60
const progressOf = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return (h * 60 + m - START) / SPAN
}

// Arc geometry (SVG units): a half-ellipse from left to right
const CX = 200
const CY = 190
const RX = 170
const RY = 150
const sunAt = (p: number) => ({ x: CX - RX * Math.cos(Math.PI * p), y: CY - RY * Math.sin(Math.PI * p) })
const ARC = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`

const TONES: Record<string, { tone: string; ink: string; wash: string }> = {
  navy: { tone: '#7fa6cc', ink: 'var(--navy)', wash: '#dfe9f4' },
  green: { tone: 'var(--green)', ink: 'var(--green-deep)', wash: 'var(--green-wash)' },
  coral: { tone: 'var(--coral)', ink: 'var(--coral-deep)', wash: 'var(--coral-wash)' },
  kraft: { tone: 'var(--kraft)', ink: 'var(--kraft-ink)', wash: 'var(--kraft-wash)' },
}
const toneVars = (t: string) =>
  ({ '--tone': TONES[t].tone, '--tone-ink': TONES[t].ink, '--tone-wash': TONES[t].wash }) as CSSProperties

/** One school day, read by scrolling: the clock and the sun follow whichever moment sits mid-screen. */
export function DayTimeline() {
  const [active, setActive] = useState(0)
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const items = list.current?.querySelectorAll<HTMLElement>('[data-moment]')
    if (!items) return
    let frame = 0
    // "Now" is the moment whose centre is closest to the middle of the screen
    const update = () => {
      frame = 0
      const mid = window.innerHeight / 2
      let best = 0
      let bestD = Infinity
      items.forEach((el, n) => {
        const r = el.getBoundingClientRect()
        const d = Math.abs(r.top + r.height / 2 - mid)
        if (d < bestD) {
          bestD = d
          best = n
        }
      })
      setActive(best)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const m = MOMENTS[active]
  const p = progressOf(m.time)
  const sun = sunAt(p)

  return (
    <section className="section band-white dt" aria-labelledby="day-title" style={toneVars(m.tone)}>
      <div className="container dt__grid">
        <div className="dt__aside">
          <div className="dt__sticky">
            <h2 id="day-title">One school day in Shigjetademy.</h2>
            <p className="dt__lede">
              From the first bell to the last message home, every step lands in the same system and feeds the next.
              Scroll through an illustrative day at a school.
            </p>

            <div className="dt__sky" aria-hidden="true">
              <svg viewBox="0 0 400 210">
                <path className="dt__arc" d={ARC} />
                <path
                  className="dt__arc dt__arc--done"
                  d={ARC}
                  pathLength={1}
                  style={{ strokeDashoffset: 1 - p }}
                />
                {MOMENTS.map((mo) => {
                  const pt = sunAt(progressOf(mo.time))
                  return <circle key={mo.time} className="dt__tick" cx={pt.x} cy={pt.y} r={3.5} />
                })}
                <line className="dt__ground" x1="10" y1={CY} x2="390" y2={CY} />
                <text x={CX - RX} y={CY + 18} textAnchor="middle">07:00</text>
                <text x={CX} y={CY + 18} textAnchor="middle">12:30</text>
                <text x={CX + RX} y={CY + 18} textAnchor="middle">18:00</text>
              </svg>
              <span className="dt__sun" style={{ transform: `translate(${(sun.x / 400) * 100}cqw, ${(sun.y / 210) * 100}cqh)` }}>
                <span />
              </span>
              <span className="dt__clock tabular">
                <span key={m.time}>{m.time}</span>
              </span>
            </div>
          </div>
        </div>

        <ol ref={list} className="dt__list">
          {MOMENTS.map((mo, n) => {
            const Icon = mo.icon
            return (
              <li
                key={mo.time}
                data-moment={n}
                className="dt__item"
                data-on={n === active || undefined}
                style={toneVars(mo.tone)}
              >
                <div className="dt__top">
                  <span className="dt__tag">
                    <Icon size={14} strokeWidth={2} aria-hidden="true" />
                    {mo.tag}
                  </span>
                  <time className="dt__time tabular">{mo.time}</time>
                </div>
                <h3>{mo.title}</h3>
                <p>{mo.body}</p>
                <span className="dt__meta tabular">{mo.meta}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
