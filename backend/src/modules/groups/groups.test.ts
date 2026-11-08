import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let groupsPath: string
let ownerAuth: string
let mathematicsId: string
let yearId: string
let otherYearId: string
let autumnId: string
let otherYearTermId: string
let mainCampusId: string
let northCampusId: string

type GroupBody = {
  course_id: string
  name: string
  academic_year_id: string
  academic_term_id: string | null
  location_id: string | null
  capacity: number | null
  lecturer_id: string | null
  lecturer_effective_from: string | null
  schedule: ScheduleEntry[]
}

type ScheduleEntry = {
  weekday: string
  start_time: string
  end_time: string
}

const MONDAY_EVENING: ScheduleEntry = { weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' }

const group = (overrides: Partial<GroupBody> = {}): GroupBody => ({
  course_id: mathematicsId,
  name: 'Group A',
  academic_year_id: yearId,
  academic_term_id: null,
  location_id: null,
  capacity: null,
  lecturer_id: null,
  lecturer_effective_from: null,
  schedule: [MONDAY_EVENING],
  ...overrides,
})

const addGroup = async (body: GroupBody, auth = ownerAuth) => request(app).post(groupsPath).set('Authorization', auth).send(body)

const listGroups = async (query: Record<string, string> = {}, auth = ownerAuth) => request(app).get(groupsPath).query(query).set('Authorization', auth)

type AddLecturerParams = {
  firstName: string
  lastName?: string
  subjects?: string[]
  status?: 'ACTIVE' | 'ARCHIVED'
  /** Another organization's id, when the lecturer isn't Oxford's */
  organization?: string
}

const addLecturer = ({ firstName, lastName = 'Lecturer', subjects = [], status = 'ACTIVE', organization = organizationId }: AddLecturerParams) =>
  prisma.lecturer.create({ data: { organization_id: organization, first_name: firstName, last_name: lastName, subjects, employment_type: 'FULL_TIME', status } })

const yllkaRecords = async () => {
  const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
  const course = await createCourse({ organizationId: yllka.id, name: 'Yllka course' })
  const year = await prisma.academicYear.create({ data: { organization_id: yllka.id, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })
  const term = await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: 'Autumn', start_date: new Date('2026-09-01'), end_date: new Date('2027-01-31') } })
  const location = await prisma.location.create({ data: { organization_id: yllka.id, name: 'Yllka campus', is_main: true } })
  return { courseId: course.id, yearId: year.id, termId: term.id, locationId: location.id }
}

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const manager = await createUser({ email: 'manager@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const schedules = await createUser({ email: 'schedules@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: manager.id, role: 'ADMIN', permissions: ['MANAGE_COURSES'] },
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: schedules.id, role: 'ADMIN', permissions: ['MANAGE_SCHEDULES'] },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  mathematicsId = (await createCourse({ organizationId, name: 'Mathematics', code: 'MATH-1' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  otherYearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2027–28', start_date: new Date('2027-09-01'), end_date: new Date('2028-06-30') } })).id
  autumnId = (await prisma.academicTerm.create({ data: { academic_year_id: yearId, name: 'Autumn', start_date: new Date('2026-09-01'), end_date: new Date('2027-01-31') } })).id
  otherYearTermId = (await prisma.academicTerm.create({ data: { academic_year_id: otherYearId, name: 'Autumn', start_date: new Date('2027-09-01'), end_date: new Date('2028-01-31') } })).id
  mainCampusId = (await prisma.location.create({ data: { organization_id: organizationId, name: 'Main campus', is_main: true } })).id
  northCampusId = (await prisma.location.create({ data: { organization_id: organizationId, name: 'North campus' } })).id
  groupsPath = `/api/organizations/${organizationId}/groups`
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('adding and listing groups', () => {
  it('adds a group with every field and lists it', async () => {
    const response = await addGroup(group({ academic_term_id: autumnId, location_id: mainCampusId, capacity: 20 }))

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      name: 'Group A',
      capacity: 20,
      status: 'ACTIVE',
      course: { id: mathematicsId, name: 'Mathematics', status: 'ACTIVE' },
      academic_year: { id: yearId, name: '2026–27' },
      academic_term: { id: autumnId, name: 'Autumn' },
      location: { id: mainCampusId, name: 'Main campus' },
    })
    const list = await listGroups()
    expect(list.status).toBe(200)
    expect(list.body.data.groups).toMatchObject([{ id: response.body.data.id }])
    expect(list.body.data.total).toBe(1)
  })

  it('needs only a course, a name and a year', async () => {
    const response = await addGroup(group())

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ academic_term: null, location: null, capacity: null })
  })

  it('asks for a name, a course and a year', async () => {
    const response = await addGroup({ ...group({ name: ' ' }), course_id: '', academic_year_id: '' })

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors).toMatchObject({ name: ['Enter the group name.'], course_id: ['Choose a course.'], academic_year_id: ['Choose a school year.'] })
  })

  it('refuses a capacity under 1', async () => {
    const response = await addGroup(group({ capacity: 0 }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.capacity).toEqual(['Enter at least 1 seat.'])
  })

  it('answers a field error for a name already in the course and year, in any case', async () => {
    await addGroup(group({ name: 'Group A' }))

    const response = await addGroup(group({ name: 'GROUP a' }))

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.name).toEqual(['This course already has a group with this name in this year.'])
  })

  it('takes _ literally when comparing names', async () => {
    await addGroup(group({ name: 'GRPX1' }))

    const response = await addGroup(group({ name: 'GRP_1' }))

    expect(response.status).toBe(201)
  })

  it('still refuses the same name when it holds _', async () => {
    await addGroup(group({ name: 'GRP_1' }))

    const response = await addGroup(group({ name: 'grp_1' }))

    expect(response.status).toBe(409)
  })

  it('lets the same name repeat in another course or another year', async () => {
    const physics = await createCourse({ organizationId, name: 'Physics' })
    await addGroup(group())

    const otherCourse = await addGroup(group({ course_id: physics.id }))
    const otherYear = await addGroup(group({ academic_year_id: otherYearId }))

    expect(otherCourse.status).toBe(201)
    expect(otherYear.status).toBe(201)
  })

  it('refuses a term of another year', async () => {
    const response = await addGroup(group({ academic_term_id: otherYearTermId }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.academic_term_id).toEqual(['Choose a term of this school year.'])
  })

  it('refuses a course, year, term and location from another organization', async () => {
    const yllka = await yllkaRecords()

    const course = await addGroup(group({ course_id: yllka.courseId }))
    const year = await addGroup(group({ academic_year_id: yllka.yearId }))
    const term = await addGroup(group({ academic_term_id: yllka.termId }))
    const location = await addGroup(group({ location_id: yllka.locationId }))

    expect(course.status).toBe(400)
    expect(course.body.details.fieldErrors.course_id).toEqual(['Choose one of your organization’s courses.'])
    expect(year.status).toBe(400)
    expect(year.body.details.fieldErrors.academic_year_id).toEqual(['Choose one of your organization’s school years.'])
    expect(term.status).toBe(400)
    expect(term.body.details.fieldErrors.academic_term_id).toEqual(['Choose a term of this school year.'])
    expect(location.status).toBe(400)
    expect(location.body.details.fieldErrors.location_id).toEqual(['Choose one of your organization’s locations.'])
    expect((await listGroups()).body.data.groups).toEqual([])
  })

  it('refuses a new group on an archived course', async () => {
    await prisma.course.update({ where: { id: mathematicsId }, data: { status: 'ARCHIVED' } })

    const response = await addGroup(group())

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.course_id).toEqual(['This course is archived. Restore it first.'])
  })
})

describe('what removing a place does to groups', () => {
  it('refuses to delete a year with groups, archived ones included, with a clear message', async () => {
    const added = await addGroup(group())
    await prisma.group.update({ where: { id: added.body.data.id }, data: { status: 'ARCHIVED' } })

    const response = await request(app).delete(`/api/organizations/${organizationId}/academic-periods/years/${yearId}`).query({ newCurrentId: otherYearId }).set('Authorization', ownerAuth)

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('This year still has groups. Move them to another year first.')
    expect(await prisma.academicYear.findUniqueOrThrow({ where: { id: yearId }, select: { is_current: true } })).toEqual({ is_current: true })
  })

  it('still deletes a year without groups', async () => {
    await addGroup(group())

    const response = await request(app).delete(`/api/organizations/${organizationId}/academic-periods/years/${otherYearId}`).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
  })

  it('clears a deleted term from its groups', async () => {
    const added = await addGroup(group({ academic_term_id: autumnId }))

    const response = await request(app).delete(`/api/organizations/${organizationId}/academic-periods/years/${yearId}/terms/${autumnId}`).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
    expect((await listGroups()).body.data.groups).toMatchObject([{ id: added.body.data.id, academic_term: null }])
  })

  it('keeps the group, without a location, when its location is removed', async () => {
    const added = await addGroup(group({ location_id: northCampusId }))

    const response = await request(app).delete(`/api/organizations/${organizationId}/locations/${northCampusId}`).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
    expect((await listGroups()).body.data.groups).toMatchObject([{ id: added.body.data.id, location: null }])
  })
})

describe('group access', () => {
  it('lets a school admin with MANAGE_COURSES add and list groups', async () => {
    const auth = await loginAs('manager@oxford.test')

    expect((await addGroup(group(), auth)).status).toBe(201)
    expect((await listGroups({}, auth)).status).toBe(200)
  })

  it('refuses a school admin without MANAGE_COURSES', async () => {
    const auth = await loginAs('admin@oxford.test')
    const added = await addGroup(group())

    expect((await addGroup(group(), auth)).status).toBe(403)
    expect((await listGroups({}, auth)).status).toBe(403)
    expect((await readGroup(added.body.data.id, auth)).status).toBe(403)
  })

  it('lets a school admin with only MANAGE_SCHEDULES list and read groups, and change nothing else about them', async () => {
    const auth = await loginAs('schedules@oxford.test')
    const added = await addGroup(group())
    const id = added.body.data.id

    expect((await listGroups({}, auth)).body.data.groups).toMatchObject([{ id }])
    expect((await readGroup(id, auth)).status).toBe(200)
    expect((await request(app).get(`/api/organizations/${organizationId}/courses/options`).set('Authorization', auth)).status).toBe(200)
    expect((await addGroup(group({ name: 'Group B' }), auth)).status).toBe(403)
    expect((await request(app).put(`${groupsPath}/${id}`).set('Authorization', auth).send(group())).status).toBe(403)
    expect((await request(app).post(`${groupsPath}/${id}/archive`).set('Authorization', auth)).status).toBe(403)
    for (const path of ['lecturers', 'enrolments']) {
      expect((await request(app).get(`${groupsPath}/${id}/${path}`).set('Authorization', auth)).status, path).toBe(403)
    }
    expect((await request(app).get(`${groupsPath}/lecturer-options`).set('Authorization', auth)).status).toBe(403)
  })
})

const readGroup = async (id: string, auth = ownerAuth) => request(app).get(`${groupsPath}/${id}`).set('Authorization', auth)

describe('reading one group', () => {
  it('answers the group with its course, year, term, location, capacity and lecturer', async () => {
    const lecturer = await addLecturer({ firstName: 'Arben', lastName: 'Hoxha' })
    const added = await addGroup(group({ academic_term_id: autumnId, location_id: mainCampusId, capacity: 20, lecturer_id: lecturer.id }))

    const response = await readGroup(added.body.data.id)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      id: added.body.data.id,
      name: 'Group A',
      capacity: 20,
      course: { id: mathematicsId, name: 'Mathematics' },
      academic_year: { id: yearId, name: '2026–27' },
      academic_term: { id: autumnId, name: 'Autumn' },
      location: { id: mainCampusId, name: 'Main campus' },
      lecturer: { id: lecturer.id, first_name: 'Arben', last_name: 'Hoxha' },
    })
  })

  it('answers 404 for an unknown group or one of another organization', async () => {
    const yllka = await yllkaRecords()
    const yllkaOrganization = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    const yllkaGroup = await prisma.group.create({ data: { organization_id: yllkaOrganization.id, course_id: yllka.courseId, name: 'Yllka group', academic_year_id: yllka.yearId } })

    expect((await readGroup('00000000-0000-4000-8000-000000000000')).status).toBe(404)
    expect((await readGroup(yllkaGroup.id)).status).toBe(404)
  })
})

const updateGroup = async (id: string, body: GroupBody, auth = ownerAuth) => request(app).put(`${groupsPath}/${id}`).set('Authorization', auth).send(body)

const setStatus = async (id: string, verb: 'archive' | 'restore', auth = ownerAuth) => request(app).post(`${groupsPath}/${id}/${verb}`).set('Authorization', auth)

const setCourseStatus = async (courseId: string, verb: 'archive' | 'restore') => request(app).post(`/api/organizations/${organizationId}/courses/${courseId}/${verb}`).set('Authorization', ownerAuth)

const namesIn = async (query: Record<string, string> = {}) => (await listGroups(query)).body.data.groups.map((item: { name: string }) => item.name)

const logged = (action: 'GROUP_ADDED' | 'GROUP_UPDATED' | 'GROUP_ARCHIVED' | 'GROUP_RESTORED') =>
  prisma.activityLog.findMany({ where: { organization_id: organizationId, action }, orderBy: { subject_name: 'asc' }, select: { subject_name: true } })

const addArchivedCourse = async () => {
  const course = await createCourse({ organizationId, name: 'Old Latin', status: 'ARCHIVED' })
  return course.id
}

describe('filtering groups', () => {
  let physicsId: string

  beforeEach(async () => {
    physicsId = (await createCourse({ organizationId, name: 'Physics' })).id
    await addGroup(group({ name: 'Math this year' }))
    await addGroup(group({ name: 'Math next year', academic_year_id: otherYearId }))
    await addGroup(group({ name: 'Physics this year', course_id: physicsId }))
    const archived = await addGroup(group({ name: 'Math archived' }))
    await setStatus(archived.body.data.id, 'archive')
  })

  it('filters by course', async () => {
    expect(await namesIn({ course_id: physicsId })).toEqual(['Physics this year'])
  })

  it('filters by year', async () => {
    expect(await namesIn({ academic_year_id: otherYearId })).toEqual(['Math next year'])
  })

  it('filters by course and year together', async () => {
    expect(await namesIn({ course_id: mathematicsId, academic_year_id: yearId })).toEqual(['Math this year'])
  })

  it('counts each status with the filters applied', async () => {
    expect((await listGroups()).body.data.counts).toEqual({ ACTIVE: 3, ARCHIVED: 1 })
    expect((await listGroups({ course_id: mathematicsId })).body.data.counts).toEqual({ ACTIVE: 2, ARCHIVED: 1 })
    expect((await listGroups({ course_id: physicsId })).body.data.counts).toEqual({ ACTIVE: 1, ARCHIVED: 0 })
  })

  it('lists one status at a time', async () => {
    expect(await namesIn({ status: 'ARCHIVED' })).toEqual(['Math archived'])
  })

  it('finds nothing for another organization’s course', async () => {
    const yllka = await yllkaRecords()

    expect(await namesIn({ course_id: yllka.courseId })).toEqual([])
  })

  it('refuses a filter that isn’t an id', async () => {
    expect((await listGroups({ course_id: 'mathematics' })).status).toBe(400)
  })
})

describe('editing groups', () => {
  it('saves every field', async () => {
    const physics = await createCourse({ organizationId, name: 'Physics' })
    const added = await addGroup(group())

    const response = await updateGroup(
      added.body.data.id,
      group({ course_id: physics.id, name: 'Group B', academic_year_id: otherYearId, academic_term_id: otherYearTermId, location_id: mainCampusId, capacity: 12 }),
    )

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      name: 'Group B',
      capacity: 12,
      course: { id: physics.id },
      academic_year: { id: otherYearId },
      academic_term: { id: otherYearTermId },
      location: { id: mainCampusId },
    })
  })

  it('lets a group keep its own name', async () => {
    const added = await addGroup(group())

    expect((await updateGroup(added.body.data.id, group({ capacity: 5 }))).status).toBe(200)
  })

  it('answers a field error for another group’s name in the course and year', async () => {
    await addGroup(group({ name: 'Group A' }))
    const added = await addGroup(group({ name: 'Group B' }))

    const response = await updateGroup(added.body.data.id, group({ name: 'group a' }))

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.name).toEqual(['This course already has a group with this name in this year.'])
  })

  it('refuses a term of another year', async () => {
    const added = await addGroup(group({ academic_term_id: autumnId }))

    const response = await updateGroup(added.body.data.id, group({ academic_year_id: otherYearId, academic_term_id: autumnId }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.academic_term_id).toEqual(['Choose a term of this school year.'])
  })

  it('refuses a course, year, term and location from another organization', async () => {
    const yllka = await yllkaRecords()
    const added = await addGroup(group())
    const id = added.body.data.id

    expect((await updateGroup(id, group({ course_id: yllka.courseId }))).status).toBe(400)
    expect((await updateGroup(id, group({ academic_year_id: yllka.yearId }))).status).toBe(400)
    expect((await updateGroup(id, group({ academic_term_id: yllka.termId }))).status).toBe(400)
    expect((await updateGroup(id, group({ location_id: yllka.locationId }))).status).toBe(400)
  })

  it('refuses moving a group onto an archived course', async () => {
    const added = await addGroup(group())

    const response = await updateGroup(added.body.data.id, group({ course_id: await addArchivedCourse() }))

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.course_id).toEqual(['This course is archived. Restore it first.'])
  })

  it('still edits a group of an archived course, on that course', async () => {
    const added = await addGroup(group())
    await setCourseStatus(mathematicsId, 'archive')

    const response = await updateGroup(added.body.data.id, group({ capacity: 9 }))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ capacity: 9, status: 'ARCHIVED' })
  })

  it('answers 404 for a group that doesn’t exist', async () => {
    expect((await updateGroup('00000000-0000-4000-8000-000000000000', group())).status).toBe(404)
  })
})

describe('archiving and restoring groups', () => {
  it('moves a group between the tabs', async () => {
    const added = await addGroup(group())

    const archived = await setStatus(added.body.data.id, 'archive')

    expect(archived.status).toBe(200)
    expect(archived.body.data.status).toBe('ARCHIVED')
    expect(await namesIn()).toEqual([])
    expect(await namesIn({ status: 'ARCHIVED' })).toEqual(['Group A'])

    const restored = await setStatus(added.body.data.id, 'restore')

    expect(restored.status).toBe(200)
    expect(restored.body.data.status).toBe('ACTIVE')
    expect(await namesIn()).toEqual(['Group A'])
  })

  it('answers 409 when already in that status', async () => {
    const added = await addGroup(group())

    const restored = await setStatus(added.body.data.id, 'restore')
    await setStatus(added.body.data.id, 'archive')
    const archived = await setStatus(added.body.data.id, 'archive')

    expect(restored.status).toBe(409)
    expect(restored.body.error).toBe('This group is already active.')
    expect(archived.status).toBe(409)
    expect(archived.body.error).toBe('This group is already archived.')
  })

  it('lets a school admin with MANAGE_COURSES edit, archive and restore, and refuses one without it', async () => {
    const added = await addGroup(group())
    const auth = await loginAs('manager@oxford.test')
    const refused = await loginAs('admin@oxford.test')
    const id = added.body.data.id

    expect((await updateGroup(id, group({ capacity: 3 }), auth)).status).toBe(200)
    expect((await setStatus(id, 'archive', auth)).status).toBe(200)
    expect((await setStatus(id, 'restore', auth)).status).toBe(200)
    expect((await updateGroup(id, group(), refused)).status).toBe(403)
    expect((await setStatus(id, 'archive', refused)).status).toBe(403)
    expect((await setStatus(id, 'restore', refused)).status).toBe(403)
  })
})

describe('group activity', () => {
  it('logs each change with the group’s name', async () => {
    const added = await addGroup(group())
    await updateGroup(added.body.data.id, group({ name: 'Group B' }))
    await setStatus(added.body.data.id, 'archive')
    await setStatus(added.body.data.id, 'restore')

    expect(await logged('GROUP_ADDED')).toEqual([{ subject_name: 'Group A' }])
    expect(await logged('GROUP_UPDATED')).toEqual([{ subject_name: 'Group B' }])
    expect(await logged('GROUP_ARCHIVED')).toEqual([{ subject_name: 'Group B' }])
    expect(await logged('GROUP_RESTORED')).toEqual([{ subject_name: 'Group B' }])
  })
})

describe('archiving a course', () => {
  it('archives its active groups and leaves other courses’ groups alone', async () => {
    const physics = await createCourse({ organizationId, name: 'Physics' })
    await addGroup(group({ name: 'Group A' }))
    await addGroup(group({ name: 'Group B', academic_year_id: otherYearId }))
    await addGroup(group({ name: 'Physics group', course_id: physics.id }))

    expect((await setCourseStatus(mathematicsId, 'archive')).status).toBe(200)

    expect(await namesIn()).toEqual(['Physics group'])
    expect(await namesIn({ status: 'ARCHIVED' })).toEqual(['Group A', 'Group B'])
  })

  it('logs each group it archives, once, and not those already archived', async () => {
    await addGroup(group({ name: 'Group A' }))
    const alreadyArchived = await addGroup(group({ name: 'Group B' }))
    await setStatus(alreadyArchived.body.data.id, 'archive')

    await setCourseStatus(mathematicsId, 'archive')

    expect(await logged('GROUP_ARCHIVED')).toEqual([{ subject_name: 'Group A' }, { subject_name: 'Group B' }])
  })

  it('leaves its groups archived when the course is restored', async () => {
    await addGroup(group())
    await setCourseStatus(mathematicsId, 'archive')

    expect((await setCourseStatus(mathematicsId, 'restore')).status).toBe(200)

    expect(await namesIn()).toEqual([])
    expect(await namesIn({ status: 'ARCHIVED' })).toEqual(['Group A'])
    expect(await logged('GROUP_RESTORED')).toEqual([])
  })

  it('refuses restoring a group while its course is archived, then allows it once the course is back', async () => {
    const added = await addGroup(group())
    await setCourseStatus(mathematicsId, 'archive')

    const refused = await setStatus(added.body.data.id, 'restore')

    expect(refused.status).toBe(409)
    expect(refused.body.error).toBe('Restore the course Mathematics first.')
    expect(await namesIn({ status: 'ARCHIVED' })).toEqual(['Group A'])

    await setCourseStatus(mathematicsId, 'restore')

    expect((await setStatus(added.body.data.id, 'restore')).status).toBe(200)
    expect(await namesIn()).toEqual(['Group A'])
  })
})

describe('a group’s weekly schedule', () => {
  const at = (weekday: string, start_time: string, end_time: string): ScheduleEntry => ({ weekday, start_time, end_time })

  /** A group stored before schedules existed, so it has none */
  const addUnscheduledGroup = () => prisma.group.create({ data: { organization_id: organizationId, course_id: mathematicsId, name: 'Old group', academic_year_id: yearId } })

  it('needs at least one day and time on a new group', async () => {
    const response = await addGroup(group({ schedule: [] }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.schedule).toEqual(['Add at least one day and time.'])
  })

  it('refuses an end time that isn’t after the start time', async () => {
    const response = await addGroup(group({ schedule: [at('MONDAY', '17:00', '17:00')] }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.schedule).toEqual(['The end time must be after the start time.'])
  })

  it('refuses a time that isn’t a wall-clock time', async () => {
    const response = await addGroup(group({ schedule: [at('MONDAY', '25:00', '26:00')] }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.schedule).toContain('Enter the start time.')
  })

  it('refuses two overlapping times on the same day, and takes back-to-back ones and other days', async () => {
    const overlapping = await addGroup(group({ schedule: [at('MONDAY', '17:00', '18:30'), at('MONDAY', '18:00', '19:00')] }))
    const fine = await addGroup(group({ schedule: [at('MONDAY', '17:00', '18:30'), at('MONDAY', '18:30', '19:00'), at('TUESDAY', '17:30', '18:00')] }))

    expect(overlapping.status).toBe(400)
    expect(overlapping.body.details.fieldErrors.schedule).toEqual(['This overlaps another time on the same day.'])
    expect(fine.status).toBe(201)
  })

  it('stores the wall-clock times and answers them in the week from Monday, then by time', async () => {
    const added = await addGroup(group({ schedule: [at('SUNDAY', '09:00', '10:00'), at('WEDNESDAY', '17:00', '18:30'), at('MONDAY', '18:00', '19:00'), at('MONDAY', '07:05', '08:00')] }))

    const expected = [at('MONDAY', '07:05', '08:00'), at('MONDAY', '18:00', '19:00'), at('WEDNESDAY', '17:00', '18:30'), at('SUNDAY', '09:00', '10:00')]
    expect(added.body.data.schedule).toEqual(expected)
    expect((await readGroup(added.body.data.id)).body.data.schedule).toEqual(expected)
    expect((await listGroups()).body.data.groups[0].schedule).toEqual(expected)
  })

  it('starts the week on Sunday when the organization does', async () => {
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade', week_start: 'SUNDAY' } })

    const added = await addGroup(group({ schedule: [at('MONDAY', '17:00', '18:00'), at('SATURDAY', '09:00', '10:00'), at('SUNDAY', '09:00', '10:00')] }))

    expect(added.body.data.schedule.map((entry: ScheduleEntry) => entry.weekday)).toEqual(['SUNDAY', 'MONDAY', 'SATURDAY'])
  })

  it('replaces the schedule on an edit', async () => {
    const added = await addGroup(group())

    const response = await updateGroup(added.body.data.id, group({ schedule: [at('FRIDAY', '10:00', '11:00')] }))

    expect(response.status).toBe(200)
    expect(response.body.data.schedule).toEqual([at('FRIDAY', '10:00', '11:00')])
  })

  it('answers no schedule for a group that has none, and saves its other edits without one', async () => {
    const old = await addUnscheduledGroup()
    expect((await readGroup(old.id)).body.data.schedule).toEqual([])

    const response = await updateGroup(old.id, group({ name: 'Renamed group', schedule: [] }))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ name: 'Renamed group', schedule: [] })
  })

  it('refuses to empty a schedule that has days and times', async () => {
    const added = await addGroup(group())

    const response = await updateGroup(added.body.data.id, group({ schedule: [] }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.schedule).toEqual(['Add at least one day and time.'])
    expect((await readGroup(added.body.data.id)).body.data.schedule).toEqual([MONDAY_EVENING])
  })
})

type AddStudentParams = {
  firstName: string
  lastName?: string
  number: string
  status?: 'ACTIVE' | 'ARCHIVED'
  /** Another organization's id, when the student isn't Oxford's */
  organization?: string
}

const addStudent = ({ firstName, lastName = 'Student', number, status = 'ACTIVE', organization = organizationId }: AddStudentParams) =>
  prisma.student.create({ data: { organization_id: organization, first_name: firstName, last_name: lastName, student_number: number, status, notes: 'Staff note', date_of_birth: new Date('2012-03-04') } })

const enrol = async (groupId: string, studentId: string, auth = ownerAuth) => request(app).post(`${groupsPath}/${groupId}/enrolments`).set('Authorization', auth).send({ student_id: studentId })

const listEnrolments = async (groupId: string, auth = ownerAuth) => request(app).get(`${groupsPath}/${groupId}/enrolments`).set('Authorization', auth)

describe('student options for enrolling', () => {
  it('offers the organization’s active students by name, with only their id, name and number', async () => {
    const arta = await addStudent({ firstName: 'Arta', lastName: 'Gashi', number: 'STU-0002' })
    const besa = await addStudent({ firstName: 'Besa', lastName: 'Berisha', number: 'STU-0001' })
    await addStudent({ firstName: 'Old', number: 'STU-0003', status: 'ARCHIVED' })
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    await addStudent({ firstName: 'Yllka', number: 'STU-0001', organization: yllka.id })

    const response = await request(app).get(`${groupsPath}/student-options`).set('Authorization', await loginAs('manager@oxford.test'))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { id: arta.id, first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0002' },
      { id: besa.id, first_name: 'Besa', last_name: 'Berisha', student_number: 'STU-0001' },
    ])
  })

  it('refuses a school admin without MANAGE_COURSES', async () => {
    expect((await request(app).get(`${groupsPath}/student-options`).set('Authorization', await loginAs('admin@oxford.test'))).status).toBe(403)
  })
})

describe('enrolling students', () => {
  let groupId: string

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // Already 3 November in Belgrade, the organization's time zone
    vi.setSystemTime(new Date('2026-11-02T23:30:00.000Z'))
    groupId = (await addGroup(group({ capacity: 2 }))).body.data.id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enrols a student on the organization’s day and lists them', async () => {
    const arta = await addStudent({ firstName: 'Arta', lastName: 'Gashi', number: 'STU-0007' })

    const response = await enrol(groupId, arta.id, await loginAs('manager@oxford.test'))

    expect(response.status).toBe(201)
    const enrolment = { id: response.body.data.id, enrolled_on: '2026-11-03', withdrawn_on: null, student: { id: arta.id, first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0007', status: 'ACTIVE' } }
    expect(response.body.data).toEqual(enrolment)
    expect((await listEnrolments(groupId)).body.data).toEqual([enrolment])
  })

  it('counts the active students on the group', async () => {
    await enrol(groupId, (await addStudent({ firstName: 'Arta', number: 'STU-0001' })).id)

    expect((await readGroup(groupId)).body.data.enrolled_count).toBe(1)
    expect((await listGroups()).body.data.groups[0].enrolled_count).toBe(1)
  })

  it('refuses another organization’s student, or an unknown one', async () => {
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    const outsider = await addStudent({ firstName: 'Yllka', number: 'STU-0001', organization: yllka.id })

    const response = await enrol(groupId, outsider.id)

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.student_id).toEqual(['Choose one of your organization’s students.'])
    expect((await enrol(groupId, '00000000-0000-4000-8000-000000000000')).status).toBe(400)
    expect(await prisma.groupEnrolment.count()).toBe(0)
  })

  it('refuses an archived student', async () => {
    const archived = await addStudent({ firstName: 'Old', number: 'STU-0001', status: 'ARCHIVED' })

    const response = await enrol(groupId, archived.id)

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.student_id).toEqual(['This student is archived. Restore them first.'])
  })

  it('refuses a new student on an archived group', async () => {
    const arta = await addStudent({ firstName: 'Arta', number: 'STU-0001' })
    await setStatus(groupId, 'archive')

    const response = await enrol(groupId, arta.id)

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('This group is archived. Restore it first.')
  })

  it('refuses a new student once the group’s school year has ended, going by the organization’s day', async () => {
    const arta = await addStudent({ firstName: 'Arta', number: 'STU-0001' })
    const ended = await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2025–26', start_date: new Date('2025-09-01'), end_date: new Date('2026-11-02') } })
    const oldGroup = await prisma.group.create({ data: { organization_id: organizationId, course_id: mathematicsId, name: 'Old group', academic_year_id: ended.id } })

    const response = await enrol(oldGroup.id, arta.id)

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.student_id).toEqual(['This group’s school year has ended, so it can’t take new students.'])
    expect(await prisma.groupEnrolment.count()).toBe(0)
  })

  it('takes a student on the last day of the school year', async () => {
    const arta = await addStudent({ firstName: 'Arta', number: 'STU-0001' })
    const ending = await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2025–26', start_date: new Date('2025-09-01'), end_date: new Date('2026-11-03') } })
    const lastDayGroup = await prisma.group.create({ data: { organization_id: organizationId, course_id: mathematicsId, name: 'Last day group', academic_year_id: ending.id } })

    expect((await enrol(lastDayGroup.id, arta.id)).status).toBe(201)
  })

  it('refuses a student already active in the group', async () => {
    const arta = await addStudent({ firstName: 'Arta', number: 'STU-0001' })
    await enrol(groupId, arta.id)

    const response = await enrol(groupId, arta.id)

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.student_id).toEqual(['This student is already in this group.'])
  })

  it('refuses a student once the group is full, and takes any number without a capacity', async () => {
    const students = await Promise.all(['STU-0001', 'STU-0002', 'STU-0003'].map((number, index) => addStudent({ firstName: `Student ${index}`, number })))
    await enrol(groupId, students[0].id)
    await enrol(groupId, students[1].id)

    const full = await enrol(groupId, students[2].id)
    const unlimited = (await addGroup(group({ name: 'Group B' }))).body.data.id

    expect(full.status).toBe(409)
    expect(full.body.details.fieldErrors.student_id).toEqual(['This group is full.'])
    for (const student of students) {
      expect((await enrol(unlimited, student.id)).status).toBe(201)
    }
  })

  it('gives the last seat to only one of two admins adding at once', async () => {
    const [arta, besa, drita] = await Promise.all(['STU-0001', 'STU-0002', 'STU-0003'].map((number, index) => addStudent({ firstName: `Student ${index}`, number })))
    await enrol(groupId, arta.id)
    const managerAuth = await loginAs('manager@oxford.test')

    const responses = await Promise.all([enrol(groupId, besa.id), enrol(groupId, drita.id, managerAuth)])

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409])
    expect(await prisma.groupEnrolment.count({ where: { group_id: groupId, withdrawn_on: null } })).toBe(2)
  })

  it('answers 404 for an unknown group', async () => {
    const arta = await addStudent({ firstName: 'Arta', number: 'STU-0001' })

    expect((await enrol('00000000-0000-4000-8000-000000000000', arta.id)).status).toBe(404)
    expect((await listEnrolments('00000000-0000-4000-8000-000000000000')).status).toBe(404)
  })

  it('refuses a school admin without MANAGE_COURSES', async () => {
    const arta = await addStudent({ firstName: 'Arta', number: 'STU-0001' })
    const auth = await loginAs('admin@oxford.test')

    expect((await enrol(groupId, arta.id, auth)).status).toBe(403)
    expect((await listEnrolments(groupId, auth)).status).toBe(403)
  })

  it('refuses a capacity below the active students, and takes one equal to them', async () => {
    await enrol(groupId, (await addStudent({ firstName: 'Arta', number: 'STU-0001' })).id)
    await enrol(groupId, (await addStudent({ firstName: 'Besa', number: 'STU-0002' })).id)

    const lowered = await updateGroup(groupId, group({ capacity: 1 }))
    const equal = await updateGroup(groupId, group({ capacity: 2 }))

    expect(lowered.status).toBe(409)
    expect(lowered.body.details.fieldErrors.capacity).toEqual(['This group has 2 students. Keep at least 2 seats, or withdraw students first.'])
    expect(equal.status).toBe(200)
  })
})

const withdraw = async (groupId: string, enrolmentId: string, auth = ownerAuth) => request(app).post(`${groupsPath}/${groupId}/enrolments/${enrolmentId}/withdraw`).set('Authorization', auth)

const move = async (groupId: string, enrolmentId: string, targetId: string, auth = ownerAuth) =>
  request(app).post(`${groupsPath}/${groupId}/enrolments/${enrolmentId}/move`).set('Authorization', auth).send({ group_id: targetId })

const studentLog = () =>
  prisma.activityLog.findMany({
    where: { organization_id: organizationId, action: { in: ['GROUP_STUDENT_ENROLLED', 'GROUP_STUDENT_WITHDRAWN', 'GROUP_STUDENT_MOVED'] } },
    orderBy: { created_at: 'asc' },
    select: { action: true, subject_name: true },
  })

describe('withdrawing and moving students', () => {
  let groupId: string
  let otherId: string
  let artaId: string
  let enrolmentId: string

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T23:30:00.000Z'))
    groupId = (await addGroup(group({ capacity: 1 }))).body.data.id
    const physics = await createCourse({ organizationId, name: 'Physics' })
    otherId = (await addGroup(group({ course_id: physics.id, name: 'Group B', capacity: 1 }))).body.data.id
    artaId = (await addStudent({ firstName: 'Arta', lastName: 'Gashi', number: 'STU-0001' })).id
    enrolmentId = (await enrol(groupId, artaId)).body.data.id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('withdraws on the organization’s day, keeps the row and frees the seat', async () => {
    const response = await withdraw(groupId, enrolmentId)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ id: enrolmentId, enrolled_on: '2026-11-03', withdrawn_on: '2026-11-03' })
    expect((await listEnrolments(groupId)).body.data).toMatchObject([{ id: enrolmentId, withdrawn_on: '2026-11-03' }])
    expect((await readGroup(groupId)).body.data.enrolled_count).toBe(0)
    expect((await enrol(groupId, (await addStudent({ firstName: 'Besa', number: 'STU-0002' })).id)).status).toBe(201)
  })

  it('adds a new row, starting today, when a withdrawn student enrols again', async () => {
    await withdraw(groupId, enrolmentId)

    const again = await enrol(groupId, artaId)

    expect(again.status).toBe(201)
    expect(again.body.data.enrolled_on).toBe('2026-11-03')
    expect(again.body.data.id).not.toBe(enrolmentId)
    expect(await prisma.groupEnrolment.count({ where: { group_id: groupId, student_id: artaId } })).toBe(2)
  })

  it('refuses withdrawing twice, and answers 404 for an enrolment of another group', async () => {
    await withdraw(groupId, enrolmentId)

    const twice = await withdraw(groupId, enrolmentId)

    expect(twice.status).toBe(409)
    expect(twice.body.error).toBe('This student has already left the group.')
    expect((await withdraw(otherId, enrolmentId)).status).toBe(404)
    expect((await move(otherId, enrolmentId, groupId)).status).toBe(404)
  })

  it('leaves an archived group’s students as they are', async () => {
    await setStatus(groupId, 'archive')

    expect((await withdraw(groupId, enrolmentId)).status).toBe(409)
    expect((await move(groupId, enrolmentId, otherId)).status).toBe(409)
    expect(await prisma.groupEnrolment.count({ where: { withdrawn_on: null } })).toBe(1)
  })

  it('moves a student to a group of another course in one step, starting in the new group the next day and taking its seat at once', async () => {
    const response = await move(groupId, enrolmentId, otherId)

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ enrolled_on: '2026-11-04', withdrawn_on: null, student: { id: artaId } })
    expect((await readGroup(otherId)).body.data.enrolled_count).toBe(1)
    expect((await readGroup(groupId)).body.data.enrolled_count).toBe(0)
    expect((await listEnrolments(groupId)).body.data).toMatchObject([{ id: enrolmentId, withdrawn_on: '2026-11-03' }])
    expect((await listEnrolments(otherId)).body.data).toMatchObject([{ id: response.body.data.id, withdrawn_on: null }])
  })

  it('changes nothing when the target group is full', async () => {
    await enrol(otherId, (await addStudent({ firstName: 'Besa', number: 'STU-0002' })).id)
    const logged = await studentLog()

    const response = await move(groupId, enrolmentId, otherId)

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.group_id).toEqual(['This group is full.'])
    expect((await listEnrolments(groupId)).body.data).toMatchObject([{ id: enrolmentId, withdrawn_on: null }])
    expect(await prisma.groupEnrolment.count({ where: { group_id: otherId, student_id: artaId } })).toBe(0)
    expect(await studentLog()).toEqual(logged)
  })

  it('holds a move to every enrolment rule of the target group', async () => {
    const yllka = await yllkaRecords()
    const yllkaOrganization = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    const yllkaGroup = await prisma.group.create({ data: { organization_id: yllkaOrganization.id, course_id: yllka.courseId, name: 'Yllka group', academic_year_id: yllka.yearId } })
    const archivedId = (await addGroup(group({ name: 'Group C' }))).body.data.id
    await setStatus(archivedId, 'archive')
    const alreadyId = (await addGroup(group({ name: 'Group D' }))).body.data.id
    await enrol(alreadyId, artaId)

    const outside = await move(groupId, enrolmentId, yllkaGroup.id)
    const archived = await move(groupId, enrolmentId, archivedId)
    const already = await move(groupId, enrolmentId, alreadyId)
    const same = await move(groupId, enrolmentId, groupId)

    expect(outside.status).toBe(400)
    expect(outside.body.details.fieldErrors.group_id).toEqual(['Choose one of your organization’s groups.'])
    expect(archived.status).toBe(409)
    expect(archived.body.details.fieldErrors.group_id).toEqual(['This group is archived. Restore it first.'])
    expect(already.status).toBe(409)
    expect(already.body.details.fieldErrors.group_id).toEqual(['This student is already in this group.'])
    expect(same.status).toBe(409)
    expect(same.body.details.fieldErrors.group_id).toEqual(['The student is already in this group.'])
    expect(await prisma.groupEnrolment.findUniqueOrThrow({ where: { id: enrolmentId }, select: { withdrawn_on: true } })).toEqual({ withdrawn_on: null })
  })

  it('refuses a move into a group whose school year has ended, and still lets a student leave one', async () => {
    const ended = await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2025–26', start_date: new Date('2025-09-01'), end_date: new Date('2026-06-30') } })
    const oldGroup = await prisma.group.create({ data: { organization_id: organizationId, course_id: mathematicsId, name: 'Old group', academic_year_id: ended.id } })
    const besa = await addStudent({ firstName: 'Besa', number: 'STU-0002' })
    const oldEnrolment = await prisma.groupEnrolment.create({ data: { group_id: oldGroup.id, student_id: besa.id, enrolled_on: new Date('2025-09-01') } })

    const moved = await move(groupId, enrolmentId, oldGroup.id)
    const left = await withdraw(oldGroup.id, oldEnrolment.id)

    expect(moved.status).toBe(409)
    expect(moved.body.details.fieldErrors.group_id).toEqual(['This group’s school year has ended, so it can’t take new students.'])
    expect(await prisma.groupEnrolment.findUniqueOrThrow({ where: { id: enrolmentId }, select: { withdrawn_on: true } })).toEqual({ withdrawn_on: null })
    expect(left.status).toBe(200)
    expect(left.body.data.withdrawn_on).toBe('2026-11-03')
  })

  it('refuses a move of a student who has left the group', async () => {
    await withdraw(groupId, enrolmentId)

    expect((await move(groupId, enrolmentId, otherId)).status).toBe(409)
  })

  it('refuses a school admin without MANAGE_COURSES', async () => {
    const auth = await loginAs('admin@oxford.test')

    expect((await withdraw(groupId, enrolmentId, auth)).status).toBe(403)
    expect((await move(groupId, enrolmentId, otherId, auth)).status).toBe(403)
  })

  it('logs each change with the names as they were, so a later rename leaves it readable', async () => {
    // A second apart each, so the log reads in order
    const later = () => vi.setSystemTime(new Date(Date.now() + 1000))
    later()
    await withdraw(groupId, enrolmentId)
    later()
    const again = await enrol(groupId, artaId)
    later()
    await move(groupId, again.body.data.id, otherId)
    await updateGroup(groupId, group({ name: 'Renamed', capacity: 1 }))
    await prisma.student.update({ where: { id: artaId }, data: { first_name: 'Renamed' } })

    expect(await studentLog()).toEqual([
      { action: 'GROUP_STUDENT_ENROLLED', subject_name: 'Arta Gashi in Group A' },
      { action: 'GROUP_STUDENT_WITHDRAWN', subject_name: 'Arta Gashi from Group A' },
      { action: 'GROUP_STUDENT_ENROLLED', subject_name: 'Arta Gashi in Group A' },
      { action: 'GROUP_STUDENT_MOVED', subject_name: 'Arta Gashi from Group A to Group B' },
    ])
  })
})

describe('deleting an organization', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('removes its groups, years and lecturers along with it', async () => {
    const lecturer = await addLecturer({ firstName: 'Arben' })
    const added = await addGroup(group({ academic_term_id: autumnId, location_id: mainCampusId, lecturer_id: lecturer.id }))
    expect(await prisma.group.count({ where: { id: added.body.data.id } })).toBe(1)

    await prisma.organization.delete({ where: { id: organizationId } })

    expect(await prisma.organization.count({ where: { id: organizationId } })).toBe(0)
    expect(await prisma.group.count({ where: { id: added.body.data.id } })).toBe(0)
    expect(await prisma.academicYear.count({ where: { id: yearId } })).toBe(0)
    expect(await prisma.lecturer.count({ where: { id: lecturer.id } })).toBe(0)
    expect(await prisma.groupLecturerAssignment.count()).toBe(0)
    expect(await prisma.groupMeeting.count()).toBe(0)
  })

  it('removes its students’ enrolments along with it', async () => {
    const added = await addGroup(group())
    const arta = await addStudent({ firstName: 'Arta', number: 'STU-0001' })
    expect((await enrol(added.body.data.id, arta.id)).status).toBe(201)

    await prisma.organization.delete({ where: { id: organizationId } })

    expect(await prisma.groupEnrolment.count()).toBe(0)
    expect(await prisma.student.count({ where: { id: arta.id } })).toBe(0)
  })
})

describe('the lecturer of a group', () => {
  const lecturerOptionsPath = () => `${groupsPath}/lecturer-options`

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers active lecturers with their subjects, by name, and nothing else about them', async () => {
    const teuta = await addLecturer({ firstName: 'Teuta', lastName: 'Krasniqi', subjects: ['English'] })
    const arben = await addLecturer({ firstName: 'Arben', lastName: 'Hoxha', subjects: ['Mathematics', 'Physics'] })
    await addLecturer({ firstName: 'Archived', status: 'ARCHIVED' })

    const response = await request(app).get(lecturerOptionsPath()).set('Authorization', await loginAs('manager@oxford.test'))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { id: arben.id, first_name: 'Arben', last_name: 'Hoxha', subjects: ['Mathematics', 'Physics'] },
      { id: teuta.id, first_name: 'Teuta', last_name: 'Krasniqi', subjects: ['English'] },
    ])
  })

  it('refuses the options to a school admin without MANAGE_COURSES', async () => {
    const response = await request(app).get(lecturerOptionsPath()).set('Authorization', await loginAs('admin@oxford.test'))

    expect(response.status).toBe(403)
  })

  it('adds a group with its lecturer, starting today', async () => {
    const arben = await addLecturer({ firstName: 'Arben', lastName: 'Hoxha' })

    const response = await addGroup(group({ lecturer_id: arben.id }))

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ lecturer: { id: arben.id, first_name: 'Arben', last_name: 'Hoxha', status: 'ACTIVE' }, lecturer_change: null })
    expect(await prisma.groupLecturerAssignment.findMany({ select: { lecturer_id: true, start_date: true, end_date: true } })).toEqual([{ lecturer_id: arben.id, start_date: new Date('2026-11-02'), end_date: null }])
  })

  it('starts today in the organization’s time zone', async () => {
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })
    const arben = await addLecturer({ firstName: 'Arben' })
    // 23:30 UTC on 2 November is already 3 November in Belgrade
    vi.setSystemTime(new Date('2026-11-02T23:30:00.000Z'))

    await addGroup(group({ lecturer_id: arben.id }))

    expect(await prisma.groupLecturerAssignment.findFirstOrThrow({ select: { start_date: true } })).toEqual({ start_date: new Date('2026-11-03') })
  })

  it('lets a group go without a lecturer', async () => {
    const response = await addGroup(group({ lecturer_id: null }))

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ lecturer: null, lecturer_change: null })
    expect(await prisma.groupLecturerAssignment.count()).toBe(0)
  })

  it('lists each group with its current lecturer', async () => {
    const arben = await addLecturer({ firstName: 'Arben' })
    await addGroup(group({ name: 'Group A', lecturer_id: arben.id }))
    await addGroup(group({ name: 'Group B' }))

    const { groups } = (await listGroups()).body.data

    expect(groups).toMatchObject([
      { name: 'Group A', lecturer: { id: arben.id } },
      { name: 'Group B', lecturer: null },
    ])
  })

  it('refuses an archived lecturer and one from another organization, and adds no group', async () => {
    const archived = await addLecturer({ firstName: 'Archived', status: 'ARCHIVED' })
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    const other = await addLecturer({ firstName: 'Other', organization: yllka.id })

    const archivedResponse = await addGroup(group({ lecturer_id: archived.id }))
    const otherResponse = await addGroup(group({ lecturer_id: other.id }))

    expect(archivedResponse.status).toBe(409)
    expect(archivedResponse.body.details.fieldErrors.lecturer_id).toEqual(['This lecturer is archived. Restore them first.'])
    expect(otherResponse.status).toBe(400)
    expect(otherResponse.body.details.fieldErrors.lecturer_id).toEqual(['Choose one of your organization’s lecturers.'])
    expect((await listGroups()).body.data.groups).toEqual([])
  })
})

/** Moves the clock and logs in again, since the jump outlives the access token */
const travelTo = async (iso: string) => {
  vi.setSystemTime(new Date(iso))
  ownerAuth = await loginAs('owner@oxford.test')
}

const readLecturers = async (groupId: string, auth = ownerAuth) => request(app).get(`${groupsPath}/${groupId}/lecturers`).set('Authorization', auth)

/** The permanent rows oldest first, as "Arben 2026-11-02 → open" */
const permanentRows = async (groupId: string) => {
  const { assignments } = (await readLecturers(groupId)).body.data
  return assignments
    .map((item: { lecturer: { first_name: string }; start_date: string; end_date: string | null }) => `${item.lecturer.first_name} ${item.start_date} → ${item.end_date ?? 'open'}`)
    .reverse()
}

describe('changing a group’s permanent lecturer', () => {
  let arben: { id: string }
  let teuta: { id: string }
  let besa: { id: string }
  let groupId: string

  const reassign = (lecturerId: string | null, effectiveFrom: string | null) => updateGroup(groupId, group({ lecturer_id: lecturerId, lecturer_effective_from: effectiveFrom }))

  const currentGroup = async () => (await listGroups()).body.data.groups[0]

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await travelTo('2026-11-02T10:00:00.000Z')
    arben = await addLecturer({ firstName: 'Arben' })
    teuta = await addLecturer({ firstName: 'Teuta' })
    besa = await addLecturer({ firstName: 'Besa' })
    groupId = (await addGroup(group({ lecturer_id: arben.id }))).body.data.id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('closes the old row the day before the effective date and opens the new one on it', async () => {
    await travelTo('2026-11-20T10:00:00.000Z')

    const response = await reassign(teuta.id, '2026-11-10')

    expect(response.status).toBe(200)
    expect(response.body.data.lecturer).toMatchObject({ id: teuta.id })
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → 2026-11-09', 'Teuta 2026-11-10 → open'])
  })

  it('keeps a newer lecturer when a form opened before that change saves without a date', async () => {
    await travelTo('2026-11-20T10:00:00.000Z')
    await reassign(teuta.id, '2026-11-20')

    const response = await updateGroup(groupId, group({ name: 'Group Z', lecturer_id: arben.id, lecturer_effective_from: null }))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ name: 'Group Z', lecturer: { id: teuta.id } })
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → 2026-11-19', 'Teuta 2026-11-20 → open'])
  })

  it('keeps every row when a form opened before the group had a lecturer saves without a date', async () => {
    const response = await updateGroup(groupId, group({ name: 'Group Z', lecturer_id: null, lecturer_effective_from: null }))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ name: 'Group Z', lecturer: { id: arben.id } })
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
  })

  it('gives a group its first lecturer from an edit', async () => {
    const empty = await addGroup(group({ name: 'Group B' }))

    const response = await updateGroup(empty.body.data.id, group({ name: 'Group B', lecturer_id: teuta.id, lecturer_effective_from: '2026-11-02' }))

    expect(response.status).toBe(200)
    expect(response.body.data.lecturer).toMatchObject({ id: teuta.id })
    expect(await permanentRows(empty.body.data.id)).toEqual(['Teuta 2026-11-02 → open'])
  })

  it('leaves the rows alone when the lecturer doesn’t change', async () => {
    const response = await updateGroup(groupId, group({ lecturer_id: arben.id, capacity: 12 }))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ capacity: 12, lecturer: { id: arben.id } })
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
  })

  it('refuses a date before the current lecturer’s start', async () => {
    const response = await reassign(teuta.id, '2026-11-01')

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.lecturer_effective_from).toEqual(['The change can’t start before the current lecturer’s start.'])
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
  })

  it('refuses a date after the school year ends, and takes its last day', async () => {
    const refused = await reassign(teuta.id, '2027-07-01')
    const accepted = await reassign(teuta.id, '2027-06-30')

    expect(refused.status).toBe(400)
    expect(refused.body.details.fieldErrors.lecturer_effective_from).toEqual(['The change can’t start after the school year ends.'])
    expect(accepted.status).toBe(200)
  })

  it('replaces the row as a correction when the date is the current start', async () => {
    const response = await reassign(teuta.id, '2026-11-02')

    expect(response.status).toBe(200)
    expect(await permanentRows(groupId)).toEqual(['Teuta 2026-11-02 → open'])
  })

  it('keeps the current lecturer until a future date, then takes effect by itself', async () => {
    const response = await reassign(teuta.id, '2026-12-01')

    expect(response.body.data).toMatchObject({ lecturer: { id: arben.id }, lecturer_change: { lecturer: { id: teuta.id }, start_date: '2026-12-01' } })
    expect(await currentGroup()).toMatchObject({ lecturer: { id: arben.id } })

    await travelTo('2026-11-30T10:00:00.000Z')
    expect(await currentGroup()).toMatchObject({ lecturer: { id: arben.id } })

    await travelTo('2026-12-01T10:00:00.000Z')
    expect(await currentGroup()).toMatchObject({ lecturer: { id: teuta.id }, lecturer_change: null })
  })

  it('takes effect on the organization’s day', async () => {
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })
    await reassign(teuta.id, '2026-12-01')

    // 23:30 UTC on 30 November is already 1 December in Belgrade
    await travelTo('2026-11-30T23:30:00.000Z')

    expect(await currentGroup()).toMatchObject({ lecturer: { id: teuta.id } })
  })

  it('replaces a pending change with a newer one, earlier or later', async () => {
    await reassign(teuta.id, '2026-12-01')

    await reassign(besa.id, '2027-01-01')
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → 2026-12-31', 'Besa 2027-01-01 → open'])

    await reassign(teuta.id, '2026-11-15')
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → 2026-11-14', 'Teuta 2026-11-15 → open'])
  })

  it('drops a pending change when the current lecturer is chosen again', async () => {
    await reassign(teuta.id, '2026-12-01')

    const response = await reassign(arben.id, '2026-11-02')

    expect(response.body.data).toMatchObject({ lecturer: { id: arben.id }, lecturer_change: null })
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
  })

  it('ignores the date that comes with dropping a pending change', async () => {
    await reassign(teuta.id, '2026-12-01')

    const afterTheYear = await reassign(arben.id, '2027-08-01')
    await reassign(teuta.id, '2026-12-01')
    const beforeTheStart = await reassign(arben.id, '2026-10-01')

    expect(afterTheYear.status).toBe(200)
    expect(beforeTheStart.status).toBe(200)
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
  })

  it('drops a pending first lecturer when no lecturer is chosen', async () => {
    const empty = await addGroup(group({ name: 'Group B' }))
    await updateGroup(empty.body.data.id, group({ name: 'Group B', lecturer_id: teuta.id, lecturer_effective_from: '2026-12-01' }))

    const response = await updateGroup(empty.body.data.id, group({ name: 'Group B', lecturer_id: null, lecturer_effective_from: '2027-08-01' }))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ lecturer: null, lecturer_change: null })
    expect(await permanentRows(empty.body.data.id)).toEqual([])
  })

  it('closes the assignment and keeps its history when choosing no lecturer', async () => {
    await travelTo('2026-11-20T10:00:00.000Z')

    const response = await reassign(null, '2026-11-20')

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ lecturer: null, lecturer_change: null })
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → 2026-11-19'])
  })

  it('leaves the group without a lecturer from a future date', async () => {
    const response = await reassign(null, '2026-12-01')

    expect(response.body.data).toMatchObject({ lecturer: { id: arben.id }, lecturer_change: { lecturer: null, start_date: '2026-12-01' } })
  })

  it('gives a group without a lecturer a new one after the last closed row', async () => {
    await travelTo('2026-11-20T10:00:00.000Z')
    await reassign(null, '2026-11-10')

    const tooEarly = await reassign(teuta.id, '2026-11-09')
    const accepted = await reassign(teuta.id, '2026-11-15')

    expect(tooEarly.status).toBe(400)
    expect(accepted.status).toBe(200)
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → 2026-11-09', 'Teuta 2026-11-15 → open'])
  })

  it('refuses to reassign an archived group, but still edits its other fields', async () => {
    await setStatus(groupId, 'archive')

    const refused = await reassign(teuta.id, '2026-11-10')
    const edited = await updateGroup(groupId, group({ lecturer_id: arben.id, capacity: 8 }))

    expect(refused.status).toBe(409)
    expect(refused.body.details.fieldErrors.lecturer_id).toEqual(['This group is archived. Restore it first.'])
    expect(edited.status).toBe(200)
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
  })

  it('refuses an archived lecturer and one from another organization, but keeps one already on the group', async () => {
    const archived = await addLecturer({ firstName: 'Archived', status: 'ARCHIVED' })
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    const other = await addLecturer({ firstName: 'Other', organization: yllka.id })
    await prisma.lecturer.update({ where: { id: arben.id }, data: { status: 'ARCHIVED' } })

    expect((await reassign(archived.id, '2026-11-10')).status).toBe(409)
    expect((await reassign(other.id, '2026-11-10')).status).toBe(400)
    expect((await updateGroup(groupId, group({ lecturer_id: arben.id, capacity: 8 }))).status).toBe(200)
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
  })

  it('logs a lecturer change as the group being changed, once', async () => {
    await reassign(teuta.id, '2026-11-10')

    expect(await logged('GROUP_UPDATED')).toEqual([{ subject_name: 'Group A' }])
  })

  it('shows the full history, newest first, with each lecturer’s status', async () => {
    await reassign(teuta.id, '2026-11-10')
    await prisma.lecturer.update({ where: { id: arben.id }, data: { status: 'ARCHIVED' } })

    const response = await readLecturers(groupId, await loginAs('manager@oxford.test'))

    expect(response.status).toBe(200)
    expect(response.body.data.assignments).toMatchObject([
      { lecturer: { id: teuta.id, first_name: 'Teuta', last_name: 'Lecturer', status: 'ACTIVE' }, start_date: '2026-11-10', end_date: null },
      { lecturer: { id: arben.id, status: 'ARCHIVED' }, start_date: '2026-11-02', end_date: '2026-11-09' },
    ])
  })

  it('keeps the history from a school admin without MANAGE_COURSES', async () => {
    expect((await readLecturers(groupId, await loginAs('admin@oxford.test'))).status).toBe(403)
  })

  it('answers 404 for the history of a group that doesn’t exist', async () => {
    expect((await readLecturers('00000000-0000-4000-8000-000000000000')).status).toBe(404)
  })
})

type SubstitutionBody = {
  lecturer_id: string
  start_date: string
  end_date: string
  note: string
}

const addSubstitution = (groupId: string, body: SubstitutionBody, auth = ownerAuth) => request(app).post(`${groupsPath}/${groupId}/substitutions`).set('Authorization', auth).send(body)

describe('adding a substitution', () => {
  let arben: { id: string }
  let teuta: { id: string }
  let besa: { id: string }
  let groupId: string

  const cover = (overrides: Partial<SubstitutionBody> = {}): SubstitutionBody => ({ lecturer_id: teuta.id, start_date: '2026-11-10', end_date: '2026-11-12', note: '', ...overrides })

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await travelTo('2026-11-02T10:00:00.000Z')
    arben = await addLecturer({ firstName: 'Arben' })
    teuta = await addLecturer({ firstName: 'Teuta' })
    besa = await addLecturer({ firstName: 'Besa' })
    groupId = (await addGroup(group({ lecturer_id: arben.id }))).body.data.id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('covers a date range, with a note, and shows it in the history', async () => {
    const response = await addSubstitution(groupId, cover({ note: 'Sick leave' }), await loginAs('manager@oxford.test'))

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ lecturer: { id: teuta.id, first_name: 'Teuta', status: 'ACTIVE' }, start_date: '2026-11-10', end_date: '2026-11-12', note: 'Sick leave', cancelled_at: null })
    expect((await readLecturers(groupId)).body.data.substitutions).toMatchObject([{ id: response.body.data.id, note: 'Sick leave' }])
  })

  it('covers one day, without a note', async () => {
    const response = await addSubstitution(groupId, cover({ start_date: '2026-11-10', end_date: '2026-11-10' }))

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ start_date: '2026-11-10', end_date: '2026-11-10', note: null })
  })

  it('leaves the permanent lecturer and the table alone, during and after', async () => {
    await addSubstitution(groupId, cover())

    await travelTo('2026-11-11T10:00:00.000Z')
    expect((await listGroups()).body.data.groups).toMatchObject([{ lecturer: { id: arben.id }, lecturer_change: null }])
    await travelTo('2026-11-13T10:00:00.000Z')
    expect((await listGroups()).body.data.groups).toMatchObject([{ lecturer: { id: arben.id } }])
    expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
  })

  it('refuses an archived substitute and one from another organization', async () => {
    const archived = await addLecturer({ firstName: 'Archived', status: 'ARCHIVED' })
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    const other = await addLecturer({ firstName: 'Other', organization: yllka.id })

    const archivedResponse = await addSubstitution(groupId, cover({ lecturer_id: archived.id }))
    const otherResponse = await addSubstitution(groupId, cover({ lecturer_id: other.id }))

    expect(archivedResponse.status).toBe(409)
    expect(archivedResponse.body.details.fieldErrors.lecturer_id).toEqual(['This lecturer is archived. Restore them first.'])
    expect(otherResponse.status).toBe(400)
    expect(otherResponse.body.details.fieldErrors.lecturer_id).toEqual(['Choose one of your organization’s lecturers.'])
  })

  it('refuses an archived group', async () => {
    await setStatus(groupId, 'archive')

    const response = await addSubstitution(groupId, cover())

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('This group is archived. Restore it first.')
  })

  it('refuses a group without a permanent lecturer', async () => {
    const empty = await addGroup(group({ name: 'Group B' }))

    const response = await addSubstitution(empty.body.data.id, cover())

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.start_date).toEqual(['The group needs a permanent lecturer on every one of these days.'])
  })

  it('refuses a range that runs past the permanent lecturer’s last day or starts before their first', async () => {
    await updateGroup(groupId, group({ lecturer_id: null, lecturer_effective_from: '2026-12-01' }))

    const pastTheEnd = await addSubstitution(groupId, cover({ start_date: '2026-11-30', end_date: '2026-12-01' }))
    const beforeTheStart = await addSubstitution(groupId, cover({ start_date: '2026-11-01', end_date: '2026-11-02' }))
    const lastDay = await addSubstitution(groupId, cover({ start_date: '2026-11-30', end_date: '2026-11-30' }))

    expect(pastTheEnd.status).toBe(409)
    expect(beforeTheStart.status).toBe(409)
    expect(lastDay.status).toBe(201)
  })

  it('takes a range across a change of permanent lecturer', async () => {
    await updateGroup(groupId, group({ lecturer_id: besa.id, lecturer_effective_from: '2026-12-01' }))

    const response = await addSubstitution(groupId, cover({ start_date: '2026-11-30', end_date: '2026-12-01' }))

    expect(response.status).toBe(201)
  })

  it('refuses the permanent lecturer as the substitute on any of those days', async () => {
    await updateGroup(groupId, group({ lecturer_id: teuta.id, lecturer_effective_from: '2026-12-01' }))

    const today = await addSubstitution(groupId, cover({ lecturer_id: arben.id }))
    const lastDayIsTeutas = await addSubstitution(groupId, cover({ lecturer_id: teuta.id, start_date: '2026-11-30', end_date: '2026-12-01' }))
    const beforeTeutaStarts = await addSubstitution(groupId, cover({ lecturer_id: teuta.id, start_date: '2026-11-29', end_date: '2026-11-30' }))

    expect(today.status).toBe(409)
    expect(today.body.details.fieldErrors.lecturer_id).toEqual(['This lecturer is the group’s permanent lecturer on some of these days.'])
    expect(lastDayIsTeutas.status).toBe(409)
    expect(beforeTeutaStarts.status).toBe(201)
  })

  it('refuses an end date before the start date', async () => {
    const response = await addSubstitution(groupId, cover({ start_date: '2026-11-12', end_date: '2026-11-10' }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.end_date).toEqual(['The end date can’t be before the start date.'])
  })

  it('keeps the range inside the school year', async () => {
    const beforeYear = await addSubstitution(groupId, cover({ start_date: '2026-08-31', end_date: '2026-09-01' }))
    const afterYear = await addSubstitution(groupId, cover({ start_date: '2027-06-30', end_date: '2027-07-01' }))

    expect(beforeYear.status).toBe(400)
    expect(beforeYear.body.details.fieldErrors.start_date).toEqual(['Keep the dates inside the school year.'])
    expect(afterYear.status).toBe(400)
    expect(afterYear.body.details.fieldErrors.end_date).toEqual(['Keep the dates inside the school year.'])
  })

  it('refuses an overlap with another substitution on the group, even by one shared day', async () => {
    await addSubstitution(groupId, cover())

    const sharedFirstDay = await addSubstitution(groupId, cover({ lecturer_id: besa.id, start_date: '2026-11-12', end_date: '2026-11-14' }))
    const sharedLastDay = await addSubstitution(groupId, cover({ lecturer_id: besa.id, start_date: '2026-11-08', end_date: '2026-11-10' }))
    const inside = await addSubstitution(groupId, cover({ lecturer_id: besa.id, start_date: '2026-11-11', end_date: '2026-11-11' }))
    const next = await addSubstitution(groupId, cover({ lecturer_id: besa.id, start_date: '2026-11-13', end_date: '2026-11-13' }))

    expect(sharedFirstDay.status).toBe(409)
    expect(sharedFirstDay.body.details.fieldErrors.start_date).toEqual(['Another substitution already covers some of these days.'])
    expect(sharedLastDay.status).toBe(409)
    expect(inside.status).toBe(409)
    expect(next.status).toBe(201)
  })

  it('lets another group have a substitution on the same days', async () => {
    const other = await addGroup(group({ name: 'Group B', lecturer_id: arben.id }))
    await addSubstitution(groupId, cover())

    expect((await addSubstitution(other.body.data.id, cover())).status).toBe(201)
  })

  it('refuses a school admin without MANAGE_COURSES and answers 404 for an unknown group', async () => {
    expect((await addSubstitution(groupId, cover(), await loginAs('admin@oxford.test'))).status).toBe(403)
    expect((await addSubstitution('00000000-0000-4000-8000-000000000000', cover())).status).toBe(404)
  })

  it('logs the substitution with the group’s name', async () => {
    await addSubstitution(groupId, cover())

    expect(await prisma.activityLog.findMany({ where: { action: 'GROUP_SUBSTITUTION_ADDED' }, select: { subject_name: true } })).toEqual([{ subject_name: 'Group A' }])
  })

  it('still lets the organization be deleted in one statement', async () => {
    await addSubstitution(groupId, cover())

    await prisma.organization.delete({ where: { id: organizationId } })

    expect(await prisma.groupSubstitution.count()).toBe(0)
    expect(await prisma.lecturer.count({ where: { id: teuta.id } })).toBe(0)
  })
})

const updateSubstitution = (groupId: string, substitutionId: string, body: SubstitutionBody, auth = ownerAuth) =>
  request(app).put(`${groupsPath}/${groupId}/substitutions/${substitutionId}`).set('Authorization', auth).send(body)

const cancelSubstitution = (groupId: string, substitutionId: string, auth = ownerAuth) => request(app).post(`${groupsPath}/${groupId}/substitutions/${substitutionId}/cancel`).set('Authorization', auth)

describe('changing a substitution', () => {
  let arben: { id: string }
  let teuta: { id: string }
  let besa: { id: string }
  let groupId: string
  let coverId: string

  const cover = (overrides: Partial<SubstitutionBody> = {}): SubstitutionBody => ({ lecturer_id: teuta.id, start_date: '2026-11-10', end_date: '2026-11-12', note: '', ...overrides })

  const reassign = (lecturerId: string | null, effectiveFrom: string | null) => updateGroup(groupId, group({ lecturer_id: lecturerId, lecturer_effective_from: effectiveFrom }))

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await travelTo('2026-11-02T10:00:00.000Z')
    arben = await addLecturer({ firstName: 'Arben', lastName: 'Hoxha' })
    teuta = await addLecturer({ firstName: 'Teuta', lastName: 'Krasniqi' })
    besa = await addLecturer({ firstName: 'Besa' })
    groupId = (await addGroup(group({ lecturer_id: arben.id }))).body.data.id
    coverId = (await addSubstitution(groupId, cover())).body.data.id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('editing', () => {
    it('saves new dates, a new substitute and a note', async () => {
      const response = await updateSubstitution(groupId, coverId, cover({ lecturer_id: besa.id, start_date: '2026-11-11', end_date: '2026-11-20', note: 'Longer' }), await loginAs('manager@oxford.test'))

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({ id: coverId, lecturer: { id: besa.id }, start_date: '2026-11-11', end_date: '2026-11-20', note: 'Longer' })
    })

    it('ignores its own row when checking overlaps', async () => {
      expect((await updateSubstitution(groupId, coverId, cover({ start_date: '2026-11-11', end_date: '2026-11-13' }))).status).toBe(200)
    })

    it('reruns every check', async () => {
      const archived = await addLecturer({ firstName: 'Archived', status: 'ARCHIVED' })
      await addSubstitution(groupId, cover({ start_date: '2026-11-20', end_date: '2026-11-21' }))

      const overlap = await updateSubstitution(groupId, coverId, cover({ end_date: '2026-11-20' }))
      const permanent = await updateSubstitution(groupId, coverId, cover({ lecturer_id: arben.id }))
      const archivedSubstitute = await updateSubstitution(groupId, coverId, cover({ lecturer_id: archived.id }))
      const noCover = await updateSubstitution(groupId, coverId, cover({ start_date: '2026-11-01', end_date: '2026-11-02' }))
      const outsideYear = await updateSubstitution(groupId, coverId, cover({ end_date: '2027-07-01' }))
      const backwards = await updateSubstitution(groupId, coverId, cover({ end_date: '2026-11-09' }))

      expect(overlap.status).toBe(409)
      expect(overlap.body.details.fieldErrors.start_date).toEqual(['Another substitution already covers some of these days.'])
      expect(permanent.status).toBe(409)
      expect(archivedSubstitute.status).toBe(409)
      expect(noCover.status).toBe(409)
      expect(outsideYear.status).toBe(400)
      expect(backwards.status).toBe(400)
    })

    it('refuses an archived group', async () => {
      await setStatus(groupId, 'archive')

      expect((await updateSubstitution(groupId, coverId, cover())).status).toBe(409)
    })

    it('refuses a past substitution, but takes one still running', async () => {
      await travelTo('2026-11-12T10:00:00.000Z')
      const running = await updateSubstitution(groupId, coverId, cover({ end_date: '2026-11-13' }))

      await travelTo('2026-11-14T10:00:00.000Z')
      const past = await updateSubstitution(groupId, coverId, cover({ end_date: '2026-11-15' }))

      expect(running.status).toBe(200)
      expect(past.status).toBe(409)
      expect(past.body.error).toBe('This substitution is over, so it can’t change.')
    })

    it('refuses a cancelled substitution', async () => {
      await cancelSubstitution(groupId, coverId)

      const response = await updateSubstitution(groupId, coverId, cover())

      expect(response.status).toBe(409)
      expect(response.body.error).toBe('This substitution is cancelled.')
    })

    it('logs the change with the group’s name', async () => {
      await updateSubstitution(groupId, coverId, cover({ note: 'Changed' }))

      expect(await prisma.activityLog.findMany({ where: { action: 'GROUP_SUBSTITUTION_UPDATED' }, select: { subject_name: true } })).toEqual([{ subject_name: 'Group A' }])
    })
  })

  describe('cancelling', () => {
    it('keeps the row with the time it was cancelled, and logs it', async () => {
      const response = await cancelSubstitution(groupId, coverId, await loginAs('manager@oxford.test'))

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({ id: coverId, cancelled_at: '2026-11-02T10:00:00.000Z' })
      expect((await readLecturers(groupId)).body.data.substitutions).toMatchObject([{ id: coverId, cancelled_at: '2026-11-02T10:00:00.000Z' }])
      expect(await prisma.activityLog.findMany({ where: { action: 'GROUP_SUBSTITUTION_CANCELLED' }, select: { subject_name: true } })).toEqual([{ subject_name: 'Group A' }])
    })

    it('frees its dates', async () => {
      await cancelSubstitution(groupId, coverId)

      expect((await addSubstitution(groupId, cover({ lecturer_id: besa.id }))).status).toBe(201)
    })

    it('refuses a past substitution, but takes one on its last day', async () => {
      const other = await addSubstitution(groupId, cover({ start_date: '2026-11-20', end_date: '2026-11-21' }))

      await travelTo('2026-11-14T10:00:00.000Z')
      const past = await cancelSubstitution(groupId, coverId)
      await travelTo('2026-11-21T10:00:00.000Z')
      const lastDay = await cancelSubstitution(groupId, other.body.data.id)

      expect(past.status).toBe(409)
      expect(past.body.error).toBe('This substitution is over, so it can’t change.')
      expect(lastDay.status).toBe(200)
    })

    it('refuses cancelling twice', async () => {
      await cancelSubstitution(groupId, coverId)

      expect((await cancelSubstitution(groupId, coverId)).status).toBe(409)
    })
  })

  it('answers 404 for a substitution reached through another group or that doesn’t exist', async () => {
    const other = await addGroup(group({ name: 'Group B', lecturer_id: arben.id }))
    const missing = '00000000-0000-4000-8000-000000000000'

    expect((await updateSubstitution(other.body.data.id, coverId, cover())).status).toBe(404)
    expect((await cancelSubstitution(other.body.data.id, coverId)).status).toBe(404)
    expect((await updateSubstitution(groupId, missing, cover())).status).toBe(404)
    expect((await cancelSubstitution(groupId, missing)).status).toBe(404)
  })

  it('refuses a school admin without MANAGE_COURSES', async () => {
    const auth = await loginAs('admin@oxford.test')

    expect((await updateSubstitution(groupId, coverId, cover(), auth)).status).toBe(403)
    expect((await cancelSubstitution(groupId, coverId, auth)).status).toBe(403)
  })

  describe('reassigning around substitutions', () => {
    it('refuses someone who substitutes on or after the effective date, with a clear message', async () => {
      const onTheDay = await reassign(teuta.id, '2026-11-12')
      const before = await reassign(teuta.id, '2026-11-05')

      expect(onTheDay.status).toBe(409)
      expect(onTheDay.body.details.fieldErrors.lecturer_id).toEqual(['Teuta Krasniqi substitutes on this group on days they would teach it permanently. Cancel or change that substitution first.'])
      expect(before.status).toBe(409)
      expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
    })

    it('takes someone whose substitution ends before the effective date', async () => {
      expect((await reassign(teuta.id, '2026-11-13')).status).toBe(200)
    })

    it('takes someone whose substitution was cancelled', async () => {
      await cancelSubstitution(groupId, coverId)

      expect((await reassign(teuta.id, '2026-11-05')).status).toBe(200)
    })

    it('takes another lecturer and leaves the substitution in place', async () => {
      expect((await reassign(besa.id, '2026-11-05')).status).toBe(200)
      expect((await readLecturers(groupId)).body.data.substitutions).toMatchObject([{ id: coverId, cancelled_at: null }])
    })

    it('refuses leaving a substitution without a permanent lecturer', async () => {
      const response = await reassign(null, '2026-11-12')

      expect(response.status).toBe(409)
      expect(response.body.details.fieldErrors.lecturer_id).toEqual(['A substitution on this group would be left without a permanent lecturer. Cancel or change it first.'])
      expect((await reassign(null, '2026-11-13')).status).toBe(200)
    })

    it('refuses bringing back a lecturer over days they substitute', async () => {
      await reassign(besa.id, '2026-12-01')
      await addSubstitution(groupId, cover({ lecturer_id: arben.id, start_date: '2026-12-05', end_date: '2026-12-05' }))

      const response = await reassign(teuta.id, '2027-01-01')

      expect(response.status).toBe(409)
      expect(response.body.details.fieldErrors.lecturer_id).toEqual(['Arben Hoxha substitutes on this group on days they would teach it permanently. Cancel or change that substitution first.'])
    })
  })

  it('stays when its substitute or the permanent lecturer is archived', async () => {
    await request(app).post(`/api/organizations/${organizationId}/lecturers/${teuta.id}/archive`).set('Authorization', ownerAuth)
    await request(app).post(`/api/organizations/${organizationId}/lecturers/${arben.id}/archive`).set('Authorization', ownerAuth)

    const { assignments, substitutions } = (await readLecturers(groupId)).body.data

    expect(assignments).toMatchObject([{ lecturer: { id: arben.id, status: 'ARCHIVED' }, end_date: null }])
    expect(substitutions).toMatchObject([{ id: coverId, lecturer: { id: teuta.id, status: 'ARCHIVED' }, cancelled_at: null }])
    expect((await listGroups()).body.data.groups).toMatchObject([{ lecturer: { id: arben.id, status: 'ARCHIVED' } }])
  })
})

describe('decisions on dates', () => {
  let arben: { id: string }
  let teuta: { id: string }
  let besa: { id: string }
  let groupId: string

  const cover = (overrides: Partial<SubstitutionBody> = {}): SubstitutionBody => ({ lecturer_id: teuta.id, start_date: '2026-11-10', end_date: '2026-11-12', note: '', ...overrides })

  const reassign = (lecturerId: string | null, effectiveFrom: string | null) => updateGroup(groupId, group({ lecturer_id: lecturerId, lecturer_effective_from: effectiveFrom }))

  const moveToOtherYear = (overrides: Partial<GroupBody> = {}) => updateGroup(groupId, group({ academic_year_id: otherYearId, lecturer_id: arben.id, ...overrides }))

  const substitutionById = async (id: string) => (await readLecturers(groupId)).body.data.substitutions.find((item: { id: string }) => item.id === id)

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await travelTo('2026-11-02T10:00:00.000Z')
    arben = await addLecturer({ firstName: 'Arben' })
    teuta = await addLecturer({ firstName: 'Teuta' })
    besa = await addLecturer({ firstName: 'Besa' })
    groupId = (await addGroup(group({ lecturer_id: arben.id }))).body.data.id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('a substitution’s end date and today', () => {
    it('refuses adding one that ended before today, and takes one ending today', async () => {
      await travelTo('2026-11-05T10:00:00.000Z')

      const past = await addSubstitution(groupId, cover({ start_date: '2026-11-03', end_date: '2026-11-04' }))
      const today = await addSubstitution(groupId, cover({ start_date: '2026-11-03', end_date: '2026-11-05' }))

      expect(past.status).toBe(400)
      expect(past.body.details.fieldErrors.end_date).toEqual(['The end date can’t be before today.'])
      expect(today.status).toBe(201)
    })

    it('goes by the organization’s day', async () => {
      await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })
      // 23:30 UTC on 4 November is already 5 November in Belgrade
      await travelTo('2026-11-04T23:30:00.000Z')

      expect((await addSubstitution(groupId, cover({ start_date: '2026-11-04', end_date: '2026-11-04' }))).status).toBe(400)
    })

    it('refuses editing an upcoming one to end before today', async () => {
      const added = await addSubstitution(groupId, cover())

      const response = await updateSubstitution(groupId, added.body.data.id, cover({ start_date: '2026-11-01', end_date: '2026-11-01' }))

      expect(response.status).toBe(400)
      expect(response.body.details.fieldErrors.end_date).toEqual(['The end date can’t be before today.'])
    })
  })

  describe('a substitution that has started', () => {
    let coverId: string

    beforeEach(async () => {
      coverId = (await addSubstitution(groupId, cover())).body.data.id
      await travelTo('2026-11-11T10:00:00.000Z')
    })

    it('takes a new end date, later or as early as today', async () => {
      const later = await updateSubstitution(groupId, coverId, cover({ end_date: '2026-11-20' }))
      const today = await updateSubstitution(groupId, coverId, cover({ end_date: '2026-11-11' }))

      expect(later.status).toBe(200)
      expect(today.status).toBe(200)
      expect(today.body.data).toMatchObject({ start_date: '2026-11-10', end_date: '2026-11-11' })
    })

    it('refuses an end date before today', async () => {
      const response = await updateSubstitution(groupId, coverId, cover({ end_date: '2026-11-10' }))

      expect(response.status).toBe(400)
      expect(response.body.details.fieldErrors.end_date).toEqual(['The end date can’t be before today.'])
    })

    it('refuses a new start date or substitute', async () => {
      const start = await updateSubstitution(groupId, coverId, cover({ start_date: '2026-11-09' }))
      const substitute = await updateSubstitution(groupId, coverId, cover({ lecturer_id: besa.id }))

      expect(start.status).toBe(409)
      expect(start.body.details.fieldErrors.start_date).toEqual(['A substitution that has started keeps its start date.'])
      expect(substitute.status).toBe(409)
      expect(substitute.body.details.fieldErrors.lecturer_id).toEqual(['A substitution that has started keeps its substitute.'])
    })

    it('treats one starting today as started', async () => {
      const added = await addSubstitution(groupId, cover({ start_date: '2026-11-15', end_date: '2026-11-16' }))
      await travelTo('2026-11-15T10:00:00.000Z')

      expect((await updateSubstitution(groupId, added.body.data.id, cover({ start_date: '2026-11-14', end_date: '2026-11-16' }))).status).toBe(409)
    })

    it('still takes a new end date when its substitute has since been archived', async () => {
      await prisma.lecturer.update({ where: { id: teuta.id }, data: { status: 'ARCHIVED' } })

      expect((await updateSubstitution(groupId, coverId, cover({ end_date: '2026-11-11' }))).status).toBe(200)
    })

    it('ends yesterday on cancel, keeping the covered days and freeing the rest', async () => {
      const response = await cancelSubstitution(groupId, coverId)

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({ id: coverId, start_date: '2026-11-10', end_date: '2026-11-10', cancelled_at: null })
      expect(await substitutionById(coverId)).toMatchObject({ end_date: '2026-11-10', cancelled_at: null })
      expect((await addSubstitution(groupId, cover({ lecturer_id: besa.id, start_date: '2026-11-11', end_date: '2026-11-12' }))).status).toBe(201)
      expect(await prisma.activityLog.findMany({ where: { action: 'GROUP_SUBSTITUTION_CANCELLED' }, select: { subject_name: true } })).toEqual([{ subject_name: 'Group A' }])
    })

    it('really cancels one that started today, since no day is covered yet', async () => {
      await travelTo('2026-11-10T10:00:00.000Z')

      const response = await cancelSubstitution(groupId, coverId)

      expect(response.body.data).toMatchObject({ start_date: '2026-11-10', end_date: '2026-11-12', cancelled_at: '2026-11-10T10:00:00.000Z' })
      expect(await prisma.activityLog.count({ where: { action: 'GROUP_SUBSTITUTION_CANCELLED' } })).toBe(1)
    })
  })

  describe('moving a group to another school year', () => {
    it('refuses while a substitution ending today or later stays behind', async () => {
      await addSubstitution(groupId, cover())
      const upcoming = await moveToOtherYear()
      await travelTo('2026-11-12T10:00:00.000Z')
      const onItsLastDay = await moveToOtherYear()

      expect(upcoming.status).toBe(409)
      expect(upcoming.body.details.fieldErrors.academic_year_id).toEqual(['This group has substitutions or a planned lecturer change outside that school year. Change or cancel them first.'])
      expect(onItsLastDay.status).toBe(409)
      expect((await listGroups()).body.data.groups).toMatchObject([{ academic_year: { id: yearId } }])
    })

    it('lets a past substitution stay behind, as history', async () => {
      const added = await addSubstitution(groupId, cover())
      await travelTo('2026-11-13T10:00:00.000Z')

      expect((await moveToOtherYear()).status).toBe(200)
      expect(await substitutionById(added.body.data.id)).toMatchObject({ start_date: '2026-11-10', end_date: '2026-11-12', cancelled_at: null })
    })

    it('doesn’t count a cancelled substitution', async () => {
      const added = await addSubstitution(groupId, cover())
      await cancelSubstitution(groupId, added.body.data.id)

      expect((await moveToOtherYear()).status).toBe(200)
    })

    it('refuses a pending lecturer outside the new year', async () => {
      await reassign(teuta.id, '2026-12-01')

      const response = await moveToOtherYear({ lecturer_id: teuta.id })

      expect(response.status).toBe(409)
    })

    it('lets past and current rows stay behind', async () => {
      await travelTo('2026-11-20T10:00:00.000Z')
      await reassign(teuta.id, '2026-11-10')

      expect((await moveToOtherYear({ lecturer_id: teuta.id })).status).toBe(200)
      expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → 2026-11-09', 'Teuta 2026-11-10 → open'])
    })

    it('checks the final state of a save that also changes the lecturer', async () => {
      await reassign(teuta.id, '2026-12-01')

      const replaced = await moveToOtherYear({ lecturer_id: besa.id, lecturer_effective_from: '2027-10-01' })

      expect(replaced.status).toBe(200)
      expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → 2027-09-30', 'Besa 2027-10-01 → open'])
    })

    it('refuses a new pending lecturer before the new year, and undoes the whole save', async () => {
      const response = await moveToOtherYear({ name: 'Group Z', lecturer_id: besa.id, lecturer_effective_from: '2026-12-01' })

      expect(response.status).toBe(400)
      expect(response.body.details.fieldErrors.lecturer_effective_from).toEqual(['The change can’t start before the school year starts.'])
      expect((await listGroups()).body.data.groups).toMatchObject([{ name: 'Group A', academic_year: { id: yearId } }])
      expect(await permanentRows(groupId)).toEqual(['Arben 2026-11-02 → open'])
    })

    it('needs no check when the year stays', async () => {
      await addSubstitution(groupId, cover())

      expect((await updateGroup(groupId, group({ lecturer_id: arben.id, capacity: 9 }))).status).toBe(200)
    })
  })

  describe('the earliest date of a first lecturer', () => {
    it('is the school year’s start for a group without rows', async () => {
      const empty = (await addGroup(group({ name: 'Group B' }))).body.data.id

      const tooEarly = await updateGroup(empty, group({ name: 'Group B', lecturer_id: teuta.id, lecturer_effective_from: '2026-08-31' }))
      const firstDay = await updateGroup(empty, group({ name: 'Group B', lecturer_id: teuta.id, lecturer_effective_from: '2026-09-01' }))

      expect(tooEarly.status).toBe(400)
      expect(tooEarly.body.details.fieldErrors.lecturer_effective_from).toEqual(['The change can’t start before the school year starts.'])
      expect(firstDay.status).toBe(200)
    })
  })

  describe('a school year that hasn’t started', () => {
    const MESSAGE = 'The change can’t start before the school year starts.'

    const editNextYearGroup = (id: string, lecturerId: string | null, effectiveFrom: string) =>
      updateGroup(id, group({ name: 'Group B', academic_year_id: otherYearId, lecturer_id: lecturerId, lecturer_effective_from: effectiveFrom }))

    it('refuses a first lecturer before its start, and takes its first day', async () => {
      const empty = (await addGroup(group({ name: 'Group B', academic_year_id: otherYearId }))).body.data.id

      const refused = await editNextYearGroup(empty, teuta.id, '2026-11-02')
      const firstDay = await editNextYearGroup(empty, teuta.id, '2027-09-01')

      expect(refused.status).toBe(400)
      expect(refused.body.details.fieldErrors.lecturer_effective_from).toEqual([MESSAGE])
      expect(firstDay.status).toBe(200)
      expect(firstDay.body.data).toMatchObject({ lecturer: null, lecturer_change: { lecturer: { id: teuta.id }, start_date: '2027-09-01' } })
    })

    it('refuses planning a change before its start on a group that has a lecturer', async () => {
      const added = (await addGroup(group({ name: 'Group B', academic_year_id: otherYearId, lecturer_id: arben.id }))).body.data.id

      const refused = await editNextYearGroup(added, teuta.id, '2027-08-31')
      const noLecturer = await editNextYearGroup(added, null, '2027-08-31')
      const firstDay = await editNextYearGroup(added, teuta.id, '2027-09-01')

      expect(refused.status).toBe(400)
      expect(refused.body.details.fieldErrors.lecturer_effective_from).toEqual([MESSAGE])
      expect(noLecturer.status).toBe(400)
      expect(firstDay.status).toBe(200)
    })

    it('doesn’t apply once the year has started', async () => {
      await travelTo('2026-11-20T10:00:00.000Z')

      expect((await reassign(teuta.id, '2026-11-10')).status).toBe(200)
    })
  })

  describe('a school year that has ended', () => {
    const MESSAGE = 'This school year has ended, so the group can’t take a new lecturer.'

    beforeEach(async () => {
      await travelTo('2026-11-02T10:00:00.000Z')
    })

    it('refuses a lecturer on a new group, and takes the group without one', async () => {
      await travelTo('2027-07-01T10:00:00.000Z')

      const refused = await addGroup(group({ name: 'Group B', lecturer_id: arben.id }))
      const accepted = await addGroup(group({ name: 'Group B' }))

      expect(refused.status).toBe(409)
      expect(refused.body.details.fieldErrors.lecturer_id).toEqual([MESSAGE])
      expect(accepted.status).toBe(201)
    })

    it('still takes a lecturer on its last day', async () => {
      await travelTo('2027-06-30T10:00:00.000Z')

      expect((await addGroup(group({ name: 'Group B', lecturer_id: arben.id }))).status).toBe(201)
    })

    it('refuses a new lecturer on an edit, but still edits the rest and closes the assignment', async () => {
      await travelTo('2027-07-01T10:00:00.000Z')

      const refused = await reassign(teuta.id, '2027-06-01')
      const edited = await updateGroup(groupId, group({ lecturer_id: arben.id, capacity: 9 }))
      const closed = await reassign(null, '2027-06-01')

      expect(refused.status).toBe(409)
      expect(refused.body.details.fieldErrors.lecturer_id).toEqual([MESSAGE])
      expect(edited.status).toBe(200)
      expect(closed.status).toBe(200)
    })
  })
})
