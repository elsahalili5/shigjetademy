import type { Prisma } from '@generated/prisma/client.ts'
import { getLecturerName } from '@shigjetademy/shared/lecturers'
import type { GroupInput, GroupLecturer, GroupLecturerHistory, GroupLecturerOption, GroupStatus, GroupSubstitution, GroupSubstitutionInput } from '@shigjetademy/shared/groups'
import { addDays, toDate, toDay } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { outside } from '@modules/academic-periods/academic-periods.utils.ts'
import { getEarliestChange, getLecturerIdOn, getSubstitutionConflict, planLecturerChange } from './lecturer-timeline.ts'
import type { TimelineRow } from './lecturer-timeline.ts'

const groupLecturerSelect = { id: true, first_name: true, last_name: true, status: true } as const

/** The rows that haven't ended by this day: the current lecturer and any change to come, in date order */
export const ongoingAssignments = (today: string) => ({
  where: { OR: [{ end_date: null }, { end_date: { gte: toDate(today) } }] },
  orderBy: { start_date: 'asc' as const },
  select: { start_date: true, end_date: true, lecturer: { select: groupLecturerSelect } },
})

type OngoingAssignment = {
  start_date: Date
  end_date: Date | null
  lecturer: GroupLecturer
}

type GetLecturerFieldsParams = {
  assignments: OngoingAssignment[]
  today: string
}

const getLecturerChange = ({ assignments, today }: GetLecturerFieldsParams) => {
  const next = assignments.find((assignment) => toDay(assignment.start_date) > today)
  if (next) return { lecturer: next.lecturer, start_date: toDay(next.start_date) }
  const lastDay = assignments.at(-1)?.end_date
  return lastDay ? { lecturer: null, start_date: addDays({ day: toDay(lastDay), days: 1 }) } : null
}

/** The lecturer on this day and the change still to come */
export const getLecturerFields = ({ assignments, today }: GetLecturerFieldsParams) => ({
  lecturer: assignments.find((assignment) => toDay(assignment.start_date) <= today)?.lecturer ?? null,
  lecturer_change: getLecturerChange({ assignments, today }),
})

type CheckLecturerParams = OrganizationScope & {
  lecturerId: string
}

/** The lecturer must be the organization's own and active */
export const checkLecturer = async ({ tx, organizationId, lecturerId }: CheckLecturerParams) => {
  const lecturer = await tx.lecturer.findFirst({ where: { id: lecturerId, organization_id: organizationId }, select: { status: true } })
  if (!lecturer) {
    throw refuseField({ field: 'lecturer_id', status: 400, message: 'Choose one of your organization’s lecturers.' })
  }
  if (lecturer.status === 'ARCHIVED') {
    throw refuseField({ field: 'lecturer_id', status: 409, message: 'This lecturer is archived. Restore them first.' })
  }
}

type CheckNewLecturerParams = CheckLecturerParams & {
  year: { end_date: Date }
  today: string
}

/** A lecturer joining a group: checked like any lecturer, and the group's school year must still be running */
export const checkNewLecturer = async ({ tx, organizationId, lecturerId, year, today }: CheckNewLecturerParams) => {
  await checkLecturer({ tx, organizationId, lecturerId })
  if (toDay(year.end_date) < today) {
    throw refuseField({ field: 'lecturer_id', status: 409, message: 'This school year has ended, so the group can’t take a new lecturer.' })
  }
}

type CountOutsideYearParams = Pick<OrganizationScope, 'tx'> & {
  groups: Prisma.GroupWhereInput
  range: { start: Date; end: Date }
  today: string
}

/** How many substitutions ending today or later and planned lecturers of these groups fall outside the range. Cancelled substitutions don't count, and past substitutions and past and current lecturers are history. */
export const countOutsideYear = async ({ tx, groups, range, today }: CountOutsideYearParams) => {
  const substitutions = await tx.groupSubstitution.count({ where: { group: groups, cancelled_at: null, end_date: { gte: toDate(today) }, ...outside(range) } })
  const plannedLecturers = await tx.groupLecturerAssignment.count({
    where: { group: groups, start_date: { gt: toDate(today) }, OR: [{ start_date: { lt: range.start } }, { start_date: { gt: range.end } }] },
  })
  return substitutions + plannedLecturers
}

type CheckMoveToYearParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
  yearId: string
  today: string
}

/** A group moving to another school year can't leave substitutions or a planned lecturer outside it; runs after any change of lecturer, so it sees the final rows */
export const checkMoveToYear = async ({ tx, groupId, yearId, today }: CheckMoveToYearParams) => {
  const year = await tx.academicYear.findUniqueOrThrow({ where: { id: yearId }, select: { start_date: true, end_date: true } })
  if ((await countOutsideYear({ tx, groups: { id: groupId }, range: { start: year.start_date, end: year.end_date }, today })) > 0) {
    throw refuseField({ field: 'academic_year_id', status: 409, message: 'This group has substitutions or a planned lecturer change outside that school year. Change or cancel them first.' })
  }
}

type ReadTimelineParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
}

/** The group's permanent rows, oldest first, with their days as 'YYYY-MM-DD' */
const readTimeline = async ({ tx, groupId }: ReadTimelineParams) => {
  const rows = await tx.groupLecturerAssignment.findMany({ where: { group_id: groupId }, orderBy: { start_date: 'asc' }, select: { id: true, lecturer_id: true, start_date: true, end_date: true } })
  return rows.map((row) => ({ ...row, start_date: toDay(row.start_date), end_date: row.end_date && toDay(row.end_date) }))
}

const EARLIEST_CHANGE_MESSAGES = {
  CURRENT_START: 'The change can’t start before the current lecturer’s start.',
  AFTER_LAST_END: 'The change can’t start before the last lecturer’s final day has passed.',
  YEAR_START: 'The change can’t start before the school year starts.',
} as const

type CheckSubstitutionsFitParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
  rows: TimelineRow[]
}

/** A change of permanent lecturer must leave every substitution on the group valid: covering for someone, and never for themselves */
const checkSubstitutionsFit = async ({ tx, groupId, rows }: CheckSubstitutionsFitParams) => {
  const substitutions = await tx.groupSubstitution.findMany({
    where: { group_id: groupId, cancelled_at: null },
    select: { lecturer_id: true, start_date: true, end_date: true, lecturer: { select: { first_name: true, last_name: true } } },
  })
  for (const substitution of substitutions) {
    const conflict = getSubstitutionConflict({ rows, substitution: { lecturer_id: substitution.lecturer_id, start_date: toDay(substitution.start_date), end_date: toDay(substitution.end_date) } })
    if (conflict === 'IS_PERMANENT_LECTURER') {
      throw refuseField({ field: 'lecturer_id', status: 409, message: `${getLecturerName(substitution.lecturer)} substitutes on this group on days they would teach it permanently. Cancel or change that substitution first.` })
    }
    if (conflict === 'NO_PERMANENT_LECTURER') {
      throw refuseField({ field: 'lecturer_id', status: 409, message: 'A substitution on this group would be left without a permanent lecturer. Cancel or change it first.' })
    }
  }
}

type ChangeLecturerParams = OrganizationScope & {
  group: { id: string; status: GroupStatus }
  data: Pick<GroupInput, 'academic_year_id' | 'lecturer_id' | 'lecturer_effective_from'>
  today: string
}

/** Applies a change of permanent lecturer from an edit. No date means no change, so a form opened before someone else's change can't undo it. Choosing who teaches today only drops what was planned, so its date doesn't matter. The caller holds the organization lock and has checked the year. */
export const changeLecturer = async ({ tx, organizationId, group, data, today }: ChangeLecturerParams) => {
  const effectiveFrom = data.lecturer_effective_from
  if (effectiveFrom === null) {
    return
  }
  if (group.status === 'ARCHIVED') {
    throw refuseField({ field: 'lecturer_id', status: 409, message: 'This group is archived. Restore it first.' })
  }
  const rows = await readTimeline({ tx, groupId: group.id })
  if (data.lecturer_id !== getLecturerIdOn({ rows, day: today })) {
    const year = await tx.academicYear.findUniqueOrThrow({ where: { id: data.academic_year_id }, select: { start_date: true, end_date: true } })
    if (data.lecturer_id) {
      await checkNewLecturer({ tx, organizationId, lecturerId: data.lecturer_id, year, today })
    }
    const yearStart = toDay(year.start_date)
    if (yearStart > today && effectiveFrom < yearStart) {
      throw refuseField({ field: 'lecturer_effective_from', status: 400, message: EARLIEST_CHANGE_MESSAGES.YEAR_START })
    }
    const earliest = getEarliestChange({ rows, day: today, yearStart })
    if (effectiveFrom < earliest.day) {
      throw refuseField({ field: 'lecturer_effective_from', status: 400, message: EARLIEST_CHANGE_MESSAGES[earliest.kind] })
    }
    if (effectiveFrom > toDay(year.end_date)) {
      throw refuseField({ field: 'lecturer_effective_from', status: 400, message: 'The change can’t start after the school year ends.' })
    }
  }
  const plan = planLecturerChange({ rows, today, lecturerId: data.lecturer_id, effectiveFrom })
  await checkSubstitutionsFit({ tx, groupId: group.id, rows: [...plan.past, ...(plan.current ? [plan.current] : []), ...(plan.added ? [plan.added] : [])] })
  const keptIds = [...plan.past.map((row) => row.id), ...(plan.current ? [plan.current.id] : [])]
  await tx.groupLecturerAssignment.deleteMany({ where: { group_id: group.id, id: { notIn: keptIds } } })
  if (plan.current) {
    await tx.groupLecturerAssignment.update({ where: { id: plan.current.id }, data: { end_date: plan.current.end_date === null ? null : toDate(plan.current.end_date) } })
  }
  if (plan.added) {
    await tx.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: plan.added.lecturer_id, start_date: toDate(plan.added.start_date) } })
  }
}

const substitutionSelect = { id: true, start_date: true, end_date: true, note: true, cancelled_at: true, lecturer: { select: groupLecturerSelect } } as const

type StoredSubstitution = {
  id: string
  start_date: Date
  end_date: Date
  note: string | null
  cancelled_at: Date | null
  lecturer: GroupLecturer
}

const toSubstitutionJson = (substitution: StoredSubstitution): GroupSubstitution => ({
  ...substitution,
  start_date: toDay(substitution.start_date),
  end_date: toDay(substitution.end_date),
  cancelled_at: substitution.cancelled_at && substitution.cancelled_at.toISOString(),
})

type FindGroupParams = OrganizationScope & {
  groupId: string
}

/** The organization's group with its year's days, or a 404 */
const findGroup = async ({ tx, organizationId, groupId }: FindGroupParams) => {
  const group = await tx.group.findFirst({
    where: { id: groupId, organization_id: organizationId },
    select: { id: true, name: true, status: true, academic_year: { select: { start_date: true, end_date: true } } },
  })
  if (!group) {
    throw new HttpError(404, 'Group not found')
  }
  return group
}

type CheckSubstitutionParams = OrganizationScope & {
  group: Awaited<ReturnType<typeof findGroup>>
  data: GroupSubstitutionInput
  today: string
  /** The substitution being edited, whose own days are free */
  substitutionId?: string
  /** A started substitution keeps its substitute, so an archived one doesn't stop its end date moving */
  isSubstituteKept?: boolean
}

/** Every rule a substitution keeps: an active group and substitute, days inside the school year, a different permanent lecturer on each of them, and no other substitution on the group */
const checkSubstitution = async ({ tx, organizationId, group, data, today, substitutionId, isSubstituteKept = false }: CheckSubstitutionParams) => {
  if (group.status === 'ARCHIVED') {
    throw new HttpError(409, 'This group is archived. Restore it first.')
  }
  if (!isSubstituteKept) {
    await checkLecturer({ tx, organizationId, lecturerId: data.lecturer_id })
  }
  if (data.start_date < toDay(group.academic_year.start_date)) {
    throw refuseField({ field: 'start_date', status: 400, message: 'Keep the dates inside the school year.' })
  }
  if (data.end_date > toDay(group.academic_year.end_date)) {
    throw refuseField({ field: 'end_date', status: 400, message: 'Keep the dates inside the school year.' })
  }
  if (data.end_date < today) {
    throw refuseField({ field: 'end_date', status: 400, message: 'The end date can’t be before today.' })
  }
  const conflict = getSubstitutionConflict({ rows: await readTimeline({ tx, groupId: group.id }), substitution: data })
  if (conflict === 'IS_PERMANENT_LECTURER') {
    throw refuseField({ field: 'lecturer_id', status: 409, message: 'This lecturer is the group’s permanent lecturer on some of these days.' })
  }
  if (conflict === 'NO_PERMANENT_LECTURER') {
    throw refuseField({ field: 'start_date', status: 409, message: 'The group needs a permanent lecturer on every one of these days.' })
  }
  const overlapping = await tx.groupSubstitution.findFirst({
    where: { id: substitutionId ? { not: substitutionId } : undefined, group_id: group.id, cancelled_at: null, start_date: { lte: toDate(data.end_date) }, end_date: { gte: toDate(data.start_date) } },
    select: { id: true },
  })
  if (overlapping) {
    throw refuseField({ field: 'start_date', status: 409, message: 'Another substitution already covers some of these days.' })
  }
}

type FindOpenSubstitutionParams = OrganizationScope & {
  groupId: string
  substitutionId: string
}

/** The group's substitution with its days and the organization's today, or a 404; only one that isn't cancelled and hasn't ended can change */
const findOpenSubstitution = async ({ tx, organizationId, groupId, substitutionId }: FindOpenSubstitutionParams) => {
  const substitution = await tx.groupSubstitution.findFirst({ where: { id: substitutionId, group_id: groupId }, select: { lecturer_id: true, start_date: true, end_date: true, cancelled_at: true } })
  if (!substitution) {
    throw new HttpError(404, 'Substitution not found')
  }
  if (substitution.cancelled_at) {
    throw new HttpError(409, 'This substitution is cancelled.')
  }
  const today = await getOrganizationToday({ db: tx, organizationId })
  if (toDay(substitution.end_date) < today) {
    throw new HttpError(409, 'This substitution is over, so it can’t change.')
  }
  return { lecturerId: substitution.lecturer_id, startDate: toDay(substitution.start_date), today }
}

const toSubstitutionColumns = ({ lecturer_id, start_date, end_date, note }: GroupSubstitutionInput) => ({ lecturer_id, start_date: toDate(start_date), end_date: toDate(end_date), note: note || null })

type GetLecturerHistoryParams = {
  organizationId: string
  groupId: string
}

type AddSubstitutionParams = GetLecturerHistoryParams & {
  actorId: string
  data: GroupSubstitutionInput
}

type CancelSubstitutionParams = GetLecturerHistoryParams & {
  substitutionId: string
  actorId: string
}

type UpdateSubstitutionParams = CancelSubstitutionParams & {
  data: GroupSubstitutionInput
}

export const GroupLecturerService = {
  listLecturerOptions: (organizationId: string): Promise<GroupLecturerOption[]> =>
    prisma.lecturer.findMany({
      where: { organization_id: organizationId, status: 'ACTIVE' },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }, { id: 'asc' }],
      select: { id: true, first_name: true, last_name: true, subjects: true },
    }),

  getLecturerHistory: async ({ organizationId, groupId }: GetLecturerHistoryParams): Promise<GroupLecturerHistory> => {
    const group = await prisma.group.findFirst({
      where: { id: groupId, organization_id: organizationId },
      select: {
        lecturer_assignments: { orderBy: { start_date: 'desc' }, select: { id: true, start_date: true, end_date: true, lecturer: { select: groupLecturerSelect } } },
        substitutions: { orderBy: [{ start_date: 'desc' }, { created_at: 'desc' }], select: substitutionSelect },
      },
    })
    if (!group) {
      throw new HttpError(404, 'Group not found')
    }
    return {
      assignments: group.lecturer_assignments.map((assignment) => ({ ...assignment, start_date: toDay(assignment.start_date), end_date: assignment.end_date && toDay(assignment.end_date) })),
      substitutions: group.substitutions.map(toSubstitutionJson),
    }
  },

  addSubstitution: ({ organizationId, groupId, actorId, data }: AddSubstitutionParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const group = await findGroup({ tx, organizationId, groupId })
      await checkSubstitution({ tx, organizationId, group, data, today: await getOrganizationToday({ db: tx, organizationId }) })
      const substitution = await tx.groupSubstitution.create({ data: { group_id: groupId, ...toSubstitutionColumns(data) }, select: substitutionSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GROUP_SUBSTITUTION_ADDED', organization_id: organizationId, subject_name: group.name } })
      return toSubstitutionJson(substitution)
    }),

  updateSubstitution: ({ organizationId, groupId, substitutionId, actorId, data }: UpdateSubstitutionParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const group = await findGroup({ tx, organizationId, groupId })
      const { lecturerId, startDate, today } = await findOpenSubstitution({ tx, organizationId, groupId, substitutionId })
      const hasStarted = startDate <= today
      if (hasStarted && data.start_date !== startDate) {
        throw refuseField({ field: 'start_date', status: 409, message: 'A substitution that has started keeps its start date.' })
      }
      if (hasStarted && data.lecturer_id !== lecturerId) {
        throw refuseField({ field: 'lecturer_id', status: 409, message: 'A substitution that has started keeps its substitute.' })
      }
      await checkSubstitution({ tx, organizationId, group, data, today, substitutionId, isSubstituteKept: hasStarted })
      const substitution = await tx.groupSubstitution.update({ where: { id: substitutionId }, data: toSubstitutionColumns(data), select: substitutionSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GROUP_SUBSTITUTION_UPDATED', organization_id: organizationId, subject_name: group.name } })
      return toSubstitutionJson(substitution)
    }),

  // The row stays, so the history shows it. Days already covered stay recorded: one that started before today ends yesterday, the rest are cancelled outright.
  cancelSubstitution: ({ organizationId, groupId, substitutionId, actorId }: CancelSubstitutionParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const group = await findGroup({ tx, organizationId, groupId })
      const { startDate, today } = await findOpenSubstitution({ tx, organizationId, groupId, substitutionId })
      const change = startDate < today ? { end_date: toDate(addDays({ day: today, days: -1 })) } : { cancelled_at: new Date() }
      const substitution = await tx.groupSubstitution.update({ where: { id: substitutionId }, data: change, select: substitutionSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GROUP_SUBSTITUTION_CANCELLED', organization_id: organizationId, subject_name: group.name } })
      return toSubstitutionJson(substitution)
    }),
}
