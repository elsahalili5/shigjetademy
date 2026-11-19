// The gradebook, read from assignments with max points and their marked hand-ins; nothing is stored for it. Who reaches a group is the rule of
// groups/space-access, as for assignments: staff every group, a lecturer the groups they teach today and a student only their own results in the
// groups they are enrolled in. Feedback-only assignments are left out.
import type { GradeAssignment, GradeAverage, Gradebook, GradeCell, GradeCellStatus, GradeGroup, StudentGroupGrades } from '@shigjetademy/shared/grades'
import type { Space } from '@shigjetademy/shared/spaces'
import type { Prisma } from '@generated/prisma/client.ts'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import { findViewerStudent, loadViewerGroups } from '@modules/groups/space-access.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'

type ViewerScope = {
  organizationId: string
  viewer: SpaceViewer
}

type GroupScope = ViewerScope & {
  groupId: string
}

const NOT_GRADER = 'Only lecturers and staff with Grades read a group’s gradebook.'

const PERCENT = 100

/** Lecturers and staff (the owner, and admins the route let in with MANAGE_GRADES) read gradebooks; students read their own grades */
const requireGrader = (viewer: SpaceViewer) => {
  if (viewer.role !== 'OWNER' && viewer.role !== 'ADMIN' && viewer.role !== 'LECTURER') throw new HttpError(403, NOT_GRADER)
}

const toGradeGroup = (group: Space): GradeGroup => ({ id: group.id, name: group.name, course_name: group.course_name ?? '', is_archived: group.is_archived })

/** Only assignments with points are columns */
const gradedAssignmentWhere = { max_points: { not: null } } as const satisfies Prisma.AssignmentWhereInput

const gradeAssignmentSelect = { id: true, title: true, due_at: true, max_points: true } as const satisfies Prisma.AssignmentSelect

type StoredGradeAssignment = Prisma.AssignmentGetPayload<{ select: typeof gradeAssignmentSelect }>

const gradeHandInSelect = { assignment_id: true, student_id: true, points: true, feedback: true, marked_at: true } as const satisfies Prisma.AssignmentSubmissionSelect

type StoredGradeHandIn = Prisma.AssignmentSubmissionGetPayload<{ select: typeof gradeHandInSelect }>

const toGradeAssignment = (assignment: StoredGradeAssignment): GradeAssignment => ({
  id: assignment.id,
  title: assignment.title,
  due_at: assignment.due_at.toISOString(),
  max_points: assignment.max_points ?? 0,
})

type ToCellParams = {
  assignment: StoredGradeAssignment
  handIn: StoredGradeHandIn | null
  now: Date
}

// A mark saved while the assignment had no points has none, so it waits like an unmarked hand-in
const getCellStatus = ({ assignment, handIn, now }: ToCellParams): GradeCellStatus => {
  if (handIn?.marked_at && handIn.points !== null) return 'MARKED'
  if (handIn) return 'HANDED_IN'
  return now > assignment.due_at ? 'MISSING' : 'NOT_DUE'
}

const toCell = (params: ToCellParams): GradeCell => {
  const status = getCellStatus(params)
  const isMarked = status === 'MARKED'
  return { assignment_id: params.assignment.id, status, points: isMarked ? (params.handIn?.points ?? null) : null, feedback: isMarked ? (params.handIn?.feedback ?? null) : null }
}

type GradedCell = {
  assignment: GradeAssignment
  cell: GradeCell
}

/** Points over max points of marked work only: missing work doesn't count as 0 */
const toAverage = (graded: GradedCell[]): GradeAverage | null => {
  const marked = graded.filter(({ cell }) => cell.status === 'MARKED')
  if (marked.length === 0) return null
  const points = marked.reduce((sum, { cell }) => sum + (cell.points ?? 0), 0)
  const maxPoints = marked.reduce((sum, { assignment }) => sum + assignment.max_points, 0)
  return { points, max_points: maxPoints, percent: Math.round((points / maxPoints) * PERCENT) }
}

const handInKey = ({ assignmentId, studentId }: { assignmentId: string; studentId: string }) => `${assignmentId}:${studentId}`

const NOT_STUDENT = 'Only students read their own grades.'

type ListStudentGradesParams = {
  organizationId: string
  studentId: string
  groups: GradeGroup[]
}

/** One student's results in each of these groups, in the order given, with their own hand-ins only */
export const listStudentGrades = async ({ organizationId, studentId, groups }: ListStudentGradesParams): Promise<StudentGroupGrades[]> => {
  const assignments = await prisma.assignment.findMany({
    where: { organization_id: organizationId, group_id: { in: groups.map((group) => group.id) }, ...gradedAssignmentWhere },
    orderBy: [{ due_at: 'asc' }, { title: 'asc' }],
    select: { ...gradeAssignmentSelect, group_id: true, hand_ins: { where: { student_id: studentId }, select: gradeHandInSelect } },
  })
  const now = new Date()
  return groups.map((group) => {
    const grades = assignments
      .filter((assignment) => assignment.group_id === group.id)
      .map(({ hand_ins: handIns, ...assignment }) => ({ assignment: toGradeAssignment(assignment), cell: toCell({ assignment, handIn: handIns[0] ?? null, now }) }))
    return { group, grades, average: toAverage(grades) }
  })
}

export const GradeService = {
  listGroups: async (scope: ViewerScope): Promise<GradeGroup[]> => {
    requireGrader(scope.viewer)
    return (await loadViewerGroups(scope)).map(toGradeGroup)
  },

  // A group the viewer doesn't reach answers 404, as one that doesn't exist
  getGradebook: async ({ organizationId, viewer, groupId }: GroupScope): Promise<Gradebook> => {
    requireGrader(viewer)
    const group = (await loadViewerGroups({ organizationId, viewer })).find((item) => item.id === groupId)
    if (!group) throw new HttpError(404, 'Group not found')
    const [assignments, students] = await Promise.all([
      prisma.assignment.findMany({ where: { organization_id: organizationId, group_id: groupId, ...gradedAssignmentWhere }, orderBy: [{ due_at: 'asc' }, { title: 'asc' }], select: gradeAssignmentSelect }),
      prisma.student.findMany({
        where: { organization_id: organizationId, status: 'ACTIVE', group_enrolments: { some: { group_id: groupId, ...activeEnrolments } } },
        orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
        select: { id: true, first_name: true, last_name: true },
      }),
    ])
    const handIns = await prisma.assignmentSubmission.findMany({
      where: { organization_id: organizationId, assignment_id: { in: assignments.map((assignment) => assignment.id) }, student_id: { in: students.map((student) => student.id) } },
      select: gradeHandInSelect,
    })
    const handInsByKey = new Map(handIns.map((handIn) => [handInKey({ assignmentId: handIn.assignment_id, studentId: handIn.student_id }), handIn]))
    const now = new Date()
    return {
      group: toGradeGroup(group),
      assignments: assignments.map(toGradeAssignment),
      rows: students.map((student) => {
        const graded = assignments.map((assignment) => ({
          assignment: toGradeAssignment(assignment),
          cell: toCell({ assignment, handIn: handInsByKey.get(handInKey({ assignmentId: assignment.id, studentId: student.id })) ?? null, now }),
        }))
        return { student, cells: graded.map(({ cell }) => cell), average: toAverage(graded) }
      }),
    }
  },

  // Across the groups the student is actively enrolled in, by name
  listMine: async ({ organizationId, viewer }: ViewerScope): Promise<StudentGroupGrades[]> => {
    if (viewer.role !== 'STUDENT') throw new HttpError(403, NOT_STUDENT)
    const student = await findViewerStudent({ organizationId, viewer })
    if (!student) throw new HttpError(403, NOT_STUDENT)
    const groups = (await loadViewerGroups({ organizationId, viewer })).map(toGradeGroup)
    return listStudentGrades({ organizationId, studentId: student.id, groups })
  },
}
