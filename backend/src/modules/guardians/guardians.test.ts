import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let ownerAuth: string
let artaId: string
let besaId: string

const DRITA = { first_name: 'Drita', last_name: 'Gashi', email: 'drita@family.test', phone: '+383 44 000 000', relationship: 'MOTHER' } as const

const guardiansPath = (studentId: string) => `/api/organizations/${organizationId}/students/${studentId}/guardians`

const addGuardian = (studentId: string, body: object = DRITA, auth = ownerAuth) => request(app).post(guardiansPath(studentId)).set('Authorization', auth).send(body)

const listGuardians = (studentId: string, auth = ownerAuth) => request(app).get(guardiansPath(studentId)).set('Authorization', auth)

const addStudent = (firstName: string, studentNumber: string) =>
  prisma.student.create({ data: { organization_id: organizationId, first_name: firstName, last_name: 'Gashi', student_number: studentNumber } })

const actionsLogged = async () =>
  (await prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: 'asc' }, select: { action: true, subject_name: true } })).map(({ action, subject_name }) => ({ action, subject_name }))

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const families = await createUser({ email: 'families@oxford.test' })
  const studentsOnly = await createUser({ email: 'students@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: families.id, role: 'ADMIN', permissions: ['MANAGE_GUARDIANS'] },
        { userId: studentsOnly.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  artaId = (await addStudent('Arta', 'STU-0001')).id
  besaId = (await addStudent('Besa', 'STU-0002')).id
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('adding a guardian to a student', () => {
  it('adds a guardian with their relationship and lists them on the student, with no login yet', async () => {
    const added = await addGuardian(artaId)
    const listed = await listGuardians(artaId)

    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({ ...DRITA, login_status: 'NONE', invitation: null })
    expect(listed.body.data).toEqual([added.body.data])
    expect(listed.body.data[0]).not.toHaveProperty('user_id')
    expect(await actionsLogged()).toEqual([{ action: 'GUARDIAN_ADDED', subject_name: 'Drita Gashi for Arta Gashi' }])
  })

  it('reuses the guardian for the same email, however it is cased or padded, and only adds the link', async () => {
    const first = await addGuardian(artaId)
    const second = await addGuardian(besaId, { ...DRITA, email: '  DRITA@Family.TEST ', relationship: 'LEGAL_GUARDIAN' })

    expect(second.status).toBe(201)
    expect(second.body.data).toMatchObject({ id: first.body.data.id, email: 'drita@family.test', relationship: 'LEGAL_GUARDIAN' })
    expect(await prisma.guardian.count()).toBe(1)
    expect(await prisma.studentGuardian.count()).toBe(2)
    expect((await actionsLogged()).at(-1)).toEqual({ action: 'GUARDIAN_LINKED', subject_name: 'Drita Gashi to Besa Gashi' })
  })

  it('adds a guardian without an email or phone, and two of them don’t clash', async () => {
    const noEmail = { ...DRITA, email: '', phone: '' }
    const first = await addGuardian(artaId, noEmail)
    const second = await addGuardian(artaId, { ...noEmail, first_name: 'Agim', relationship: 'FATHER' })

    expect(first.status).toBe(201)
    expect(first.body.data).toMatchObject({ email: null, phone: null })
    expect(second.status).toBe(201)
    expect(await prisma.guardian.count()).toBe(2)
  })

  it('refuses linking the same guardian to the same student twice', async () => {
    await addGuardian(artaId)

    const again = await addGuardian(artaId, { ...DRITA, relationship: 'OTHER' })

    expect(again.status).toBe(409)
    expect(await prisma.studentGuardian.count()).toBe(1)
  })

  it('asks for the names and the relationship', async () => {
    const response = await addGuardian(artaId, { first_name: '', last_name: '', email: '', phone: '', relationship: '' })

    expect(response.status).toBe(400)
    expect(Object.keys(response.body.details.fieldErrors).sort()).toEqual(['first_name', 'last_name', 'relationship'])
  })

  it('answers 404 for a student of another organization', async () => {
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    const yllkaStudent = await prisma.student.create({ data: { organization_id: yllka.id, first_name: 'Other', last_name: 'Child', student_number: 'STU-0001' } })

    expect((await addGuardian(yllkaStudent.id)).status).toBe(404)
    expect(await prisma.guardian.count()).toBe(0)
  })
})

describe('editing a guardian on a student', () => {
  it('changes the guardian’s details and this link’s relationship only', async () => {
    const { id } = (await addGuardian(artaId)).body.data
    await addGuardian(besaId)

    const edited = await request(app)
      .put(`${guardiansPath(artaId)}/${id}`)
      .set('Authorization', ownerAuth)
      .send({ ...DRITA, first_name: 'Dritë', email: 'Drite@Family.test', relationship: 'GRANDPARENT' })
    const onBesa = await listGuardians(besaId)

    expect(edited.status).toBe(200)
    expect(edited.body.data).toMatchObject({ id, first_name: 'Dritë', email: 'drite@family.test', relationship: 'GRANDPARENT' })
    expect(onBesa.body.data).toEqual([expect.objectContaining({ first_name: 'Dritë', relationship: 'MOTHER' })])
    expect((await actionsLogged()).at(-1)).toEqual({ action: 'GUARDIAN_UPDATED', subject_name: 'Dritë Gashi' })
  })

  it('refuses an email another guardian of the organization already has', async () => {
    await addGuardian(artaId)
    const { id } = (await addGuardian(artaId, { ...DRITA, first_name: 'Agim', email: 'agim@family.test', relationship: 'FATHER' })).body.data

    const response = await request(app).put(`${guardiansPath(artaId)}/${id}`).set('Authorization', ownerAuth).send({ ...DRITA, first_name: 'Agim', relationship: 'FATHER' })

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.email).toEqual(['Another guardian in your organization already has this email.'])
  })

  it('answers 404 for a guardian who isn’t linked to this student', async () => {
    const { id } = (await addGuardian(besaId)).body.data

    const response = await request(app).put(`${guardiansPath(artaId)}/${id}`).set('Authorization', ownerAuth).send(DRITA)

    expect(response.status).toBe(404)
  })
})

describe('unlinking a guardian from a student', () => {
  it('removes only the link: the guardian and their other children stay', async () => {
    const { id } = (await addGuardian(artaId)).body.data
    await addGuardian(besaId)

    const response = await request(app).delete(`${guardiansPath(artaId)}/${id}`).set('Authorization', ownerAuth)

    expect(response.status).toBe(204)
    expect((await listGuardians(artaId)).body.data).toEqual([])
    expect((await listGuardians(besaId)).body.data).toEqual([expect.objectContaining({ id })])
    expect(await prisma.guardian.count()).toBe(1)
    expect((await actionsLogged()).at(-1)).toEqual({ action: 'GUARDIAN_UNLINKED', subject_name: 'Drita Gashi from Arta Gashi' })
  })

  it('keeps a guardian left with no children', async () => {
    const { id } = (await addGuardian(artaId)).body.data

    await request(app).delete(`${guardiansPath(artaId)}/${id}`).set('Authorization', ownerAuth)

    expect(await prisma.guardian.findUnique({ where: { id } })).not.toBeNull()
  })

  it('answers 404 when the guardian isn’t linked to the student', async () => {
    const { id } = (await addGuardian(besaId)).body.data

    expect((await request(app).delete(`${guardiansPath(artaId)}/${id}`).set('Authorization', ownerAuth)).status).toBe(404)
  })
})

describe('who may manage guardians', () => {
  it('lets the owner and admins with MANAGE_GUARDIANS in, and refuses everyone else with 403', async () => {
    const permitted = await addGuardian(artaId, DRITA, await loginAs('families@oxford.test'))
    const { id } = permitted.body.data
    const calls = [
      (auth: string) => listGuardians(artaId, auth),
      (auth: string) => addGuardian(artaId, { ...DRITA, email: 'other@family.test' }, auth),
      (auth: string) => request(app).put(`${guardiansPath(artaId)}/${id}`).set('Authorization', auth).send(DRITA),
      (auth: string) => request(app).delete(`${guardiansPath(artaId)}/${id}`).set('Authorization', auth),
    ]

    for (const email of ['students@oxford.test', 'owner@yllka.test']) {
      const auth = await loginAs(email)
      for (const call of calls) {
        expect((await call(auth)).status, email).toBe(403)
      }
    }
    expect(permitted.status).toBe(201)
    expect(await prisma.studentGuardian.count()).toBe(1)
  })
})
