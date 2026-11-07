import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { GraduationCap, Plus, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getLecturerName, LECTURER_STATUSES } from '@shigjetademy/shared/lecturers'
import type { Lecturer, LecturerStatus } from '@shigjetademy/shared/lecturers'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import { NoticeBar } from '#/components/NoticeBar'
import type { Notice } from '#/components/NoticeBar'
import { showErrorToast } from '#/lib/error-toast'
import { useDepartments } from '#/modules/locations/hooks/use-departments'
import { useLocations } from '#/modules/locations/hooks/use-locations'
import { useLecturerInvitationAction } from '../hooks/use-lecturer-invitation-action'
import { useDebouncedSearch } from '#/lib/use-debounced-search'
import { useLecturers } from '../hooks/use-lecturers'
import type { LoadedLecturers } from '../hooks/use-lecturers'
import { useSetLecturerStatus } from '../hooks/use-set-lecturer-status'
import { useSubjects } from '../hooks/use-subjects'
import { LecturerActions } from './lecturer-actions'
import type { LecturerInvitationChange, LecturerStatusChange } from './lecturer-actions'
import { LecturerDialog } from './lecturer-dialog'
import type { LecturerDialogMode, LecturerFormOptions } from './lecturer-dialog'
import { LecturerFilters } from './lecturer-filters'
import { LecturerInviteDialog } from './lecturer-invite-dialog'
import type { LecturerInviteTarget } from './lecturer-invite-dialog'
import type { LecturerPlaceFilters } from './lecturer-filters'
import { LecturerTable } from './lecturer-table'
import { SkeletonRows } from './skeleton-rows'

const STATUS_TAB_LABELS = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
} as const satisfies Record<LecturerStatus, string>

const NO_FILTERS: LecturerPlaceFilters = { locationId: '', departmentId: '', subject: '' }

const countFormatter = new Intl.NumberFormat()

interface LecturersPageProps {
  organizationId: string
  organizationName: string
}

/** The organization's lecturer records: search, filters, active and archived tabs, and adding, editing and archiving */
export function LecturersPage({ organizationId, organizationName }: LecturersPageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inviteDialogRef = useRef<HTMLDialogElement>(null)
  const searchId = useId()
  const lecturerSearch = useDebouncedSearch()
  const [status, setStatus] = useState<LecturerStatus>('ACTIVE')
  const [placeFilters, setPlaceFilters] = useState<LecturerPlaceFilters>(NO_FILTERS)
  const lecturers = useLecturers({ organizationId, search: lecturerSearch.search, status, ...placeFilters })
  const locations = useLocations(organizationId)
  const departments = useDepartments(organizationId)
  const subjects = useSubjects(organizationId)
  const setLecturerStatus = useSetLecturerStatus(organizationId)
  const lecturerInvitation = useLecturerInvitationAction(organizationId)
  const [inviteTarget, setInviteTarget] = useState<LecturerInviteTarget | null>(null)
  const [dialogMode, setDialogMode] = useState<LecturerDialogMode>({ kind: 'add', openCount: 0 })
  const [notice, setNotice] = useState<Notice | null>(null)

  const formOptions: LecturerFormOptions = { locations: locations.data ?? [], departments: departments.data ?? [], subjects: subjects.data ?? [] }
  const isFiltered = !!lecturerSearch.search || Object.values(placeFilters).some(Boolean)

  const handleAdd = () => {
    setDialogMode((current) => ({ kind: 'add', openCount: current.kind === 'add' ? current.openCount + 1 : 0 }))
    dialogRef.current?.showModal()
  }

  const handleEdit = (lecturer: Lecturer) => {
    setDialogMode({ kind: 'edit', lecturer })
    dialogRef.current?.showModal()
  }

  const handleSaved = (saved: Lecturer) => {
    const name = getLecturerName(saved)
    setNotice({ tone: 'success', text: dialogMode.kind === 'add' ? `Added ${name}.` : `Saved ${name}.` })
  }

  const handleSetStatus = ({ lecturer, status: nextStatus }: LecturerStatusChange) => {
    const name = getLecturerName(lecturer)
    setLecturerStatus.mutate(
      { lecturerId: lecturer.id, status: nextStatus },
      {
        onSuccess: () => setNotice({ tone: 'success', text: nextStatus === 'ARCHIVED' ? `Archived ${name}.` : `Restored ${name}.` }),
        onError: showErrorToast,
      },
    )
  }

  const handleInvite = (lecturer: Lecturer) => {
    setInviteTarget((current) => ({ lecturer, openCount: (current?.openCount ?? 0) + 1 }))
    inviteDialogRef.current?.showModal()
  }

  const handleInvited = (invited: Lecturer) => {
    setNotice({ tone: 'success', text: `Sent an invitation to ${invited.invitation?.email ?? getLecturerName(invited)}.` })
  }

  const handleChangeInvitation = ({ lecturer, action }: LecturerInvitationChange) => {
    const email = lecturer.invitation?.email ?? getLecturerName(lecturer)
    lecturerInvitation.mutate(
      { lecturerId: lecturer.id, action },
      {
        onSuccess: () => toast.success(action === 'RESEND' ? `Sent a new link to ${email}. The old one no longer works.` : `Withdrew the invitation to ${email}.`),
        onError: showErrorToast,
      },
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={GraduationCap} title="Lecturers" subtitle={`${organizationName} · teaching staff`}>
        <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={handleAdd}>
          <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
          Add lecturer
        </button>
      </DashboardPageHeader>

      <div className="grid min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        {notice ? <NoticeBar notice={notice} onDismiss={() => setNotice(null)} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Lecturer status" className="flex gap-1.5 rounded-full bg-mist p-1">
            {LECTURER_STATUSES.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={tab === status}
                className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 font-semibold text-ink-2 transition-colors duration-150 hover:text-ink aria-selected:bg-white aria-selected:text-ink aria-selected:shadow-card"
                onClick={() => setStatus(tab)}
              >
                {STATUS_TAB_LABELS[tab]}{' '}
                <span className="tabular text-[0.9rem] text-ink-3">{lecturers.data ? countFormatter.format(lecturers.data.counts[tab]) : null}</span>
              </button>
            ))}
          </div>

          <div className="relative w-[min(100%,340px)]">
            <label htmlFor={searchId} className="visually-hidden">
              Search lecturers
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" size={17} strokeWidth={2} aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              placeholder="Name, subject or email"
              className="min-h-11 w-full rounded-full border border-rule-strong bg-white pr-4 pl-10 text-base transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
              value={lecturerSearch.text}
              onChange={(event) => lecturerSearch.change(event.target.value)}
            />
          </div>
        </div>

        <LecturerFilters filters={placeFilters} locations={formOptions.locations} departments={formOptions.departments} subjects={formOptions.subjects} onChange={setPlaceFilters} />

        <section className="rounded-card border border-rule" role="tabpanel" aria-label={STATUS_TAB_LABELS[status]}>
          <LecturerList
            status={lecturers.status}
            data={lecturers.data}
            listStatus={status}
            isFiltered={isFiltered}
            hasNextPage={lecturers.hasNextPage}
            isLoadingMore={lecturers.isFetchingNextPage}
            onRetry={() => void lecturers.refetch()}
            onLoadMore={() => void lecturers.fetchNextPage()}
            onAdd={handleAdd}
            renderActions={(lecturer) => (
              <LecturerActions
                lecturer={lecturer}
                isChangingInvitation={lecturerInvitation.isPending}
                onEdit={handleEdit}
                onSetStatus={handleSetStatus}
                onInvite={handleInvite}
                onChangeInvitation={handleChangeInvitation}
              />
            )}
          />
        </section>
      </div>

      <LecturerDialog dialogRef={dialogRef} organizationId={organizationId} mode={dialogMode} options={formOptions} onSaved={handleSaved} />
      <LecturerInviteDialog dialogRef={inviteDialogRef} organizationId={organizationId} target={inviteTarget} onInvited={handleInvited} />
    </div>
  )
}

interface LecturerListProps {
  status: 'pending' | 'error' | 'success'
  data?: LoadedLecturers
  listStatus: LecturerStatus
  isFiltered: boolean
  hasNextPage: boolean
  isLoadingMore: boolean
  onRetry: () => void
  onLoadMore: () => void
  onAdd: () => void
  renderActions: (lecturer: Lecturer) => ReactNode
}

function LecturerList({ status, data, listStatus, isFiltered, hasNextPage, isLoadingMore, onRetry, onLoadMore, onAdd, renderActions }: LecturerListProps) {
  if (status === 'error') return <LoadError what="lecturers" onRetry={onRetry} />
  if (!data) return <SkeletonRows />
  if (data.lecturers.length === 0) return <EmptyLecturers listStatus={listStatus} isFiltered={isFiltered} onAdd={onAdd} />

  return (
    <div className="grid min-w-0 justify-items-center gap-4 pb-4">
      <LecturerTable lecturers={data.lecturers} renderActions={renderActions} />
      {hasNextPage ? (
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

interface EmptyLecturersProps {
  listStatus: LecturerStatus
  isFiltered: boolean
  onAdd: () => void
}

function EmptyLecturers({ listStatus, isFiltered, onAdd }: EmptyLecturersProps) {
  if (isFiltered) {
    return <EmptyMessage title="No lecturers match." text="Try another name, subject or filter." />
  }
  switch (listStatus) {
    case 'ACTIVE':
      return (
        <EmptyMessage title="No lecturers yet." text="Add your first lecturer. A login is optional; you can invite them later.">
          <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={onAdd}>
            <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
            Add lecturer
          </button>
        </EmptyMessage>
      )
    case 'ARCHIVED':
      return <EmptyMessage title="No archived lecturers." text="Lecturers you archive show here, with their records kept." />
    default: {
      const unknown: never = listStatus
      throw new Error(`Unknown lecturer status: ${String(unknown)}`)
    }
  }
}

interface EmptyMessageProps {
  title: string
  text: string
  children?: ReactNode
}

function EmptyMessage({ title, text, children }: EmptyMessageProps) {
  return (
    <div className="grid justify-items-center gap-2 px-5 py-12 text-center">
      <GraduationCap className="text-ink-3" size={24} strokeWidth={1.7} aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      <p className="text-ink-2">{text}</p>
      {children}
    </div>
  )
}
