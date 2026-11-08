type GetMsUntilParams = {
  now: Date
  /** The organization's IANA time zone */
  timeZone: string
  /** 'YYYY-MM-DD' */
  day: string
  /** 'HH:MM' */
  time: string
}

// en-CA with h23 only fixes how the parts are written, not what the user sees
const toWallClockParts = ({ now, timeZone }: Pick<GetMsUntilParams, 'now' | 'timeZone'>) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now)

/** Milliseconds from now until the wall-clock time on the day in the time zone; measured between wall clocks, so it's off by the shift on a day the clocks change */
export const getMsUntil = ({ now, timeZone, day, time }: GetMsUntilParams) => {
  const parts = toWallClockParts({ now, timeZone })
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  const wallNow = Date.parse(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}.000Z`) + now.getMilliseconds()
  return Date.parse(`${day}T${time}:00.000Z`) - wallNow
}
