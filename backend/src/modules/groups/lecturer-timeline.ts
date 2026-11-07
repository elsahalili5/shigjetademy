import { addDays } from '@lib/calendar-day.ts'

/** One permanent row with its days as 'YYYY-MM-DD'; the rows of a group never overlap */
export type TimelineRow = {
  lecturer_id: string
  start_date: string
  /** Null while open */
  end_date: string | null
}

type StoredRow = TimelineRow & {
  id: string
}

type RowsOnDayParams<Row extends TimelineRow> = {
  rows: Row[]
  day: string
}

const getRowOn = <Row extends TimelineRow>({ rows, day }: RowsOnDayParams<Row>) => rows.find((row) => row.start_date <= day && (row.end_date === null || row.end_date >= day))

const getPastRows = <Row extends TimelineRow>({ rows, day }: RowsOnDayParams<Row>) => rows.filter((row) => row.end_date !== null && row.end_date < day)

/** The lecturer on this day; a change to them cancels what was planned rather than adding a row */
export const getLecturerIdOn = (params: RowsOnDayParams<StoredRow>) => getRowOn(params)?.lecturer_id ?? null

type GetEarliestChangeParams = RowsOnDayParams<StoredRow> & {
  yearStart: string
}

/** What limits how early a change may start: the current lecturer's first day, the day after the last one's final day, or without either, the school year's first day */
export const getEarliestChange = ({ rows, day, yearStart }: GetEarliestChangeParams) => {
  const current = getRowOn({ rows, day })
  if (current) return { kind: 'CURRENT_START', day: current.start_date } as const
  const lastDay = getPastRows({ rows, day }).at(-1)?.end_date
  return lastDay ? ({ kind: 'AFTER_LAST_END', day: addDays({ day: lastDay, days: 1 }) } as const) : ({ kind: 'YEAR_START', day: yearStart } as const)
}

type PlanLecturerChangeParams = {
  rows: StoredRow[]
  today: string
  lecturerId: string | null
  effectiveFrom: string
}

/** Past rows stay. The current row runs up to the change, or goes when the change starts on its first day, as a correction. Anything still to come is replaced. */
export const planLecturerChange = ({ rows, today, lecturerId, effectiveFrom }: PlanLecturerChangeParams) => {
  const past = getPastRows({ rows, day: today })
  const current = getRowOn({ rows, day: today })
  if (current && current.lecturer_id === lecturerId) {
    return { past, current: { ...current, end_date: null }, added: null }
  }
  return {
    past,
    current: current && current.start_date < effectiveFrom ? { ...current, end_date: addDays({ day: effectiveFrom, days: -1 }) } : null,
    added: lecturerId ? { lecturer_id: lecturerId, start_date: effectiveFrom, end_date: null } : null,
  }
}

type SubstitutionDays = {
  lecturer_id: string
  start_date: string
  end_date: string
}

type GetSubstitutionConflictParams = {
  rows: TimelineRow[]
  substitution: SubstitutionDays
}

/** Why the substitution can't sit on these rows, if so: a substitute covers for a permanent lecturer on every one of its days, and is never that lecturer */
export const getSubstitutionConflict = ({ rows, substitution }: GetSubstitutionConflictParams) => {
  const overlapping = rows.filter((row) => row.start_date <= substitution.end_date && (row.end_date === null || row.end_date >= substitution.start_date))
  if (overlapping.some((row) => row.lecturer_id === substitution.lecturer_id)) return 'IS_PERMANENT_LECTURER'
  let firstUncovered = substitution.start_date
  for (const row of overlapping) {
    if (row.start_date > firstUncovered) return 'NO_PERMANENT_LECTURER'
    if (row.end_date === null) return null
    firstUncovered = addDays({ day: row.end_date, days: 1 })
  }
  return firstUncovered > substitution.end_date ? null : 'NO_PERMANENT_LECTURER'
}
