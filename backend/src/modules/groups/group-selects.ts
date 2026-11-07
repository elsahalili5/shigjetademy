// Prisma filters several modules share when they read groups: the groups services and the student and lecturer homes

/** Active enrolments: a withdrawn one keeps its row with withdrawn_on set */
export const activeEnrolments = { withdrawn_on: null } as const
