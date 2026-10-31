// Calendar days are 'YYYY-MM-DD' strings, so they compare correctly as strings.

const padded = (value: number) => String(value).padStart(2, '0')

/** Today as a 'YYYY-MM-DD' calendar day, where the code runs */
export const todayDay = () => {
  const now = new Date()
  return `${now.getFullYear()}-${padded(now.getMonth() + 1)}-${padded(now.getDate())}`
}
