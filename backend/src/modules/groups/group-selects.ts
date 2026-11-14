import type { Prisma } from '@generated/prisma/client.ts'

// Prisma filters several modules share when they read groups: the groups services and the student and lecturer homes

/** Active enrolments: a withdrawn one keeps its row with withdrawn_on set */
export const activeEnrolments = { withdrawn_on: null } as const

/** Permanent lecturer assignments that cover a calendar day, both ends included; an open one has no end */
export const assignmentCoveringDay = (day: Date) =>
  ({ start_date: { lte: day }, OR: [{ end_date: null }, { end_date: { gte: day } }] }) satisfies Prisma.GroupLecturerAssignmentWhereInput
