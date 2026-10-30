import { useState } from 'react'
import { AlertCircle, ArrowLeft, Mail, RotateCw } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { ClientOrganizationDetail } from '@shigjetademy/shared/organization'
import { isApiError } from '#/api/client'
import { getApiErrorMessage } from '#/lib/api-error-message'
import { initials } from '#/lib/initials'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { useClient } from '../hooks/use-client'
import { useUpdateClientStatus } from '../hooks/use-update-client-status'
import { formatDate, regionNames } from '../utils/format'
import { ORGANIZATION_TYPE_LABELS } from '../utils/labels'
import { ClientStatusChip } from './client-status-chip'

// A malformed id is refused with 400; to the admin it is as missing as an unknown one
const NOT_FOUND_STATUSES = [400, 404]

const currencyNames = new Intl.DisplayNames(undefined, { type: 'currency' })

interface ClientDetailProps {
  organizationId: string
}

export function ClientDetail({ organizationId }: ClientDetailProps) {
  const client = useClient(organizationId)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <div className="px-[clamp(20px,3.4vw,44px)] pt-5">
        <Link to="/dashboard/$module" params={{ module: 'clients' }} className="inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-ink-2 no-underline hover:text-ink">
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          All clients
        </Link>
      </div>
      <ClientDetailBody query={client} />
    </div>
  )
}

interface ClientDetailBodyProps {
  query: ReturnType<typeof useClient>
}

function ClientDetailBody({ query }: ClientDetailBodyProps) {
  if (query.isPending) {
    return <ClientDetailSkeleton />
  }

  if (query.isError) {
    const isNotFound = isApiError(query.error) && NOT_FOUND_STATUSES.includes(query.error.response?.status ?? 0)
    return (
      <div className="grid justify-items-center gap-3 px-8 py-20 text-center" role="alert">
        <AlertCircle className="text-coral-deep" size={28} strokeWidth={1.8} aria-hidden="true" />
        <p className="font-semibold">{isNotFound ? 'Client not found.' : 'We couldn’t load this client.'}</p>
        {isNotFound ? null : (
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={() => void query.refetch()}>
            <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    )
  }

  return <ClientProfile client={query.data} />
}

interface ClientProfileProps {
  client: ClientOrganizationDetail
}

function ClientProfile({ client }: ClientProfileProps) {
  return (
    <>
      <header className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-5 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="grid size-14 flex-none place-items-center rounded-2xl bg-kraft-wash font-display text-xl font-bold text-kraft-ink" aria-hidden="true">
              {initials(client.name)}
            </span>
            <div>
              <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">{client.name}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-2.5 text-ink-2">
                {ORGANIZATION_TYPE_LABELS[client.type]} · {regionNames.of(client.country)}
                <ClientStatusChip status={client.status} />
              </p>
            </div>
          </div>
          <StatusControl client={client} />
        </div>
      </header>

      <div className="grid max-w-[980px] gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <dl className="grid grid-cols-4 gap-3 rounded-card border border-rule p-5 max-[900px]:grid-cols-2">
          <Fact label="Joined" value={formatDate(client.created_at)} />
          <Fact label="Currency" value={`${client.currency} · ${currencyNames.of(client.currency) ?? ''}`} />
          <Fact label="Size" value={client.size ?? 'Not given'} />
          <Fact label="Members" value={String(client.members.length)} />
        </dl>

        <section className="rounded-card border border-rule p-5" aria-labelledby="members-title">
          <h2 id="members-title" className="mb-3 text-[1.2rem] font-[650]">
            Members
          </h2>
          <ul className="grid">
            {client.members.map((member) => (
              <li key={member.membership_id} className="flex items-center gap-3 border-b border-rule py-3 last:border-b-0">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-green-wash text-[0.9rem] font-bold text-green-deep" aria-hidden="true">
                  {initials(`${member.first_name} ${member.last_name}`)}
                </span>
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-semibold">
                    {member.first_name} {member.last_name}
                  </span>
                  <span className="truncate text-[0.87rem] text-ink-3">{member.email}</span>
                </span>
                <span className="chip chip--navy">{ROLE_LABELS[member.role]}</span>
                <span className="tabular w-[7.5rem] text-right text-[0.9rem] text-ink-3 max-[700px]:hidden">Joined {formatDate(member.joined_at)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-card border border-rule p-5" aria-labelledby="invitations-title">
          <h2 id="invitations-title" className="mb-3 text-[1.2rem] font-[650]">
            Pending invitations
          </h2>
          {client.pending_invitations.length > 0 ? (
            <ul className="grid">
              {client.pending_invitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center gap-3 border-b border-rule py-3 last:border-b-0">
                  <Mail className="flex-none text-ink-3" size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{invitation.email}</span>
                  <span className="chip chip--kraft">{ROLE_LABELS[invitation.role]}</span>
                  <span className="tabular text-[0.9rem] text-ink-3 max-[700px]:hidden">Expires {formatDate(invitation.expires_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.95rem] text-ink-3">No open invitations.</p>
          )}
        </section>
      </div>
    </>
  )
}

interface FactProps {
  label: string
  value: string
}

function Fact({ label, value }: FactProps) {
  return (
    <div>
      <dt className="text-[0.87rem] font-semibold text-ink-3">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  )
}

interface StatusControlProps {
  client: ClientOrganizationDetail
}

function StatusControl({ client }: StatusControlProps) {
  const updateStatus = useUpdateClientStatus()
  const [isConfirming, setIsConfirming] = useState(false)

  const handleSuspend = () => {
    updateStatus.mutate({ organizationId: client.id, status: 'SUSPENDED' }, { onSuccess: () => setIsConfirming(false) })
  }

  // A failed attempt's error shouldn't follow the admin into the next try
  const handleOpenConfirm = () => {
    updateStatus.reset()
    setIsConfirming(true)
  }

  const handleCancel = () => {
    updateStatus.reset()
    setIsConfirming(false)
  }

  const handleReactivate = () => {
    updateStatus.mutate({ organizationId: client.id, status: 'ACTIVE' })
  }

  const errorMessage = updateStatus.isError ? getApiErrorMessage(updateStatus.error, 'We couldn’t change this client’s status. Please try again.') : null

  if (client.status === 'DEACTIVATED') {
    return <p className="max-w-[28ch] text-[0.95rem] text-ink-3">The owner deactivated this organization.</p>
  }

  if (client.status === 'SUSPENDED') {
    return (
      <div className="grid justify-items-end gap-2">
        <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={handleReactivate} disabled={updateStatus.isPending}>
          {updateStatus.isPending ? 'Reactivating…' : 'Reactivate'}
        </button>
        {errorMessage ? <StatusError>{errorMessage}</StatusError> : null}
      </div>
    )
  }

  if (isConfirming) {
    return (
      <div className="grid max-w-[34ch] gap-3 rounded-card border border-coral-wash bg-white p-4" role="group" aria-label="Confirm suspension">
        <p className="text-[0.95rem]">
          Suspend <strong>{client.name}</strong>? Its members lose access until you reactivate it.
        </p>
        <div className="flex gap-2">
          <button type="button" className="button min-h-10 bg-coral-deep px-4 text-base text-white" onClick={handleSuspend} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? 'Suspending…' : 'Suspend'}
          </button>
          <button type="button" className="button button--ghost min-h-10 px-4 text-base" onClick={handleCancel} disabled={updateStatus.isPending}>
            Cancel
          </button>
        </div>
        {errorMessage ? <StatusError>{errorMessage}</StatusError> : null}
      </div>
    )
  }

  return (
    <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={handleOpenConfirm}>
      Suspend client
    </button>
  )
}

interface StatusErrorProps {
  children: string
}

function StatusError({ children }: StatusErrorProps) {
  return (
    <p className="flex items-center gap-1.5 text-[0.93rem] font-[550] text-coral-deep" role="alert">
      <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
      {children}
    </p>
  )
}

function ClientDetailSkeleton() {
  return (
    <div className="grid gap-5 px-[clamp(20px,3.4vw,44px)] pt-5" aria-busy="true" aria-label="Loading client">
      <div className="flex items-center gap-4">
        <span className="size-14 animate-pulse rounded-2xl bg-mist" />
        <span className="grid gap-2">
          <span className="h-7 w-64 animate-pulse rounded bg-mist" />
          <span className="h-4 w-40 animate-pulse rounded bg-mist" />
        </span>
      </div>
      <div className="h-[88px] max-w-[980px] animate-pulse rounded-card bg-mist" />
      <div className="h-[260px] max-w-[980px] animate-pulse rounded-card bg-mist" />
    </div>
  )
}
