/** Whole points, as typed */
export const WHOLE_NUMBER = /^\d+$/

/** "Out of 40 points" */
export const getPointsLabel = (maxPoints: number) => `Out of ${maxPoints} points`

/** "18 / 40 points" */
export const getResultPointsLabel = ({ points, maxPoints }: { points: number; maxPoints: number }) => `${points} / ${maxPoints} points`
