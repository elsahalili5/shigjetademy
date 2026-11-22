import { useSyncExternalStore } from 'react'
import { INITIAL_FOCUS_SESSION, getRemainingMs, minutesToMs, parseFocusSession } from '../utils/focus-session'
import type { FocusSession } from '../utils/focus-session'

export const FOCUS_SESSION_STORAGE_KEY = 'shigjetademy-focus-session'

const TICK_MS = 1000

const listeners = new Set<() => void>()
// The session stays in memory too, so it still works for this visit when storage is blocked
let memoryRaw: string | null = null
let cachedRaw: string | null | undefined
let cachedSession: FocusSession = INITIAL_FOCUS_SESSION

const readRaw = (): string | null => {
  try {
    return localStorage.getItem(FOCUS_SESSION_STORAGE_KEY)
  } catch {
    return memoryRaw
  }
}

const readSession = (): FocusSession => {
  const raw = readRaw()
  // useSyncExternalStore needs the same object back while nothing changed
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedSession = parseFocusSession(raw)
  }
  return cachedSession
}

const writeSession = (session: FocusSession) => {
  const raw = JSON.stringify(session)
  memoryRaw = raw
  try {
    localStorage.setItem(FOCUS_SESSION_STORAGE_KEY, raw)
  } catch {
    // Blocked storage keeps the session for this visit only
  }
  listeners.forEach((listener) => listener())
}

const subscribeSession = (onChange: () => void) => {
  listeners.add(onChange)
  // Another tab starting or stopping the timer shows here too
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FOCUS_SESSION_STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', handleStorage)
  }
}

const subscribeClock = (onTick: () => void) => {
  const id = window.setInterval(onTick, TICK_MS)
  return () => window.clearInterval(id)
}

const subscribeNothing = () => () => undefined

/**
 * The student's focus timer and goals, shared by the Focus page and the sidebar and kept across reloads.
 * While running it re-renders once a second so the countdown moves.
 */
export function useFocusSession() {
  const session = useSyncExternalStore(subscribeSession, readSession)
  const isRunning = session.status === 'running'
  // Whole seconds left, so the snapshot only changes when the countdown does
  const remainingSeconds = useSyncExternalStore(isRunning ? subscribeClock : subscribeNothing, () => Math.ceil(getRemainingMs({ session, now: Date.now() }) / TICK_MS))
  const remainingMs = remainingSeconds * TICK_MS
  const isFinished = isRunning && remainingSeconds === 0

  const addGoal = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    writeSession({ ...session, goals: [...session.goals, { id: crypto.randomUUID(), text: trimmed, isDone: false }] })
  }

  const toggleGoal = (id: string) => writeSession({ ...session, goals: session.goals.map((goal) => (goal.id === id ? { ...goal, isDone: !goal.isDone } : goal)) })

  const removeGoal = (id: string) => writeSession({ ...session, goals: session.goals.filter((goal) => goal.id !== id) })

  const setMinutes = (minutes: number) => {
    if (session.status !== 'idle') return
    writeSession({ ...session, minutes })
  }

  const start = () => {
    const ms = session.status === 'paused' ? session.remainingMs : minutesToMs(session.minutes)
    writeSession({ status: 'running', goals: session.goals, minutes: session.minutes, endsAt: new Date(Date.now() + ms).toISOString() })
  }

  const pause = () => {
    if (session.status !== 'running') return
    writeSession({ status: 'paused', goals: session.goals, minutes: session.minutes, remainingMs: getRemainingMs({ session, now: Date.now() }) })
  }

  const reset = () => writeSession({ status: 'idle', goals: session.goals, minutes: session.minutes })

  return { session, remainingMs, isFinished, addGoal, toggleGoal, removeGoal, setMinutes, start, pause, reset }
}
