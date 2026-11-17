/** "Out of 20 points", or "No points" for an assignment marked with feedback only */
export const getPointsLabel = (maxPoints: number | null) => (maxPoints === null ? 'No points' : `Out of ${maxPoints} points`)

/** "18 / 20 points" */
export const getMarkPointsLabel = ({ points, maxPoints }: { points: number; maxPoints: number }) => `${points} / ${maxPoints} points`

export const NO_LATE_HAND_INS_LABEL = 'No late hand-ins'
