import { Pause, Play, RotateCcw } from 'lucide-react'
import { FOCUS_DURATION_OPTIONS, formatCountdown, getRemainingFraction } from '../utils/focus-session'
import type { FocusTimerStatus } from '../utils/focus-session'

const RING_SIZE = 280
const RING_STROKE = 12
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const LIGHT_BUTTON_CLASS = 'button button--light min-h-12 min-w-[148px] px-6 text-base shadow-[0_10px_30px_-12px_var(--green)]'
const NAVY_GHOST_BUTTON_CLASS =
  'button min-h-12 border-white/20 px-6 text-base text-on-navy hover:border-white/40 hover:bg-navy-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green'

const STATUS_LABELS = {
  idle: 'Ready when you are',
  running: 'Focusing',
  paused: 'Paused',
  finished: 'Time’s up',
} as const satisfies Record<FocusTimerStatus, string>

interface FocusTimerCardProps {
  status: FocusTimerStatus
  minutes: number
  remainingMs: number
  goal: string
  onMinutesChange: (minutes: number) => void
  onStart: () => void
  onPause: () => void
  onReset: () => void
}

/** The countdown on navy: a ring that empties as the session runs, the session length, and the controls */
export function FocusTimerCard({ status, minutes, remainingMs, goal, onMinutesChange, onStart, onPause, onReset }: FocusTimerCardProps) {
  const fraction = getRemainingFraction({ remainingMs, minutes })
  const isRunning = status === 'running'
  const trimmedGoal = goal.trim()

  return (
    <section
      aria-label="Timer"
      className="relative isolate overflow-hidden rounded-[28px] bg-navy px-6 pt-6 pb-8 text-white shadow-card bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--green)_26%,transparent),transparent_62%)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 font-data text-[0.78rem] tracking-[0.06em] text-on-navy uppercase">
          <span className={`size-2 rounded-full ${isRunning ? 'animate-pulse bg-green motion-reduce:animate-none' : status === 'finished' ? 'bg-kraft' : 'bg-on-navy-2'}`} aria-hidden="true" />
          {STATUS_LABELS[status]}
        </span>
        <FocusDurationPicker minutes={minutes} isDisabled={status !== 'idle'} onChange={onMinutesChange} />
      </div>

      <div className="relative mx-auto mt-8 grid aspect-square w-full max-w-[280px] place-items-center">
        {/* A soft glow behind the ring while the clock runs */}
        <div
          className={`absolute inset-6 -z-10 rounded-full bg-green blur-3xl transition-opacity duration-700 motion-reduce:transition-none ${isRunning ? 'opacity-30' : 'opacity-0'}`}
          aria-hidden="true"
        />
        <svg className="absolute inset-0 size-full -rotate-90" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden="true">
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth={RING_STROKE} className="text-white/8" />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
            className={`transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none ${status === 'paused' ? 'text-on-navy-2' : 'text-green'}`}
          />
        </svg>
        <div className="grid justify-items-center gap-2 text-center">
          <p role="timer" aria-label="Time left" className="font-data text-[clamp(3rem,7vw,4.2rem)] leading-none font-medium tracking-[-0.05em] tabular-nums">
            {formatCountdown(remainingMs)}
          </p>
          <p className="max-w-[180px] truncate text-[0.92rem] text-on-navy-2" title={trimmedGoal || undefined}>
            {trimmedGoal || `${minutes} minute session`}
          </p>
        </div>
      </div>

      {status === 'finished' ? (
        <p role="status" className="mx-auto mt-6 w-fit rounded-full bg-green/15 px-4 py-2 font-semibold text-green">
          Time’s up. Take a short break.
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <FocusControls status={status} onStart={onStart} onPause={onPause} onReset={onReset} />
      </div>
    </section>
  )
}

interface FocusDurationPickerProps {
  minutes: number
  isDisabled: boolean
  onChange: (minutes: number) => void
}

/** The session lengths, chosen before the timer starts */
function FocusDurationPicker({ minutes, isDisabled, onChange }: FocusDurationPickerProps) {
  return (
    <div role="group" aria-label="Session length" className="flex flex-wrap gap-1 rounded-full bg-white/6 p-1">
      {FOCUS_DURATION_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === minutes}
          disabled={isDisabled}
          onClick={() => onChange(option)}
          className="min-h-9 rounded-full px-3.5 text-[0.92rem] font-semibold text-on-navy-2 transition-colors duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-green disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:bg-green aria-pressed:text-navy aria-pressed:disabled:opacity-80"
        >
          {option} min
        </button>
      ))}
    </div>
  )
}

interface FocusControlsProps {
  status: FocusTimerStatus
  onStart: () => void
  onPause: () => void
  onReset: () => void
}

function FocusControls({ status, onStart, onPause, onReset }: FocusControlsProps) {
  switch (status) {
    case 'idle':
      return (
        <button type="button" className={LIGHT_BUTTON_CLASS} onClick={onStart}>
          <Play size={17} strokeWidth={2.2} aria-hidden="true" />
          Start
        </button>
      )
    case 'running':
      return (
        <>
          <button type="button" className={LIGHT_BUTTON_CLASS} onClick={onPause}>
            <Pause size={17} strokeWidth={2.2} aria-hidden="true" />
            Pause
          </button>
          <ResetButton onReset={onReset} />
        </>
      )
    case 'paused':
      return (
        <>
          <button type="button" className={LIGHT_BUTTON_CLASS} onClick={onStart}>
            <Play size={17} strokeWidth={2.2} aria-hidden="true" />
            Resume
          </button>
          <ResetButton onReset={onReset} />
        </>
      )
    case 'finished':
      return (
        <button type="button" className={LIGHT_BUTTON_CLASS} onClick={onReset}>
          <RotateCcw size={17} strokeWidth={2.2} aria-hidden="true" />
          Done
        </button>
      )
    default: {
      const unknown: never = status
      throw new Error(`Unknown focus status: ${String(unknown)}`)
    }
  }
}

interface ResetButtonProps {
  onReset: () => void
}

function ResetButton({ onReset }: ResetButtonProps) {
  return (
    <button type="button" className={NAVY_GHOST_BUTTON_CLASS} onClick={onReset}>
      <RotateCcw size={17} strokeWidth={2.2} aria-hidden="true" />
      Reset
    </button>
  )
}
