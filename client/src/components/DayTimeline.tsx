import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { BookOpenCheck, CalendarDays, ClipboardCheck, FileText, MessageSquare, Wallet } from 'lucide-react'

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
    // One school day: the sky on the left holds still; the moments on the right pass through the
    // middle of the screen and set the clock and sun. Narrow: the sky rides at the top instead.
    <section className="section band-white" aria-labelledby="day-title" style={toneVars(m.tone)}>
      <div className="shell grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start gap-[clamp(32px,6vw,96px)] max-[900px]:grid-cols-1 max-[900px]:gap-0">
        <div className="self-stretch max-[900px]:contents">
          <div className="sticky top-[calc(var(--nav-h)+var(--frame)+24px)] max-[900px]:contents">
            <h2 id="day-title" className="text-[clamp(2rem,3.6vw,3.2rem)] font-[680] tracking-[-0.032em]">One school day in Shigjetademy.</h2>
            <p className="mt-4 max-w-[44ch] text-ink-2">
              From the first bell to the last message home, every step lands in the same system and feeds the next.
              Scroll through an illustrative day at a school.
            </p>

            {/* The sky: an arc for the day with the sun riding it, and the clock beneath */}
            <div
              className="relative mt-[clamp(28px,4vw,48px)] aspect-[400/210] overflow-hidden rounded-3xl bg-mist bg-[radial-gradient(60%_80%_at_50%_100%,color-mix(in_srgb,var(--tone-wash)_90%,transparent),transparent_75%)] shadow-[0_1px_2px_rgba(20,42,61,0.06),0_24px_48px_-32px_rgba(20,42,61,0.45)] [container-type:size] max-[900px]:sticky max-[900px]:top-[calc(var(--nav-h)+var(--frame)+8px)] max-[900px]:z-[2] max-[900px]:mx-auto max-[900px]:w-full max-[900px]:max-w-[420px]"
              aria-hidden="true"
            >
              <svg viewBox="0 0 400 210" className="absolute inset-0 size-full overflow-visible [&_text]:fill-ink-3 [&_text]:font-data [&_text]:text-[9px]">
                <path className="fill-none stroke-mist-deep stroke-3 [stroke-dasharray:4_6]" d={ARC} />
                <path
                  className="fill-none stroke-(--tone) stroke-3 [stroke-dasharray:1] [stroke-linecap:round] transition-[stroke-dashoffset,stroke] duration-[700ms,500ms] ease-out motion-reduce:transition-none"
                  d={ARC}
                  pathLength={1}
                  style={{ strokeDashoffset: 1 - p }}
                />
                {MOMENTS.map((mo) => {
                  const pt = sunAt(progressOf(mo.time))
                  return <circle key={mo.time} className="fill-white stroke-rule-strong stroke-[1.5]" cx={pt.x} cy={pt.y} r={3.5} />
                })}
                <line className="stroke-rule-strong stroke-1" x1="10" y1={CY} x2="390" y2={CY} />
                <text x={CX - RX} y={CY + 18} textAnchor="middle">07:00</text>
                <text x={CX} y={CY + 18} textAnchor="middle">12:30</text>
                <text x={CX + RX} y={CY + 18} textAnchor="middle">18:00</text>
              </svg>
              {/* The sun moves by transform; its glow takes the current moment's tone */}
              <span className="absolute top-0 left-0 size-0 transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `translate(${(sun.x / 400) * 100}cqw, ${(sun.y / 210) * 100}cqh)` }}>
                <span className="absolute -mt-[13px] -ml-[13px] size-[26px] rounded-full bg-(--tone) shadow-[0_0_0_6px_color-mix(in_srgb,var(--tone)_22%,transparent),0_6px_16px_-4px_color-mix(in_srgb,var(--tone)_70%,transparent)] transition-[background-color,box-shadow] duration-500" />
              </span>
              <span className="tabular absolute bottom-[16%] left-1/2 -translate-x-1/2 font-display text-[clamp(2.6rem,5vw,4rem)] leading-none font-bold tracking-[-0.04em] text-ink">
                <span key={m.time} className="inline-block motion-safe:animate-dt-tick">{m.time}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Moments: generous spacing so each one gets its turn in the middle of the screen */}
        <ol ref={list} className="grid gap-[clamp(20px,6vh,56px)] py-[18vh] max-[900px]:pt-[8vh] max-[900px]:pb-[20vh]">
          {MOMENTS.map((mo, n) => {
            const Icon = mo.icon
            return (
              <li
                key={mo.time}
                data-moment={n}
                className="grid scale-[0.98] gap-2.5 rounded-[20px] bg-mist p-[clamp(22px,2.6vw,30px)] opacity-55 shadow-[inset_0_0_0_1px_var(--rule)] transition-[opacity,scale,background-color,box-shadow] duration-[400ms] ease-out data-on:scale-100 data-on:bg-white data-on:opacity-100 data-on:shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--tone)_45%,transparent),0_24px_48px_-30px_rgba(20,42,61,0.5)]"
                data-on={n === active || undefined}
                style={toneVars(mo.tone)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-(--tone-wash) px-[11px] py-1 text-[0.78rem] font-[650] text-(--tone-ink)">
                    <Icon size={14} strokeWidth={2} aria-hidden="true" />
                    {mo.tag}
                  </span>
                  <time className="tabular font-data text-[0.8rem] text-ink-3">{mo.time}</time>
                </div>
                <h3 className="mt-1 text-[clamp(1.25rem,2vw,1.6rem)] font-[650] tracking-[-0.025em]">{mo.title}</h3>
                <p className="max-w-[52ch] text-ink-2">{mo.body}</p>
                <span className="tabular font-data text-[0.74rem] text-(--tone-ink)">{mo.meta}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
