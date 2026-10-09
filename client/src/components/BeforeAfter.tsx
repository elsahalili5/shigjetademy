import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { ChevronsLeftRight, ClipboardCheck, MessageSquare, StickyNote, Wallet } from 'lucide-react'
import before from '../assets/photos/before.jpg'
import after from '../assets/photos/after.jpg'

const clamp = (v: number) => Math.min(100, Math.max(0, v))

// Notes pinned onto each photo where the work happens; each set is cut by the same divider as its photo
// Notes pinned onto each photo, clear of the teacher, the students' faces and the wall screen.
// Positions are CSS variables so small screens can re-lay them out without fighting inline styles.
const BEFORE_NOTES = [
  { text: 'Paper registers, typed up later', x: 20, y: 5 },
  { text: 'Letters and calls to parents', x: 24, y: 40 },
  { text: 'Fees tracked in a notebook', x: 20, y: 80 },
]

const AFTER_NOTES = [
  { icon: ClipboardCheck, text: 'Register taken in class', detail: '24 of 26 present', right: 3, y: 5 },
  { icon: MessageSquare, text: 'Families messaged', detail: '2 absences · sent 09:10', right: 3, y: 22 },
  { icon: Wallet, text: 'Payment status live', detail: '23 paid · 3 due', right: 3, y: 78 },
]

/** Before/after comparison: the paper-run classroom on top, clipped away to reveal the same room in Shigjetademy. */
export function BeforeAfter() {
  const frame = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [glide, setGlide] = useState(false) // eased move for clicks, keys and the hint; instant while dragging

  // One-time hint when it first comes into view: a small sweep that shows the divider moves
  useEffect(() => {
    const el = frame.current
    if (!el || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return
    const timers: number[] = []
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        setGlide(true)
        timers.push(window.setTimeout(() => setPos(64), 350))
        timers.push(window.setTimeout(() => setPos(50), 1000))
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      timers.forEach(window.clearTimeout)
    }
  }, [])

  const fromPointer = (e: PointerEvent) => {
    const r = frame.current!.getBoundingClientRect()
    return clamp(((e.clientX - r.left) / r.width) * 100)
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setGlide(true) // the first press glides to the pointer, then tracking is instant
    setPos(fromPointer(e))
  }

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setGlide(false)
    setPos(fromPointer(e))
  }

  const onUp = () => setDragging(false)

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      setGlide(true)
      setPos(e.key === 'Home' ? 0 : 100)
    } else if (map[e.key]) {
      e.preventDefault()
      setGlide(false)
      setPos((p) => clamp(p + map[e.key]))
    }
  }

  // Clicks, keys and the hint glide; dragging tracks the pointer exactly
  const glides = glide && !dragging ? 'motion-safe:duration-[420ms] motion-safe:ease-out' : 'duration-0'
  // Notes settle in once when the photo first appears
  const pin =
    'pointer-events-none absolute top-(--t) motion-safe:[.motion_[data-inview]_&]:animate-note-pin motion-safe:[.motion_[data-inview]_&]:[animation-delay:calc(var(--i)*90ms+300ms)] max-[900px]:nth-3:hidden'
  const label =
    'pointer-events-none absolute bottom-[clamp(14px,2vw,22px)] rounded-full px-3.5 py-[7px] text-[0.82rem] font-[650] shadow-[0_6px_16px_-8px_rgba(20,42,61,0.5)] transition-[opacity,translate] duration-[220ms] ease-out data-hidden:translate-y-1.5 data-hidden:opacity-0 max-[640px]:px-2.5 max-[640px]:py-[5px] max-[640px]:text-[0.72rem]'

  return (
    // Extra room below, so the photo isn't crowded by the next section
    <section className="section shell pb-[clamp(56px,8vw,112px)]" aria-labelledby="compare-title">
      {/* Headline centred above one wide photo; the story is told by notes pinned on the photo itself */}
      <div className="mx-auto mb-[clamp(32px,5vw,56px)] max-w-[760px] text-center" data-reveal>
        <h2 id="compare-title" className="text-[clamp(2rem,4vw,3.6rem)] font-[680] tracking-[-0.034em]">
          From paperwork to one dashboard.
        </h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-ink-2">
          Drag across the classroom to see the same term run on paper, and run in Shigjetademy.
        </p>
      </div>

      {/* Before/after comparison: one frame, the top photo clipped at --pos */}
      <div
        ref={frame}
        className="group/cmp relative mx-auto aspect-[16/8.6] max-w-[1080px] cursor-ew-resize touch-pan-y overflow-hidden rounded-3xl bg-mist-deep shadow-[0_1px_2px_rgba(20,42,61,0.08),0_40px_80px_-48px_rgba(20,42,61,0.6)] select-none max-[900px]:aspect-[4/3.4] max-[640px]:aspect-[4/3] max-[640px]:rounded-[18px]"
        data-reveal
        data-dragging={dragging || undefined}
        style={{ '--pos': `${pos}%` } as CSSProperties}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* After: the full photo underneath, with its Shigjetademy chips */}
        <img
          className="pointer-events-none absolute inset-0 size-full object-cover"
          src={after}
          alt="The same classroom with Shigjetademy: a teacher at a laptop and monitor showing an attendance dashboard"
          width={1376}
          height={768}
          loading="lazy"
          draggable={false}
        />
        <ul aria-label="With Shigjetademy">
          {AFTER_NOTES.map(({ icon: Icon, text, detail, right, y }, n) => (
            // Anchored from the right edge, so chips never run out of the frame on narrow screens
            <li
              key={text}
              className={`${pin} right-(--r) flex items-center gap-2.5 rounded-[14px] bg-white py-2.5 pr-3.5 pl-2.5 text-[0.84rem] leading-[1.3] text-ink shadow-[0_1px_2px_rgba(20,42,61,0.1),0_16px_32px_-16px_rgba(10,22,34,0.55)] max-[900px]:right-[3%] max-[900px]:max-w-[46%] max-[900px]:text-[0.74rem] max-[900px]:nth-2:top-[30%]`}
              style={{ '--r': `${right}%`, '--t': `${y}%`, '--i': n } as CSSProperties}
            >
              <span
                className="grid size-8 flex-none place-items-center rounded-[10px] bg-green-wash text-green-deep max-[900px]:size-[26px]"
                aria-hidden="true"
              >
                <Icon size={15} strokeWidth={2} />
              </span>
              <span>
                <strong className="block font-[650]">{text}</strong>
                <span className="text-[0.78rem] text-ink-3 max-[900px]:hidden">{detail}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Before: the paper photo and its notes, cut together at the divider (clip-path, no extra wrappers) */}
        <div className={`absolute inset-0 transition-[clip-path] [clip-path:inset(0_calc(100%-var(--pos))_0_0)] ${glides}`}>
          <img
            className="pointer-events-none absolute inset-0 size-full object-cover"
            src={before}
            alt="A traditional classroom: the teacher's desk buried in paper registers, letters and binders"
            width={1376}
            height={768}
            loading="lazy"
            draggable={false}
          />
          <ul aria-label="Without Shigjetademy">
            {BEFORE_NOTES.map(({ text, x, y }, n) => (
              // Paper notes, slightly askew like something stuck on a desk
              <li
                key={text}
                className={`${pin} left-(--l) inline-flex -rotate-[2.5deg] items-center gap-2 rounded-md bg-kraft-wash px-[13px] py-[9px] text-[0.86rem] font-[650] text-kraft-ink shadow-[0_10px_22px_-12px_rgba(40,28,10,0.55)] nth-2:rotate-2 max-[900px]:left-[3%] max-[900px]:max-w-[46%] max-[900px]:text-[0.74rem] [&_svg]:flex-none [&_svg]:text-coral-deep`}
                style={{ '--l': `${x}%`, '--t': `${y}%`, '--i': n } as CSSProperties}
              >
                <StickyNote size={14} strokeWidth={2} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Labels sit in each corner and step aside when their side is nearly gone */}
        <span
          className={`${label} left-[clamp(14px,2vw,22px)] bg-coral-wash text-coral-deep`}
          data-hidden={pos < 18 || undefined}
        >
          Before
        </span>
        <span className={`${label} right-[clamp(14px,2vw,22px)] bg-navy text-white`} data-hidden={pos > 82 || undefined}>
          With Shigjetademy
        </span>

        {/* The split layer moves by transform */}
        <div className={`pointer-events-none absolute inset-0 translate-x-(--pos) transition-transform ${glides}`}>
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-0 -ml-px w-0.5 bg-white shadow-[0_0_0_1px_rgba(20,42,61,0.15)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-auto absolute top-1/2 left-0 -mt-[26px] -ml-[26px] grid size-[52px] cursor-grab place-items-center rounded-full bg-white text-navy shadow-[0_2px_4px_rgba(20,42,61,0.15),0_14px_30px_-10px_rgba(20,42,61,0.55)] transition-[scale,background-color,color] duration-200 ease-out group-hover/cmp:scale-[1.06] focus-visible:outline-kraft focus-visible:outline-offset-4 group-data-dragging/cmp:scale-[0.94] group-data-dragging/cmp:cursor-grabbing group-data-dragging/cmp:bg-navy group-data-dragging/cmp:text-white max-[640px]:-mt-[22px] max-[640px]:-ml-[22px] max-[640px]:size-11"
            role="slider"
            tabIndex={0}
            aria-label="Compare before and after"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={`${Math.round(pos)}% before, ${Math.round(100 - pos)}% after`}
            onKeyDown={onKey}
          >
            <ChevronsLeftRight size={20} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-[1080px] text-[0.78rem] text-ink-3">Illustrative photos.</p>
    </section>
  )
}
