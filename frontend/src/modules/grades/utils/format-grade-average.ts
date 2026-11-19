import type { GradeAverage } from '@shigjetademy/shared/grades'

const percentFormat = new Intl.NumberFormat(undefined, { style: 'percent' })

const PERCENT = 100

/** The average as a percentage in the user's locale, like 83% */
export const formatGradeAverage = (average: GradeAverage) => percentFormat.format(average.percent / PERCENT)
