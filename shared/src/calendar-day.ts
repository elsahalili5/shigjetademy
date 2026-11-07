// Calendar days are 'YYYY-MM-DD' strings, so they compare correctly as strings.

const padded = (value: number) => String(value).padStart(2, '0')

/** Today as a 'YYYY-MM-DD' calendar day, where the code runs */
export const todayDay = () => {
  const now = new Date()
  return `${now.getFullYear()}-${padded(now.getMonth() + 1)}-${padded(now.getDate())}`
}

/** Today as a 'YYYY-MM-DD' calendar day in the time zone; en-CA writes dates that way */
export const todayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
