import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { ChevronsLeftRight, ClipboardCheck, MessageSquare, StickyNote, Wallet } from 'lucide-react'
import before from '../assets/photos/before.jpg'
import after from '../assets/photos/after.jpg'
import './BeforeAfter.css'

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

  return (
    <section className="section container compare" aria-labelledby="compare-title">
      <div className="compare__head" data-reveal>
        <h2 id="compare-title">From paperwork to one dashboard.</h2>
        <p>Drag across the classroom to see the same term run on paper, and run in Shigjetademy.</p>
      </div>

      <div
        ref={frame}
        className="compare__frame"
        data-reveal
        data-dragging={dragging || undefined}
        data-glide={glide || undefined}
        style={{ '--pos': `${pos}%` } as CSSProperties}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* After: the full photo underneath, with its Shigjetademy chips */}
        <img
          className="compare__img"
          src={after}
          alt="The same classroom with Shigjetademy: a teacher at a laptop and monitor showing an attendance dashboard"
          width={1376}
          height={768}
          loading="lazy"
          draggable={false}
        />
        <ul className="compare__notes" aria-label="With Shigjetademy">
          {AFTER_NOTES.map(({ icon: Icon, text, detail, right, y }, n) => (
            // Anchored from the right edge, so chips never run out of the frame on narrow screens
            <li key={text} className="chip-note" style={{ '--r': `${right}%`, '--t': `${y}%`, '--i': n } as CSSProperties}>
              <span className="chip-note__icon" aria-hidden="true">
                <Icon size={15} strokeWidth={2} />
              </span>
              <span>
                <strong>{text}</strong>
                <span>{detail}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Before: the paper photo and its notes, cut together at the divider */}
        <div className="compare__before">
          <img
            className="compare__img"
            src={before}
            alt="A traditional classroom: the teacher's desk buried in paper registers, letters and binders"
            width={1376}
            height={768}
            loading="lazy"
            draggable={false}
          />
          <ul className="compare__notes" aria-label="Without Shigjetademy">
            {BEFORE_NOTES.map(({ text, x, y }, n) => (
              <li key={text} className="paper-note" style={{ '--l': `${x}%`, '--t': `${y}%`, '--i': n } as CSSProperties}>
                <StickyNote size={14} strokeWidth={2} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <span className="compare__label compare__label--before" data-hidden={pos < 18 || undefined}>
          Before
        </span>
        <span className="compare__label compare__label--after" data-hidden={pos > 82 || undefined}>
          With Shigjetademy
        </span>

        {/* The split layer moves by transform */}
        <div className="compare__split">
          <div className="compare__divider" aria-hidden="true" />
          <div
            className="compare__handle"
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
      <p className="compare__note">Illustrative photos.</p>
    </section>
  )
}
