import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Material, MaterialSpace } from '@shigjetademy/shared/materials'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type MemberKey = 'owner' | 'admin' | 'clerk' | 'arben' | 'teuta' | 'alba' | 'besa' | 'gent'

const ROLE_OF: Record<MemberKey, 'OWNER' | 'ADMIN' | 'LECTURER' | 'STUDENT' | 'GUARDIAN'> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  clerk: 'ADMIN',
  arben: 'LECTURER',
  teuta: 'LECTURER',
  alba: 'STUDENT',
  besa: 'STUDENT',
  gent: 'GUARDIAN',
}

const MEMBER_KEYS = Object.keys(ROLE_OF) as MemberKey[]

const emailOf = (key: MemberKey) => `${key}@oxford.test`

let organizationId: string
let yearId: string
let mathId: string
let groupAId: string
let groupBId: string

const base = () => `/api/organizations/${organizationId}/materials`

const authed = (key: MemberKey) => loginAs(emailOf(key))

const get = async (key: MemberKey, path = '', query: object = {}) => request(app).get(`${base()}${path}`).query(query).set('Authorization', await authed(key))

const post = async (key: MemberKey, path: string, body?: object) => request(app).post(`${base()}${path}`).set('Authorization', await authed(key)).send(body)

const put = async (key: MemberKey, path: string, body: object) => request(app).put(`${base()}${path}`).set('Authorization', await authed(key)).send(body)

const remove = async (key: MemberKey, materialId: string) => request(app).delete(`${base()}/${materialId}`).set('Authorization', await authed(key))

const DETAILS = { title: 'Limits, part 2', description: 'Read before the test.', section: 'Week 4' } as const

type SpaceInput = { space_kind: 'GROUP' | 'COURSE'; space_id: string }

const inGroup = (space_id: string): SpaceInput => ({ space_kind: 'GROUP', space_id })

const inCourse = (space_id: string): SpaceInput => ({ space_kind: 'COURSE', space_id })

const linkBody = (space: SpaceInput, overrides: object = {}) => ({ kind: 'LINK', title: 'Limits explained', description: '', section: 'Week 3', url: 'https://example.com/limits', ...space, ...overrides })

const noteBody = (space: SpaceInput, overrides: object = {}) => ({ kind: 'NOTE', title: 'Bring a calculator', description: '', section: '', body: 'Thursday we work on derivatives.', ...space, ...overrides })

/** Shares a link and returns its id */
const shareLink = async (key: MemberKey, space: SpaceInput, overrides: object = {}) => {
  const response = await post(key, '', linkBody(space, overrides))
  expect(response.status, JSON.stringify(response.body)).toBe(201)
  return (response.body.data as Material).id
}

const materialsOf = async (key: MemberKey, space: SpaceInput) => {
  const response = await get(key, '', space)
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  return response.body.data as Material[]
}

type UploadParams = {
  key: MemberKey
  space: SpaceInput
  file: { buffer: Buffer; filename: string; contentType: string }
  fields?: Record<string, string>
}

const upload = async ({ key, space, file, fields = {} }: UploadParams) => {
  const call = request(app).post(`${base()}/files`).set('Authorization', await authed(key))
  for (const [name, value] of Object.entries({ title: 'Week 3 slides', description: '', section: 'Week 3', ...space, ...fields })) call.field(name, value)
  return call.attach('file', file.buffer, { filename: file.filename, contentType: file.contentType })
}

const download = async (key: MemberKey, materialId: string) => request(app).get(`${base()}/${materialId}/download`).set('Authorization', await authed(key)).responseType('blob')

const PDF_BYTES = 20 * 1024 * 1024

/** A PDF of exactly the largest allowed size */
const bigPdf = () => ({ buffer: Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(PDF_BYTES - 9, 'a')]), filename: 'Week 3 – slides.pdf', contentType: 'application/pdf' })

/** The files stored for materials, to prove an upload left nothing or a removal took its file away */
const storedFiles = async () => readdir(process.env.MATERIALS_DIR ?? '').catch(() => [])

const spacesOf = async (key: MemberKey) => {
  const response = await get(key, '/spaces')
  expect(response.status).toBe(200)
  return response.body.data as MaterialSpace[]
}

// Files go to a folder of this run's own, removed afterward
beforeAll(async () => {
  process.env.MATERIALS_DIR = await mkdtemp(path.join(tmpdir(), 'materials-test-'))
})

afterAll(async () => {
  await rm(process.env.MATERIALS_DIR ?? '', { recursive: true, force: true })
  delete process.env.MATERIALS_DIR
})

beforeEach(async () => {
  await rm(process.env.MATERIALS_DIR ?? '', { recursive: true, force: true })
  const users = {} as Record<MemberKey, { id: string }>
  for (const key of MEMBER_KEYS) {
    users[key] = await createUser({ email: emailOf(key) })
    await prisma.user.update({ where: { id: users[key].id }, data: { first_name: key[0].toUpperCase() + key.slice(1), last_name: 'Person' } })
  }
  const organization = await createOrganization({
    name: 'Oxford Academy',
    ownerId: users.owner.id,
    members: MEMBER_KEYS.filter((key) => key !== 'owner').map((key) => ({ userId: users[key].id, role: ROLE_OF[key], permissions: key === 'admin' ? ['MANAGE_MATERIALS'] : [] })),
  })
  organizationId = organization.id
  mathId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  const lecturerOf = async (key: MemberKey) =>
    (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: key, last_name: 'Person', employment_type: 'FULL_TIME', user_id: users[key].id } })).id
  const studentOf = async (key: MemberKey, number: string) =>
    (await prisma.student.create({ data: { organization_id: organizationId, first_name: key, last_name: 'Person', student_number: number, user_id: users[key].id } })).id
  const addGroup = async (name: string, lecturerId: string) => {
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: mathId, name, academic_year_id: yearId } })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2020-01-01') } })
    return group.id
  }
  // Mathematics: group A (Arben: Alba) and group B (Teuta: Besa)
  groupAId = await addGroup('Group A', await lecturerOf('arben'))
  groupBId = await addGroup('Group B', await lecturerOf('teuta'))
  await prisma.groupEnrolment.create({ data: { group_id: groupAId, student_id: await studentOf('alba', 'STU-1'), enrolled_on: new Date('2020-01-01') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupBId, student_id: await studentOf('besa', 'STU-2'), enrolled_on: new Date('2020-01-01') } })
})

describe('sharing links and notes', () => {
  it('lets a lecturer share a link with a group they teach, and that group’s student reads it under its section', async () => {
    await shareLink('arben', inGroup(groupAId))

    const [material] = await materialsOf('alba', inGroup(groupAId))

    expect(material).toMatchObject({
      kind: 'LINK',
      title: 'Limits explained',
      description: null,
      section: 'Week 3',
      url: 'https://example.com/limits',
      body: null,
      space: { kind: 'GROUP', id: groupAId, name: 'Group A', course_name: 'Mathematics' },
      author: { first_name: 'Arben', last_name: 'Person' },
    })
  })
})

describe('who shares and who reads', () => {
  it('refuses a lecturer sharing with a group they don’t teach, and a student sharing at all', async () => {
    const byOtherLecturer = await post('arben', '', linkBody(inGroup(groupBId)))
    const byStudent = await post('alba', '', linkBody(inGroup(groupAId)))

    expect(byOtherLecturer.status).toBe(403)
    expect(byStudent.status).toBe(403)
    expect(await prisma.material.count()).toBe(0)
  })

  it('does not let a student read another group’s materials', async () => {
    await shareLink('teuta', inGroup(groupBId))

    const response = await get('alba', '', inGroup(groupBId))

    expect(response.status).toBe(404)
    expect(await materialsOf('besa', inGroup(groupBId))).toHaveLength(1)
  })

  it('shows a course’s materials to the students of all its groups', async () => {
    await shareLink('arben', inCourse(mathId), { title: 'Syllabus' })

    expect((await materialsOf('alba', inCourse(mathId))).map((material) => material.title)).toEqual(['Syllabus'])
    expect((await materialsOf('besa', inCourse(mathId))).map((material) => material.title)).toEqual(['Syllabus'])
  })

  it('lets the owner and an admin with the permission share anywhere, and refuses other admins and guardians', async () => {
    await shareLink('owner', inGroup(groupBId), { title: 'From the owner' })
    await shareLink('admin', inCourse(mathId), { title: 'From the admin' })

    for (const key of ['clerk', 'gent'] as const) {
      expect((await get(key, '/spaces')).status).toBe(403)
      expect((await get(key, '', inGroup(groupAId))).status).toBe(403)
      expect((await post(key, '', linkBody(inGroup(groupAId)))).status).toBe(403)
    }
  })

  it('lists the spaces each person reads, and where they may share', async () => {
    const studentSpaces = await spacesOf('alba')
    const lecturerSpaces = await spacesOf('arben')

    expect(studentSpaces.map((space) => [space.name, space.can_post])).toEqual([
      ['Mathematics', false],
      ['Group A', false],
    ])
    expect(lecturerSpaces.map((space) => [space.name, space.can_post])).toEqual([
      ['Mathematics', true],
      ['Group A', true],
    ])
    expect((await spacesOf('admin')).map((space) => space.name)).toEqual(['Mathematics', 'Group A', 'Group B'])
  })

  it('shares a note, newest first, with an empty section left out', async () => {
    await shareLink('arben', inGroup(groupAId))
    const response = await post('arben', '', noteBody(inGroup(groupAId)))
    expect(response.status).toBe(201)

    const materials = await materialsOf('alba', inGroup(groupAId))

    expect(materials.map((material) => material.title)).toEqual(['Bring a calculator', 'Limits explained'])
    expect(materials[0]).toMatchObject({ kind: 'NOTE', body: 'Thursday we work on derivatives.', section: null, url: null })
  })

  it('refuses a link that is not a web address and a note without words', async () => {
    const badLink = await post('arben', '', linkBody(inGroup(groupAId), { url: 'javascript:alert(1)' }))
    const emptyNote = await post('arben', '', noteBody(inGroup(groupAId), { body: '   ' }))

    expect(badLink.status).toBe(400)
    expect(emptyNote.status).toBe(400)
  })

  it('answers 404 for a group of another organization or one that doesn’t exist', async () => {
    const response = await post('owner', '', linkBody(inGroup('00000000-0000-4000-8000-000000000001')))

    expect(response.status).toBe(404)
  })
})

describe('files', () => {
  it('uploads a 20 MB PDF and downloads it as an attachment with its name', async () => {
    const pdf = bigPdf()
    const uploaded = await upload({ key: 'arben', space: inGroup(groupAId), file: pdf })
    expect(uploaded.status, JSON.stringify(uploaded.body)).toBe(201)
    const material = uploaded.body.data as Material
    expect(material).toMatchObject({ kind: 'FILE', title: 'Week 3 slides', section: 'Week 3', file: { name: 'Week 3 – slides.pdf', type: 'application/pdf', size: PDF_BYTES } })

    const response = await download('alba', material.id)

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('application/pdf')
    expect(response.headers['content-disposition']).toContain('attachment')
    expect(response.headers['content-disposition']).toContain("filename*=UTF-8''Week%203%20%E2%80%93%20slides.pdf")
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(Buffer.compare(response.body as Buffer, pdf.buffer)).toBe(0)
  })

  it('refuses the download to anyone outside the group', async () => {
    const uploaded = await upload({ key: 'arben', space: inGroup(groupAId), file: { buffer: Buffer.from('notes'), filename: 'notes.txt', contentType: 'text/plain' } })
    const materialId = (uploaded.body.data as Material).id

    expect((await download('besa', materialId)).status).toBe(404)
    expect((await download('teuta', materialId)).status).toBe(404)
    expect((await download('gent', materialId)).status).toBe(403)
    expect((await download('clerk', materialId)).status).toBe(403)
    expect((await download('owner', materialId)).status).toBe(200)
  })

  it('is not served from the public uploads', async () => {
    const uploaded = await upload({ key: 'arben', space: inGroup(groupAId), file: { buffer: Buffer.from('secret'), filename: 'notes.txt', contentType: 'text/plain' } })
    expect(uploaded.status).toBe(201)
    const [stored] = await storedFiles()

    for (const publicPath of [`/api/uploads/materials/${stored}`, `/api/uploads/${stored}`, `/api/uploads/avatars/../materials/${stored}`]) {
      expect((await request(app).get(publicPath)).status, publicPath).toBe(404)
    }
  })

  it('refuses a type that is not allowed, a file over 20 MB and a missing file, and keeps none of them', async () => {
    const script = await upload({ key: 'arben', space: inGroup(groupAId), file: { buffer: Buffer.from('<script>'), filename: 'page.html', contentType: 'text/html' } })
    const renamed = await upload({ key: 'arben', space: inGroup(groupAId), file: { buffer: Buffer.from('MZ'), filename: 'setup.exe', contentType: 'application/pdf' } })
    const tooBig = await upload({ key: 'arben', space: inGroup(groupAId), file: { ...bigPdf(), buffer: Buffer.alloc(PDF_BYTES + 1, 'a') } })
    const missing = await request(app).post(`${base()}/files`).set('Authorization', await authed('arben')).field('title', 'Nothing').field('description', '').field('section', '').field('space_kind', 'GROUP').field('space_id', groupAId)

    expect(script.status).toBe(400)
    expect(renamed.status).toBe(400)
    expect(tooBig.status).toBe(400)
    expect(tooBig.body.error).toBe('Files must be 20 MB or smaller.')
    expect(missing.status).toBe(400)
    expect(await prisma.material.count()).toBe(0)
    expect(await storedFiles()).toEqual([])
  })

  it('refuses a student’s upload before reading the file, whatever the file is', async () => {
    const tooBig = await upload({ key: 'alba', space: inGroup(groupAId), file: { ...bigPdf(), buffer: Buffer.alloc(PDF_BYTES + 1, 'a') } })
    const wrongType = await upload({ key: 'alba', space: inGroup(groupAId), file: { buffer: Buffer.from('<script>'), filename: 'page.html', contentType: 'text/html' } })

    // A file read first would answer 400 for its size or type
    expect(tooBig.status).toBe(403)
    expect(wrongType.status).toBe(403)
    expect(await storedFiles()).toEqual([])
  })

  it('refuses a student’s upload, one to a group the lecturer doesn’t teach and one without a title, and keeps no file', async () => {
    const file = { buffer: Buffer.from('notes'), filename: 'notes.txt', contentType: 'text/plain' }

    expect((await upload({ key: 'alba', space: inGroup(groupAId), file })).status).toBe(403)
    expect((await upload({ key: 'arben', space: inGroup(groupBId), file })).status).toBe(403)
    expect((await upload({ key: 'arben', space: inGroup(groupAId), file, fields: { title: '' } })).status).toBe(400)
    expect(await prisma.material.count()).toBe(0)
    expect(await storedFiles()).toEqual([])
  })
})

describe('editing and removing', () => {
  it('lets the author change the title, description and section', async () => {
    const materialId = await shareLink('arben', inGroup(groupAId))

    const response = await put('arben', `/${materialId}`, DETAILS)

    expect(response.status, JSON.stringify(response.body)).toBe(200)
    expect(response.body.data).toMatchObject({ id: materialId, ...DETAILS, url: 'https://example.com/limits', can_edit: true, can_remove: true })
    expect((await materialsOf('alba', inGroup(groupAId)))[0]).toMatchObject({ ...DETAILS, can_edit: false, can_remove: false })
  })

  it('lets the owner and an admin with the permission edit and remove anyone’s, but not another lecturer or a student', async () => {
    const materialId = await shareLink('teuta', inCourse(mathId))

    expect((await put('arben', `/${materialId}`, DETAILS)).status).toBe(403)
    expect((await remove('arben', materialId)).status).toBe(403)
    expect((await put('alba', `/${materialId}`, DETAILS)).status).toBe(403)
    expect((await remove('alba', materialId)).status).toBe(403)
    expect((await materialsOf('arben', inCourse(mathId)))[0]).toMatchObject({ can_edit: false, can_remove: false })
    expect((await materialsOf('owner', inCourse(mathId)))[0]).toMatchObject({ can_edit: true, can_remove: true })
    expect((await put('admin', `/${materialId}`, DETAILS)).status).toBe(200)
    expect((await remove('owner', materialId)).status).toBe(200)
    expect(await prisma.material.count()).toBe(0)
  })

  it('answers 404 to someone outside the material’s space', async () => {
    const materialId = await shareLink('arben', inGroup(groupAId))

    expect((await put('teuta', `/${materialId}`, DETAILS)).status).toBe(404)
    expect((await remove('teuta', materialId)).status).toBe(404)
    expect((await remove('besa', materialId)).status).toBe(404)
  })

  it('removes the stored file with the material', async () => {
    const uploaded = await upload({ key: 'arben', space: inGroup(groupAId), file: { buffer: Buffer.from('notes'), filename: 'notes.txt', contentType: 'text/plain' } })
    const materialId = (uploaded.body.data as Material).id
    expect(await storedFiles()).toHaveLength(1)

    const response = await remove('arben', materialId)

    expect(response.status).toBe(200)
    expect(await storedFiles()).toEqual([])
    expect((await download('arben', materialId)).status).toBe(404)
    expect(await materialsOf('alba', inGroup(groupAId))).toEqual([])
  })

  it('refuses an edit without a title', async () => {
    const materialId = await shareLink('arben', inGroup(groupAId))

    expect((await put('arben', `/${materialId}`, { ...DETAILS, title: ' ' })).status).toBe(400)
  })
})

describe('archived groups and courses', () => {
  it('keeps an archived group’s materials readable but takes no new ones', async () => {
    const materialId = await shareLink('arben', inGroup(groupAId))
    await prisma.group.update({ where: { id: groupAId }, data: { status: 'ARCHIVED' } })
    const file = { buffer: Buffer.from('notes'), filename: 'notes.txt', contentType: 'text/plain' }

    const link = await post('arben', '', linkBody(inGroup(groupAId)))
    const byOwner = await post('owner', '', noteBody(inGroup(groupAId)))
    const uploaded = await upload({ key: 'arben', space: inGroup(groupAId), file })

    expect(link.status).toBe(403)
    expect(link.body.error).toBe('This group is archived, so it takes no new materials.')
    expect(byOwner.status).toBe(403)
    expect(uploaded.status).toBe(403)
    expect(await storedFiles()).toEqual([])
    expect((await materialsOf('alba', inGroup(groupAId))).map((material) => material.id)).toEqual([materialId])
    expect((await spacesOf('arben')).find((space) => space.id === groupAId)).toMatchObject({ is_archived: true, can_post: false })
  })

  it('makes an archived course’s materials read-only, even for their author and the owner', async () => {
    const materialId = await shareLink('arben', inCourse(mathId))
    await prisma.course.update({ where: { id: mathId }, data: { status: 'ARCHIVED' } })

    expect((await post('arben', '', linkBody(inCourse(mathId)))).status).toBe(403)
    expect((await put('arben', `/${materialId}`, DETAILS)).status).toBe(403)
    expect((await remove('owner', materialId)).status).toBe(403)
    expect((await materialsOf('arben', inCourse(mathId)))[0]).toMatchObject({ title: 'Limits explained', can_edit: false, can_remove: false })
  })
})
