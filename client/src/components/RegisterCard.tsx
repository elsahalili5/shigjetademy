import { useEffect, useRef, useState } from 'react'
import { Check, MessageSquare } from 'lucide-react'
import studentPhoto from '../assets/photos/student.jpg'
import './RegisterCard.css'

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
    <div className="register">
      <div className="card card--register">
        <div className="card__head">
          <span>
            <strong>Grade 9 Mathematics</strong>
            <span>Register · 09:00 · Room 204</span>
          </span>
          <span className="card__live">Live</span>
        </div>

        <p className="card__stat tabular" aria-live="polite">
          <span className="register__count">
            <span key={count} className="register__tick" data-dir={dir}>
              {count}
            </span>
          </span>
          <span>/ {CLASS_SIZE} present</span>
        </p>

        <div className="card__meter" aria-hidden="true">
          <span className="register__fill" style={{ transform: `scaleX(${count / CLASS_SIZE})` }} />
        </div>

        <p className="register__hint">Tap a student to take the register</p>
        <ul className="register__students">
          {STUDENTS.map((s, n) => (
            <li key={s.first}>
              <button
                type="button"
                className="register__student"
                aria-pressed={present[n]}
                aria-label={`${s.first} ${s.last}, ${present[n] ? 'present' : 'absent'}`}
                onClick={() => toggle(n)}
              >
                {s.photo ? (
                  <img src={s.photo} alt="" width={34} height={34} />
                ) : (
                  <span>
                    {s.first[0]}
                    {s.last[0]}
                  </span>
                )}
                <i aria-hidden="true">{present[n] && <Check size={9} strokeWidth={4} />}</i>
              </button>
            </li>
          ))}
        </ul>

        <p className="register__foot">
          {absent} absent · {absent === 1 ? 'family' : 'families'} notified
        </p>
      </div>

      {!onEvent && <div className="register__toast" data-open={toastOpen || undefined} data-tone={toast?.tone} role="status">
        {toast && (
          <>
            <span className="register__toast-icon" aria-hidden="true">
              {toast.tone === 'absent' ? <MessageSquare size={14} strokeWidth={2} /> : <Check size={14} strokeWidth={2.5} />}
            </span>
            <span key={toast.id} className="register__toast-text">
              {toast.text}
            </span>
          </>
        )}
      </div>}
    </div>
  )
}
