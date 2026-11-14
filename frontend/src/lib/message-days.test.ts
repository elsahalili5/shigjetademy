import { describe, expect, it } from 'vitest'
import { getDayLabel, getMessageDayKey } from './message-days'

const NOW = new Date(2026, 10, 12, 15, 0)
const formatDate = (iso: string) => `date:${iso.slice(0, 10)}`

describe('getDayLabel', () => {
  it('says Today and Yesterday, and writes the date for older days', () => {
    expect(getDayLabel({ iso: new Date(2026, 10, 12, 9, 30).toISOString(), now: NOW, formatDate })).toBe('Today')
    expect(getDayLabel({ iso: new Date(2026, 10, 11, 23, 59).toISOString(), now: NOW, formatDate })).toBe('Yesterday')
    expect(getDayLabel({ iso: new Date(2026, 10, 3, 9, 0).toISOString(), now: NOW, formatDate })).toMatch(/^date:/)
  })
})

describe('getMessageDayKey', () => {
  it('is the same for two times on one day and different on the next', () => {
    expect(getMessageDayKey(new Date(2026, 10, 12, 0, 5).toISOString())).toBe(getMessageDayKey(new Date(2026, 10, 12, 23, 55).toISOString()))
    expect(getMessageDayKey(new Date(2026, 10, 12, 12, 0).toISOString())).not.toBe(getMessageDayKey(new Date(2026, 10, 13, 12, 0).toISOString()))
  })
})
