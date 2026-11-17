import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Assignment, AssignmentDetail, AssignmentGroup, StudentAssignment } from '@shigjetademy/shared/assignments'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type MemberKey = 'owner' | 'admin' | 'clerk' | 'arben' | 'teuta' | 'alba' | 'dren' | 'besa' | 'gent'

const ROLE_OF: Record<MemberKey, 'OWNER' | 'ADMIN' | 'LECTURER' | 'STUDENT' | 'GUARDIAN'> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  clerk: 'ADMIN',
  arben: 'LECTURER',
  teuta: 'LECTURER',
  alba: 'STUDENT',
  dren: 'STUDENT',
  besa: 'STUDENT',
  gent: 'GUARDIAN',
}

const MEMBER_KEYS = Object.keys(ROLE_OF) as MemberKey[]

const emailOf = (key: MemberKey) => `${key}@oxford.test`

let organizationId: string
let groupAId: string
let groupBId: string

const base = () => `/api/organizations/${organizationId}/assignments`

const authed = (key: MemberKey) => loginAs(emailOf(key))

const get = async (key: MemberKey, path = '', query: object = {}) => request(app).get(`${base()}${path}`).query(query).set('Authorization', await authed(key))

const remove = async (key: MemberKey, assignmentId: string) => request(app).delete(`${base()}/${assignmentId}`).set('Authorization', await authed(key))

// Far ahead, so hand-ins in these tests are on time
const DUE_AT = '2030-11-20T16:00:00.000Z'

type UploadFile = { buffer: Buffer; filename: string; contentType: string }

const notesFile = (): UploadFile => ({ buffer: Buffer.from('Read pages 4 to 9.'), filename: 'reading.txt', contentType: 'text/plain' })

type SendFormParams = {
  key: MemberKey
  method: 'post' | 'put'
  path: string
  fields: Record<string, string>
  file?: UploadFile
}

/** A multipart form, as the page sends it */
const sendForm = async ({ key, method, path, fields, file }: SendFormParams) => {
  const call = request(app)[method](`${base()}${path}`).set('Authorization', await authed(key))
  for (const [name, value] of Object.entries(fields)) call.field(name, value)
  return file ? call.attach('file', file.buffer, { filename: file.filename, contentType: file.contentType }) : call
}

const assignmentFields = (groupId: string, overrides: Record<string, string> = {}) => ({
  group_id: groupId,
  title: 'Limits worksheet',
  instructions: 'Answer questions 1 to 5.',
  due_at: DUE_AT,
  max_points: '20',
  ...overrides,
})

type SetParams = {
  key: MemberKey
  groupId: string
  fields?: Record<string, string>
  file?: UploadFile
}

const setAssignment = ({ key, groupId, fields = {}, file }: SetParams) => sendForm({ key, method: 'post', path: '', fields: assignmentFields(groupId, fields), file })

/** Sets an assignment and returns it */
const setOk = async (params: SetParams) => {
  const response = await setAssignment(params)
  expect(response.status, JSON.stringify(response.body)).toBe(201)
  return response.body.data as Assignment
}

const detailFields = (overrides: Record<string, string> = {}) => ({ title: 'Limits worksheet (v2)', instructions: 'Answer questions 1 to 8.', due_at: '2026-11-21T16:00:00.000Z', max_points: '', ...overrides })

const edit = (key: MemberKey, assignmentId: string, fields: Record<string, string> = detailFields(), file?: UploadFile) => sendForm({ key, method: 'put', path: `/${assignmentId}`, fields, file })

const assignmentsIn = async (key: MemberKey, groupId: string) => {
  const response = await get(key, '', { group_id: groupId })
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  return response.body.data as Assignment[]
}

type HandInParams = {
  key: MemberKey
  assignmentId: string
  fields?: Record<string, string>
  file?: UploadFile
}

const handIn = ({ key, assignmentId, fields = { text: 'My answers.' }, file }: HandInParams) => sendForm({ key, method: 'put', path: `/${assignmentId}/submission`, fields, file })

const mine = async (key: MemberKey) => {
  const response = await get(key, '/mine')
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  return response.body.data as StudentAssignment[]
}

const download = async (key: MemberKey, assignmentId: string) => request(app).get(`${base()}/${assignmentId}/download`).set('Authorization', await authed(key)).responseType('blob')

const detailOf = async (key: MemberKey, assignmentId: string) => {
  const response = await get(key, `/${assignmentId}`)
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  return response.body.data as AssignmentDetail
}

const downloadHandIn = async (key: MemberKey, assignmentId: string, submissionId: string) =>
  request(app).get(`${base()}/${assignmentId}/submissions/${submissionId}/download`).set('Authorization', await authed(key)).responseType('blob')

const mark = async (key: MemberKey, assignmentId: string, submissionId: string, body: object) =>
  request(app).put(`${base()}/${assignmentId}/submissions/${submissionId}/mark`).set('Authorization', await authed(key)).send(body)

/** Sets an assignment, has Alba hand it in, and returns both ids */
const handedInByAlba = async (fields: Record<string, string> = {}) => {
  const assignment = await setOk({ key: 'arben', groupId: groupAId, fields })
  const response = await handIn({ key: 'alba', assignmentId: assignment.id })
  return { assignmentId: assignment.id, submissionId: (response.body.data as StudentAssignment).hand_in?.id ?? '' }
}

/** The files stored for assignments, to prove a refusal left nothing or a removal took its files away */
const storedFiles = async () => readdir(process.env.ASSIGNMENTS_DIR ?? '').catch(() => [])

// Files go to a folder of this run's own, removed afterward
beforeAll(async () => {
  process.env.ASSIGNMENTS_DIR = await mkdtemp(path.join(tmpdir(), 'assignments-test-'))
})

afterAll(async () => {
  await rm(process.env.ASSIGNMENTS_DIR ?? '', { recursive: true, force: true })
  delete process.env.ASSIGNMENTS_DIR
})

beforeEach(async () => {
  await rm(process.env.ASSIGNMENTS_DIR ?? '', { recursive: true, force: true })
  const users = {} as Record<MemberKey, { id: string }>
  for (const key of MEMBER_KEYS) {
    users[key] = await createUser({ email: emailOf(key) })
    await prisma.user.update({ where: { id: users[key].id }, data: { first_name: key[0].toUpperCase() + key.slice(1), last_name: 'Person' } })
  }
  const organization = await createOrganization({
    name: 'Oxford Academy',
    ownerId: users.owner.id,
    members: MEMBER_KEYS.filter((key) => key !== 'owner').map((key) => ({ userId: users[key].id, role: ROLE_OF[key], permissions: key === 'admin' ? ['MANAGE_GRADES'] : [] })),
  })
  organizationId = organization.id
  const mathId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  const yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  const lecturerOf = async (key: MemberKey) =>
    (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: key, last_name: 'Person', employment_type: 'FULL_TIME', user_id: users[key].id } })).id
  const studentOf = async (key: MemberKey, number: string) =>
    (await prisma.student.create({ data: { organization_id: organizationId, first_name: key[0].toUpperCase() + key.slice(1), last_name: 'Person', student_number: number, user_id: users[key].id } })).id
  const addGroup = async (name: string, lecturerId: string) => {
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: mathId, name, academic_year_id: yearId } })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2020-01-01') } })
    return group.id
  }
  // Mathematics: group A (Arben: Alba and Dren) and group B (Teuta: Besa)
  groupAId = await addGroup('Group A', await lecturerOf('arben'))
  groupBId = await addGroup('Group B', await lecturerOf('teuta'))
  await prisma.groupEnrolment.create({ data: { group_id: groupAId, student_id: await studentOf('alba', 'STU-1'), enrolled_on: new Date('2020-01-01') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupAId, student_id: await studentOf('dren', 'STU-3'), enrolled_on: new Date('2020-01-01') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupBId, student_id: await studentOf('besa', 'STU-2'), enrolled_on: new Date('2020-01-01') } })
})

describe('setting assignments', () => {
  it('lets a lecturer set an assignment for a group they teach, and lists it for that group', async () => {
    await setOk({ key: 'arben', groupId: groupAId })

    const [assignment] = await assignmentsIn('arben', groupAId)

    expect(assignment).toMatchObject({
      title: 'Limits worksheet',
      instructions: 'Answer questions 1 to 5.',
      due_at: DUE_AT,
      max_points: 20,
      file: null,
      group: { id: groupAId, name: 'Group A', course_name: 'Mathematics' },
      author: { first_name: 'Arben', last_name: 'Person' },
      can_edit: true,
      can_remove: true,
    })
  })

  it('stores no max points when left empty, and refuses a missing title, a bad due date and points out of range', async () => {
    const withoutPoints = await setOk({ key: 'arben', groupId: groupAId, fields: { max_points: '' } })

    expect(withoutPoints.max_points).toBeNull()
    const refused: Record<string, string>[] = [{ title: ' ' }, { due_at: 'next friday' }, { max_points: '0' }, { max_points: '1001' }, { max_points: '2.5' }]
    for (const fields of refused) {
      expect((await setAssignment({ key: 'arben', groupId: groupAId, fields })).status, JSON.stringify(fields)).toBe(400)
    }
    expect(await prisma.assignment.count()).toBe(1)
  })

  it('attaches a file the group downloads, and refuses a file type that is not allowed', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId, file: notesFile() })
    const script = await setAssignment({ key: 'arben', groupId: groupAId, file: { buffer: Buffer.from('<script>'), filename: 'page.html', contentType: 'text/html' } })

    const response = await download('alba', assignment.id)

    expect(assignment.file).toEqual({ name: 'reading.txt', type: 'text/plain', size: 18 })
    expect(response.status).toBe(200)
    expect(response.headers['content-disposition']).toContain('attachment')
    expect(Buffer.from(response.body as Buffer).toString()).toBe('Read pages 4 to 9.')
    expect(script.status).toBe(400)
    expect(await storedFiles()).toHaveLength(1)
  })
})

describe('who sets assignments', () => {
  it('refuses a lecturer setting for a group they don’t teach and a student setting at all, keeping no file', async () => {
    const byOtherLecturer = await setAssignment({ key: 'arben', groupId: groupBId, file: notesFile() })
    const byStudent = await setAssignment({ key: 'alba', groupId: groupAId, file: notesFile() })

    expect(byOtherLecturer.status).toBe(403)
    expect(byStudent.status).toBe(403)
    expect(await prisma.assignment.count()).toBe(0)
    expect(await storedFiles()).toEqual([])
  })

  it('lets the owner and an admin with Grades set anywhere, and refuses other admins and guardians on every route', async () => {
    await setOk({ key: 'owner', groupId: groupBId, fields: { title: 'From the owner' } })
    const fromAdmin = await setOk({ key: 'admin', groupId: groupAId, fields: { title: 'From the admin' } })

    for (const key of ['clerk', 'gent'] as const) {
      expect((await get(key, '/groups')).status).toBe(403)
      expect((await get(key, '', { group_id: groupAId })).status).toBe(403)
      expect((await setAssignment({ key, groupId: groupAId })).status).toBe(403)
      expect((await edit(key, fromAdmin.id)).status).toBe(403)
      expect((await download(key, fromAdmin.id)).status).toBe(403)
      expect((await remove(key, fromAdmin.id)).status).toBe(403)
    }
    expect((await assignmentsIn('owner', groupBId)).map((assignment) => assignment.title)).toEqual(['From the owner'])
  })

  it('lists the groups each setter teaches, and every group for staff', async () => {
    const lecturerGroups = (await get('arben', '/groups')).body.data as AssignmentGroup[]
    const adminGroups = (await get('admin', '/groups')).body.data as AssignmentGroup[]

    expect(lecturerGroups.map((group) => [group.name, group.can_set])).toEqual([['Group A', true]])
    expect(adminGroups.map((group) => group.name)).toEqual(['Group A', 'Group B'])
  })

  it('does not show a group’s assignments to a lecturer who doesn’t teach it', async () => {
    await setOk({ key: 'teuta', groupId: groupBId })

    expect((await get('arben', '', { group_id: groupBId })).status).toBe(404)
  })
})

describe('editing and removing', () => {
  it('lets the group’s lecturer change the details, replace the file and take it away', async () => {
    const assignment = await setOk({ key: 'owner', groupId: groupAId, file: notesFile() })

    const replaced = await edit('arben', assignment.id, detailFields(), { buffer: Buffer.from('New pages.'), filename: 'pages.txt', contentType: 'text/plain' })
    expect(replaced.status, JSON.stringify(replaced.body)).toBe(200)
    expect(replaced.body.data).toMatchObject({ title: 'Limits worksheet (v2)', instructions: 'Answer questions 1 to 8.', due_at: '2026-11-21T16:00:00.000Z', max_points: null, file: { name: 'pages.txt' } })
    expect(await storedFiles()).toHaveLength(1)

    const withoutFile = await edit('arben', assignment.id, detailFields({ remove_file: 'true' }))

    expect(withoutFile.body.data).toMatchObject({ file: null })
    expect(await storedFiles()).toEqual([])
  })

  it('refuses a lecturer of another group and a student, and answers 404 outside the group', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId })

    expect((await edit('teuta', assignment.id)).status).toBe(404)
    expect((await remove('teuta', assignment.id)).status).toBe(404)
    expect((await edit('alba', assignment.id)).status).toBe(403)
    expect((await remove('alba', assignment.id)).status).toBe(403)
    expect(await prisma.assignment.count()).toBe(1)
  })

  it('removes an assignment with its file, its hand-ins and their files', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId, file: notesFile() })
    await handIn({ key: 'alba', assignmentId: assignment.id, file: notesFile() })
    expect(await storedFiles()).toHaveLength(2)

    const response = await remove('admin', assignment.id)

    expect(response.status).toBe(200)
    expect(await assignmentsIn('arben', groupAId)).toEqual([])
    expect(await mine('alba')).toEqual([])
    expect(await prisma.assignmentSubmission.count()).toBe(0)
    expect(await storedFiles()).toEqual([])
  })
})

describe('handing in', () => {
  it('shows a student the assignments of their own groups only, soonest due first, none handed in yet', async () => {
    await setOk({ key: 'arben', groupId: groupAId, fields: { title: 'Later one', due_at: '2031-01-10T16:00:00.000Z' } })
    await setOk({ key: 'arben', groupId: groupAId, fields: { title: 'Sooner one' } })
    await setOk({ key: 'teuta', groupId: groupBId, fields: { title: 'Group B work' } })

    const assignments = await mine('alba')

    expect(assignments.map((assignment) => assignment.title)).toEqual(['Sooner one', 'Later one'])
    expect(assignments[0]).toMatchObject({ status: 'NOT_HANDED_IN', hand_in: null, can_hand_in: true, can_edit: false, can_remove: false, group: { name: 'Group A' } })
    expect((await mine('besa')).map((assignment) => assignment.title)).toEqual(['Group B work'])
  })

  it('takes text, then replaces it with text and a file, and shows each student only their own hand-in', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId })

    const first = await handIn({ key: 'alba', assignmentId: assignment.id })
    expect(first.status, JSON.stringify(first.body)).toBe(200)
    expect(first.body.data).toMatchObject({ status: 'HANDED_IN', hand_in: { text: 'My answers.', file: null, is_late: false, mark: null } })

    const replaced = await handIn({ key: 'alba', assignmentId: assignment.id, fields: { text: 'Better answers.' }, file: notesFile() })
    expect(replaced.body.data).toMatchObject({ hand_in: { text: 'Better answers.', file: { name: 'reading.txt' } } })
    const fileOnly = await handIn({ key: 'alba', assignmentId: assignment.id, fields: { text: '', keep_file: 'true' } })
    expect(fileOnly.body.data).toMatchObject({ hand_in: { text: null, file: { name: 'reading.txt' } } })

    expect((await mine('dren'))[0]).toMatchObject({ status: 'NOT_HANDED_IN', hand_in: null })
    expect(await prisma.assignmentSubmission.count()).toBe(1)
  })

  it('replaces the stored file with a new one, and drops it when the student doesn’t keep it', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId })
    await handIn({ key: 'alba', assignmentId: assignment.id, file: notesFile() })
    await handIn({ key: 'alba', assignmentId: assignment.id, file: { buffer: Buffer.from('v2'), filename: 'v2.txt', contentType: 'text/plain' } })
    expect(await storedFiles()).toHaveLength(1)

    const textOnly = await handIn({ key: 'alba', assignmentId: assignment.id, fields: { text: 'Only words now.' } })

    expect(textOnly.body.data).toMatchObject({ hand_in: { text: 'Only words now.', file: null } })
    expect(await storedFiles()).toEqual([])
  })

  it('still takes a hand-in after the due date, marked late', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId, fields: { due_at: '2020-01-10T16:00:00.000Z' } })

    const response = await handIn({ key: 'alba', assignmentId: assignment.id })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ status: 'LATE', hand_in: { is_late: true } })
  })

  it('refuses an empty hand-in, a wrong file type, a lecturer, and a student outside the group, keeping no file', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId })

    expect((await handIn({ key: 'alba', assignmentId: assignment.id, fields: { text: '  ' } })).status).toBe(400)
    expect((await handIn({ key: 'alba', assignmentId: assignment.id, file: { buffer: Buffer.from('<script>'), filename: 'page.html', contentType: 'text/html' } })).status).toBe(400)
    expect((await handIn({ key: 'arben', assignmentId: assignment.id, file: notesFile() })).status).toBe(403)
    expect((await handIn({ key: 'besa', assignmentId: assignment.id, file: notesFile() })).status).toBe(404)
    expect((await get('arben', '/mine')).status).toBe(403)
    expect(await prisma.assignmentSubmission.count()).toBe(0)
    expect(await storedFiles()).toEqual([])
  })
})

describe('reviewing hand-ins', () => {
  it('shows the group’s lecturer every student with where their hand-in stands', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId, fields: { due_at: '2020-01-10T16:00:00.000Z' } })
    await handIn({ key: 'alba', assignmentId: assignment.id, fields: { text: 'Late but done.' } })

    const detail = await detailOf('arben', assignment.id)

    expect(detail).toMatchObject({ id: assignment.id, title: 'Limits worksheet' })
    expect(detail.hand_ins.map((row) => [row.student.first_name, row.status, row.hand_in?.text ?? null])).toEqual([
      ['Alba', 'LATE', 'Late but done.'],
      ['Dren', 'NOT_HANDED_IN', null],
    ])
  })

  it('shows on-time hand-ins as handed in, and leaves out students who left the group', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId })
    await handIn({ key: 'dren', assignmentId: assignment.id })
    await prisma.groupEnrolment.updateMany({ where: { group_id: groupAId, student: { first_name: 'Alba' } }, data: { withdrawn_on: new Date('2026-10-01') } })

    const detail = await detailOf('owner', assignment.id)

    expect(detail.hand_ins.map((row) => [row.student.first_name, row.status])).toEqual([['Dren', 'HANDED_IN']])
  })

  it('refuses the hand-ins to students and to lecturers of other groups', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId })

    expect((await get('alba', `/${assignment.id}`)).status).toBe(403)
    expect((await get('teuta', `/${assignment.id}`)).status).toBe(404)
    expect((await get('clerk', `/${assignment.id}`)).status).toBe(403)
  })

  it('lets the lecturer and the student who handed it in download the file, and refuses everyone else', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId })
    const handedIn = (await handIn({ key: 'alba', assignmentId: assignment.id, file: notesFile() })).body.data as StudentAssignment
    const submissionId = handedIn.hand_in?.id ?? ''

    const byLecturer = await downloadHandIn('arben', assignment.id, submissionId)

    expect(byLecturer.status).toBe(200)
    expect(byLecturer.headers['content-disposition']).toContain('attachment')
    expect(Buffer.from(byLecturer.body as Buffer).toString()).toBe('Read pages 4 to 9.')
    expect((await downloadHandIn('alba', assignment.id, submissionId)).status).toBe(200)
    expect((await downloadHandIn('admin', assignment.id, submissionId)).status).toBe(200)
    expect((await downloadHandIn('dren', assignment.id, submissionId)).status).toBe(404)
    expect((await downloadHandIn('besa', assignment.id, submissionId)).status).toBe(404)
    expect((await downloadHandIn('teuta', assignment.id, submissionId)).status).toBe(404)
    expect((await downloadHandIn('clerk', assignment.id, submissionId)).status).toBe(403)
    expect((await request(app).get(`${base()}/${assignment.id}/submissions/${submissionId}/download`)).status).toBe(401)
  })
})

describe('marking', () => {
  it('marks a hand-in with points and feedback, which the student sees right away', async () => {
    const { assignmentId, submissionId } = await handedInByAlba()

    const response = await mark('arben', assignmentId, submissionId, { points: 18, feedback: 'Good work.' })

    expect(response.status, JSON.stringify(response.body)).toBe(200)
    expect(response.body.data).toMatchObject({ student: { first_name: 'Alba' }, status: 'MARKED', hand_in: { mark: { points: 18, feedback: 'Good work.' } } })
    expect((await mine('alba'))[0]).toMatchObject({ status: 'MARKED', can_hand_in: false, hand_in: { mark: { points: 18, feedback: 'Good work.' } } })
  })

  it('lets the lecturer change the mark later', async () => {
    const { assignmentId, submissionId } = await handedInByAlba()
    await mark('arben', assignmentId, submissionId, { points: 12, feedback: 'Check question 3.' })

    const changed = await mark('owner', assignmentId, submissionId, { points: 15, feedback: 'Better after the retry.' })

    expect(changed.status).toBe(200)
    expect((await detailOf('arben', assignmentId)).hand_ins[0]).toMatchObject({ status: 'MARKED', hand_in: { mark: { points: 15, feedback: 'Better after the retry.' } } })
  })

  it('refuses points above the max, points without max points, and missing points when there is a max', async () => {
    const { assignmentId, submissionId } = await handedInByAlba()
    const withoutPoints = await handedInByAlba({ max_points: '' })

    expect((await mark('arben', assignmentId, submissionId, { points: 21, feedback: '' })).status).toBe(400)
    expect((await mark('arben', assignmentId, submissionId, { points: null, feedback: 'No points?' })).status).toBe(400)
    expect((await mark('arben', withoutPoints.assignmentId, withoutPoints.submissionId, { points: 5, feedback: '' })).status).toBe(400)
    expect((await mark('arben', withoutPoints.assignmentId, withoutPoints.submissionId, { points: null, feedback: 'Well argued.' })).status).toBe(200)
    expect(await prisma.assignmentSubmission.count({ where: { marked_at: { not: null } } })).toBe(1)
  })

  it('stops the student handing in again once marked', async () => {
    const { assignmentId, submissionId } = await handedInByAlba()
    await mark('arben', assignmentId, submissionId, { points: 18, feedback: '' })

    const again = await handIn({ key: 'alba', assignmentId, fields: { text: 'One more try.' } })

    expect(again.status).toBe(403)
    expect((await mine('alba'))[0].hand_in?.text).toBe('My answers.')
  })

  it('refuses marking to students, lecturers of other groups, and another assignment’s hand-in', async () => {
    const { assignmentId, submissionId } = await handedInByAlba()
    const other = await setOk({ key: 'arben', groupId: groupAId, fields: { title: 'Other' } })

    expect((await mark('alba', assignmentId, submissionId, { points: 20, feedback: '' })).status).toBe(403)
    expect((await mark('teuta', assignmentId, submissionId, { points: 20, feedback: '' })).status).toBe(404)
    expect((await mark('arben', other.id, submissionId, { points: 20, feedback: '' })).status).toBe(404)
    expect(await prisma.assignmentSubmission.count({ where: { marked_at: { not: null } } })).toBe(0)
  })

  it('refuses lowering the max points below points already given, and drops the points when the max goes', async () => {
    const { assignmentId, submissionId } = await handedInByAlba()
    await mark('arben', assignmentId, submissionId, { points: 18, feedback: 'Good work.' })

    const lowered = await edit('arben', assignmentId, detailFields({ max_points: '10' }))

    expect(lowered.status).toBe(400)
    expect((await edit('arben', assignmentId, detailFields({ max_points: '18' }))).status).toBe(200)
    expect((await edit('arben', assignmentId, detailFields({ max_points: '' }))).status).toBe(200)
    expect((await mine('alba'))[0]).toMatchObject({ status: 'MARKED', hand_in: { mark: { points: null, feedback: 'Good work.' } } })
  })
})

describe('archived groups', () => {
  it('refuses every change in an archived group, and keeps it readable and downloadable', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId, file: notesFile() })
    const handedIn = (await handIn({ key: 'alba', assignmentId: assignment.id, file: notesFile() })).body.data as StudentAssignment
    const submissionId = handedIn.hand_in?.id ?? ''
    await prisma.group.update({ where: { id: groupAId }, data: { status: 'ARCHIVED' } })

    const refused = [
      await setAssignment({ key: 'arben', groupId: groupAId }),
      await setAssignment({ key: 'owner', groupId: groupAId }),
      await edit('arben', assignment.id),
      await edit('admin', assignment.id),
      await remove('owner', assignment.id),
      await handIn({ key: 'alba', assignmentId: assignment.id, fields: { text: 'Again.' } }),
      await handIn({ key: 'dren', assignmentId: assignment.id }),
      await mark('arben', assignment.id, submissionId, { points: 18, feedback: '' }),
      await mark('owner', assignment.id, submissionId, { points: 18, feedback: '' }),
    ]

    expect(refused.map((response) => response.status)).toEqual([403, 403, 403, 403, 403, 403, 403, 403, 403])
    expect(await prisma.assignment.count()).toBe(1)
    expect(await prisma.assignmentSubmission.count()).toBe(1)
    expect(await storedFiles()).toHaveLength(2)
    expect((await assignmentsIn('arben', groupAId))[0]).toMatchObject({ id: assignment.id, can_edit: false, can_remove: false })
    expect((await mine('alba'))[0]).toMatchObject({ status: 'HANDED_IN', can_hand_in: false })
    expect((await detailOf('owner', assignment.id)).hand_ins[0]).toMatchObject({ status: 'HANDED_IN' })
    expect(((await get('arben', '/groups')).body.data as AssignmentGroup[])[0]).toMatchObject({ is_archived: true, can_set: false })
    expect((await download('alba', assignment.id)).status).toBe(200)
    expect((await downloadHandIn('arben', assignment.id, submissionId)).status).toBe(200)
  })
})

describe('late hand-ins', () => {
  const PAST_DUE = '2020-01-10T16:00:00.000Z'

  it('accepts late hand-ins by default, and flags them late', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId, fields: { due_at: PAST_DUE } })

    const response = await handIn({ key: 'alba', assignmentId: assignment.id })

    expect(assignment.accepts_late_hand_ins).toBe(true)
    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ status: 'LATE', is_closed: false, can_hand_in: true })
  })

  it('refuses a first hand-in and a replacement after the due date when late hand-ins are off, and still lets the lecturer mark', async () => {
    const assignment = await setOk({ key: 'arben', groupId: groupAId })
    const first = (await handIn({ key: 'alba', assignmentId: assignment.id })).body.data as StudentAssignment
    const edited = await edit('arben', assignment.id, detailFields({ due_at: PAST_DUE, max_points: '20', accepts_late_hand_ins: 'false' }))
    expect(edited.body.data).toMatchObject({ accepts_late_hand_ins: false })

    const replaced = await handIn({ key: 'alba', assignmentId: assignment.id, fields: { text: 'Too late.' } })
    const late = await handIn({ key: 'dren', assignmentId: assignment.id })

    expect(replaced.status).toBe(403)
    expect(replaced.body.error).toBe('Hand-ins for this assignment closed at the due date.')
    expect(late.status).toBe(403)
    expect((await mine('dren'))[0]).toMatchObject({ is_closed: true, can_hand_in: false })
    expect((await mark('arben', assignment.id, first.hand_in?.id ?? '', { points: 15, feedback: '' })).status).toBe(200)
  })

  it('takes hand-ins before the due date whether late ones are accepted or not', async () => {
    const closing = await setOk({ key: 'arben', groupId: groupAId, fields: { accepts_late_hand_ins: 'false' } })
    const open = await setOk({ key: 'arben', groupId: groupAId, fields: { title: 'Open one' } })

    expect(closing.accepts_late_hand_ins).toBe(false)
    expect((await handIn({ key: 'alba', assignmentId: closing.id })).status).toBe(200)
    expect((await handIn({ key: 'alba', assignmentId: open.id })).status).toBe(200)
    expect((await mine('dren')).map((assignment) => assignment.is_closed)).toEqual([false, false])
  })
})
