import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

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
}

const group = (overrides: Partial<GroupBody> = {}): GroupBody => ({
  course_id: mathematicsId,
  name: 'Group A',
  academic_year_id: yearId,
  academic_term_id: null,
  location_id: null,
  capacity: null,
  ...overrides,
})

const addGroup = async (body: GroupBody, auth = ownerAuth) => request(app).post(groupsPath).set('Authorization', auth).send(body)

const listGroups = async (query: Record<string, string> = {}, auth = ownerAuth) => request(app).get(groupsPath).query(query).set('Authorization', auth)

const yllkaRecords = async () => {
  const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
  const course = await prisma.course.create({ data: { organization_id: yllka.id, name: 'Yllka course' } })
  const year = await prisma.academicYear.create({ data: { organization_id: yllka.id, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })
  const term = await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: 'Autumn', start_date: new Date('2026-09-01'), end_date: new Date('2027-01-31') } })
  const location = await prisma.location.create({ data: { organization_id: yllka.id, name: 'Yllka campus', is_main: true } })
  return { courseId: course.id, yearId: year.id, termId: term.id, locationId: location.id }
}

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const manager = await createUser({ email: 'manager@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: manager.id, role: 'ADMIN', permissions: ['MANAGE_COURSES'] },
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  mathematicsId = (await prisma.course.create({ data: { organization_id: organizationId, name: 'Mathematics', code: 'MATH-1' } })).id
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
    const physics = await prisma.course.create({ data: { organization_id: organizationId, name: 'Physics' } })
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

    expect((await addGroup(group(), auth)).status).toBe(403)
    expect((await listGroups({}, auth)).status).toBe(403)
  })
})

const updateGroup = async (id: string, body: GroupBody, auth = ownerAuth) => request(app).put(`${groupsPath}/${id}`).set('Authorization', auth).send(body)

const setStatus = async (id: string, verb: 'archive' | 'restore', auth = ownerAuth) => request(app).post(`${groupsPath}/${id}/${verb}`).set('Authorization', auth)

const setCourseStatus = async (courseId: string, verb: 'archive' | 'restore') => request(app).post(`/api/organizations/${organizationId}/courses/${courseId}/${verb}`).set('Authorization', ownerAuth)

const namesIn = async (query: Record<string, string> = {}) => (await listGroups(query)).body.data.groups.map((item: { name: string }) => item.name)

const logged = (action: 'GROUP_ADDED' | 'GROUP_UPDATED' | 'GROUP_ARCHIVED' | 'GROUP_RESTORED') =>
  prisma.activityLog.findMany({ where: { organization_id: organizationId, action }, orderBy: { subject_name: 'asc' }, select: { subject_name: true } })

const addArchivedCourse = async () => {
  const course = await prisma.course.create({ data: { organization_id: organizationId, name: 'Old Latin', status: 'ARCHIVED' } })
  return course.id
}

describe('filtering groups', () => {
  let physicsId: string

  beforeEach(async () => {
    physicsId = (await prisma.course.create({ data: { organization_id: organizationId, name: 'Physics' } })).id
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
    const physics = await prisma.course.create({ data: { organization_id: organizationId, name: 'Physics' } })
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
    const physics = await prisma.course.create({ data: { organization_id: organizationId, name: 'Physics' } })
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

describe('deleting an organization', () => {
  it('removes its groups and years along with it', async () => {
    const added = await addGroup(group({ academic_term_id: autumnId, location_id: mainCampusId }))
    expect(await prisma.group.count({ where: { id: added.body.data.id } })).toBe(1)

    await prisma.organization.delete({ where: { id: organizationId } })

    expect(await prisma.organization.count({ where: { id: organizationId } })).toBe(0)
    expect(await prisma.group.count({ where: { id: added.body.data.id } })).toBe(0)
    expect(await prisma.academicYear.count({ where: { id: yearId } })).toBe(0)
  })
})
