// The gradebook, read from assignments with max points and their marked hand-ins, and from tests and their recorded results; nothing is stored for it.
// Who reaches a group is the rule of groups/space-access, as for assignments and tests: staff every group, a lecturer the groups they teach today and a
// student only their own results in the groups they are enrolled in. Feedback-only assignments are left out.
import { isDayWithin } from '@shigjetademy/shared/academic-periods'
import type { DayRange } from '@shigjetademy/shared/academic-periods'
import { createDayReader, todayIn } from '@shigjetademy/shared/calendar-day'
import { PASS_MARK_PERCENT, PERCENT } from '@shigjetademy/shared/grades'
import type {
  GradeAverage,
  GradeCell,
  GradeCellStatus,
  GradeColumn,
  GradeGroup,
  GradeOverview,
  Gradebook,
  GradeStudent,
  GroupPerformance,
  GroupReport,
  Performance,
  ReportTerm,
  ReportTerms,
  StudentGroupGrades,
  StudentPerformance,
  StudentReport,
} from '@shigjetademy/shared/grades'
import type { Space } from '@shigjetademy/shared/spaces'
import type { Prisma } from '@generated/prisma/client.ts'
import { addDays, toDate, toDay } from '@lib/calendar-day.ts'
import { getOrganizationTimeZone } from '@lib/current-period.ts'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import { findViewerStudent, loadViewerGroups, loadViewerSpaces } from '@modules/groups/space-access.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'

type ViewerScope = {
  organizationId: string
  viewer: SpaceViewer
}

type GroupScope = ViewerScope & {
  groupId: string
}

const NOT_GRADER = 'Only lecturers and staff with Grades read a group’s gradebook.'

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

/** The term a report covers, and how to read a moment's calendar day in the organization's time zone */
type TermFilter = {
  term: DayRange
  dayOf: (moment: Date) => string
}

/** A day either side of the term, so a column dated on its first or last day in any time zone is loaded; isDatedInTerm then decides by the calendar day */
const toPaddedWindow = (term: DayRange) => ({ gte: toDate(addDays({ day: term.start_date, days: -1 })), lt: toDate(addDays({ day: term.end_date, days: 2 })) })

/** Whether a column's date falls on a day of the term, both days included; every date does without a term */
const isDatedInTerm = ({ filter, date }: { filter: TermFilter | null; date: Date }) => !filter || isDayWithin({ range: filter.term, day: filter.dayOf(date) })

type LoadGradeColumnsParams = {
  organizationId: string
  groupIds: string[]
  /** Only the work dated inside a term; every column without one */
  termFilter: TermFilter | null
}

/** The groups' assignments with points and tests, dated inside the term */
const loadGradeColumns = async ({ organizationId, groupIds, termFilter }: LoadGradeColumnsParams) => {
  const inGroups = { organization_id: organizationId, group_id: { in: groupIds } }
  const window = termFilter ? toPaddedWindow(termFilter.term) : undefined
  const [assignments, tests] = await Promise.all([
    prisma.assignment.findMany({ where: { ...inGroups, ...gradedAssignmentWhere, due_at: window }, select: gradeAssignmentSelect }),
    prisma.test.findMany({ where: { ...inGroups, held_at: window }, select: gradeTestSelect }),
  ])
  return {
    assignments: assignments.filter((assignment) => isDatedInTerm({ filter: termFilter, date: assignment.due_at })),
    tests: tests.filter((test) => isDatedInTerm({ filter: termFilter, date: test.held_at })),
  }
}

const NOT_STUDENT = 'Only students read their own grades.'

type ListStudentGradesParams = {
  organizationId: string
  studentId: string
  groups: GradeGroup[]
  /** Only the work dated inside a term; every column without one */
  termFilter?: TermFilter | null
}

/** One student's results in each of these groups, in the order given, with their own hand-ins and test results only */
export const listStudentGrades = async ({ organizationId, studentId, groups, termFilter = null }: ListStudentGradesParams): Promise<StudentGroupGrades[]> => {
  const { assignments, tests } = await loadGradeColumns({ organizationId, groupIds: groups.map((group) => group.id), termFilter })
  const [handIns, results] = await Promise.all([
    prisma.assignmentSubmission.findMany({ where: { organization_id: organizationId, student_id: studentId, assignment_id: { in: assignments.map((assignment) => assignment.id) } }, select: gradeHandInSelect }),
    prisma.testResult.findMany({ where: { organization_id: organizationId, student_id: studentId, test_id: { in: tests.map((test) => test.id) } }, select: gradeResultSelect }),
  ])
  const sources = toColumnSources({ assignments, tests, handIns, results, now: new Date() })
  return groups.map((group) => {
    const grades = sources.filter((source) => source.groupId === group.id).map((source) => ({ column: source.column, cell: source.toCell(studentId) }))
    return { group, grades, average: toAverage(grades) }
  })
}

type GroupStudent = GradeStudent & {
  groupIds: string[]
}

/** The groups' columns dated inside the term (every column without one), and their actively enrolled students by name, each with their hand-ins and results */
const loadGroupsGrades = async ({ organizationId, groupIds, termFilter }: LoadGradeColumnsParams) => {
  const [{ assignments, tests }, students] = await Promise.all([
    loadGradeColumns({ organizationId, groupIds, termFilter }),
    prisma.student.findMany({
      where: { organization_id: organizationId, status: 'ACTIVE', group_enrolments: { some: { group_id: { in: groupIds }, ...activeEnrolments } } },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }, { id: 'asc' }],
      select: { id: true, first_name: true, last_name: true, group_enrolments: { where: { group_id: { in: groupIds }, ...activeEnrolments }, select: { group_id: true } } },
    }),
  ])
  const studentIds = students.map((student) => student.id)
  const [handIns, results] = await Promise.all([
    prisma.assignmentSubmission.findMany({ where: { organization_id: organizationId, assignment_id: { in: assignments.map((assignment) => assignment.id) }, student_id: { in: studentIds } }, select: gradeHandInSelect }),
    prisma.testResult.findMany({ where: { organization_id: organizationId, test_id: { in: tests.map((test) => test.id) }, student_id: { in: studentIds } }, select: gradeResultSelect }),
  ])
  const groupStudents: GroupStudent[] = students.map((student) => ({
    id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    groupIds: student.group_enrolments.map((enrolment) => enrolment.group_id),
  }))
  return { sources: toColumnSources({ assignments, tests, handIns, results, now: new Date() }), students: groupStudents }
}

const toStudent = ({ id, first_name, last_name }: GradeStudent): GradeStudent => ({ id, first_name, last_name })

// Reports: the same columns and averages as the gradebook, for the work dated inside one term

type ReportScope = ViewerScope & {
  termId?: string
}

type StudentScope = ReportScope & {
  studentId: string
}

const reportTermSelect = { id: true, name: true, start_date: true, end_date: true, academic_year: { select: { name: true } } } as const satisfies Prisma.AcademicTermSelect

type StoredReportTerm = Prisma.AcademicTermGetPayload<{ select: typeof reportTermSelect }>

const toReportTerm = (term: StoredReportTerm): ReportTerm => ({ id: term.id, name: term.name, start_date: toDay(term.start_date), end_date: toDay(term.end_date), year_name: term.academic_year.name })

type LoadReportTermsParams = {
  organizationId: string
  termId?: string
  today: string
}

/** The term asked for; else the one holding today, the latest that has started, or the first to come */
const loadReportTerms = async ({ organizationId, termId, today }: LoadReportTermsParams): Promise<ReportTerms> => {
  const stored = await prisma.academicTerm.findMany({ where: { academic_year: { organization_id: organizationId } }, orderBy: [{ start_date: 'desc' }, { id: 'asc' }], select: reportTermSelect })
  const terms = stored.map(toReportTerm)
  if (termId) {
    const term = terms.find((item) => item.id === termId)
    if (!term) throw new HttpError(404, 'Term not found')
    return { terms, term }
  }
  const term = terms.find((item) => isDayWithin({ range: item, day: today })) ?? terms.find((item) => item.start_date <= today) ?? terms.at(-1) ?? null
  return { terms, term }
}

const countStatus = ({ graded, status }: { graded: GradedCell[]; status: GradeCellStatus }) => graded.filter(({ cell }) => cell.status === status).length

const toPerformance = (graded: GradedCell[]): Performance => ({
  average: toAverage(graded),
  marked_count: countStatus({ graded, status: 'MARKED' }),
  missing_count: countStatus({ graded, status: 'MISSING' }),
})

/** Reads the term the report covers, with its days read in the organization's time zone */
const loadReportScope = async ({ organizationId, termId }: { organizationId: string; termId?: string }) => {
  const timeZone = await getOrganizationTimeZone({ db: prisma, organizationId })
  const reportTerms = await loadReportTerms({ organizationId, termId, today: todayIn(timeZone) })
  const termFilter: TermFilter | null = reportTerms.term ? { term: reportTerms.term, dayOf: createDayReader(timeZone) } : null
  return { reportTerms, termFilter }
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
    const { sources, students } = await loadGroupsGrades({ organizationId, groupIds: [groupId], termFilter: null })
    return {
      group: toGradeGroup(group),
      columns: sources.map((source) => source.column),
      rows: students.map((student) => {
        const graded = sources.map((source) => ({ column: source.column, cell: source.toCell(student.id) }))
        return { student: toStudent(student), cells: graded.map(({ cell }) => cell), average: toAverage(graded) }
      }),
    }
  },

  // Each group the viewer reaches, by name; a group average is over every student's marked work, as if the group were one student.
  // A student under the pass mark in any of the groups counts once.
  getOverview: async ({ organizationId, viewer, termId }: ReportScope): Promise<GradeOverview> => {
    requireGrader(viewer)
    const [groups, { reportTerms, termFilter }] = await Promise.all([loadViewerGroups({ organizationId, viewer }), loadReportScope({ organizationId, termId })])
    const { sources, students } = await loadGroupsGrades({ organizationId, groupIds: groups.map((group) => group.id), termFilter })
    const belowPassIds = new Set<string>()
    const performances = groups.map((group): GroupPerformance => {
      const groupSources = sources.filter((source) => source.groupId === group.id)
      const groupStudents = students.filter((student) => student.groupIds.includes(group.id))
      const gradedByStudent = groupStudents.map((student) => ({ student, graded: groupSources.map((source) => ({ column: source.column, cell: source.toCell(student.id) })) }))
      for (const { student, graded } of gradedByStudent) {
        const average = toAverage(graded)
        if (average && average.percent < PASS_MARK_PERCENT) belowPassIds.add(student.id)
      }
      return { group: toGradeGroup(group), student_count: groupStudents.length, ...toPerformance(gradedByStudent.flatMap(({ graded }) => graded)) }
    })
    return { ...reportTerms, groups: performances, below_pass_count: belowPassIds.size }
  },

  // A group the viewer doesn't reach answers 404, as one that doesn't exist
  getGroupReport: async ({ organizationId, viewer, groupId, termId }: GroupScope & ReportScope): Promise<GroupReport> => {
    requireGrader(viewer)
    const [groups, { reportTerms, termFilter }] = await Promise.all([loadViewerGroups({ organizationId, viewer }), loadReportScope({ organizationId, termId })])
    const group = groups.find((item) => item.id === groupId)
    if (!group) throw new HttpError(404, 'Group not found')
    const { sources, students } = await loadGroupsGrades({ organizationId, groupIds: [groupId], termFilter })
    return {
      ...reportTerms,
      group: toGradeGroup(group),
      students: students.map((student): StudentPerformance => ({
        student: toStudent(student),
        ...toPerformance(sources.map((source) => ({ column: source.column, cell: source.toCell(student.id) }))),
      })),
    }
  },

  // The groups the viewer reaches that the student is actively enrolled in; a lecturer sharing no group with the student gets 404, as for one that doesn't exist
  getStudentReport: async ({ organizationId, viewer, studentId, termId }: StudentScope): Promise<StudentReport> => {
    requireGrader(viewer)
    const [viewerSpaces, { reportTerms, termFilter }, student] = await Promise.all([
      loadViewerSpaces({ organizationId, viewer }),
      loadReportScope({ organizationId, termId }),
      prisma.student.findFirst({
        where: { id: studentId, organization_id: organizationId },
        select: { id: true, first_name: true, last_name: true, group_enrolments: { where: activeEnrolments, select: { group_id: true } } },
      }),
    ])
    const enrolledIds = new Set(student?.group_enrolments.map((enrolment) => enrolment.group_id))
    const groups = viewerSpaces.spaces.filter((space) => space.kind === 'GROUP' && enrolledIds.has(space.id)).map(toGradeGroup)
    if (!student || (!viewerSpaces.isStaff && groups.length === 0)) throw new HttpError(404, 'Student not found')
    return {
      ...reportTerms,
      student: toStudent(student),
      groups: await listStudentGrades({ organizationId, studentId: student.id, groups, termFilter }),
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
