type GetDayLabelParams = {
  iso: string
  now: Date
  /** The date written the way the organization writes dates, for days that are neither today nor yesterday */
  formatDate: (iso: string) => string
}

const DAY_MS = 24 * 60 * 60 * 1000

// The reader's own calendar day, like "2026-11-10", so a day heading follows their clock
const toDayKey = (date: Date) => date.toLocaleDateString('en-CA')

/** The key two messages share when they were sent on the same day */
export const getMessageDayKey = (iso: string) => toDayKey(new Date(iso))

/** "Today", "Yesterday", or the date, for the heading above a day's messages */
export const getDayLabel = ({ iso, now, formatDate }: GetDayLabelParams) => {
  const dayKey = getMessageDayKey(iso)
  if (dayKey === toDayKey(now)) return 'Today'
  if (dayKey === toDayKey(new Date(now.getTime() - DAY_MS))) return 'Yesterday'
  return formatDate(iso)
}
