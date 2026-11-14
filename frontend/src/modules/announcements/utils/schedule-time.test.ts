import { describe, expect, it } from 'vitest'
import { toUtcIso, toWallClock } from './schedule-time'

describe('scheduling in the organization’s time zone', () => {
  it.each([
    ['Europe/Belgrade in winter, an hour ahead of UTC', 'Europe/Belgrade', '2026-11-20', '09:00', '2026-11-20T08:00:00.000Z'],
    ['Europe/Belgrade in summer, two hours ahead of UTC', 'Europe/Belgrade', '2026-07-01', '09:00', '2026-07-01T07:00:00.000Z'],
    ['America/New_York in winter, five hours behind UTC', 'America/New_York', '2026-11-20', '09:00', '2026-11-20T14:00:00.000Z'],
    ['UTC itself', 'UTC', '2026-11-20', '23:30', '2026-11-20T23:30:00.000Z'],
    ['a time that falls on the previous day in UTC', 'Europe/Belgrade', '2026-11-20', '00:30', '2026-11-19T23:30:00.000Z'],
  ])('turns a wall-clock time into UTC for %s', (_name, timeZone, day, time, expected) => {
    expect(toUtcIso({ day, time, timeZone })).toBe(expected)
  })

  it('moves a time the spring clock change skips an hour later, and takes the later of two when the autumn change repeats it', () => {
    // 02:30 doesn't exist on 2027-03-28 in Belgrade (02:00 jumps to 03:00): it lands at 03:30 local, which is 01:30 UTC
    expect(toUtcIso({ day: '2027-03-28', time: '02:30', timeZone: 'Europe/Belgrade' })).toBe('2027-03-28T01:30:00.000Z')
    // 02:30 happens twice on 2026-10-25 (CEST, then CET): the current rule picks the second, 01:30 UTC
    expect(toUtcIso({ day: '2026-10-25', time: '02:30', timeZone: 'Europe/Belgrade' })).toBe('2026-10-25T01:30:00.000Z')
  })

  it('reads the wall clock back from a UTC moment', () => {
    expect(toWallClock({ iso: '2026-11-19T23:30:00.000Z', timeZone: 'Europe/Belgrade' })).toEqual({ day: '2026-11-20', time: '00:30' })
    expect(toWallClock({ iso: '2026-07-01T07:00:00.000Z', timeZone: 'Europe/Belgrade' })).toEqual({ day: '2026-07-01', time: '09:00' })
  })
})
