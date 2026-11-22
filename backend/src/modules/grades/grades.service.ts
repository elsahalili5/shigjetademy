// The gradebook, read from assignments with max points and their marked hand-ins, and from tests and their recorded results; nothing is stored for it.
// Who reaches a group is the rule of groups/space-access, as for assignments and tests: staff every group, a lecturer the groups they teach today and a
// student only their own results in the groups they are enrolled in. Feedback-only assignments are left out.
import type { GradeAverage, GradeCell, GradeCellStatus, GradeColumn, GradeGroup, Gradebook, StudentGroupGrades } from '@shigjetademy/shared/grades'
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

const gradeAssignmentSelect = { id: true, group_id: true, title: true, due_at: true, max_points: true } as const satisfies Prisma.AssignmentSelect

type StoredGradeAssignment = Prisma.AssignmentGetPayload<{ select: typeof gradeAssignmentSelect }>

const gradeHandInSelect = { assignment_id: true, student_id: true, points: true, feedback: true, marked_at: true } as const satisfies Prisma.AssignmentSubmissionSelect

type StoredGradeHandIn = Prisma.AssignmentSubmissionGetPayload<{ select: typeof gradeHandInSelect }>

const gradeTestSelect = { id: true, group_id: true, title: true, held_at: true, max_points: true } as const satisfies Prisma.TestSelect

type StoredGradeTest = Prisma.TestGetPayload<{ select: typeof gradeTestSelect }>

const gradeResultSelect = { test_id: true, student_id: true, points: true, is_absent: true, feedback: true } as const satisfies Prisma.TestResultSelect

type StoredGradeResult = Prisma.TestResultGetPayload<{ select: typeof gradeResultSelect }>

type ToAssignmentCellParams = {
  assignment: StoredGradeAssignment
  handIn: StoredGradeHandIn | null
  now: Date
}

// A mark saved while the assignment had no points has none, so it waits like an unmarked hand-in
const getAssignmentStatus = ({ assignment, handIn, now }: ToAssignmentCellParams): GradeCellStatus => {
  if (handIn?.marked_at && handIn.points !== null) return 'MARKED'
  if (handIn) return 'HANDED_IN'
  return now > assignment.due_at ? 'MISSING' : 'NOT_DUE'
}

const toAssignmentCell = (params: ToAssignmentCellParams): GradeCell => {
  const status = getAssignmentStatus(params)
  const isMarked = status === 'MARKED'
  return { column_id: params.assignment.id, status, points: isMarked ? (params.handIn?.points ?? null) : null, feedback: isMarked ? (params.handIn?.feedback ?? null) : null }
}

type ToTestCellParams = {
  test: StoredGradeTest
  result: StoredGradeResult | null
  now: Date
}

const getTestStatus = ({ test, result, now }: ToTestCellParams): GradeCellStatus => {
  if (result?.is_absent) return 'ABSENT'
  if (result && result.points !== null) return 'MARKED'
  return now > test.held_at ? 'NOT_RECORDED' : 'NOT_DUE'
}

const toTestCell = (params: ToTestCellParams): GradeCell => {
  const status = getTestStatus(params)
  const hasResult = status === 'MARKED' || status === 'ABSENT'
  return { column_id: params.test.id, status, points: status === 'MARKED' ? (params.result?.points ?? null) : null, feedback: hasResult ? (params.result?.feedback ?? null) : null }
}

/** A column with how to read one student's cell in it */
type ColumnSource = {
  column: GradeColumn
  groupId: string
  toCell: (studentId: string) => GradeCell
}

type ColumnSourcesParams = {
  assignments: StoredGradeAssignment[]
  tests: StoredGradeTest[]
  handIns: StoredGradeHandIn[]
  results: StoredGradeResult[]
  now: Date
}

const resultKey = ({ columnId, studentId }: { columnId: string; studentId: string }) => `${columnId}:${studentId}`

/** Assignments and tests as columns by date, then title */
const toColumnSources = ({ assignments, tests, handIns, results, now }: ColumnSourcesParams): ColumnSource[] => {
  const handInsByKey = new Map(handIns.map((handIn) => [resultKey({ columnId: handIn.assignment_id, studentId: handIn.student_id }), handIn]))
  const resultsByKey = new Map(results.map((result) => [resultKey({ columnId: result.test_id, studentId: result.student_id }), result]))
  const sources: ColumnSource[] = [
    ...assignments.map((assignment) => ({
      column: { kind: 'ASSIGNMENT' as const, id: assignment.id, title: assignment.title, date: assignment.due_at.toISOString(), max_points: assignment.max_points ?? 0 },
      groupId: assignment.group_id,
      toCell: (studentId: string) => toAssignmentCell({ assignment, handIn: handInsByKey.get(resultKey({ columnId: assignment.id, studentId })) ?? null, now }),
    })),
    ...tests.map((test) => ({
      column: { kind: 'TEST' as const, id: test.id, title: test.title, date: test.held_at.toISOString(), max_points: test.max_points },
      groupId: test.group_id,
      toCell: (studentId: string) => toTestCell({ test, result: resultsByKey.get(resultKey({ columnId: test.id, studentId })) ?? null, now }),
    })),
  ]
  return sources.sort((first, second) => first.column.date.localeCompare(second.column.date) || first.column.title.localeCompare(second.column.title))
}

type GradedCell = {
  column: GradeColumn
  cell: GradeCell
}

/** Points over max points of marked work only: missing work and absences don't count as 0 */
const toAverage = (graded: GradedCell[]): GradeAverage | null => {
  const marked = graded.filter(({ cell }) => cell.status === 'MARKED')
  if (marked.length === 0) return null
  const points = marked.reduce((sum, { cell }) => sum + (cell.points ?? 0), 0)
  const maxPoints = marked.reduce((sum, { column }) => sum + column.max_points, 0)
  return { points, max_points: maxPoints, percent: Math.round((points / maxPoints) * PERCENT) }
}

const NOT_STUDENT = 'Only students read their own grades.'

type ListStudentGradesParams = {
  organizationId: string
  studentId: string
  groups: GradeGroup[]
}

/** One student's results in each of these groups, in the order given, with their own hand-ins and test results only */
export const listStudentGrades = async ({ organizationId, studentId, groups }: ListStudentGradesParams): Promise<StudentGroupGrades[]> => {
  const inGroups = { organization_id: organizationId, group_id: { in: groups.map((group) => group.id) } }
  const [assignments, tests, handIns, results] = await Promise.all([
    prisma.assignment.findMany({ where: { ...inGroups, ...gradedAssignmentWhere }, select: gradeAssignmentSelect }),
    prisma.test.findMany({ where: inGroups, select: gradeTestSelect }),
    prisma.assignmentSubmission.findMany({ where: { organization_id: organizationId, student_id: studentId, assignment: inGroups }, select: gradeHandInSelect }),
    prisma.testResult.findMany({ where: { organization_id: organizationId, student_id: studentId, test: inGroups }, select: gradeResultSelect }),
  ])
  const sources = toColumnSources({ assignments, tests, handIns, results, now: new Date() })
  return groups.map((group) => {
    const grades = sources.filter((source) => source.groupId === group.id).map((source) => ({ column: source.column, cell: source.toCell(studentId) }))
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
    const inGroup = { organization_id: organizationId, group_id: groupId }
    const [assignments, tests, students] = await Promise.all([
      prisma.assignment.findMany({ where: { ...inGroup, ...gradedAssignmentWhere }, select: gradeAssignmentSelect }),
      prisma.test.findMany({ where: inGroup, select: gradeTestSelect }),
      prisma.student.findMany({
        where: { organization_id: organizationId, status: 'ACTIVE', group_enrolments: { some: { group_id: groupId, ...activeEnrolments } } },
        orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
        select: { id: true, first_name: true, last_name: true },
      }),
    ])
    const studentIds = students.map((student) => student.id)
    const [handIns, results] = await Promise.all([
      prisma.assignmentSubmission.findMany({ where: { organization_id: organizationId, assignment_id: { in: assignments.map((assignment) => assignment.id) }, student_id: { in: studentIds } }, select: gradeHandInSelect }),
      prisma.testResult.findMany({ where: { organization_id: organizationId, test_id: { in: tests.map((test) => test.id) }, student_id: { in: studentIds } }, select: gradeResultSelect }),
    ])
    const sources = toColumnSources({ assignments, tests, handIns, results, now: new Date() })
    return {
      group: toGradeGroup(group),
      columns: sources.map((source) => source.column),
      rows: students.map((student) => {
        const graded = sources.map((source) => ({ column: source.column, cell: source.toCell(student.id) }))
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
