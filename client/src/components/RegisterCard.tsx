import { useEffect, useRef, useState } from 'react'
import { Check, MessageSquare } from 'lucide-react'
import studentPhoto from '../assets/photos/student.jpg'

// Illustrative class: 20 students already marked, six left to take in front of the visitor.
const CLASS_SIZE = 26
const ALREADY_PRESENT = 20
const STUDENTS = [
  { first: 'Arta', last: 'Krasniqi', photo: studentPhoto },
  { first: 'Besnik', last: 'Hoxha' },
  { first: 'Dea', last: 'Morina' },
  { first: 'Elion', last: 'Gashi' },
  { first: 'Fjolla', last: 'Berisha' },
  { first: 'Gent', last: 'Leka' },
]
const INITIALLY_ABSENT = new Set([3, 5])

type Toast = { id: number; text: string; tone: 'absent' | 'present' }

export type RegisterEvent = { name: string; family: string; present: boolean }

type Props = {
  /** When given, events go to the caller (e.g. a live feed) instead of the card's own toast. */
  onEvent?: (e: RegisterEvent) => void
}

/** The hero's register: tap a student to mark them, the count and families follow. */
export function RegisterCard({ onEvent }: Props = {}) {
  const [present, setPresent] = useState(() => STUDENTS.map((_, n) => !INITIALLY_ABSENT.has(n)))
  const [dir, setDir] = useState<'up' | 'down'>('up')
  const [toast, setToast] = useState<Toast | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const timer = useRef(0)
  const seq = useRef(0)

  const count = ALREADY_PRESENT + present.filter(Boolean).length
  const absent = CLASS_SIZE - count

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const toggle = (n: number) => {
    const s = STUDENTS[n]
    const nowPresent = !present[n]
    setPresent((p) => p.map((v, k) => (k === n ? nowPresent : v)))
    setDir(nowPresent ? 'up' : 'down')
    if (onEvent) {
      onEvent({ name: `${s.first} ${s.last}`, family: s.last, present: nowPresent })
      return
    }
    setToast({
      id: ++seq.current,
      tone: nowPresent ? 'present' : 'absent',
      text: nowPresent ? `${s.first} ${s.last} marked present` : `Message sent to the ${s.last} family`,
    })
    setToastOpen(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastOpen(false), 2600)
  }

  return (
    // Holds still while the visitor is using it
    <div className="group/reg relative">
      <div className="hero-card p-4 group-hover/reg:[animation-play-state:paused] group-focus-within/reg:[animation-play-state:paused]">
        <div className="flex items-start justify-between gap-2.5">
          <span>
            <strong>Grade 9 Mathematics</strong>
            <span className="text-[0.78rem] text-ink-3">Register · 09:00 · Room 204</span>
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full bg-green-wash px-2 py-0.5 text-[0.7rem] font-bold text-green-deep before:size-1.5 before:rounded-full before:bg-green before:content-['']">
            Live
          </span>
        </div>

        <p className="tabular mt-3.5 font-display text-[2.1rem] leading-none font-bold tracking-[-0.03em]" aria-live="polite">
          <span className="inline-block overflow-hidden align-bottom leading-[1.05]">
            <span
              key={count}
              className={`inline-block ${dir === 'up' ? 'motion-safe:animate-tick-up' : 'motion-safe:animate-tick-down'}`}
            >
              {count}
            </span>
          </span>
          <span className="ml-1.5 font-sans text-[0.82rem] font-semibold tracking-normal text-ink-3">/ {CLASS_SIZE} present</span>
        </p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist-deep" aria-hidden="true">
          {/* The bar follows the count; transform only, interruptible */}
          <span className="block h-full w-full origin-left rounded-[inherit] bg-green transition-transform duration-[320ms] ease-out" style={{ transform: `scaleX(${count / CLASS_SIZE})` }} />
        </div>

        <p className="mt-3.5 text-[0.72rem] font-semibold text-ink-3">Tap a student to take the register</p>
        <ul className="mt-2 flex gap-[5px]">
          {STUDENTS.map((s, n) => (
            <li key={s.first}>
              <button
                type="button"
                className="group/st relative grid size-8 place-items-center rounded-full bg-[#dfe6ee] p-0 text-[0.6rem] font-bold tracking-[-0.02em] text-ink shadow-[0_0_0_2px_var(--white),0_0_0_3.5px_var(--green)] transition-[translate,scale,box-shadow,filter,opacity] duration-200 ease-out [-webkit-tap-highlight-color:transparent] hover:-translate-y-0.5 focus-visible:outline-offset-4 active:translate-y-0 active:scale-90 aria-[pressed=false]:opacity-60 aria-[pressed=false]:grayscale aria-[pressed=false]:shadow-[0_0_0_2px_var(--white),0_0_0_3.5px_var(--coral)]"
                aria-pressed={present[n]}
                aria-label={`${s.first} ${s.last}, ${present[n] ? 'present' : 'absent'}`}
                onClick={() => toggle(n)}
              >
                {s.photo ? (
                  <img className="size-full rounded-full object-cover object-[50%_70%]" src={s.photo} alt="" width={34} height={34} />
                ) : (
                  <span>
                    {s.first[0]}
                    {s.last[0]}
                  </span>
                )}
                {/* Status dot: green tick when present, coral when absent */}
                <i
                  className="absolute -right-[3px] -bottom-[3px] grid size-3.5 place-items-center rounded-full border-2 border-white bg-green text-white transition-[background-color,scale] duration-200 ease-out group-aria-[pressed=false]/st:scale-[0.85] group-aria-[pressed=false]/st:bg-coral"
                  aria-hidden="true"
                >
                  {present[n] && <Check size={9} strokeWidth={4} />}</i>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[0.76rem] text-ink-2">
          {absent} absent · {absent === 1 ? 'family' : 'families'} notified
        </p>
      </div>

      {!onEvent && // Toast: enters from the card, exits faster than it arrives; on phones it opens upward
        <div
          className="pointer-events-none absolute top-[calc(100%+10px)] right-2 left-2 flex origin-top -translate-y-2 scale-[0.97] items-center gap-2.5 rounded-[14px] bg-white px-3 py-2.5 text-[0.8rem] leading-[1.3] font-semibold text-ink opacity-0 shadow-[0_1px_2px_rgba(20,42,61,0.1),0_18px_36px_-18px_rgba(10,22,34,0.55)] transition-[opacity,translate,scale] duration-[160ms,180ms,180ms] ease-out data-open:translate-y-0 data-open:scale-100 data-open:opacity-100 data-open:duration-[220ms,300ms,300ms] motion-reduce:translate-y-0 motion-reduce:scale-100 max-[900px]:top-auto max-[900px]:bottom-[calc(100%+10px)] max-[900px]:origin-bottom max-[900px]:translate-y-2 max-[900px]:data-open:translate-y-0"
          data-open={toastOpen || undefined}
          role="status"
        >
        {toast && (
          <>
            <span
              className={`grid size-[26px] flex-none place-items-center rounded-lg ${toast.tone === 'absent' ? 'bg-coral-wash text-coral-deep' : 'bg-green-wash text-green-deep'}`}
              aria-hidden="true"
            >
              {toast.tone === 'absent' ? <MessageSquare size={14} strokeWidth={2} /> : <Check size={14} strokeWidth={2.5} />}
            </span>
            <span key={toast.id} className="motion-safe:animate-toast-text">
              {toast.text}
            </span>
          </>
        )}
      </div>}
    </div>
  )
}
