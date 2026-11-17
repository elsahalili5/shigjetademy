// Homework set for one group. Who reaches a group is the rule of groups/space-access: staff every group, a lecturer the groups they teach today and a student
// the groups they are enrolled in. The group's lecturers, the owner and admins with MANAGE_GRADES (checked by the route) set, change and remove assignments.
// An archived group is read-only: its assignments and files stay readable, and nothing is set, changed or removed.
import type { Assignment, AssignmentDetail, AssignmentGroup, AssignmentHandIn, GroupHandIn, HandInStatus, StudentAssignment } from '@shigjetademy/shared/assignments'
import type { Space } from '@shigjetademy/shared/spaces'
import type { Prisma } from '@generated/prisma/client.ts'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import type { StoredUpload } from '@lib/private-files.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import { loadViewerSpaces } from '@modules/groups/space-access.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'
import { assignmentFiles } from './assignment-files.ts'
import type { CreateAssignmentInput, HandInInput, MarkHandInInput, UpdateAssignmentInput } from './assignments.types.ts'

/** A group lists this many assignments at most, latest due first */
const LIST_LIMIT = 500

const assignmentSelect = {
  id: true,
  group_id: true,
  title: true,
  instructions: true,
  due_at: true,
  max_points: true,
  accepts_late_hand_ins: true,
  file_key: true,
  file_name: true,
  file_type: true,
  file_size: true,
  created_at: true,
  updated_at: true,
  author_membership_id: true,
  author: { select: { user: { select: { first_name: true, last_name: true } } } },
  group: { select: { id: true, name: true, status: true, course: { select: { name: true } } } },
} as const satisfies Prisma.AssignmentSelect

type StoredAssignment = Prisma.AssignmentGetPayload<{ select: typeof assignmentSelect }>

const handInSelect = {
  id: true,
  text: true,
  file_key: true,
  file_name: true,
  file_type: true,
  file_size: true,
  submitted_at: true,
  points: true,
  feedback: true,
  marked_at: true,
} as const satisfies Prisma.AssignmentSubmissionSelect

type StoredHandIn = Prisma.AssignmentSubmissionGetPayload<{ select: typeof handInSelect }>

type ViewerScope = {
  organizationId: string
  viewer: SpaceViewer
}

type AssignmentScope = ViewerScope & {
  assignmentId: string
}

type SubmissionScope = AssignmentScope & {
  submissionId: string
}

const NOT_FOUND = 'Assignment not found'

const NOT_SETTER = 'You can only set assignments for the groups you teach.'

const ARCHIVED_MESSAGE = 'This group is archived, so its assignments can’t be changed.'

/** Lecturers and staff (the owner, and admins the route let in with MANAGE_GRADES) set assignments; students hand them in */
const isSetter = (viewer: SpaceViewer) => viewer.role === 'OWNER' || viewer.role === 'ADMIN' || viewer.role === 'LECTURER'

const isArchived = (assignment: StoredAssignment) => assignment.group.status === 'ARCHIVED'

/** The groups the viewer reaches, by name */
const loadViewerGroups = async (scope: ViewerScope): Promise<Space[]> => (await loadViewerSpaces(scope)).spaces.filter((space) => space.kind === 'GROUP')

const findGroup = ({ groups, groupId }: { groups: Space[]; groupId: string }) => groups.find((group) => group.id === groupId) ?? null

type AssignmentView = {
  assignment: StoredAssignment
  viewer: SpaceViewer
}

/** A setter who reaches the group changes and removes its assignments, until the group is archived */
const isManager = ({ assignment, viewer }: AssignmentView) => isSetter(viewer) && !isArchived(assignment)

const toFile = (row: Pick<StoredAssignment, 'file_name' | 'file_type' | 'file_size'>) => (row.file_name && row.file_type && row.file_size !== null ? { name: row.file_name, type: row.file_type, size: row.file_size } : null)

const toAssignment = ({ assignment, viewer }: AssignmentView): Assignment => ({
  id: assignment.id,
  group: { id: assignment.group.id, name: assignment.group.name, course_name: assignment.group.course.name },
  title: assignment.title,
  instructions: assignment.instructions,
  due_at: assignment.due_at.toISOString(),
  max_points: assignment.max_points,
  accepts_late_hand_ins: assignment.accepts_late_hand_ins,
  file: toFile(assignment),
  author: { membership_id: assignment.author_membership_id, first_name: assignment.author.user.first_name, last_name: assignment.author.user.last_name },
  created_at: assignment.created_at.toISOString(),
  updated_at: assignment.updated_at.toISOString(),
  can_edit: isManager({ assignment, viewer }),
  can_remove: isManager({ assignment, viewer }),
})

const toAssignmentGroup = ({ group, viewer }: { group: Space; viewer: SpaceViewer }): AssignmentGroup => ({
  id: group.id,
  name: group.name,
  course_name: group.course_name ?? '',
  is_archived: group.is_archived,
  can_set: group.can_post && isSetter(viewer),
})

type HandInView = {
  handIn: StoredHandIn
  dueAt: Date
}

/** Handed in after the due date; it is still taken */
const isLate = ({ handIn, dueAt }: HandInView) => handIn.submitted_at > dueAt

const toHandIn = ({ handIn, dueAt }: HandInView): AssignmentHandIn => ({
  id: handIn.id,
  text: handIn.text,
  file: toFile(handIn),
  submitted_at: handIn.submitted_at.toISOString(),
  is_late: isLate({ handIn, dueAt }),
  mark: handIn.marked_at ? { points: handIn.points, feedback: handIn.feedback, marked_at: handIn.marked_at.toISOString() } : null,
})

const getHandInStatus = ({ handIn, dueAt }: { handIn: StoredHandIn | null; dueAt: Date }): HandInStatus => {
  if (!handIn) return 'NOT_HANDED_IN'
  if (handIn.marked_at) return 'MARKED'
  return isLate({ handIn, dueAt }) ? 'LATE' : 'HANDED_IN'
}

/** Past the due date with late hand-ins turned off: nothing more is taken */
const isClosed = ({ assignment, now }: { assignment: StoredAssignment; now: Date }) => !assignment.accepts_late_hand_ins && now > assignment.due_at

const toStudentAssignment = ({ assignment, viewer, handIn }: AssignmentView & { handIn: StoredHandIn | null }): StudentAssignment => {
  const isClosedNow = isClosed({ assignment, now: new Date() })
  return {
    ...toAssignment({ assignment, viewer }),
    status: getHandInStatus({ handIn, dueAt: assignment.due_at }),
    hand_in: handIn ? toHandIn({ handIn, dueAt: assignment.due_at }) : null,
    is_closed: isClosedNow,
    can_hand_in: !isArchived(assignment) && !handIn?.marked_at && !isClosedNow,
  }
}

const handInStudentSelect = { id: true, first_name: true, last_name: true, student_number: true } as const satisfies Prisma.StudentSelect

type ToGroupHandInParams = {
  student: Prisma.StudentGetPayload<{ select: typeof handInStudentSelect }>
  handIn: StoredHandIn | null
  dueAt: Date
}

const toGroupHandIn = ({ student, handIn, dueAt }: ToGroupHandInParams): GroupHandIn => ({ student, status: getHandInStatus({ handIn, dueAt }), hand_in: handIn ? toHandIn({ handIn, dueAt }) : null })

/** Points out of the max when the assignment has one, and none when it doesn't */
const checkPoints = ({ points, maxPoints }: { points: number | null; maxPoints: number | null }) => {
  if (maxPoints === null && points !== null) throw refuseField({ field: 'points', status: 400, message: 'This assignment has no points; leave them empty.' })
  if (maxPoints !== null && points === null) throw refuseField({ field: 'points', status: 400, message: `Give points out of ${maxPoints}.` })
  if (maxPoints !== null && points !== null && points > maxPoints) throw refuseField({ field: 'points', status: 400, message: `Points can be at most ${maxPoints}.` })
}

type RequireMaxAboveGivenParams = {
  db: Prisma.TransactionClient
  assignmentId: string
  maxPoints: number | null
}

/** Lowering the max below points already given would leave marks over it; read in the transaction that saves the max */
const requireMaxAboveGiven = async ({ db, assignmentId, maxPoints }: RequireMaxAboveGivenParams) => {
  if (maxPoints === null) return
  const highest = await db.assignmentSubmission.aggregate({ where: { assignment_id: assignmentId }, _max: { points: true } })
  const given = highest._max.points
  if (given !== null && given > maxPoints) throw refuseField({ field: 'max_points', status: 400, message: `A hand-in already has ${given} points; the max can’t go below that.` })
}

const MARKED_MESSAGE = 'This hand-in is marked, so it can’t be replaced.'

const NOT_STUDENT = 'Only the group’s students hand in assignments.'

const requireStudent = (viewer: SpaceViewer) => {
  if (viewer.role !== 'STUDENT') throw new HttpError(403, NOT_STUDENT)
}

/** The viewer's active student record in the organization; a student login without one hands in nothing */
const findViewerStudent = async ({ organizationId, viewer }: ViewerScope) => {
  const student = await prisma.student.findFirst({ where: { organization_id: organizationId, user_id: viewer.userId, status: 'ACTIVE' }, select: { id: true } })
  if (!student) throw new HttpError(403, NOT_STUDENT)
  return student
}

type ChooseHandInFileParams = {
  file: StoredUpload | null
  keepFile: boolean
  current: StoredHandIn | null
}

/** A new file, or the one handed in before when the student keeps it, or none */
const chooseHandInFile = ({ file, keepFile, current }: ChooseHandInFileParams) => {
  if (file) return fileColumns(file)
  if (keepFile && current?.file_key) return { file_key: current.file_key, file_name: current.file_name, file_type: current.file_type, file_size: current.file_size }
  return fileColumns(null)
}

const requireSetter = (viewer: SpaceViewer) => {
  if (!isSetter(viewer)) throw new HttpError(403, NOT_SETTER)
}

type GroupScope = ViewerScope & {
  groupId: string
}

/** The group exists in the organization (404 otherwise), the viewer sets there (403 otherwise) and it is not archived (403) */
const requireSettableGroup = async ({ organizationId, viewer, groupId }: GroupScope) => {
  if ((await prisma.group.count({ where: { id: groupId, organization_id: organizationId } })) === 0) throw new HttpError(404, 'Group not found')
  const group = findGroup({ groups: await loadViewerGroups({ organizationId, viewer }), groupId })
  if (!group || !isSetter(viewer)) throw new HttpError(403, NOT_SETTER)
  if (group.is_archived) throw new HttpError(403, 'This group is archived, so it takes no new assignments.')
}

/** The assignment for someone who reaches its group; 404 for everyone else */
const findReachableAssignment = async ({ organizationId, viewer, assignmentId }: AssignmentScope) => {
  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, organization_id: organizationId }, select: assignmentSelect })
  if (!assignment) throw new HttpError(404, NOT_FOUND)
  if (!findGroup({ groups: await loadViewerGroups({ organizationId, viewer }), groupId: assignment.group_id })) throw new HttpError(404, NOT_FOUND)
  return assignment
}

/** The assignment for a setter of its group to change; 403 for its students, and for everyone once the group is archived */
const findManagedAssignment = async (scope: AssignmentScope) => {
  const assignment = await findReachableAssignment(scope)
  if (!isSetter(scope.viewer)) throw new HttpError(403, 'Only the group’s lecturers and staff change assignments.')
  if (isArchived(assignment)) throw new HttpError(403, ARCHIVED_MESSAGE)
  return assignment
}

const fileColumns = (file: StoredUpload | null) => ({ file_key: file?.key ?? null, file_name: file?.name ?? null, file_type: file?.type ?? null, file_size: file?.size ?? null })

const detailColumns = (data: Pick<CreateAssignmentInput, 'title' | 'instructions' | 'due_at' | 'max_points' | 'accepts_late_hand_ins'>) => ({
  title: data.title,
  instructions: data.instructions,
  due_at: new Date(data.due_at),
  max_points: data.max_points,
  accepts_late_hand_ins: data.accepts_late_hand_ins,
})

export const AssignmentService = {
  // Known from the role alone, so an upload is refused before its file is read
  requireSetter,
  requireStudent,

  listGroups: async (scope: ViewerScope): Promise<AssignmentGroup[]> => (await loadViewerGroups(scope)).map((group) => toAssignmentGroup({ group, viewer: scope.viewer })),

  // A group the viewer doesn't reach answers 404, as one that doesn't exist
  list: async ({ organizationId, viewer, groupId }: GroupScope): Promise<Assignment[]> => {
    requireSetter(viewer)
    if (!findGroup({ groups: await loadViewerGroups({ organizationId, viewer }), groupId })) throw new HttpError(404, 'Group not found')
    const assignments = await prisma.assignment.findMany({ where: { organization_id: organizationId, group_id: groupId }, orderBy: { due_at: 'desc' }, take: LIST_LIMIT, select: assignmentSelect })
    return assignments.map((assignment) => toAssignment({ assignment, viewer }))
  },

  create: async ({ organizationId, viewer, data, file }: ViewerScope & { data: CreateAssignmentInput; file: StoredUpload | null }): Promise<Assignment> => {
    await requireSettableGroup({ organizationId, viewer, groupId: data.group_id })
    const assignment = await prisma.assignment.create({
      data: { organization_id: organizationId, group_id: data.group_id, author_membership_id: viewer.membershipId, ...detailColumns(data), ...fileColumns(file) },
      select: assignmentSelect,
    })
    return toAssignment({ assignment, viewer })
  },

  // A new file replaces the old one, which is deleted once the row no longer points at it
  update: async ({ data, file, ...scope }: AssignmentScope & { data: UpdateAssignmentInput; file: StoredUpload | null }): Promise<Assignment> => {
    const current = await findManagedAssignment(scope)
    const isFileChanged = !!file || data.remove_file
    const assignment = await prisma.$transaction(async (tx) => {
      await requireMaxAboveGiven({ db: tx, assignmentId: current.id, maxPoints: data.max_points })
      // Without max points, marks keep their feedback and lose their points
      if (data.max_points === null) await tx.assignmentSubmission.updateMany({ where: { assignment_id: current.id }, data: { points: null } })
      return tx.assignment.update({ where: { id: current.id }, data: { ...detailColumns(data), ...(isFileChanged ? fileColumns(file) : {}) }, select: assignmentSelect })
    })
    if (isFileChanged && current.file_key) await assignmentFiles.removeOrphans([current.file_key])
    return toAssignment({ assignment, viewer: scope.viewer })
  },

  // The row and its hand-ins go, then their files; a file that can't be deleted is logged
  remove: async (scope: AssignmentScope): Promise<{ id: string }> => {
    const assignment = await findManagedAssignment(scope)
    // Read with the delete, so a hand-in that lands meanwhile can't leave its file behind
    const handIns = await prisma.$transaction(async (tx) => {
      const rows = await tx.assignmentSubmission.findMany({ where: { assignment_id: assignment.id }, select: { file_key: true } })
      await tx.assignment.delete({ where: { id: assignment.id } })
      return rows
    })
    const fileKeys = [assignment.file_key, ...handIns.map((handIn) => handIn.file_key)].flatMap((key) => (key ? [key] : []))
    await assignmentFiles.removeOrphans(fileKeys)
    return { id: assignment.id }
  },

  // Across all the student's groups, soonest due first, each with their own hand-in only
  listMine: async ({ organizationId, viewer }: ViewerScope): Promise<StudentAssignment[]> => {
    requireStudent(viewer)
    const student = await findViewerStudent({ organizationId, viewer })
    const groupIds = (await loadViewerGroups({ organizationId, viewer })).map((group) => group.id)
    const assignments = await prisma.assignment.findMany({
      where: { organization_id: organizationId, group_id: { in: groupIds } },
      orderBy: { due_at: 'asc' },
      take: LIST_LIMIT,
      select: { ...assignmentSelect, hand_ins: { where: { student_id: student.id }, select: handInSelect } },
    })
    return assignments.map(({ hand_ins: handIns, ...assignment }) => toStudentAssignment({ assignment, viewer, handIn: handIns[0] ?? null }))
  },

  // Replaces the student's hand-in until it is marked; one after the due date is still taken and shows as late
  handIn: async ({ data, file, ...scope }: AssignmentScope & { data: HandInInput; file: StoredUpload | null }): Promise<StudentAssignment> => {
    requireStudent(scope.viewer)
    const assignment = await findReachableAssignment(scope)
    if (isArchived(assignment)) throw new HttpError(403, 'This group is archived, so it takes no hand-ins.')
    const submittedAt = new Date()
    if (isClosed({ assignment, now: submittedAt })) throw new HttpError(403, 'Hand-ins for this assignment closed at the due date.')
    const student = await findViewerStudent(scope)
    const current = await prisma.assignmentSubmission.findUnique({ where: { assignment_id_student_id: { assignment_id: assignment.id, student_id: student.id } }, select: handInSelect })
    if (current?.marked_at) throw new HttpError(403, MARKED_MESSAGE)
    const fileColumnsToSave = chooseHandInFile({ file, keepFile: data.keep_file, current })
    if (!data.text && !fileColumnsToSave.file_key) throw refuseField({ field: 'text', status: 400, message: 'Write your answer or attach a file.' })
    const columns = { text: data.text || null, ...fileColumnsToSave, submitted_at: submittedAt }
    const studentHandIn = { assignment_id: assignment.id, student_id: student.id }
    const handIn = await prisma.$transaction(async (tx) => {
      if (!current) return tx.assignmentSubmission.create({ data: { organization_id: scope.organizationId, ...studentHandIn, ...columns }, select: handInSelect })
      // Only an unmarked hand-in is replaced, so a mark saved since it was read wins
      const replaced = await tx.assignmentSubmission.updateMany({ where: { ...studentHandIn, marked_at: null }, data: columns })
      if (replaced.count === 0) throw new HttpError(403, MARKED_MESSAGE)
      return tx.assignmentSubmission.findUniqueOrThrow({ where: { assignment_id_student_id: studentHandIn }, select: handInSelect })
    })
    if (current?.file_key && current.file_key !== handIn.file_key) await assignmentFiles.removeOrphans([current.file_key])
    return toStudentAssignment({ assignment, viewer: scope.viewer, handIn })
  },

  // For the group's setters: every actively enrolled student, by name, with their hand-in
  getDetail: async (scope: AssignmentScope): Promise<AssignmentDetail> => {
    requireSetter(scope.viewer)
    const assignment = await findReachableAssignment(scope)
    const students = await prisma.student.findMany({
      where: { organization_id: scope.organizationId, status: 'ACTIVE', group_enrolments: { some: { group_id: assignment.group_id, ...activeEnrolments } } },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
      select: { ...handInStudentSelect, assignment_hand_ins: { where: { assignment_id: assignment.id }, select: handInSelect } },
    })
    return {
      ...toAssignment({ assignment, viewer: scope.viewer }),
      hand_ins: students.map(({ assignment_hand_ins: handIns, ...student }) => toGroupHandIn({ student, handIn: handIns[0] ?? null, dueAt: assignment.due_at })),
    }
  },

  // Saved marks show to the student at once, and stop them handing in again; the group's setters change a mark whenever they like, until the group is archived
  mark: async ({ submissionId, data, ...scope }: SubmissionScope & { data: MarkHandInInput }): Promise<GroupHandIn> => {
    const assignment = await findManagedAssignment(scope)
    const current = await prisma.assignmentSubmission.findFirst({ where: { id: submissionId, assignment_id: assignment.id, organization_id: scope.organizationId }, select: { id: true } })
    if (!current) throw new HttpError(404, 'Hand-in not found')
    checkPoints({ points: data.points, maxPoints: assignment.max_points })
    const handIn = await prisma.assignmentSubmission.update({
      where: { id: current.id },
      data: { points: data.points, feedback: data.feedback || null, marked_at: new Date(), marked_by_membership_id: scope.viewer.membershipId },
      select: { ...handInSelect, student: { select: handInStudentSelect } },
    })
    return toGroupHandIn({ student: handIn.student, handIn, dueAt: assignment.due_at })
  },

  // For the group's setters and the student who handed it in; 404 for everyone else, other students included
  getHandInFile: async ({ submissionId, ...scope }: SubmissionScope) => {
    const assignment = await findReachableAssignment(scope)
    const handIn = await prisma.assignmentSubmission.findFirst({ where: { id: submissionId, assignment_id: assignment.id, organization_id: scope.organizationId }, select: { student_id: true, ...handInSelect } })
    if (!handIn) throw new HttpError(404, 'Hand-in not found')
    if (!isSetter(scope.viewer) && (await findViewerStudent(scope)).id !== handIn.student_id) throw new HttpError(404, 'Hand-in not found')
    if (!handIn.file_key || !handIn.file_name || !handIn.file_type) throw new HttpError(404, 'This hand-in has no file.')
    return { path: assignmentFiles.getPath(handIn.file_key), name: handIn.file_name, type: handIn.file_type }
  },

  // Only for someone who reaches the group; 404 for everyone else, as for one that doesn't exist
  getFile: async (scope: AssignmentScope) => {
    const assignment = await findReachableAssignment(scope)
    if (!assignment.file_key || !assignment.file_name || !assignment.file_type) throw new HttpError(404, 'This assignment has no file.')
    return { path: assignmentFiles.getPath(assignment.file_key), name: assignment.file_name, type: assignment.file_type }
  },
}
