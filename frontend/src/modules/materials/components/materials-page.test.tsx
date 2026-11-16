import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser, MemberRole, Permission } from '@shigjetademy/shared/auth'
import { createMaterialSchema, updateMaterialSchema } from '@shigjetademy/shared/materials'
import type { Material, MaterialSpace } from '@shigjetademy/shared/materials'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ORG = '*/api/organizations/org-1/materials'

const membershipWith = (role: MemberRole, permissions: Permission[] = []): AuthUser['memberships'][number] => ({
  id: 'membership-me',
  role,
  permissions,
  organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS },
})

const signInWithRole = (role: MemberRole, permissions: Permission[] = []) => signInAs(buildUser({ id: 'user-me', memberships: [membershipWith(role, permissions)] }))

const ARBEN = { membership_id: 'membership-arben', first_name: 'Arben', last_name: 'Hoxha' }

const GROUP_A_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21'
const MATH_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e11'

const GROUP_A = { kind: 'GROUP', id: GROUP_A_ID, name: 'Group A', course_name: 'Mathematics' } as const
const MATH = { kind: 'COURSE', id: MATH_ID, name: 'Mathematics', course_name: null } as const

const spacesFor = (canPost: boolean): MaterialSpace[] => [
  { ...MATH, is_archived: false, can_post: canPost },
  { ...GROUP_A, is_archived: false, can_post: canPost },
]

const material = (overrides: Partial<Material> & Pick<Material, 'id' | 'title'>): Material => ({
  space: MATH,
  kind: 'LINK',
  description: null,
  section: null,
  url: 'https://example.com/limits',
  body: null,
  file: null,
  author: ARBEN,
  created_at: '2026-11-10T11:00:00.000Z',
  updated_at: '2026-11-10T11:00:00.000Z',
  can_edit: false,
  can_remove: false,
  ...overrides,
})

const serveSpaces = (spaces: MaterialSpace[]) => server.use(http.get(`${ORG}/spaces`, () => HttpResponse.json({ data: spaces })))

/** Serves each space's materials by the space in the query */
const serveMaterials = (bySpace: Record<string, Material[]>) =>
  server.use(
    http.get(ORG, ({ request }) => {
      const url = new URL(request.url)
      return HttpResponse.json({ data: bySpace[`${url.searchParams.get('space_kind')}:${url.searchParams.get('space_id')}`] ?? [] })
    }),
  )

describe('learning materials: reading', () => {
  it('shows a student the first space’s materials grouped by section, General first, and switches space with the picker', async () => {
    signInWithRole('STUDENT')
    serveSpaces(spacesFor(false))
    serveMaterials({
      [`COURSE:${MATH_ID}`]: [
        material({ id: 'm-1', title: 'Limits explained', section: 'Week 3', description: 'Read before Thursday.' }),
        material({ id: 'm-2', title: 'Syllabus', kind: 'NOTE', url: null, body: 'Ten units this year.' }),
        material({ id: 'm-3', title: 'Week 2 video', section: 'Week 2' }),
      ],
      [`GROUP:${GROUP_A_ID}`]: [material({ id: 'm-4', title: 'Group A seating plan', space: GROUP_A })],
    })
    const { user } = renderRoute('/dashboard/materials')

    expect(await screen.findByRole('heading', { level: 1, name: 'Learning materials' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'General' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['General', 'Week 2', 'Week 3'])
    const week3 = within(screen.getByRole('region', { name: 'Week 3' }))
    expect(week3.getByText('Limits explained')).toBeInTheDocument()
    expect(week3.getByText('Read before Thursday.')).toBeInTheDocument()
    expect(week3.getByRole('link', { name: /Open link/ })).toHaveAttribute('href', 'https://example.com/limits')
    expect(within(screen.getByRole('region', { name: 'General' })).getByText('Ten units this year.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add material' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Group or course'), 'Group: Group A')

    expect(await screen.findByText('Group A seating plan')).toBeInTheDocument()
    expect(screen.queryByText('Limits explained')).not.toBeInTheDocument()
  })

  it('says when the member is in no group or course, and when a space has nothing yet', async () => {
    signInWithRole('STUDENT')
    serveSpaces([])
    serveMaterials({})
    renderRoute('/dashboard/materials')

    expect(await screen.findByText('You are not in a group or course yet.')).toBeInTheDocument()
  })

  it('says when the chosen space has no materials yet', async () => {
    signInWithRole('LECTURER')
    serveSpaces(spacesFor(true))
    serveMaterials({})
    renderRoute('/dashboard/materials')

    expect(await screen.findByText('No materials here yet.')).toBeInTheDocument()
  })
})

describe('learning materials: sharing', () => {
  it('lets a lecturer share a link with the chosen space, and shows it under its section', async () => {
    signInWithRole('LECTURER')
    serveSpaces(spacesFor(true))
    serveMaterials({})
    let sent: unknown = null
    server.use(
      http.post(ORG, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: material({ id: 'm-new', title: 'Limits explained', section: 'Week 3' }) }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/materials')

    await user.click(await screen.findByRole('button', { name: 'Add material' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add material' }))
    await user.click(dialog.getByRole('radio', { name: 'Link' }))
    await user.type(dialog.getByLabelText('Title'), 'Limits explained')
    await user.type(dialog.getByLabelText(/Section/), 'Week 3')
    await user.type(dialog.getByLabelText('Web address'), 'https://example.com/limits')
    await user.click(dialog.getByRole('button', { name: 'Share' }))

    expect(await within(await screen.findByRole('region', { name: 'Week 3' })).findByText('Limits explained')).toBeInTheDocument()
    expect(createMaterialSchema.parse(sent)).toEqual({ kind: 'LINK', space_kind: 'COURSE', space_id: MATH_ID, title: 'Limits explained', description: '', section: 'Week 3', url: 'https://example.com/limits' })
    expect(screen.queryByRole('dialog', { name: 'Add material' })).not.toBeInTheDocument()
  })

  it('shares a note, and checks the fields before sending', async () => {
    signInWithRole('OWNER')
    serveSpaces(spacesFor(true))
    serveMaterials({})
    let sent: unknown = null
    server.use(
      http.post(ORG, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: material({ id: 'm-new', title: 'Bring a calculator', kind: 'NOTE', url: null, body: 'For Thursday.' }) }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/materials')

    await user.click(await screen.findByRole('button', { name: 'Add material' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add material' }))
    await user.click(dialog.getByRole('radio', { name: 'Note' }))
    await user.click(dialog.getByRole('button', { name: 'Share' }))

    expect(await dialog.findByText('Write a title.')).toBeInTheDocument()
    expect(dialog.getByText('Write the note.')).toBeInTheDocument()
    expect(sent).toBeNull()

    await user.type(dialog.getByLabelText('Title'), 'Bring a calculator')
    await user.type(dialog.getByRole('textbox', { name: 'Note' }), 'For Thursday.')
    await user.click(dialog.getByRole('button', { name: 'Share' }))

    expect(await screen.findByText('For Thursday.')).toBeInTheDocument()
    expect(createMaterialSchema.parse(sent)).toMatchObject({ kind: 'NOTE', body: 'For Thursday.', space_kind: 'COURSE' })
  })
})

describe('learning materials: files', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uploads a file with its title and section to the chosen space', async () => {
    signInWithRole('LECTURER')
    serveSpaces(spacesFor(true))
    serveMaterials({})
    let contentType: string | null = null
    let sent = ''
    server.use(
      http.post(`${ORG}/files`, async ({ request }) => {
        contentType = request.headers.get('Content-Type')
        // jsdom's File can't go through the fetch FormData parser, so the multipart body is read as text
        sent = await request.text()
        return HttpResponse.json(
          { data: material({ id: 'm-file', title: 'Week 3 slides', kind: 'FILE', url: null, section: 'Week 3', file: { name: 'slides.pdf', type: 'application/pdf', size: 2_516_582 } }) },
          { status: 201 },
        )
      }),
    )
    const { user } = renderRoute('/dashboard/materials')

    await user.click(await screen.findByRole('button', { name: 'Add material' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add material' }))
    await user.click(dialog.getByRole('radio', { name: 'File' }))
    await user.upload(dialog.getByLabelText(/^File/, { selector: 'input[type="file"]' }), new File(['%PDF-1.7'], 'slides.pdf', { type: 'application/pdf' }))
    await user.type(dialog.getByLabelText('Title'), 'Week 3 slides')
    await user.type(dialog.getByLabelText(/Section/), 'Week 3')
    await user.click(dialog.getByRole('button', { name: 'Share' }))

    const week3 = within(await screen.findByRole('region', { name: 'Week 3' }))
    expect(week3.getByRole('button', { name: 'Download slides.pdf' })).toBeInTheDocument()
    expect(week3.getByText(/2.4 MB/)).toBeInTheDocument()
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/)
    const fieldOf = (name: string) => new RegExp(`name="${name}"\r\n\r\n([^\r]*)\r\n`).exec(sent)?.[1]
    expect(fieldOf('title')).toBe('Week 3 slides')
    expect(fieldOf('section')).toBe('Week 3')
    expect(fieldOf('space_kind')).toBe('COURSE')
    expect(fieldOf('space_id')).toBe(MATH_ID)
    expect(sent).toContain('name="file"; filename="slides.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7')
  })

  it('checks the file’s type and size before sending', async () => {
    signInWithRole('LECTURER')
    serveSpaces(spacesFor(true))
    serveMaterials({})
    const { user } = renderRoute('/dashboard/materials')

    await user.click(await screen.findByRole('button', { name: 'Add material' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add material' }))
    await user.click(dialog.getByRole('radio', { name: 'File' }))
    await user.type(dialog.getByLabelText('Title'), 'Setup')
    await user.click(dialog.getByRole('button', { name: 'Share' }))
    expect(await dialog.findByText('Choose a file to upload.')).toBeInTheDocument()

    await user.upload(dialog.getByLabelText(/^File/, { selector: 'input[type="file"]' }), new File(['<html>'], 'page.pdf', { type: 'text/html' }))
    await user.click(dialog.getByRole('button', { name: 'Share' }))
    expect(await dialog.findByText('Upload a PDF, Word, PowerPoint, Excel, image or plain text file.')).toBeInTheDocument()

    const tooBig = new File(['x'], 'huge.pdf', { type: 'application/pdf' })
    Object.defineProperty(tooBig, 'size', { value: 20 * 1024 * 1024 + 1 })
    await user.upload(dialog.getByLabelText(/^File/, { selector: 'input[type="file"]' }), tooBig)
    await user.click(dialog.getByRole('button', { name: 'Share' }))
    expect(await dialog.findByText('Files must be 20 MB or smaller.')).toBeInTheDocument()
  })

  it('downloads a file with the member’s token and saves it under its name', async () => {
    signInWithRole('STUDENT')
    serveSpaces(spacesFor(false))
    serveMaterials({ [`COURSE:${MATH_ID}`]: [material({ id: 'm-file', title: 'Week 3 slides', kind: 'FILE', url: null, file: { name: 'slides.pdf', type: 'application/pdf', size: 1200 } })] })
    let authorization: string | null = null
    server.use(
      http.get(`${ORG}/m-file/download`, ({ request }) => {
        authorization = request.headers.get('Authorization')
        return new HttpResponse('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } })
      }),
    )
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:slides')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function saveLink(this: HTMLAnchorElement) {
      expect(this.download).toBe('slides.pdf')
      expect(this.href).toBe('blob:slides')
    })
    const { user } = renderRoute('/dashboard/materials')

    await user.click(await screen.findByRole('button', { name: 'Download slides.pdf' }))

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(authorization).toBe('Bearer access-token')
    expect(await createObjectURL.mock.calls[0]?.[0].text()).toBe('%PDF-1.7')
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:slides'), { timeout: 2000 })
  })

  it('shows the server’s reason when a download fails', async () => {
    signInWithRole('STUDENT')
    serveSpaces(spacesFor(false))
    serveMaterials({ [`COURSE:${MATH_ID}`]: [material({ id: 'm-file', title: 'Week 3 slides', kind: 'FILE', url: null, file: { name: 'slides.pdf', type: 'application/pdf', size: 1200 } })] })
    server.use(http.get(`${ORG}/m-file/download`, () => HttpResponse.json({ error: 'This file is no longer stored.' }, { status: 404 })))
    const { user } = renderRoute('/dashboard/materials')

    await user.click(await screen.findByRole('button', { name: 'Download slides.pdf' }))

    expect(await screen.findByText('This file is no longer stored.')).toBeInTheDocument()
  })
})

describe('learning materials: editing and removing', () => {
  const MINE = material({ id: 'm-mine', title: 'Limits explained', section: 'Week 3', description: 'Read first.', can_edit: true, can_remove: true })

  it('lets the author change the title, description and section from the three-dots menu', async () => {
    signInWithRole('LECTURER')
    serveSpaces(spacesFor(true))
    serveMaterials({ [`COURSE:${MATH_ID}`]: [MINE] })
    let sent: unknown = null
    server.use(
      http.put(`${ORG}/m-mine`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: { ...MINE, title: 'Limits, part 2', section: 'Week 4', description: null } })
      }),
    )
    const { user } = renderRoute('/dashboard/materials')

    await user.click(await screen.findByRole('button', { name: 'Actions for Limits explained' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit material' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Edit material' }))
    expect(dialog.getByLabelText('Title')).toHaveValue('Limits explained')
    expect(dialog.getByLabelText(/Description/)).toHaveValue('Read first.')
    expect(dialog.queryByRole('radio')).not.toBeInTheDocument()
    await user.clear(dialog.getByLabelText('Title'))
    await user.type(dialog.getByLabelText('Title'), 'Limits, part 2')
    await user.clear(dialog.getByLabelText(/Description/))
    await user.clear(dialog.getByLabelText(/Section/))
    await user.type(dialog.getByLabelText(/Section/), 'Week 4')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await within(await screen.findByRole('region', { name: 'Week 4' })).findByText('Limits, part 2')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Week 3' })).not.toBeInTheDocument()
    expect(updateMaterialSchema.parse(sent)).toEqual({ title: 'Limits, part 2', description: '', section: 'Week 4' })
  })

  it('removes a material after one confirmation', async () => {
    signInWithRole('LECTURER')
    serveSpaces(spacesFor(true))
    serveMaterials({ [`COURSE:${MATH_ID}`]: [MINE, material({ id: 'm-other', title: 'Syllabus' })] })
    let removedId: string | null = null
    server.use(
      http.delete(`${ORG}/:materialId`, ({ params }) => {
        removedId = String(params.materialId)
        return HttpResponse.json({ data: { id: removedId } })
      }),
    )
    const { user } = renderRoute('/dashboard/materials')

    await user.click(await screen.findByRole('button', { name: 'Actions for Limits explained' }))
    await user.click(screen.getByRole('menuitem', { name: 'Remove material' }))
    await user.click(within(screen.getByRole('group', { name: 'Remove Limits explained' })).getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(screen.queryByText('Limits explained')).not.toBeInTheDocument())
    expect(removedId).toBe('m-mine')
    expect(screen.getByText('Syllabus')).toBeInTheDocument()
  })

  it('offers no menu on materials the member can’t change', async () => {
    signInWithRole('STUDENT')
    serveSpaces(spacesFor(false))
    serveMaterials({ [`COURSE:${MATH_ID}`]: [material({ id: 'm-other', title: 'Syllabus' })] })
    renderRoute('/dashboard/materials')

    expect(await screen.findByText('Syllabus')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument()
  })
})

describe('learning materials: archived groups and courses', () => {
  it('hides Add material in an archived group and says it is read-only', async () => {
    signInWithRole('LECTURER')
    serveSpaces([
      { ...MATH, is_archived: false, can_post: true },
      { ...GROUP_A, is_archived: true, can_post: false },
    ])
    serveMaterials({ [`GROUP:${GROUP_A_ID}`]: [material({ id: 'm-old', title: 'Last year’s notes', space: GROUP_A })] })
    const { user } = renderRoute('/dashboard/materials')

    expect(await screen.findByRole('button', { name: 'Add material' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Group or course'), 'Group: Group A (archived)')

    expect(await screen.findByText('Last year’s notes')).toBeInTheDocument()
    expect(screen.getByText('This group is archived. Its materials stay readable, and nothing new can be added.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add material' })).not.toBeInTheDocument()
  })
})

describe('learning materials: navigation', () => {
  it.each(['LECTURER', 'STUDENT', 'OWNER'] as const)('has a Learning materials link in the %s sidebar', async (role) => {
    signInWithRole(role)
    serveSpaces([])
    serveMaterials({})
    renderRoute('/dashboard/materials')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(await sidebar.findByRole('link', { name: 'Learning materials' })).toHaveAttribute('href', '/dashboard/materials')
  })

  it('opens the page for an admin with the permission, with the link in their sidebar', async () => {
    signInWithRole('ADMIN', ['MANAGE_MATERIALS'])
    serveSpaces([])
    serveMaterials({})
    renderRoute('/dashboard/materials')

    expect(await screen.findByRole('heading', { level: 1, name: 'Learning materials' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Learning materials' })).toHaveAttribute('href', '/dashboard/materials')
  })

  it('sends an admin without the permission back to their dashboard and leaves the link out', async () => {
    signInWithRole('ADMIN')
    server.use(http.get('*/api/organizations/org-1/academic-periods/years', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/materials')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
    expect(sidebar.queryByRole('link', { name: 'Learning materials' })).not.toBeInTheDocument()
  })
})
