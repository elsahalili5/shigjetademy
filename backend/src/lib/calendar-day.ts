/** A 'YYYY-MM-DD' calendar day as the Date Prisma stores in a @db.Date column */
export const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`)

/** A @db.Date column back as its 'YYYY-MM-DD' calendar day */
export const toDay = (date: Date) => date.toISOString().slice(0, 10)
