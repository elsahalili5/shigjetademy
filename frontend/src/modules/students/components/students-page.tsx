import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getStudentName, STUDENT_STATUSES } from '@shigjetademy/shared/students'
import type { Student, StudentStatus } from '@shigjetademy/shared/students'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import { NoticeBar } from '#/components/NoticeBar'
import type { Notice } from '#/components/NoticeBar'
import { showErrorToast } from '#/lib/error-toast'
import { useSetStudentStatus } from '../hooks/use-set-student-status'
import { useStudentInvitationAction } from '../hooks/use-student-invitation-action'
import { useStudentSearch } from '../hooks/use-student-search'
import { useStudents } from '../hooks/use-students'
import type { LoadedStudents } from '../hooks/use-students'
import { SkeletonRows } from './skeleton-rows'
import { StudentActions } from './student-actions'
import type { StudentInvitationChange, StudentStatusChange } from './student-actions'
import { StudentDialog } from './student-dialog'
import type { StudentDialogMode } from './student-dialog'
import { StudentInviteDialog } from './student-invite-dialog'
import type { StudentInviteTarget } from './student-invite-dialog'
import { StudentTable } from './student-table'

const STATUS_TAB_LABELS = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
} as const satisfies Record<StudentStatus, string>

const countFormatter = new Intl.NumberFormat()

interface StudentsPageProps {
  organizationId: string
  organizationName: string
}

/** The organization's student records: search, active and archived tabs, and adding, editing and archiving */
export function StudentsPage({ organizationId, organizationName }: StudentsPageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inviteDialogRef = useRef<HTMLDialogElement>(null)
  const searchId = useId()
  const studentSearch = useStudentSearch()
  const [status, setStatus] = useState<StudentStatus>('ACTIVE')
  const students = useStudents({ organizationId, search: studentSearch.search, status })
  const setStudentStatus = useSetStudentStatus(organizationId)
  const studentInvitation = useStudentInvitationAction(organizationId)
  const [dialogMode, setDialogMode] = useState<StudentDialogMode>({ kind: 'add', openCount: 0 })
  const [inviteTarget, setInviteTarget] = useState<StudentInviteTarget | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const handleAdd = () => {
    setDialogMode((current) => ({ kind: 'add', openCount: current.kind === 'add' ? current.openCount + 1 : 0 }))
    dialogRef.current?.showModal()
  }

  const handleEdit = (student: Student) => {
    setDialogMode({ kind: 'edit', student })
    dialogRef.current?.showModal()
  }

  const handleSaved = (saved: Student) => {
    const name = getStudentName(saved)
    setNotice({ tone: 'success', text: dialogMode.kind === 'add' ? `Added ${name} as ${saved.student_number}.` : `Saved ${name}.` })
  }

  const handleSetStatus = ({ student, status: nextStatus }: StudentStatusChange) => {
    const name = getStudentName(student)
    setStudentStatus.mutate(
      { studentId: student.id, status: nextStatus },
      {
        onSuccess: () => setNotice({ tone: 'success', text: nextStatus === 'ARCHIVED' ? `Archived ${name}.` : `Restored ${name}.` }),
        onError: showErrorToast,
      },
    )
  }

  const handleInvite = (student: Student) => {
    setInviteTarget((current) => ({ student, openCount: (current?.openCount ?? 0) + 1 }))
    inviteDialogRef.current?.showModal()
  }

  const handleInvited = (invited: Student) => {
    setNotice({ tone: 'success', text: `Sent an invitation to ${invited.invitation?.email ?? getStudentName(invited)}.` })
  }

  const handleChangeInvitation = ({ student, action }: StudentInvitationChange) => {
    const email = student.invitation?.email ?? getStudentName(student)
    studentInvitation.mutate(
      { studentId: student.id, action },
      {
        onSuccess: () => toast.success(action === 'RESEND' ? `Sent a new link to ${email}. The old one no longer works.` : `Withdrew the invitation to ${email}.`),
        onError: showErrorToast,
      },
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Users} title="Students" subtitle={`${organizationName} · student records`}>
        <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={handleAdd}>
          <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
          Add student
        </button>
      </DashboardPageHeader>

      <div className="grid max-w-[1120px] gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        {notice ? <NoticeBar notice={notice} onDismiss={() => setNotice(null)} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Student status" className="flex gap-1.5 rounded-full bg-mist p-1">
            {STUDENT_STATUSES.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={tab === status}
                className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 font-semibold text-ink-2 transition-colors duration-150 hover:text-ink aria-selected:bg-white aria-selected:text-ink aria-selected:shadow-card"
                onClick={() => setStatus(tab)}
              >
                {STATUS_TAB_LABELS[tab]}{' '}
                <span className="tabular text-[0.9rem] text-ink-3">{students.data ? countFormatter.format(students.data.counts[tab]) : null}</span>
              </button>
            ))}
          </div>

          <div className="relative w-[min(100%,340px)]">
            <label htmlFor={searchId} className="visually-hidden">
              Search students
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" size={17} strokeWidth={2} aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              placeholder="Name or student number"
              className="min-h-11 w-full rounded-full border border-rule-strong bg-white pr-4 pl-10 text-base transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
              value={studentSearch.text}
              onChange={(event) => studentSearch.change(event.target.value)}
            />
          </div>
        </div>

        <section className="rounded-card border border-rule" role="tabpanel" aria-label={STATUS_TAB_LABELS[status]}>
          <StudentList
            status={students.status}
            data={students.data}
            listStatus={status}
            hasSearch={!!studentSearch.search}
            hasNextPage={students.hasNextPage}
            isLoadingMore={students.isFetchingNextPage}
            onRetry={() => void students.refetch()}
            onLoadMore={() => void students.fetchNextPage()}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onSetStatus={handleSetStatus}
            isChangingInvitation={studentInvitation.isPending}
            onInvite={handleInvite}
            onChangeInvitation={handleChangeInvitation}
          />
        </section>
      </div>

      <StudentDialog dialogRef={dialogRef} organizationId={organizationId} mode={dialogMode} onSaved={handleSaved} />
      <StudentInviteDialog dialogRef={inviteDialogRef} organizationId={organizationId} target={inviteTarget} onInvited={handleInvited} />
    </div>
  )
}

interface StudentListProps {
  status: 'pending' | 'error' | 'success'
  data?: LoadedStudents
  listStatus: StudentStatus
  hasSearch: boolean
  hasNextPage: boolean
  isLoadingMore: boolean
  onRetry: () => void
  onLoadMore: () => void
  onAdd: () => void
  onEdit: (student: Student) => void
  onSetStatus: (change: StudentStatusChange) => void
  isChangingInvitation: boolean
  onInvite: (student: Student) => void
  onChangeInvitation: (change: StudentInvitationChange) => void
}

function StudentList({
  status,
  data,
  listStatus,
  hasSearch,
  hasNextPage,
  isLoadingMore,
  onRetry,
  onLoadMore,
  onAdd,
  onEdit,
  onSetStatus,
  isChangingInvitation,
  onInvite,
  onChangeInvitation,
}: StudentListProps) {
  if (status === 'error') return <LoadError what="students" onRetry={onRetry} />
  if (!data) return <SkeletonRows />
  if (data.students.length === 0) return <EmptyStudents listStatus={listStatus} hasSearch={hasSearch} onAdd={onAdd} />

  return (
    <div className="grid justify-items-center gap-4 pb-4">
      <StudentTable students={data.students} renderActions={(student) => (
            <StudentActions
              student={student}
              isChangingInvitation={isChangingInvitation}
              onEdit={onEdit}
              onSetStatus={onSetStatus}
              onInvite={onInvite}
              onChangeInvitation={onChangeInvitation}
            />
          )} />
      {hasNextPage ? (
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

interface EmptyStudentsProps {
  listStatus: StudentStatus
  hasSearch: boolean
  onAdd: () => void
}

function EmptyStudents({ listStatus, hasSearch, onAdd }: EmptyStudentsProps) {
  if (hasSearch) {
    return <EmptyMessage title="No students match." text="Try another name or student number." />
  }
  switch (listStatus) {
    case 'ACTIVE':
      return (
        <EmptyMessage title="No students yet." text="Add your first student. No email or account is needed.">
          <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={onAdd}>
            <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
            Add student
          </button>
        </EmptyMessage>
      )
    case 'ARCHIVED':
      return <EmptyMessage title="No archived students." text="Students you archive show here, with their records kept." />
    default: {
      const unknown: never = listStatus
      throw new Error(`Unknown student status: ${String(unknown)}`)
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
      <Users className="text-ink-3" size={24} strokeWidth={1.7} aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      <p className="text-ink-2">{text}</p>
      {children}
    </div>
  )
}
