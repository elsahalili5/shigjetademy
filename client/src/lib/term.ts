// Illustrative term model. Every number on the homepage is derived from here,
// so the Term Clock can move the whole page in sync.

export const TERM_DAYS = 84
export const TERM_WEEKS = 12

export type OrgKind = 'School' | 'Academy' | 'Training centre' | 'Educator'
export type Stage = 'Enrolling' | 'In session' | 'Assessing' | 'Reported'

export type Cohort = {
  id: string
  name: string
  kind: OrgKind
  seats: number
  enrolled: number
  /** Term day on which the first session runs; may be before day 1. */
  startDay: number
  lengthDays: number
  /** 0 = Monday … 6 = Sunday */
  weekdays: number[]
  time: string
  room: string
  audience: 'families' | 'students' | 'learners'
}

export const COHORTS: Cohort[] = [
  {
    id: 'g9-math',
    name: 'Grade 9 Mathematics',
    kind: 'School',
    seats: 28,
    enrolled: 26,
    startDay: 1,
    lengthDays: 84,
    weekdays: [0, 2, 4],
    time: '09:00',
    room: 'Room 204',
    audience: 'families',
  },
  {
    id: 'ielts',
    name: 'IELTS Evening Prep',
    kind: 'Academy',
    seats: 16,
    enrolled: 14,
    startDay: -13,
    lengthDays: 70,
    weekdays: [1, 3],
    time: '18:30',
    room: 'Room B2',
    audience: 'students',
  },
  {
    id: 'forklift',
    name: 'Forklift Operator Certificate',
    kind: 'Training centre',
    seats: 12,
    enrolled: 10,
    startDay: 30,
    lengthDays: 42,
    weekdays: [5],
    time: '08:00',
    room: 'Yard 1',
    audience: 'learners',
  },
  {
    id: 'piano',
    name: 'Piano for Beginners',
    kind: 'Educator',
    seats: 8,
    enrolled: 6,
    startDay: -30,
    lengthDays: 84,
    weekdays: [4],
    time: '16:00',
    room: 'Studio',
    audience: 'families',
  },
]

export const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const STUDENTS = [
  'Arta Krasniqi',
  'Besnik Hoxha',
  'Dea Morina',
  'Elion Gashi',
  'Fjolla Berisha',
  'Gent Leka',
  'Ilira Shala',
  'Jon Dervishi',
]

/** Small deterministic hash so illustrative data is stable across renders. */
export function noise(...parts: (string | number)[]): number {
  let h = 2166136261
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const weekdayOf = (termDay: number) => (((termDay - 1) % 7) + 7) % 7
export const weekOf = (termDay: number) => Math.floor((termDay - 1) / 7) + 1

export function cohortDay(c: Cohort, termDay: number) {
  return termDay - c.startDay + 1
}

export function stageOf(c: Cohort, termDay: number): Stage {
  const d = cohortDay(c, termDay)
  if (d <= 0) return 'Enrolling'
  if (d <= c.lengthDays - 14) return 'In session'
  if (d <= c.lengthDays - 4) return 'Assessing'
  return 'Reported'
}

export function enrolledBy(c: Cohort, termDay: number) {
  const opens = c.startDay - 24
  const t = clamp((termDay - opens) / 24, 0, 1)
  return Math.max(1, Math.round(c.enrolled * (1 - (1 - t) ** 2)))
}

/** 0–1: how far the cohort has matured through its course. */
export function maturity(c: Cohort, termDay: number) {
  const d = cohortDay(c, termDay)
  if (d <= 0) return 0.05 + 0.1 * (enrolledBy(c, termDay) / c.enrolled)
  return clamp(0.15 + 0.85 * (d / c.lengthDays), 0, 1)
}

export function attendanceRate(c: Cohort) {
  return 0.86 + noise(c.id, 'rate') * 0.1
}

export function isPresent(c: Cohort, studentIndex: number, sessionDay: number) {
  return noise(c.id, studentIndex, sessionDay) < attendanceRate(c)
}

export function isLate(c: Cohort, studentIndex: number, sessionDay: number) {
  return noise(c.id, 'late', studentIndex, sessionDay) < 0.06
}

/** Term days on which this cohort meets, up to and including `upTo`. */
export function sessionsUntil(c: Cohort, upTo: number) {
  const out: number[] = []
  const last = Math.min(upTo, c.startDay + c.lengthDays - 1)
  for (let d = Math.max(c.startDay, 1); d <= last; d++) {
    if (c.weekdays.includes(weekdayOf(d))) out.push(d)
  }
  return out
}

export function nextSession(c: Cohort, termDay: number) {
  for (let d = Math.max(termDay + 1, c.startDay); d < c.startDay + c.lengthDays; d++) {
    if (c.weekdays.includes(weekdayOf(d))) return d
  }
  return null
}

/** One line that always says what happens next for this cohort. */
export function nextUp(c: Cohort, termDay: number) {
  const stage = stageOf(c, termDay)
  const d = cohortDay(c, termDay)
  switch (stage) {
    case 'Enrolling': {
      const days = c.startDay - termDay
      return `Starts in ${days} day${days === 1 ? '' : 's'} · ${enrolledBy(c, termDay)} of ${c.seats} seats`
    }
    case 'In session': {
      const next = nextSession(c, termDay)
      return next ? `Next · ${WEEKDAY[weekdayOf(next)]} ${c.time} · ${c.room}` : 'Final session this week'
    }
    case 'Assessing': {
      const due = c.lengthDays - 4 - d + 1
      return `Grades due in ${due} day${due === 1 ? '' : 's'}`
    }
    case 'Reported':
      return `Reports sent to ${c.enrolled} ${c.audience}`
  }
}

export type FeeStatus = 'Paid' | 'Due' | 'Overdue'

export function feeStatus(c: Cohort, studentIndex: number, termDay: number): FeeStatus {
  const cycleDay = ((cohortDay(c, termDay) - 1) % 28) + 1
  const n = noise(c.id, 'fee', studentIndex, Math.floor((termDay - 1) / 28))
  if (cycleDay > 14) return n < 0.08 ? 'Overdue' : 'Paid'
  if (n < 0.45 + cycleDay * 0.035) return 'Paid'
  return 'Due'
}

export function score(c: Cohort, studentIndex: number) {
  return Math.round((5.6 + noise(c.id, 'score', studentIndex) * 4.3) * 10) / 10
}

export const pad3 = (n: number) => String(Math.max(0, n)).padStart(3, '0')
