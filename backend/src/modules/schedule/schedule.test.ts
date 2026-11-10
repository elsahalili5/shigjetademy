import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

// Monday 9 November 2026, 11:00 in Belgrade, the organization's default time zone
const MONDAY_MORNING = '2026-11-09T10:00:00.000Z'

let organizationId: string
let schedulePath: string
let ownerAuth: string
let courseId: string
let yearId: string
let mainRoomId: string
let arbenId: string
let teutaId: string

type AddGroupParams = {
  name: string
  roomId?: string | null
  lecturerId?: string
  meetings?: { weekday: string; start_time: string; end_time: string }[]
}

const toTime = (clock: string) => new Date(`1970-01-01T${clock}:00.000Z`)

const addGroup = async ({ name, roomId = null, lecturerId, meetings = [{ weekday: 'MONDAY', start_time: '10:00', end_time: '11:00' }] }: AddGroupParams) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, room_id: roomId } })
  await prisma.groupMeeting.createMany({ data: meetings.map((meeting) => ({ group_id: group.id, weekday: meeting.weekday as never, start_time: toTime(meeting.start_time), end_time: toTime(meeting.end_time) })) })
  if (lecturerId) {
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2026-09-01') } })
  }
  return group
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(MONDAY_MORNING))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const schedulesAdmin = await createUser({ email: 'schedules@oxford.test' })
  const otherAdmin = await createUser({ email: 'other-admin@oxford.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: schedulesAdmin.id, role: 'ADMIN', permissions: ['MANAGE_SCHEDULES'] },
        { userId: otherAdmin.id, role: 'ADMIN', permissions: ['MANAGE_COURSES'] },
      ],
    })
  ).id
  courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  const location = await prisma.location.create({ data: { organization_id: organizationId, name: 'Main campus', is_main: true } })
  mainRoomId = (await prisma.room.create({ data: { location_id: location.id, name: 'Room 101' } })).id
  arbenId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME' } })).id
  teutaId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Krasniqi', employment_type: 'FULL_TIME' } })).id
  schedulePath = `/api/organizations/${organizationId}/schedule`
  ownerAuth = await loginAs('owner@oxford.test')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the weekly schedule', () => {
  it('flags a room shared by two groups at an overlapping time, even when the overlap isn’t exact', async () => {
    await addGroup({ name: 'Group A', roomId: mainRoomId, meetings: [{ weekday: 'MONDAY', start_time: '10:00', end_time: '11:00' }] })
    await addGroup({ name: 'Group B', roomId: mainRoomId, meetings: [{ weekday: 'MONDAY', start_time: '10:30', end_time: '11:30' }] })

    const response = await request(app).get(schedulePath).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
    const entries = response.body.data as { group: { name: string }; clash: { room: boolean; teacher: boolean } }[]
    expect(entries.every((entry) => entry.clash.room)).toBe(true)
    expect(entries.every((entry) => !entry.clash.teacher)).toBe(true)
  })

  it('does not flag two meetings in the same room that don’t overlap', async () => {
    await addGroup({ name: 'Group A', roomId: mainRoomId, meetings: [{ weekday: 'MONDAY', start_time: '10:00', end_time: '11:00' }] })
    await addGroup({ name: 'Group B', roomId: mainRoomId, meetings: [{ weekday: 'MONDAY', start_time: '11:00', end_time: '12:00' }] })

    const response = await request(app).get(schedulePath).set('Authorization', ownerAuth)

    expect(response.body.data.every((entry: { clash: { room: boolean } }) => !entry.clash.room)).toBe(true)
  })

  it('flags a lecturer teaching two groups at an overlapping time, in different rooms', async () => {
    const otherLocation = await prisma.location.create({ data: { organization_id: organizationId, name: 'North campus' } })
    const otherRoomId = (await prisma.room.create({ data: { location_id: otherLocation.id, name: 'Room 201' } })).id
    await addGroup({ name: 'Group A', roomId: mainRoomId, lecturerId: arbenId, meetings: [{ weekday: 'MONDAY', start_time: '10:00', end_time: '11:00' }] })
    await addGroup({ name: 'Group B', roomId: otherRoomId, lecturerId: arbenId, meetings: [{ weekday: 'MONDAY', start_time: '10:30', end_time: '11:30' }] })

    const response = await request(app).get(schedulePath).set('Authorization', ownerAuth)

    const entries = response.body.data as { clash: { room: boolean; teacher: boolean } }[]
    expect(entries.every((entry) => entry.clash.teacher)).toBe(true)
    expect(entries.every((entry) => !entry.clash.room)).toBe(true)
  })

  it('shows the lecturer currently substituting, not the permanent one, on the organization’s today', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await prisma.groupSubstitution.create({ data: { group_id: group.id, lecturer_id: teutaId, start_date: new Date('2026-11-09'), end_date: new Date('2026-11-09') } })

    const response = await request(app).get(schedulePath).set('Authorization', ownerAuth)

    expect(response.body.data).toEqual([expect.objectContaining({ teacher: expect.objectContaining({ first_name: 'Teuta', last_name: 'Krasniqi' }) })])
  })

  it('shows the permanent lecturer once a substitution has ended', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await prisma.groupSubstitution.create({ data: { group_id: group.id, lecturer_id: teutaId, start_date: new Date('2026-11-01'), end_date: new Date('2026-11-02') } })

    const response = await request(app).get(schedulePath).set('Authorization', ownerAuth)

    expect(response.body.data).toEqual([expect.objectContaining({ teacher: expect.objectContaining({ first_name: 'Arben' }) })])
  })

  it('lists a group without a room or a lecturer without erroring, clearly marked', async () => {
    await addGroup({ name: 'Group A' })

    const response = await request(app).get(schedulePath).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([expect.objectContaining({ room: null, teacher: null, clash: { room: false, teacher: false } })])
  })

  it('leaves out archived groups', async () => {
    const group = await addGroup({ name: 'Group A' })
    await prisma.group.update({ where: { id: group.id }, data: { status: 'ARCHIVED' } })

    const response = await request(app).get(schedulePath).set('Authorization', ownerAuth)

    expect(response.body.data).toEqual([])
  })

  it('only shows this organization’s groups', async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    const other = await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
    const otherCourse = await createCourse({ organizationId: other.id, name: 'Yllka course' })
    const otherYear = await prisma.academicYear.create({ data: { organization_id: other.id, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })
    await prisma.group.create({ data: { organization_id: other.id, course_id: otherCourse.id, name: 'Yllka group', academic_year_id: otherYear.id } })
    await addGroup({ name: 'Group A' })

    const response = await request(app).get(schedulePath).set('Authorization', ownerAuth)

    expect(response.body.data).toEqual([expect.objectContaining({ group: expect.objectContaining({ name: 'Group A' }) })])
  })

  it('lets a school admin with MANAGE_SCHEDULES read it, and refuses one without it', async () => {
    const schedulesAuth = await loginAs('schedules@oxford.test')
    const otherAuth = await loginAs('other-admin@oxford.test')
    await addGroup({ name: 'Group A' })

    expect((await request(app).get(schedulePath).set('Authorization', schedulesAuth)).status).toBe(200)
    expect((await request(app).get(schedulePath).set('Authorization', otherAuth)).status).toBe(403)
  })
})
