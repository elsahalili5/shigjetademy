import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Building2, Search } from 'lucide-react'
import { MEMBER_ROLES } from '@shigjetademy/shared/auth'
import type { ClientOrganization, OrganizationStatus, OrganizationTypeValue } from '@shigjetademy/shared/organization'
import { useFormatDate } from '#/lib/use-format-date'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import { initials } from '#/lib/initials'
import { useClients } from '../hooks/use-clients'
import { regionNames } from '../utils/format'
import { MEMBER_ROLE_NOUNS, ORGANIZATION_TYPE_LABELS } from '../utils/labels'
import { ClientStatusChip } from './client-status-chip'

type StatusFilter = 'ALL' | OrganizationStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
]

const SKELETON_ROWS = 6

const numberFormat = new Intl.NumberFormat()

const isOrganizationTypeValue = (value: string): value is OrganizationTypeValue => value in ORGANIZATION_TYPE_LABELS

const totalMembers = (client: ClientOrganization) => Object.values(client.member_counts).reduce((sum, count) => sum + count, 0)

/** "1 owner · 3 lecturers · 40 students", leaving out roles nobody holds */
const describeMembers = (client: ClientOrganization) =>
  MEMBER_ROLES.map((role) => ({ nouns: MEMBER_ROLE_NOUNS[role], count: client.member_counts[role] }))
    .filter(({ count }) => count > 0)
    .map(({ nouns, count }) => `${numberFormat.format(count)} ${count === 1 ? nouns.one : nouns.other}`)
    .join(' · ')

/** Clients: every organization on the platform, for the platform admin. */
export function ClientsModule() {
  const clients = useClients()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [query, setQuery] = useState('')
  const [type, setType] = useState<OrganizationTypeValue | ''>('')

  const allClients = clients.data ?? []
  const needle = query.trim().toLowerCase()
  const matchesSearch = (client: ClientOrganization) =>
    (!type || client.type === type) &&
    (!needle ||
      client.name.toLowerCase().includes(needle) ||
      (client.owner?.email.toLowerCase().includes(needle) ?? false) ||
      (client.owner ? `${client.owner.first_name} ${client.owner.last_name}`.toLowerCase().includes(needle) : false))
  const searched = allClients.filter(matchesSearch)
  const visible = searched.filter((client) => statusFilter === 'ALL' || client.status === statusFilter)
  const countFor = (value: StatusFilter) => (value === 'ALL' ? searched.length : searched.filter((client) => client.status === value).length)
  const membersTotal = allClients.reduce((sum, client) => sum + totalMembers(client), 0)

  const handleTypeChange = (value: string) => {
    setType(isOrganizationTypeValue(value) ? value : '')
  }

  const handleClearFilters = () => {
    setStatusFilter('ALL')
    setQuery('')
    setType('')
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader
        icon={Building2}
        title="Clients"
        subtitle={
          clients.isSuccess
            ? `${numberFormat.format(allClients.length)} ${allClients.length === 1 ? 'organization' : 'organizations'} · ${numberFormat.format(membersTotal)} ${membersTotal === 1 ? 'member' : 'members'}`
            : 'Every organization on Shigjetademy'
        }
      >
        {/* Full width, so the filters wrap onto their own row under the title */}
        <div className="mt-2 flex w-full flex-wrap items-center gap-3">
          <div className="flex max-w-full overflow-x-auto rounded-full bg-mist p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by status">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={statusFilter === filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className="inline-flex min-h-9 flex-none items-center gap-2 rounded-full px-3.5 text-[0.95rem] font-semibold text-ink-2 transition-[background-color,color,box-shadow] duration-200 hover:text-ink aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgba(22,34,46,0.08),0_4px_10px_-6px_rgba(22,34,46,0.3)]"
              >
                {filter.label}
                <span className="tabular text-[0.85rem] text-ink-3">{countFor(filter.value)}</span>
              </button>
            ))}
          </div>

          <label className="relative ml-auto flex min-w-[220px] flex-1 items-center max-[700px]:ml-0 min-[1100px]:max-w-[320px]">
            <span className="sr-only">Search clients</span>
            <Search className="pointer-events-none absolute left-3.5 text-ink-3" size={17} strokeWidth={2} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or owner"
              className="min-h-11 w-full rounded-full border border-rule-strong bg-white pr-4 pl-10 text-[0.98rem] transition-[border-color,box-shadow] duration-200 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
            />
          </label>

          <label className="flex items-center">
            <span className="sr-only">Filter by type</span>
            <select
              value={type}
              onChange={(event) => handleTypeChange(event.target.value)}
              className="min-h-11 cursor-pointer rounded-full border border-rule-strong bg-white px-4 text-[0.98rem] font-medium transition-[border-color,box-shadow] duration-200 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
            >
              <option value="">All types</option>
              {Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </DashboardPageHeader>

      <div className="px-[clamp(20px,3.4vw,44px)] pb-8">
        <ClientsTable
          status={clients.status}
          clients={visible}
          hasClients={allClients.length > 0}
          onRetry={() => void clients.refetch()}
          onClearFilters={handleClearFilters}
        />
      </div>
    </div>
  )
}

interface ClientsTableProps {
  status: 'pending' | 'error' | 'success'
  clients: ClientOrganization[]
  hasClients: boolean
  onRetry: () => void
  onClearFilters: () => void
}

function ClientsTable({ status, clients, hasClients, onRetry, onClearFilters }: ClientsTableProps) {
  if (status === 'error') {
    return <LoadError what="clients" onRetry={onRetry} />
  }

  if (status === 'success' && clients.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 py-16 text-center">
        <Building2 className="text-ink-3" size={28} strokeWidth={1.6} aria-hidden="true" />
        <p className="font-semibold">{hasClients ? 'No clients match these filters.' : 'No organizations have signed up yet.'}</p>
        {hasClients ? (
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onClearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <table className="w-full border-collapse text-left" aria-busy={status === 'pending'}>
      <thead className="sticky top-0 z-10 bg-white">
        <tr className="text-[0.87rem] text-ink-3 [&>th]:border-b [&>th]:border-rule [&>th]:py-3 [&>th]:pr-4 [&>th]:font-semibold">
          <th scope="col">Organization</th>
          <th scope="col" className="max-[900px]:hidden">
            Owner
          </th>
          <th scope="col">Members</th>
          <th scope="col">Status</th>
          <th scope="col" className="max-[700px]:hidden">
            Joined
          </th>
        </tr>
      </thead>
      <tbody>
        {status === 'pending'
          ? Array.from({ length: SKELETON_ROWS }, (_, index) => <SkeletonRow key={index} />)
          : clients.map((client) => <ClientRow key={client.id} client={client} />)}
      </tbody>
    </table>
  )
}

interface ClientRowProps {
  client: ClientOrganization
}

function ClientRow({ client }: ClientRowProps) {
  const formatDate = useFormatDate()
  const members = totalMembers(client)
  return (
    // The name link stretches over the whole row, so any cell opens the client
    <tr className="relative transition-colors duration-150 hover:bg-mist [&>td]:border-b [&>td]:border-rule [&>td]:py-3 [&>td]:pr-4">
      <td>
        <span className="flex items-center gap-3">
          <span className="grid size-10 flex-none place-items-center rounded-[10px] bg-kraft-wash font-display font-bold text-kraft-ink" aria-hidden="true">
            {initials(client.name)}
          </span>
          <span className="grid min-w-0 leading-tight">
            <Link
              to="/dashboard/clients/$organizationId"
              params={{ organizationId: client.id }}
              className="font-semibold text-ink no-underline after:absolute after:inset-0 hover:underline"
            >
              {client.name}
            </Link>
            <span className="text-[0.87rem] text-ink-3">
              {ORGANIZATION_TYPE_LABELS[client.type]} · {regionNames.of(client.country)}
            </span>
          </span>
        </span>
      </td>
      <td className="max-[900px]:hidden">
        {client.owner ? (
          <span className="grid leading-tight">
            <span className="text-[0.95rem] text-ink">
              {client.owner.first_name} {client.owner.last_name}
            </span>
            <span className="text-[0.87rem] text-ink-3">{client.owner.email}</span>
          </span>
        ) : (
          <span className="text-[0.95rem] text-ink-3">No owner</span>
        )}
      </td>
      <td>
        <span className="grid leading-tight">
          <span className="tabular font-semibold text-ink">{numberFormat.format(members)}</span>
          <span className="text-[0.87rem] text-ink-3">{describeMembers(client)}</span>
        </span>
      </td>
      <td>
        <ClientStatusChip status={client.status} />
      </td>
      <td className="tabular text-[0.95rem] whitespace-nowrap text-ink-2 max-[700px]:hidden">{formatDate(client.created_at)}</td>
    </tr>
  )
}

function SkeletonRow() {
  return (
    <tr className="[&>td]:border-b [&>td]:border-rule [&>td]:py-3 [&>td]:pr-4" aria-hidden="true">
      <td>
        <span className="flex items-center gap-3">
          <span className="size-10 flex-none animate-pulse rounded-[10px] bg-mist" />
          <span className="grid gap-1.5">
            <span className="h-3.5 w-40 animate-pulse rounded bg-mist" />
            <span className="h-3 w-24 animate-pulse rounded bg-mist" />
          </span>
        </span>
      </td>
      <td className="max-[900px]:hidden">
        <span className="block h-3.5 w-36 animate-pulse rounded bg-mist" />
      </td>
      <td>
        <span className="block h-3.5 w-16 animate-pulse rounded bg-mist" />
      </td>
      <td>
        <span className="block h-6 w-16 animate-pulse rounded-full bg-mist" />
      </td>
      <td className="max-[700px]:hidden">
        <span className="block h-3.5 w-20 animate-pulse rounded bg-mist" />
      </td>
    </tr>
  )
}
