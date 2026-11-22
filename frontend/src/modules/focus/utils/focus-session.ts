import { z } from 'zod'

/** The lengths a student picks from for one focus session, in minutes */
export const FOCUS_DURATION_OPTIONS = [15, 25, 45, 60] as const

export const DEFAULT_FOCUS_MINUTES = 25

const MS_PER_MINUTE = 60_000
const MS_PER_SECOND = 1000

const focusGoalSchema = z.object({ id: z.string(), text: z.string(), isDone: z.boolean() })

export type FocusGoal = z.infer<typeof focusGoalSchema>

const sharedFields = { goals: z.array(focusGoalSchema), minutes: z.number().int().positive() }

const focusSessionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('idle'), ...sharedFields }),
  // endsAt is an ISO string in UTC
  z.object({ status: z.literal('running'), ...sharedFields, endsAt: z.string() }),
  z.object({ status: z.literal('paused'), ...sharedFields, remainingMs: z.number().nonnegative() }),
])

export type FocusSession = z.infer<typeof focusSessionSchema>

export const INITIAL_FOCUS_SESSION: FocusSession = { status: 'idle', goals: [], minutes: DEFAULT_FOCUS_MINUTES }

/** The goal the student is on now: the first one not done yet */
export const getCurrentGoal = (goals: readonly FocusGoal[]) => goals.find((goal) => !goal.isDone)

/** A stored session, or the initial one when the stored text is missing or not a session */
export const parseFocusSession = (raw: string | null): FocusSession => {
  if (!raw) return INITIAL_FOCUS_SESSION
  try {
    const result = focusSessionSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : INITIAL_FOCUS_SESSION
  } catch {
    // Text that isn't JSON starts a fresh session
    return INITIAL_FOCUS_SESSION
  }
}

type GetRemainingMsParams = {
  session: FocusSession
  now: number
}

/** How long is left of the session at `now`, never below zero */
export const getRemainingMs = ({ session, now }: GetRemainingMsParams): number => {
  switch (session.status) {
    case 'idle':
      return session.minutes * MS_PER_MINUTE
    case 'running':
      return Math.max(0, Date.parse(session.endsAt) - now)
    case 'paused':
      return session.remainingMs
    default: {
      const unknown: never = session
      throw new Error(`Unknown focus session: ${String(unknown)}`)
    }
  }
}

/** Milliseconds as a countdown: `25:00`, `4:05`, or `1:00:00` from an hour up */
export const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / MS_PER_SECOND)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const paddedSeconds = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
  return `${minutes}:${paddedSeconds}`
}

export const minutesToMs = (minutes: number) => minutes * MS_PER_MINUTE

/** What the timer shows: a stored running session whose time ran out is finished */
export type FocusTimerStatus = FocusSession['status'] | 'finished'

type GetFocusTimerStatusParams = {
  session: FocusSession
  isFinished: boolean
}

export const getFocusTimerStatus = ({ session, isFinished }: GetFocusTimerStatusParams): FocusTimerStatus => (isFinished ? 'finished' : session.status)

/** The share of the session still to go, from 1 at the start to 0 when it rings */
export const getRemainingFraction = ({ remainingMs, minutes }: { remainingMs: number; minutes: number }) => Math.min(1, Math.max(0, remainingMs / minutesToMs(minutes)))
