export type PartOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING'

const MORNING_STARTS = 5
const AFTERNOON_STARTS = 12
const EVENING_STARTS = 18

/** Morning 05:00–11:59, afternoon 12:00–17:59, evening otherwise */
export const getPartOfDay = (hour: number): PartOfDay => {
  if (hour >= MORNING_STARTS && hour < AFTERNOON_STARTS) return 'MORNING'
  if (hour >= AFTERNOON_STARTS && hour < EVENING_STARTS) return 'AFTERNOON'
  return 'EVENING'
}
