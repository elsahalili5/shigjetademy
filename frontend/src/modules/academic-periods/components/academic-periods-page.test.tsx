import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { academicYearSchema } from '@shigjetademy/shared/academic-periods'
import type { AcademicHoliday, AcademicTerm, AcademicYear } from '@shigjetademy/shared/academic-periods'
import type { AuthUser, MemberRole, Permission } from '@shigjetademy/shared/auth'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const YEAR_2026: AcademicYear = {
  id: '9b3e4f65-2f3a-4e77-9c5a-8d3b2e4c3c01',
  name: '2026–27',
  start_date: '2026-09-01',
  end_date: '2027-06-30',
  is_current: true,
  terms: [],
  holidays: [],
}

const YEAR_2027: AcademicYear = {
  id: '9b3e4f65-2f3a-4e77-9c5a-8d3b2e4c3c02',
  name: '2027–28',
  start_date: '2027-09-01',
  end_date: '2028-06-30',
  is_current: false,
  terms: [],
  holidays: [],
}

const YEARS_PATH = '*/api/organizations/org-1/academic-periods/years'

const [OWNER_MEMBERSHIP] = OWNER_MEMBERSHIPS

type SignInParams = {
  role?: MemberRole
  permissions?: Permission[]
  years?: AcademicYear[]
}

const membershipFor = ({ role = 'OWNER', permissions = [] }: SignInParams): AuthUser['memberships'] => [{ ...OWNER_MEMBERSHIP, role, permissions }]

const signInWithYears = (params: SignInParams = {}) => {
  signInAs(buildUser({ memberships: membershipFor(params) }))
  server.use(http.get(YEARS_PATH, () => HttpResponse.json({ data: params.years ?? [YEAR_2026, YEAR_2027] })))
}

const yearsRegion = () => screen.findByRole('region', { name: 'School years' })

const yearRegion = (name: string) => screen.findByRole('region', { name })

const yearNames = async () => within(await yearsRegion()).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)

describe('AcademicPeriodsPage: school years', () => {
  it('opens from the owner’s sidebar and lists the years, the current one first', async () => {
    signInWithYears({ years: [YEAR_2026, YEAR_2027] })
    renderRoute('/dashboard/academic-periods')

    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).getByRole('link', { name: 'Academic periods' })).toHaveAttribute('href', '/dashboard/academic-periods')
    const current = await yearRegion('2026–27')
    expect(current).toHaveTextContent('Current')
    expect(current).toHaveTextContent(/1 Sep 2026.+30 Jun 2027/)
    expect(await yearRegion('2027–28')).not.toHaveTextContent('Current')
    expect(await yearNames()).toEqual(['2026–27', '2027–28'])
  })

  it('opens from the school admin’s flat sidebar', async () => {
    signInWithYears({ role: 'ADMIN' })
    renderRoute('/dashboard/academic-periods')

    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).getByRole('link', { name: 'Academic periods' })).toHaveAttribute('href', '/dashboard/academic-periods')
  })

  it('says when there are no years yet, and adds the first one as current with a suggested name', async () => {
    signInWithYears({ years: [] })
    let sent: unknown = null
    server.use(
      http.post(YEARS_PATH, async ({ request }) => {
        const body = academicYearSchema.parse(await request.json())
        sent = body
        return HttpResponse.json({ data: { ...YEAR_2026, ...body, is_current: true } }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/academic-periods')

    const region = await yearsRegion()
    expect(await within(region).findByText('No academic years yet')).toBeInTheDocument()
    await user.click(within(region).getByRole('button', { name: 'Add year' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a school year' })
    expect(within(dialog).getByRole('checkbox', { name: 'Current year' })).toBeChecked()
    await user.type(within(dialog).getByLabelText('Starts'), '2026-09-01')
    await user.type(within(dialog).getByLabelText('Ends'), '2027-06-30')
    expect(within(dialog).getByLabelText('Name')).toHaveValue('2026–27')
    await user.click(within(dialog).getByRole('button', { name: 'Add year' }))

    expect(await screen.findByText('Added 2026–27.')).toBeInTheDocument()
    expect(sent).toEqual({ name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30', is_current: true })
    expect(await yearRegion('2026–27')).toHaveTextContent('Current')
  })

  it('keeps a name the user typed when the dates change', async () => {
    signInWithYears({ years: [] })
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(await within(await yearsRegion()).findByRole('button', { name: 'Add year' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a school year' })
    await user.type(within(dialog).getByLabelText('Name'), 'Year one')
    await user.type(within(dialog).getByLabelText('Starts'), '2026-09-01')
    await user.type(within(dialog).getByLabelText('Ends'), '2027-06-30')

    expect(within(dialog).getByLabelText('Name')).toHaveValue('Year one')
  })

  it('asks for an end date after the start', async () => {
    signInWithYears({ years: [] })
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(await within(await yearsRegion()).findByRole('button', { name: 'Add year' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a school year' })
    await user.type(within(dialog).getByLabelText('Starts'), '2027-06-30')
    await user.type(within(dialog).getByLabelText('Ends'), '2026-09-01')
    await user.click(within(dialog).getByRole('button', { name: 'Add year' }))

    expect(within(dialog).getByText('End the year after it starts.')).toBeInTheDocument()
  })

  it('shows the server’s message in the form and keeps it open when the year overlaps', async () => {
    signInWithYears()
    server.use(http.post(YEARS_PATH, () => HttpResponse.json({ error: 'These dates overlap 2026–27' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(await within(await yearsRegion()).findByRole('button', { name: 'Add year' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a school year' })
    expect(within(dialog).getByRole('checkbox', { name: 'Current year' })).not.toBeChecked()
    await user.type(within(dialog).getByLabelText('Starts'), '2027-01-01')
    await user.type(within(dialog).getByLabelText('Ends'), '2027-08-31')
    await user.click(within(dialog).getByRole('button', { name: 'Add year' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('These dates overlap 2026–27')
    expect(dialog).toHaveAttribute('open')
  })

  it('starts a reopened add form empty, without the last error', async () => {
    signInWithYears()
    server.use(http.post(YEARS_PATH, () => HttpResponse.json({ error: 'These dates overlap 2026–27' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(await within(await yearsRegion()).findByRole('button', { name: 'Add year' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a school year' })
    await user.type(within(dialog).getByLabelText('Starts'), '2027-01-01')
    await user.type(within(dialog).getByLabelText('Ends'), '2027-08-31')
    await user.click(within(dialog).getByRole('button', { name: 'Add year' }))
    await within(dialog).findByRole('alert')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(within(await yearsRegion()).getByRole('button', { name: 'Add year' }))

    const reopened = screen.getByRole('dialog', { name: 'Add a school year' })
    expect(within(reopened).getByLabelText('Starts')).toHaveValue('')
    expect(within(reopened).getByLabelText('Name')).toHaveValue('')
    expect(within(reopened).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('edits a year', async () => {
    signInWithYears()
    server.use(http.put(`${YEARS_PATH}/${YEAR_2027.id}`, () => HttpResponse.json({ data: { ...YEAR_2027, name: 'Next year' } })))
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await yearRegion('2027–28')).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit 2027–28' })
    expect(within(dialog).getByLabelText('Starts')).toHaveValue('2027-09-01')
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Next year')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Next year.')).toBeInTheDocument()
    expect(await yearNames()).toEqual(['2026–27', 'Next year'])
  })

  it('makes another year current', async () => {
    signInWithYears()
    let sent: unknown = null
    server.use(
      http.put(`${YEARS_PATH}/${YEAR_2027.id}`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: { ...YEAR_2027, is_current: true } })
      }),
    )
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await yearRegion('2027–28')).getByRole('button', { name: 'Make current' }))

    expect(await screen.findByText('2027–28 is now the current year.')).toBeInTheDocument()
    expect(sent).toEqual({ name: '2027–28', start_date: '2027-09-01', end_date: '2028-06-30', is_current: true })
    expect(await yearNames()).toEqual(['2027–28', '2026–27'])
    expect(await yearRegion('2026–27')).not.toHaveTextContent('Current')
  })

  it('shows a toast when making a year current fails', async () => {
    signInWithYears()
    server.use(http.put(`${YEARS_PATH}/${YEAR_2027.id}`, () => HttpResponse.json({ error: 'This organization is suspended' }, { status: 403 })))
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await yearRegion('2027–28')).getByRole('button', { name: 'Make current' }))

    expect(await screen.findByText('This organization is suspended')).toBeInTheDocument()
  })

  it('deletes a year after confirming once, with its terms and holidays', async () => {
    signInWithYears()
    server.use(http.delete(`${YEARS_PATH}/${YEAR_2027.id}`, () => HttpResponse.json({ message: 'Academic year deleted' })))
    const { user } = renderRoute('/dashboard/academic-periods')

    const year = await yearRegion('2027–28')
    await user.click(within(year).getByRole('button', { name: 'Delete' }))
    expect(within(year).getByText('Its terms and holidays are deleted too.')).toBeInTheDocument()
    await user.click(within(year).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Deleted 2027–28.')).toBeInTheDocument()
    expect(await yearNames()).toEqual(['2026–27'])
  })

  it('asks for the new current year before deleting the current one', async () => {
    signInWithYears()
    let newCurrentId: string | null = null
    server.use(
      http.delete(`${YEARS_PATH}/${YEAR_2026.id}`, ({ request }) => {
        newCurrentId = new URL(request.url).searchParams.get('newCurrentId')
        return HttpResponse.json({ message: 'Academic year deleted' })
      }),
    )
    const { user } = renderRoute('/dashboard/academic-periods')

    const year = await yearRegion('2026–27')
    await user.click(within(year).getByRole('button', { name: 'Delete' }))
    expect(within(year).getByRole('button', { name: 'Delete' })).toBeDisabled()
    await user.selectOptions(within(year).getByRole('combobox', { name: 'New current year' }), '2027–28')
    await user.click(within(year).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Deleted 2026–27. 2027–28 is now the current year.')).toBeInTheDocument()
    expect(newCurrentId).toBe(YEAR_2027.id)
    expect(await yearRegion('2027–28')).toHaveTextContent('Current')
  })

  it('deletes the only year without asking for a replacement', async () => {
    signInWithYears({ years: [YEAR_2026] })
    server.use(http.delete(`${YEARS_PATH}/${YEAR_2026.id}`, () => HttpResponse.json({ message: 'Academic year deleted' })))
    const { user } = renderRoute('/dashboard/academic-periods')

    const year = await yearRegion('2026–27')
    await user.click(within(year).getByRole('button', { name: 'Delete' }))
    expect(within(year).queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(within(year).getByRole('button', { name: 'Delete' }))

    expect(await within(await yearsRegion()).findByText('No academic years yet')).toBeInTheDocument()
  })

  it('shows a toast when deleting fails', async () => {
    signInWithYears()
    server.use(http.delete(`${YEARS_PATH}/${YEAR_2027.id}`, () => HttpResponse.json({ error: 'Academic year not found' }, { status: 404 })))
    const { user } = renderRoute('/dashboard/academic-periods')

    const year = await yearRegion('2027–28')
    await user.click(within(year).getByRole('button', { name: 'Delete' }))
    await user.click(within(year).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Academic year not found')).toBeInTheDocument()
  })

  it('lets a school admin with the permission make changes', async () => {
    signInWithYears({ role: 'ADMIN', permissions: ['MANAGE_ACADEMIC_PERIODS'] })
    renderRoute('/dashboard/academic-periods')

    expect(await within(await yearsRegion()).findByRole('button', { name: 'Add year' })).toBeInTheDocument()
    expect(within(await yearRegion('2027–28')).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it.each([
    { role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
    { role: 'LECTURER', permissions: [] },
    { role: 'STUDENT', permissions: [] },
  ] satisfies SignInParams[])('shows a $role without the permission the years without anything to change', async (params) => {
    signInWithYears(params)
    renderRoute('/dashboard/academic-periods')

    expect(await yearRegion('2026–27')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add|Edit|Delete|Make current/ })).not.toBeInTheDocument()
  })

  it('tells read-only members when there are no years yet', async () => {
    signInWithYears({ role: 'LECTURER', years: [] })
    renderRoute('/dashboard/academic-periods')

    const region = await yearsRegion()
    expect(await within(region).findByText('No academic years yet')).toBeInTheDocument()
    expect(within(region).getByText('Your organization hasn’t added any yet.')).toBeInTheDocument()
  })

  it('offers to try again when the years fail to load', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get(YEARS_PATH, () => HttpResponse.json({ error: 'Failed' }, { status: 500 })))
    renderRoute('/dashboard/academic-periods')

    const region = await yearsRegion()
    expect(await within(region).findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(within(region).queryByRole('button', { name: 'Add year' })).not.toBeInTheDocument()
  })

  it('shows a loading skeleton and only offers adding once the years have loaded', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get(YEARS_PATH, () => new Promise<never>(() => {})))
    renderRoute('/dashboard/academic-periods')

    const region = await yearsRegion()
    expect(within(region).getByRole('list', { name: 'Loading' })).toBeInTheDocument()
    expect(within(region).queryByRole('button', { name: 'Add year' })).not.toBeInTheDocument()
  })
})

const AUTUMN_TERM: AcademicTerm = { id: 'a1c2d3e4-0000-4000-8000-000000000001', name: 'Autumn term', start_date: '2026-09-01', end_date: '2027-01-31' }

const SPRING_TERM: AcademicTerm = { id: 'a1c2d3e4-0000-4000-8000-000000000002', name: 'Spring term', start_date: '2027-02-01', end_date: '2027-06-30' }

const TERMS_PATH = `${YEARS_PATH}/${YEAR_2026.id}/terms`

const termsOf = async (yearName: string) => within(await yearRegion(yearName)).getByRole('region', { name: 'Terms' })

describe('AcademicPeriodsPage: terms', () => {
  it('lists each year’s terms under it, in date order', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, terms: [AUTUMN_TERM, SPRING_TERM] }, YEAR_2027] })
    renderRoute('/dashboard/academic-periods')

    const [autumn, spring] = within(await termsOf('2026–27')).getAllByRole('listitem')
    expect(autumn).toHaveTextContent('Autumn term')
    expect(autumn).toHaveTextContent(/1 Sep 2026.+31 Jan 2027/)
    expect(spring).toHaveTextContent('Spring term')
    expect(within(await termsOf('2027–28')).getByText('No terms yet.')).toBeInTheDocument()
  })

  it('adds a term to a year and places it in date order', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, terms: [SPRING_TERM] }] })
    let sent: unknown = null
    server.use(
      http.post(TERMS_PATH, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: AUTUMN_TERM }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await termsOf('2026–27')).getByRole('button', { name: 'Add term' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a term to 2026–27' })
    await user.type(within(dialog).getByLabelText('Name'), 'Autumn term')
    await user.type(within(dialog).getByLabelText('Starts'), '2026-09-01')
    await user.type(within(dialog).getByLabelText('Ends'), '2027-01-31')
    await user.click(within(dialog).getByRole('button', { name: 'Add term' }))

    expect(await screen.findByText('Added Autumn term.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Autumn term', start_date: '2026-09-01', end_date: '2027-01-31' })
    const [first, second] = within(await termsOf('2026–27')).getAllByRole('listitem')
    expect(first).toHaveTextContent('Autumn term')
    expect(second).toHaveTextContent('Spring term')
  })

  it('asks for an end date after the start', async () => {
    signInWithYears({ years: [YEAR_2026] })
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await termsOf('2026–27')).getByRole('button', { name: 'Add term' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a term to 2026–27' })
    await user.type(within(dialog).getByLabelText('Name'), 'Autumn term')
    await user.type(within(dialog).getByLabelText('Starts'), '2026-09-01')
    await user.type(within(dialog).getByLabelText('Ends'), '2026-09-01')
    await user.click(within(dialog).getByRole('button', { name: 'Add term' }))

    expect(within(dialog).getByText('End the term after it starts.')).toBeInTheDocument()
  })

  it('shows the server’s message in the form when the term falls outside its year', async () => {
    signInWithYears({ years: [YEAR_2026] })
    server.use(http.post(TERMS_PATH, () => HttpResponse.json({ error: 'The term must fall inside the year (2026-09-01 to 2027-06-30)' }, { status: 400 })))
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await termsOf('2026–27')).getByRole('button', { name: 'Add term' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a term to 2026–27' })
    await user.type(within(dialog).getByLabelText('Name'), 'Early term')
    await user.type(within(dialog).getByLabelText('Starts'), '2026-08-01')
    await user.type(within(dialog).getByLabelText('Ends'), '2026-12-20')
    await user.click(within(dialog).getByRole('button', { name: 'Add term' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The term must fall inside the year')
    expect(dialog).toHaveAttribute('open')
  })

  it('starts a second added term from an empty form', async () => {
    signInWithYears({ years: [YEAR_2026] })
    server.use(http.post(TERMS_PATH, () => HttpResponse.json({ data: AUTUMN_TERM }, { status: 201 })))
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await termsOf('2026–27')).getByRole('button', { name: 'Add term' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a term to 2026–27' })
    await user.type(within(dialog).getByLabelText('Name'), 'Autumn term')
    await user.type(within(dialog).getByLabelText('Starts'), '2026-09-01')
    await user.type(within(dialog).getByLabelText('Ends'), '2027-01-31')
    await user.click(within(dialog).getByRole('button', { name: 'Add term' }))
    await screen.findByText('Added Autumn term.')
    await user.click(within(await termsOf('2026–27')).getByRole('button', { name: 'Add term' }))

    expect(within(screen.getByRole('dialog', { name: 'Add a term to 2026–27' })).getByLabelText('Name')).toHaveValue('')
  })

  it('edits a term', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, terms: [AUTUMN_TERM] }] })
    server.use(http.put(`${TERMS_PATH}/${AUTUMN_TERM.id}`, () => HttpResponse.json({ data: { ...AUTUMN_TERM, name: 'First term' } })))
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(within(await termsOf('2026–27')).getByRole('listitem')).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Autumn term' })
    expect(within(dialog).getByLabelText('Ends')).toHaveValue('2027-01-31')
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'First term')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved First term.')).toBeInTheDocument()
    expect(within(await termsOf('2026–27')).getByRole('listitem')).toHaveTextContent('First term')
  })

  it('deletes a term after confirming once', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, terms: [AUTUMN_TERM] }] })
    server.use(http.delete(`${TERMS_PATH}/${AUTUMN_TERM.id}`, () => HttpResponse.json({ message: 'Term deleted' })))
    const { user } = renderRoute('/dashboard/academic-periods')

    const row = within(await termsOf('2026–27')).getByRole('listitem')
    await user.click(within(row).getByRole('button', { name: 'Delete' }))
    await user.click(within(row).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Deleted Autumn term.')).toBeInTheDocument()
    expect(within(await termsOf('2026–27')).getByText('No terms yet.')).toBeInTheDocument()
  })

  it('shows a toast when deleting a term fails', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, terms: [AUTUMN_TERM] }] })
    server.use(http.delete(`${TERMS_PATH}/${AUTUMN_TERM.id}`, () => HttpResponse.json({ error: 'Term not found' }, { status: 404 })))
    const { user } = renderRoute('/dashboard/academic-periods')

    const row = within(await termsOf('2026–27')).getByRole('listitem')
    await user.click(within(row).getByRole('button', { name: 'Delete' }))
    await user.click(within(row).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Term not found')).toBeInTheDocument()
  })

  it('shows read-only members the terms without anything to change', async () => {
    signInWithYears({ role: 'LECTURER', years: [{ ...YEAR_2026, terms: [AUTUMN_TERM] }] })
    renderRoute('/dashboard/academic-periods')

    expect(within(await termsOf('2026–27')).getByText('Autumn term')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add|Edit|Delete/ })).not.toBeInTheDocument()
  })
})

const WINTER_BREAK: AcademicHoliday = { id: 'b2d3e4f5-0000-4000-8000-000000000001', name: 'Winter break', start_date: '2026-12-24', end_date: '2027-01-06' }

const INDEPENDENCE_DAY: AcademicHoliday = { id: 'b2d3e4f5-0000-4000-8000-000000000002', name: 'Independence Day', start_date: '2027-02-17', end_date: '2027-02-17' }

const HOLIDAYS_PATH = `${YEARS_PATH}/${YEAR_2026.id}/holidays`

const holidaysOf = async (yearName: string) => within(await yearRegion(yearName)).getByRole('region', { name: 'Holidays' })

describe('AcademicPeriodsPage: holidays', () => {
  it('lists each year’s holidays under it, one day or several', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, holidays: [WINTER_BREAK, INDEPENDENCE_DAY] }, YEAR_2027] })
    renderRoute('/dashboard/academic-periods')

    const [winter, independence] = within(await holidaysOf('2026–27')).getAllByRole('listitem')
    expect(winter).toHaveTextContent('Winter break')
    expect(winter).toHaveTextContent(/24 Dec 2026.+6 Jan 2027/)
    expect(independence).toHaveTextContent('Independence Day17 Feb 2027')
    expect(within(await holidaysOf('2027–28')).getByText('No holidays yet.')).toBeInTheDocument()
  })

  it('writes holiday days in the organization’s date format', async () => {
    const [membership] = membershipFor({})
    signInAs(buildUser({ memberships: [{ ...membership, organization: { ...membership.organization, date_format: 'MONTH_DAY_YEAR' } }] }))
    server.use(http.get(YEARS_PATH, () => HttpResponse.json({ data: [{ ...YEAR_2026, holidays: [INDEPENDENCE_DAY] }] })))
    renderRoute('/dashboard/academic-periods')

    const [independence] = within(await holidaysOf('2026–27')).getAllByRole('listitem')
    expect(independence).toHaveTextContent('Independence DayFeb 17, 2027')
  })

  it('adds a one-day holiday', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, holidays: [WINTER_BREAK] }] })
    let sent: unknown = null
    server.use(
      http.post(HOLIDAYS_PATH, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: INDEPENDENCE_DAY }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await holidaysOf('2026–27')).getByRole('button', { name: 'Add holiday' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a holiday to 2026–27' })
    await user.type(within(dialog).getByLabelText('Name'), 'Independence Day')
    await user.type(within(dialog).getByLabelText('Starts'), '2027-02-17')
    await user.type(within(dialog).getByLabelText('Ends'), '2027-02-17')
    await user.click(within(dialog).getByRole('button', { name: 'Add holiday' }))

    expect(await screen.findByText('Added Independence Day.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Independence Day', start_date: '2027-02-17', end_date: '2027-02-17' })
    const [first, second] = within(await holidaysOf('2026–27')).getAllByRole('listitem')
    expect(first).toHaveTextContent('Winter break')
    expect(second).toHaveTextContent('Independence Day')
  })

  it('refuses a holiday that ends before it starts', async () => {
    signInWithYears({ years: [YEAR_2026] })
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(await holidaysOf('2026–27')).getByRole('button', { name: 'Add holiday' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a holiday to 2026–27' })
    await user.type(within(dialog).getByLabelText('Name'), 'Winter break')
    await user.type(within(dialog).getByLabelText('Starts'), '2027-01-06')
    await user.type(within(dialog).getByLabelText('Ends'), '2026-12-24')
    await user.click(within(dialog).getByRole('button', { name: 'Add holiday' }))

    expect(within(dialog).getByText('A holiday can’t end before it starts.')).toBeInTheDocument()
  })

  it('edits a holiday', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, holidays: [WINTER_BREAK] }] })
    server.use(http.put(`${HOLIDAYS_PATH}/${WINTER_BREAK.id}`, () => HttpResponse.json({ data: { ...WINTER_BREAK, name: 'Winter holidays' } })))
    const { user } = renderRoute('/dashboard/academic-periods')

    await user.click(within(within(await holidaysOf('2026–27')).getByRole('listitem')).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Winter break' })
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Winter holidays')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Winter holidays.')).toBeInTheDocument()
    expect(within(await holidaysOf('2026–27')).getByRole('listitem')).toHaveTextContent('Winter holidays')
  })

  it('deletes a holiday after confirming once', async () => {
    signInWithYears({ years: [{ ...YEAR_2026, holidays: [WINTER_BREAK] }] })
    server.use(http.delete(`${HOLIDAYS_PATH}/${WINTER_BREAK.id}`, () => HttpResponse.json({ message: 'Holiday deleted' })))
    const { user } = renderRoute('/dashboard/academic-periods')

    const row = within(await holidaysOf('2026–27')).getByRole('listitem')
    await user.click(within(row).getByRole('button', { name: 'Delete' }))
    await user.click(within(row).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Deleted Winter break.')).toBeInTheDocument()
    expect(within(await holidaysOf('2026–27')).getByText('No holidays yet.')).toBeInTheDocument()
  })

  it('shows read-only members the holidays without anything to change', async () => {
    signInWithYears({ role: 'GUARDIAN', years: [{ ...YEAR_2026, holidays: [WINTER_BREAK] }] })
    renderRoute('/dashboard/academic-periods')

    expect(within(await holidaysOf('2026–27')).getByText('Winter break')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add|Edit|Delete/ })).not.toBeInTheDocument()
  })
})
