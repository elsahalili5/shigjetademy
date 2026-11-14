// The organization's wall clock and the UTC instant it means, for scheduling an announcement in the school's time zone.

type WallClock = {
  /** 'YYYY-MM-DD' */
  day: string
  /** 'HH:MM' */
  time: string
}

type ToUtcIsoParams = WallClock & {
  timeZone: string
}

const getZoneParts = ({ date, timeZone }: { date: Date; timeZone: string }) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return { day: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}`, seconds: part('second') }
}

/** How far the zone's clock is ahead of UTC at that moment, in milliseconds */
const getOffsetMs = ({ date, timeZone }: { date: Date; timeZone: string }) => {
  const { day, time, seconds } = getZoneParts({ date, timeZone })
  const zoned = new Date(`${day}T${time}:${seconds}.000Z`).getTime()
  return zoned - Math.floor(date.getTime() / 1000) * 1000
}

/** The moment a wall-clock day and time are in the time zone, as an ISO timestamp in UTC; a time a daylight saving change skips lands an hour later */
export const toUtcIso = ({ day, time, timeZone }: ToUtcIsoParams) => {
  const asUtc = new Date(`${day}T${time}:00.000Z`)
  const first = new Date(asUtc.getTime() - getOffsetMs({ date: asUtc, timeZone }))
  const second = new Date(asUtc.getTime() - getOffsetMs({ date: first, timeZone }))
  return second.toISOString()
}

/** The wall-clock day and time in the time zone at an ISO moment */
export const toWallClock = ({ iso, timeZone }: { iso: string; timeZone: string }): WallClock => {
  const { day, time } = getZoneParts({ date: new Date(iso), timeZone })
  return { day, time }
}

/** True when the wall-clock day and time are still ahead in the time zone */
export const isInFuture = ({ day, time, timeZone }: ToUtcIsoParams) => new Date(toUtcIso({ day, time, timeZone })).getTime() > Date.now()
