import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ACTIVITY_PAGE_SIZE } from '@shigjetademy/shared/activity'
import type { ActivityAction, ActivityEntry } from '@shigjetademy/shared/activity'
import type { ClientOrganization } from '@shigjetademy/shared/organization'
import { buildUser, PLATFORM_ADMIN_ROLES, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ADMIN = { id: 'admin-1', first_name: 'Platform', last_name: 'Admin', email: 'admin@platform.test' }
const ELSA = { id: 'user-2', first_name: 'Elsa', last_name: 'Halili', email: 'elsa@oxford.test' }
const ARTA = { id: 'user-3', first_name: 'Arta', last_name: 'Gashi', email: 'arta@yllka.test' }

const ENTRIES: ActivityEntry[] = [
  { id: 'a-3', action: 'ACCOUNT_LOCKED', created_at: '2026-10-03T09:00:00.000Z', actor: null, organization: null, target_user: ARTA, subject_name: null },
  { id: 'a-2', action: 'PASSWORD_CHANGED', created_at: '2026-10-02T09:00:00.000Z', actor: ELSA, organization: null, target_user: ELSA, subject_name: null },
  {
    id: 'a-1',
    action: 'ORGANIZATION_SUSPENDED',
    created_at: '2026-10-01T09:00:00.000Z',
    actor: ADMIN,
    organization: { id: 'org-1', name: 'Oxford Academy' },
    target_user: null,
    subject_name: null,
  },
]

const CLIENTS: ClientOrganization[] = [
  {
    id: 'org-1',
    name: 'Oxford Academy',
    type: 'ACADEMY',
    country: 'XK',
    status: 'SUSPENDED',
    created_at: '2026-09-01T09:00:00.000Z',
    owner: ELSA,
    member_counts: { OWNER: 1, ADMIN: 0, LECTURER: 0, STUDENT: 0, GUARDIAN: 0 },
  },
]

/** Answers like the API: the filters in the query string narrow the entries */
const serveActivity = (requests: URLSearchParams[] = []) =>
  server.use(
    http.get('*/api/organizations', () => HttpResponse.json({ data: CLIENTS })),
    http.get('*/api/activity', ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const organizationId = params.get('organizationId')
      const action = params.get('action')
      const entries = ENTRIES.filter(
        (entry) => (!organizationId || entry.organization?.id === organizationId) && (!action || entry.action === action),
      )
      return HttpResponse.json({ data: entries })
    }),
  )

describe('ActivityModule', () => {
  it('is in the admin sidebar and lists entries as sentences, newest first', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    serveActivity()
    renderRoute('/dashboard/activity')

    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).getByRole('link', { name: 'Activity' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Activity' })).toBeInTheDocument()

    const list = await screen.findByRole('list', { name: 'Activity' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Arta Gashi’s account was locked after too many failed logins')
    expect(rows[1]).toHaveTextContent('Elsa Halili changed their password')
    expect(rows[2]).toHaveTextContent('Platform Admin suspended Oxford Academy')
    expect(within(rows[2]).getByRole('link', { name: 'Oxford Academy' })).toHaveAttribute('href', '/dashboard/clients/org-1')
  })

  it('names the client in location and department sentences', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    const oxford = { id: 'org-1', name: 'Oxford Academy' }
    const base = { created_at: '2026-10-04T09:00:00.000Z', actor: ELSA, organization: oxford, target_user: null }
    server.use(
      http.get('*/api/organizations', () => HttpResponse.json({ data: CLIENTS })),
      http.get('*/api/activity', () =>
        HttpResponse.json({
          data: [
            { ...base, id: 'a-5', action: 'LOCATION_CREATED', subject_name: 'Main campus' },
            { ...base, id: 'a-4', action: 'DEPARTMENT_REMOVED', subject_name: 'Sciences' },
          ],
        }),
      ),
    )
    renderRoute('/dashboard/activity')

    const [location, department] = await within(await screen.findByRole('list', { name: 'Activity' })).findAllByRole('listitem')
    expect(location).toHaveTextContent('Elsa Halili added the location Main campus at Oxford Academy')
    expect(within(location).getByRole('link', { name: 'Oxford Academy' })).toHaveAttribute('href', '/dashboard/clients/org-1')
    expect(department).toHaveTextContent('Elsa Halili removed the department Sciences at Oxford Academy')
  })

  it('shows academic period changes as sentences that name the client', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    const oxford = { id: 'org-1', name: 'Oxford Academy' }
    const entries: [ActivityAction, string][] = [
      ['ACADEMIC_YEAR_CREATED', '2026–27'],
      ['ACADEMIC_YEAR_UPDATED', '2026–27'],
      ['ACADEMIC_YEAR_REMOVED', '2025–26'],
      ['ACADEMIC_TERM_CREATED', 'Autumn term'],
      ['ACADEMIC_TERM_UPDATED', 'Autumn term'],
      ['ACADEMIC_TERM_REMOVED', 'Spring term'],
      ['ACADEMIC_HOLIDAY_CREATED', 'Winter break'],
      ['ACADEMIC_HOLIDAY_UPDATED', 'Winter break'],
      ['ACADEMIC_HOLIDAY_REMOVED', 'Independence Day'],
    ]
    server.use(
      http.get('*/api/organizations', () => HttpResponse.json({ data: CLIENTS })),
      http.get('*/api/activity', () =>
        HttpResponse.json({
          data: entries.map(([action, subjectName]) => ({
            id: action,
            action,
            created_at: '2026-10-04T09:00:00.000Z',
            actor: ELSA,
            organization: oxford,
            target_user: null,
            subject_name: subjectName,
          })),
        }),
      ),
    )
    renderRoute('/dashboard/activity')

    const rows = await within(await screen.findByRole('list', { name: 'Activity' })).findAllByRole('listitem')
    const sentences = [
      'Elsa Halili added the school year 2026–27 at Oxford Academy',
      'Elsa Halili changed the school year 2026–27 at Oxford Academy',
      'Elsa Halili removed the school year 2025–26 at Oxford Academy',
      'Elsa Halili added the term Autumn term at Oxford Academy',
      'Elsa Halili changed the term Autumn term at Oxford Academy',
      'Elsa Halili removed the term Spring term at Oxford Academy',
      'Elsa Halili added the holiday Winter break at Oxford Academy',
      'Elsa Halili changed the holiday Winter break at Oxford Academy',
      'Elsa Halili removed the holiday Independence Day at Oxford Academy',
    ]
    expect(rows).toHaveLength(sentences.length)
    sentences.forEach((sentence, index) => expect(rows[index]).toHaveTextContent(sentence))
  })

  it('shows student record changes as sentences that name the client', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    const oxford = { id: 'org-1', name: 'Oxford Academy' }
    const actions: ActivityAction[] = ['STUDENT_ADDED', 'STUDENT_UPDATED', 'STUDENT_ARCHIVED', 'STUDENT_RESTORED']
    server.use(
      http.get('*/api/organizations', () => HttpResponse.json({ data: CLIENTS })),
      http.get('*/api/activity', () =>
        HttpResponse.json({
          data: actions.map((action) => ({ id: action, action, created_at: '2026-10-04T09:00:00.000Z', actor: ELSA, organization: oxford, target_user: null, subject_name: 'Arta Gashi' })),
        }),
      ),
    )
    renderRoute('/dashboard/activity')

    const rows = await within(await screen.findByRole('list', { name: 'Activity' })).findAllByRole('listitem')
    const sentences = [
      'Elsa Halili added the student Arta Gashi at Oxford Academy',
      'Elsa Halili changed the student Arta Gashi at Oxford Academy',
      'Elsa Halili archived the student Arta Gashi at Oxford Academy',
      'Elsa Halili restored the student Arta Gashi at Oxford Academy',
    ]
    expect(rows).toHaveLength(sentences.length)
    sentences.forEach((sentence, index) => expect(rows[index]).toHaveTextContent(sentence))
  })

  it('asks the API for one client or one action and offers to clear the filters', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    const requests: URLSearchParams[] = []
    serveActivity(requests)
    const { user } = renderRoute('/dashboard/activity')
    await screen.findByText(/changed their password/)

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter by client' }), 'Oxford Academy')
    expect(await screen.findByText(/Platform Admin suspended/)).toBeInTheDocument()
    expect(screen.queryByText(/changed their password/)).not.toBeInTheDocument()
    expect(requests.at(-1)?.get('organizationId')).toBe('org-1')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by action' }), 'Password changed')
    expect(await screen.findByText('No activity matches these filters.')).toBeInTheDocument()
    expect(requests.at(-1)?.get('action')).toBe('PASSWORD_CHANGED')

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText(/changed their password/)).toBeInTheDocument()
  })

  it('shows an empty state before anything has happened', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    server.use(
      http.get('*/api/organizations', () => HttpResponse.json({ data: CLIENTS })),
      http.get('*/api/activity', () => HttpResponse.json({ data: [] })),
    )
    renderRoute('/dashboard/activity')

    expect(await screen.findByText('No activity yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('loads older entries after a full page', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    const fullPage = Array.from({ length: ACTIVITY_PAGE_SIZE }, (_, index) => ({ ...ENTRIES[1], id: `page-${index}` }))
    const oldest = { ...ENTRIES[2], created_at: '2026-09-01T09:00:00.000Z' }
    server.use(
      http.get('*/api/organizations', () => HttpResponse.json({ data: CLIENTS })),
      http.get('*/api/activity', ({ request }) => {
        const params = new URL(request.url).searchParams
        const isNextPage = params.get('before') === ENTRIES[1].created_at && params.get('beforeId') === fullPage.at(-1)?.id
        return HttpResponse.json({ data: isNextPage ? [oldest] : fullPage })
      }),
    )
    const { user } = renderRoute('/dashboard/activity')

    await user.click(await screen.findByRole('button', { name: 'Load more' }))

    expect(await screen.findByText(/Platform Admin suspended/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })
})
