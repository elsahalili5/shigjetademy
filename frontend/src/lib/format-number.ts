import { PERCENT } from '@shigjetademy/shared/grades'

const percentFormat = new Intl.NumberFormat(undefined, { style: 'percent' })

const countFormat = new Intl.NumberFormat()

/** A whole percent in the user's locale, like 75% */
export const formatPercent = (percent: number) => percentFormat.format(percent / PERCENT)

/** A count in the user's locale, like 1,284 */
export const formatCount = (count: number) => countFormat.format(count)
