import type { GradeAverage } from '@shigjetademy/shared/grades'
import { formatPercent } from '#/lib/format-number'

/** The average as a percentage in the user's locale, like 83% */
export const formatGradeAverage = (average: GradeAverage) => formatPercent(average.percent)
