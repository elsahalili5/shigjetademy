/** A 'YYYY-MM-DD' calendar day as the Date Prisma stores in a @db.Date column */
export const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`)

/** A @db.Date column back as its 'YYYY-MM-DD' calendar day */
export const toDay = (date: Date) => date.toISOString().slice(0, 10)

const MS_PER_DAY = 86_400_000

type AddDaysParams = {
  day: string
  days: number
}

/** The 'YYYY-MM-DD' calendar day this many days later, or earlier when negative */
export const addDays = ({ day, days }: AddDaysParams) => toDay(new Date(toDate(day).getTime() + days * MS_PER_DAY))

/** A wall-clock time like '17:00' as the Date Prisma stores in a @db.Time column, on 1970-01-01 in UTC so no zone shifts it */
export const toTime = (time: string) => new Date(`1970-01-01T${time}:00.000Z`)

/** A @db.Time column back as its 'HH:MM' wall-clock time */
export const toClock = (date: Date) => date.toISOString().slice(11, 16)
