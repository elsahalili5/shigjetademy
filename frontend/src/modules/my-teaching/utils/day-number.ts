const DAY_MS = 24 * 60 * 60 * 1000

/** A 'YYYY-MM-DD' calendar day as whole days since 1970-01-01, so days subtract without time zones */
export const toDayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00.000Z`) / DAY_MS)
