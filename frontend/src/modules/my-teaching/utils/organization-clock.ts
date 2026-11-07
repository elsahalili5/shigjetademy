const WEEKEND_DAYS = new Set(['Sat', 'Sun'])

type GetOrganizationClockParams = {
  now: Date
  /** The organization's IANA time zone */
  timeZone: string
}

/** Where the organization is in its own day: its calendar day, the hour (0–23) and whether it's the weekend */
export type OrganizationClock = {
  day: string
  hour: number
  isWeekend: boolean
}

// en-US with h23 only fixes how the parts are written (2-digit numbers, "Sat"), not what the user sees
const toParts = ({ now, timeZone }: GetOrganizationClockParams) =>
  new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(now)

export const getOrganizationClock = (params: GetOrganizationClockParams): OrganizationClock => {
  const parts = toParts(params)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return { day: `${part('year')}-${part('month')}-${part('day')}`, hour: Number(part('hour')), isWeekend: WEEKEND_DAYS.has(part('weekday')) }
}
