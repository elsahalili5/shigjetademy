// Paper or in-class tests set for one group. Who reaches a group is the rule of groups/space-access: staff every group, a lecturer the groups they teach today and a student
// the groups they are enrolled in. The group's lecturers, the owner and admins with MANAGE_TESTS (checked by the route) set, change and remove tests.
// An archived group is read-only: its tests stay readable, and nothing is set, changed or removed.
import type { Space } from '@shigjetademy/shared/spaces'
import type { StudentTest, Test, TestGroup, TestResult, TestSheet, TestSheetRow } from '@shigjetademy/shared/tests'
import type { Prisma } from '@generated/prisma/client.ts'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import { findViewerStudent, loadViewerGroups } from '@modules/groups/space-access.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'
import type { CreateTestInput, RecordTestResultsInput, UpdateTestInput } from './tests.types.ts'

/** A group lists this many tests at most */
const LIST_LIMIT = 500

const testSelect = {
  id: true,
  group_id: true,
  title: true,
  description: true,
  held_at: true,
  max_points: true,
  created_at: true,
  updated_at: true,
  author_membership_id: true,
  author: { select: { user: { select: { first_name: true, last_name: true } } } },
  group: { select: { id: true, name: true, status: true, course: { select: { name: true } } } },
} as const satisfies Prisma.TestSelect

type StoredTest = Prisma.TestGetPayload<{ select: typeof testSelect }>

const resultSelect = { points: true, is_absent: true, feedback: true, recorded_at: true } as const satisfies Prisma.TestResultSelect

type StoredResult = Prisma.TestResultGetPayload<{ select: typeof resultSelect }>

const sheetStudentSelect = { id: true, first_name: true, last_name: true, student_number: true } as const satisfies Prisma.StudentSelect

type ViewerScope = {
  organizationId: string
  viewer: SpaceViewer
}

type GroupScope = ViewerScope & {
  groupId: string
}

type TestScope = ViewerScope & {
  testId: string
}

const NOT_FOUND = 'Test not found'

const NOT_SETTER = 'You can only set tests for the groups you teach.'

/** Lecturers and staff (the owner, and admins the route let in with MANAGE_TESTS) set tests; students read their own results */
const isSetter = (viewer: SpaceViewer) => viewer.role === 'OWNER' || viewer.role === 'ADMIN' || viewer.role === 'LECTURER'

const isArchived = (test: StoredTest) => test.group.status === 'ARCHIVED'

const findGroup = ({ groups, groupId }: { groups: Space[]; groupId: string }) => groups.find((group) => group.id === groupId) ?? null

type TestView = {
  test: StoredTest
  viewer: SpaceViewer
}

/** A setter who reaches the group changes and removes its tests, until the group is archived */
const isManager = ({ test, viewer }: TestView) => isSetter(viewer) && !isArchived(test)

const toTest = ({ test, viewer }: TestView): Test => ({
  id: test.id,
  group: { id: test.group.id, name: test.group.name, course_name: test.group.course.name },
  title: test.title,
  description: test.description,
  held_at: test.held_at.toISOString(),
  max_points: test.max_points,
  author: { membership_id: test.author_membership_id, first_name: test.author.user.first_name, last_name: test.author.user.last_name },
  created_at: test.created_at.toISOString(),
  updated_at: test.updated_at.toISOString(),
  can_edit: isManager({ test, viewer }),
  can_remove: isManager({ test, viewer }),
})

const toTestGroup = ({ group, viewer }: { group: Space; viewer: SpaceViewer }): TestGroup => ({
  id: group.id,
  name: group.name,
  course_name: group.course_name ?? '',
  is_archived: group.is_archived,
  can_set: group.can_post && isSetter(viewer),
})

const toResult = (result: StoredResult): TestResult => ({ points: result.points, is_absent: result.is_absent, feedback: result.feedback, recorded_at: result.recorded_at.toISOString() })

type SheetStudent = Prisma.StudentGetPayload<{ select: typeof sheetStudentSelect }> & { test_results: StoredResult[] }

const toSheetRow = ({ test_results: results, ...student }: SheetStudent): TestSheetRow => ({ student, result: results[0] ? toResult(results[0]) : null })

type RequireMaxAboveGivenParams = {
  db: Prisma.TransactionClient
  testId: string
  maxPoints: number
}

/** Lowering the max below points already given would leave results over it; read in the transaction that saves the max */
const requireMaxAboveGiven = async ({ db, testId, maxPoints }: RequireMaxAboveGivenParams) => {
  const highest = await db.testResult.aggregate({ where: { test_id: testId }, _max: { points: true } })
  const given = highest._max.points
  if (given !== null && given > maxPoints) throw refuseField({ field: 'max_points', status: 400, message: `A student already has ${given} points; the max can’t go below that.` })
}

/** Every actively enrolled student of the group, by name, with their result on the test */
const loadSheetRows = async ({ organizationId, test }: { organizationId: string; test: StoredTest }) => {
  const students = await prisma.student.findMany({
    where: { organization_id: organizationId, status: 'ACTIVE', group_enrolments: { some: { group_id: test.group_id, ...activeEnrolments } } },
    orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    select: { ...sheetStudentSelect, test_results: { where: { test_id: test.id }, select: resultSelect } },
  })
  return students.map(toSheetRow)
}

const NOT_ENROLLED = 'Only the group’s enrolled students get results.'

type CheckEntriesParams = {
  entries: RecordTestResultsInput['results']
  enrolledIds: Set<string>
  maxPoints: number
}

/** Every student on the sheet is actively enrolled in the group, and no points go over the max */
const checkEntries = ({ entries, enrolledIds, maxPoints }: CheckEntriesParams) => {
  if (entries.some((item) => !enrolledIds.has(item.student_id))) throw refuseField({ field: 'results', status: 400, message: NOT_ENROLLED })
  if (entries.some((item) => item.points !== null && item.points > maxPoints)) throw refuseField({ field: 'results', status: 400, message: `Points can be at most ${maxPoints}.` })
}

const NOT_STUDENT = 'Only students read their own tests.'

/** The viewer's active student record; a student login without one has no tests */
const requireViewerStudent = async ({ organizationId, viewer }: ViewerScope) => {
  if (viewer.role !== 'STUDENT') throw new HttpError(403, NOT_STUDENT)
  const student = await findViewerStudent({ organizationId, viewer })
  if (!student) throw new HttpError(403, NOT_STUDENT)
  return student
}

const requireSetter = (viewer: SpaceViewer) => {
  if (!isSetter(viewer)) throw new HttpError(403, NOT_SETTER)
}

/** The group exists in the organization (404 otherwise), the viewer sets there (403 otherwise) and it is not archived (403) */
const requireSettableGroup = async ({ organizationId, viewer, groupId }: GroupScope) => {
  if ((await prisma.group.count({ where: { id: groupId, organization_id: organizationId } })) === 0) throw new HttpError(404, 'Group not found')
  const group = findGroup({ groups: await loadViewerGroups({ organizationId, viewer }), groupId })
  if (!group || !isSetter(viewer)) throw new HttpError(403, NOT_SETTER)
  if (group.is_archived) throw new HttpError(403, 'This group is archived, so it takes no new tests.')
}

/** The test for someone who reaches its group; 404 for everyone else */
const findReachableTest = async ({ organizationId, viewer, testId }: TestScope) => {
  const test = await prisma.test.findFirst({ where: { id: testId, organization_id: organizationId }, select: testSelect })
  if (!test) throw new HttpError(404, NOT_FOUND)
  if (!findGroup({ groups: await loadViewerGroups({ organizationId, viewer }), groupId: test.group_id })) throw new HttpError(404, NOT_FOUND)
  return test
}

/** The test for a setter of its group to change; 403 for its students, and for everyone once the group is archived */
const findManagedTest = async (scope: TestScope) => {
  const test = await findReachableTest(scope)
  if (!isSetter(scope.viewer)) throw new HttpError(403, 'Only the group’s lecturers and staff change tests.')
  if (isArchived(test)) throw new HttpError(403, 'This group is archived, so its tests can’t be changed.')
  return test
}

const detailColumns = (data: UpdateTestInput) => ({
  title: data.title,
  description: data.description || null,
  held_at: new Date(data.held_at),
  max_points: data.max_points,
})

export const TestService = {
  listGroups: async (scope: ViewerScope): Promise<TestGroup[]> => (await loadViewerGroups(scope)).map((group) => toTestGroup({ group, viewer: scope.viewer })),

  // Soonest first; a group the viewer doesn't reach answers 404, as one that doesn't exist
  list: async ({ organizationId, viewer, groupId }: GroupScope): Promise<Test[]> => {
    requireSetter(viewer)
    if (!findGroup({ groups: await loadViewerGroups({ organizationId, viewer }), groupId })) throw new HttpError(404, 'Group not found')
    const tests = await prisma.test.findMany({ where: { organization_id: organizationId, group_id: groupId }, orderBy: [{ held_at: 'asc' }, { title: 'asc' }], take: LIST_LIMIT, select: testSelect })
    return tests.map((test) => toTest({ test, viewer }))
  },

  create: async ({ organizationId, viewer, data }: ViewerScope & { data: CreateTestInput }): Promise<Test> => {
    await requireSettableGroup({ organizationId, viewer, groupId: data.group_id })
    const test = await prisma.test.create({
      data: { organization_id: organizationId, group_id: data.group_id, author_membership_id: viewer.membershipId, ...detailColumns(data) },
      select: testSelect,
    })
    return toTest({ test, viewer })
  },

  update: async ({ data, ...scope }: TestScope & { data: UpdateTestInput }): Promise<Test> => {
    const current = await findManagedTest(scope)
    const test = await prisma.$transaction(async (tx) => {
      await requireMaxAboveGiven({ db: tx, testId: current.id, maxPoints: data.max_points })
      return tx.test.update({ where: { id: current.id }, data: detailColumns(data), select: testSelect })
    })
    return toTest({ test, viewer: scope.viewer })
  },

  // Its results go with it
  remove: async (scope: TestScope): Promise<{ id: string }> => {
    const test = await findManagedTest(scope)
    await prisma.test.delete({ where: { id: test.id } })
    return { id: test.id }
  },

  // For the group's setters: every actively enrolled student, by name, with their result
  getSheet: async (scope: TestScope): Promise<TestSheet> => {
    requireSetter(scope.viewer)
    const test = await findReachableTest(scope)
    return { ...toTest({ test, viewer: scope.viewer }), rows: await loadSheetRows({ organizationId: scope.organizationId, test }) }
  },

  // The whole sheet in one go: points or absent saves a result, neither clears it; students left off the sheet keep theirs
  recordResults: async ({ data, ...scope }: TestScope & { data: RecordTestResultsInput }): Promise<TestSheet> => {
    const current = await findManagedTest(scope)
    const recordedAt = new Date()
    const test = await prisma.$transaction(async (tx) => {
      // Read with the save, so a max lowered meanwhile is the one checked
      const { max_points: maxPoints } = await tx.test.findUniqueOrThrow({ where: { id: current.id }, select: { max_points: true } })
      const enrolled = await tx.student.findMany({
        where: { organization_id: scope.organizationId, status: 'ACTIVE', group_enrolments: { some: { group_id: current.group_id, ...activeEnrolments } } },
        select: { id: true },
      })
      checkEntries({ entries: data.results, enrolledIds: new Set(enrolled.map((student) => student.id)), maxPoints })
      const cleared = data.results.filter((item) => item.points === null && !item.is_absent).map((item) => item.student_id)
      await tx.testResult.deleteMany({ where: { test_id: current.id, student_id: { in: cleared } } })
      for (const item of data.results.filter((result) => !cleared.includes(result.student_id))) {
        const columns = { points: item.points, is_absent: item.is_absent, feedback: item.feedback || null, recorded_at: recordedAt, recorded_by_membership_id: scope.viewer.membershipId }
        await tx.testResult.upsert({
          where: { test_id_student_id: { test_id: current.id, student_id: item.student_id } },
          create: { organization_id: scope.organizationId, test_id: current.id, student_id: item.student_id, ...columns },
          update: columns,
        })
      }
      return tx.test.findUniqueOrThrow({ where: { id: current.id }, select: testSelect })
    })
    return { ...toTest({ test, viewer: scope.viewer }), rows: await loadSheetRows({ organizationId: scope.organizationId, test }) }
  },

  // Across all the student's groups, soonest first, each with their own result only
  listMine: async ({ organizationId, viewer }: ViewerScope): Promise<StudentTest[]> => {
    const student = await requireViewerStudent({ organizationId, viewer })
    const groupIds = (await loadViewerGroups({ organizationId, viewer })).map((group) => group.id)
    const tests = await prisma.test.findMany({
      where: { organization_id: organizationId, group_id: { in: groupIds } },
      orderBy: [{ held_at: 'asc' }, { title: 'asc' }],
      take: LIST_LIMIT,
      select: { ...testSelect, results: { where: { student_id: student.id }, select: resultSelect } },
    })
    return tests.map(({ results, ...test }) => ({ ...toTest({ test, viewer }), result: results[0] ? toResult(results[0]) : null }))
  },
}
