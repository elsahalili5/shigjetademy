type GetAgeParams = {
  /** A calendar day like '2019-03-14' */
  dateOfBirth: string
  today: string
}

export type Age = { unit: 'year' | 'month'; value: number }

const MONTHS_PER_YEAR = 12

const toParts = (day: string) => day.split('-').map(Number)

/** Full years old, or full months for a child under one */
export const getAge = ({ dateOfBirth, today }: GetAgeParams): Age => {
  const [birthYear = 0, birthMonth = 0, birthDay = 0] = toParts(dateOfBirth)
  const [year = 0, month = 0, day = 0] = toParts(today)
  const months = (year - birthYear) * MONTHS_PER_YEAR + (month - birthMonth) - (day < birthDay ? 1 : 0)
  const fullMonths = Math.max(months, 0)
  return fullMonths < MONTHS_PER_YEAR ? { unit: 'month', value: fullMonths } : { unit: 'year', value: Math.floor(fullMonths / MONTHS_PER_YEAR) }
}
