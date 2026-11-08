import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus, UsersRound } from 'lucide-react'
import { GROUP_STATUSES } from '@shigjetademy/shared/groups'
import type { Group, GroupStatus } from '@shigjetademy/shared/groups'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { NoticeBar } from '#/components/NoticeBar'
import type { Notice } from '#/components/NoticeBar'
import { SkeletonRows } from '#/components/SkeletonRows'
import { StatusTabs } from '#/components/StatusTabs'
import { showErrorToast } from '#/lib/error-toast'
import { useAcademicYears } from '#/modules/academic-periods/hooks/use-academic-years'
import { useCourseOptions } from '#/modules/courses/hooks/use-course-options'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isCoursesManager } from '#/modules/courses/utils/permissions'
import { useLocations } from '#/modules/locations/hooks/use-locations'
import { useGroupLecturerOptions } from '../hooks/use-group-lecturer-options'
import { useGroups } from '../hooks/use-groups'
import type { LoadedGroups } from '../hooks/use-groups'
import { useSetGroupStatus } from '../hooks/use-set-group-status'
import { getGroupSetup } from '../utils/group-setup'
import type { GroupSetup } from '../utils/group-setup'
import { GroupActions } from './group-actions'
import type { GroupStatusChange } from './group-actions'
import { GroupDialog } from './group-dialog'
import type { GroupDialogMode, GroupFormOptions } from './group-dialog'
import { GroupFilters } from './group-filters'
import type { GroupListFilters } from './group-filters'
import { GroupLecturersDialog } from './group-lecturers-dialog'
import type { GroupLecturersDialogMode } from './group-lecturers-dialog'
import { GroupTable } from './group-table'

const STATUS_TAB_LABELS = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
} as const satisfies Record<GroupStatus, string>

const NO_FILTERS: GroupListFilters = { courseId: '', yearId: '' }

interface GroupsPageProps {
  organizationId: string
  organizationName: string
  /** The organization's time zone, for what counts as today */
  timeZone: string
}

/** The organization's groups: filters, active and archived tabs, and adding, editing and archiving, once it has a school year and a course; read-only for timetable admins */
export function GroupsPage({ organizationId, organizationName, timeZone }: GroupsPageProps) {
  const membership = useActiveMembership()
  const canManage = isCoursesManager(membership)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const lecturersDialogRef = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState<GroupStatus>('ACTIVE')
  const [listFilters, setListFilters] = useState<GroupListFilters>(NO_FILTERS)
  const groups = useGroups({ organizationId, status, ...listFilters })
  const courses = useCourseOptions(organizationId)
  const years = useAcademicYears(organizationId)
  const locations = useLocations(organizationId)
  const lecturers = useGroupLecturerOptions({ organizationId, isEnabled: canManage })
  const setGroupStatus = useSetGroupStatus(organizationId)
  const [dialogMode, setDialogMode] = useState<GroupDialogMode>({ kind: 'add', openCount: 0 })
  const [lecturersDialogMode, setLecturersDialogMode] = useState<GroupLecturersDialogMode>({ group: null, openCount: 0 })
  const [notice, setNotice] = useState<Notice | null>(null)

  const formOptions: GroupFormOptions = { courses: courses.data ?? [], years: years.data ?? [], locations: locations.data ?? [], lecturers: lecturers.data ?? [] }
  const setup = getGroupSetup({ years: years.data, courses: courses.data })
  const isListFailed = groups.status === 'error' || courses.status === 'error' || years.status === 'error' || lecturers.status === 'error'

  const handleAdd = () => {
    setDialogMode((current) => ({ kind: 'add', openCount: current.openCount + 1 }))
    dialogRef.current?.showModal()
  }

  const handleEdit = (group: Group) => {
    setDialogMode((current) => ({ kind: 'edit', group, openCount: current.openCount + 1 }))
    dialogRef.current?.showModal()
  }

  const handleOpenLecturers = (group: Group) => {
    setLecturersDialogMode((current) => ({ group, openCount: current.openCount + 1 }))
    lecturersDialogRef.current?.showModal()
  }

  const handleSaved = (saved: Group) => {
    setNotice({ tone: 'success', text: dialogMode.kind === 'add' ? `Added ${saved.name}.` : `Saved ${saved.name}.` })
  }

  const handleSetStatus = ({ group, status: nextStatus }: GroupStatusChange) => {
    setGroupStatus.mutate(
      { groupId: group.id, status: nextStatus },
      {
        onSuccess: () => setNotice({ tone: 'success', text: nextStatus === 'ARCHIVED' ? `Archived ${group.name}.` : `Restored ${group.name}.` }),
        onError: showErrorToast,
      },
    )
  }

  const handleRetry = () => {
    void groups.refetch()
    void courses.refetch()
    void years.refetch()
    void lecturers.refetch()
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={UsersRound} title="Groups" subtitle={`${organizationName} · the classes you run`}>
        {canManage && setup === 'READY' ? (
          <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={handleAdd}>
            <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
            Add group
          </button>
        ) : null}
      </DashboardPageHeader>

      <div className="grid min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        {notice ? <NoticeBar notice={notice} onDismiss={() => setNotice(null)} /> : null}

        <StatusTabs label="Group status" statuses={GROUP_STATUSES} labels={STATUS_TAB_LABELS} counts={groups.data?.counts} current={status} onChange={setStatus} />

        <GroupFilters filters={listFilters} courses={formOptions.courses} years={formOptions.years} onChange={setListFilters} />

        <section className="rounded-card border border-rule" role="tabpanel" aria-label={STATUS_TAB_LABELS[status]}>
          <GroupList
            isFailed={isListFailed}
            data={groups.data}
            setup={setup}
            listStatus={status}
            isFiltered={Object.values(listFilters).some(Boolean)}
            hasNextPage={groups.hasNextPage}
            isLoadingMore={groups.isFetchingNextPage}
            onRetry={handleRetry}
            onLoadMore={() => void groups.fetchNextPage()}
            onAdd={canManage ? handleAdd : undefined}
            renderActions={canManage ? (group) => <GroupActions group={group} onEdit={handleEdit} onOpenLecturers={handleOpenLecturers} onSetStatus={handleSetStatus} /> : undefined}
          />
        </section>
      </div>

      {canManage ? (
        <>
          <GroupDialog dialogRef={dialogRef} organizationId={organizationId} mode={dialogMode} options={formOptions} timeZone={timeZone} onSaved={handleSaved} />
          <GroupLecturersDialog dialogRef={lecturersDialogRef} organizationId={organizationId} mode={lecturersDialogMode} lecturers={formOptions.lecturers} timeZone={timeZone} />
        </>
      ) : null}
    </div>
  )
}

interface GroupListProps {
  isFailed: boolean
  data?: LoadedGroups
  setup: GroupSetup
  listStatus: GroupStatus
  isFiltered: boolean
  hasNextPage: boolean
  isLoadingMore: boolean
  onRetry: () => void
  onLoadMore: () => void
  /** Left out for a reader, who adds nothing */
  onAdd?: () => void
  /** Left out for a reader, whose table has no actions */
  renderActions?: (group: Group) => ReactNode
}

function GroupList({ isFailed, data, setup, listStatus, isFiltered, hasNextPage, isLoadingMore, onRetry, onLoadMore, onAdd, renderActions }: GroupListProps) {
  if (isFailed) return <LoadError what="groups" onRetry={onRetry} />
  if (!data || setup === 'LOADING') return <SkeletonRows />
  if (data.groups.length === 0) return <EmptyGroups setup={setup} listStatus={listStatus} isFiltered={isFiltered} onAdd={onAdd} />

  return (
    <div className="grid min-w-0 justify-items-center gap-4 pb-4">
      <GroupTable groups={data.groups} renderActions={renderActions} />
      {hasNextPage ? (
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

interface EmptyGroupsProps {
  setup: Exclude<GroupSetup, 'LOADING'>
  listStatus: GroupStatus
  isFiltered: boolean
  onAdd?: () => void
}

function EmptyGroups({ setup, listStatus, isFiltered, onAdd }: EmptyGroupsProps) {
  if (isFiltered) {
    return <EmptyMessage icon={UsersRound} title="No groups match." text="Try another course or school year." />
  }
  if (listStatus === 'ARCHIVED') {
    return <EmptyMessage icon={UsersRound} title="No archived groups." text="Groups you archive show here." />
  }
  switch (setup) {
    case 'NEEDS_YEAR':
      if (!onAdd) return <EmptyMessage icon={UsersRound} title="No groups yet." text="Groups show here once the school sets them up." />
      return (
        <EmptyMessage icon={UsersRound} title="Add a school year first." text="Every group runs in a school year.">
          <Link className="button button--primary min-h-11 px-4 text-base" to="/dashboard/academic-periods">
            Go to Academic periods
          </Link>
        </EmptyMessage>
      )
    case 'NEEDS_COURSE':
      if (!onAdd) return <EmptyMessage icon={UsersRound} title="No groups yet." text="Groups show here once the school sets them up." />
      return (
        <EmptyMessage icon={UsersRound} title="Add a course first." text="Every group belongs to an active course.">
          <Link className="button button--primary min-h-11 px-4 text-base" to="/dashboard/courses">
            Go to Courses
          </Link>
        </EmptyMessage>
      )
    case 'READY':
      if (!onAdd) return <EmptyMessage icon={UsersRound} title="No groups yet." text="Groups show here once the school sets them up." />
      return (
        <EmptyMessage icon={UsersRound} title="No groups yet." text="Add your first group to a course for a school year.">
          <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={onAdd}>
            <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
            Add group
          </button>
        </EmptyMessage>
      )
    default: {
      const unknown: never = setup
      throw new Error(`Unknown group setup: ${String(unknown)}`)
    }
  }
}
