// Calendar days are 'YYYY-MM-DD' strings, so they compare correctly as strings.

const padded = (value: number) => String(value).padStart(2, '0')

/** Today as a 'YYYY-MM-DD' calendar day, where the code runs */
export const todayDay = () => {
  const now = new Date()
  return `${now.getFullYear()}-${padded(now.getMonth() + 1)}-${padded(now.getDate())}`
}


/** The calendar day as 'YYYY-MM-DD' and the wall-clock time as 'HH:MM' in the time zone, read from one moment so they always agree; en-CA writes dates that way */
export const nowIn = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return { day: `${part('year')}-${part('month')}-${part('day')}`, clock: `${part('hour')}:${part('minute')}` }
}

/** Today as a 'YYYY-MM-DD' calendar day in the time zone */
export const todayIn = (timeZone: string) => nowIn(timeZone).day
