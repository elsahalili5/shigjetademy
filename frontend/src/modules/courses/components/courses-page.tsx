import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Layers, Plus, Search } from 'lucide-react'
import { COURSE_STATUSES } from '@shigjetademy/shared/courses'
import type { Course, CourseStatus } from '@shigjetademy/shared/courses'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { NoticeBar } from '#/components/NoticeBar'
import type { Notice } from '#/components/NoticeBar'
import { SkeletonRows } from '#/components/SkeletonRows'
import { StatusTabs } from '#/components/StatusTabs'
import { showErrorToast } from '#/lib/error-toast'
import { useDebouncedSearch } from '#/lib/use-debounced-search'
import { useDepartments } from '#/modules/locations/hooks/use-departments'
import { useCourses } from '../hooks/use-courses'
import type { LoadedCourses } from '../hooks/use-courses'
import { useSetCourseStatus } from '../hooks/use-set-course-status'
import { getCourseSetup } from '../utils/course-setup'
import { COURSE_STATUS_LABELS } from '../utils/status-labels'
import type { CourseSetup } from '../utils/course-setup'
import { CourseActions } from './course-actions'
import type { CourseStatusChange } from './course-actions'
import { CourseDialog } from './course-dialog'
import type { CourseDialogMode } from './course-dialog'
import { CourseTable } from './course-table'
import { TableToolbar } from '#/components/TableToolbar'


interface CoursesPageProps {
  organizationId: string
  organizationName: string
  /** Only the owner can add the departments courses need */
  isOwner: boolean
}

/** The organization's courses: search, active and archived tabs, and adding, editing and archiving, once it has a department */
export function CoursesPage({ organizationId, organizationName, isOwner }: CoursesPageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const searchId = useId()
  const courseSearch = useDebouncedSearch()
  const [status, setStatus] = useState<CourseStatus>('ACTIVE')
  const courses = useCourses({ organizationId, search: courseSearch.search, status })
  const departments = useDepartments(organizationId)
  const setCourseStatus = useSetCourseStatus(organizationId)
  const [dialogMode, setDialogMode] = useState<CourseDialogMode>({ kind: 'add', openCount: 0 })
  const [notice, setNotice] = useState<Notice | null>(null)

  const setup = getCourseSetup(departments.data)
  const isListFailed = courses.status === 'error' || departments.status === 'error'

  const handleAdd = () => {
    setDialogMode((current) => ({ kind: 'add', openCount: current.openCount + 1 }))
    dialogRef.current?.showModal()
  }

  const handleEdit = (course: Course) => {
    setDialogMode((current) => ({ kind: 'edit', course, openCount: current.openCount + 1 }))
    dialogRef.current?.showModal()
  }

  const handleSaved = (saved: Course) => {
    setNotice({ tone: 'success', text: dialogMode.kind === 'add' ? `Added ${saved.name}.` : `Saved ${saved.name}.` })
  }

  const handleSetStatus = ({ course, status: nextStatus }: CourseStatusChange) => {
    setCourseStatus.mutate(
      { courseId: course.id, status: nextStatus },
      {
        onSuccess: () => setNotice({ tone: 'success', text: nextStatus === 'ARCHIVED' ? `Archived ${course.name}.` : `Restored ${course.name}.` }),
        onError: showErrorToast,
      },
    )
  }

  const handleRetry = () => {
    void courses.refetch()
    void departments.refetch()
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Layers} title="Courses" subtitle={`${organizationName} · what you teach`} />

      <div className="grid min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        {notice ? <NoticeBar notice={notice} onDismiss={() => setNotice(null)} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusTabs label="Course status" statuses={COURSE_STATUSES} labels={COURSE_STATUS_LABELS} counts={courses.data?.counts} current={status} onChange={setStatus} />
        </div>

        <TableToolbar
          addLabel="Add course"
          onAdd={setup === 'READY' ? handleAdd : undefined}
          search={
            <div className="relative w-[min(100%,340px)]">
                <label htmlFor={searchId} className="visually-hidden">
                  Search courses
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" size={17} strokeWidth={2} aria-hidden="true" />
                <input
                  id={searchId}
                  type="search"
                  placeholder="Name, code or level"
                  className="min-h-11 w-full rounded-full border border-rule-strong bg-white pr-4 pl-10 text-base transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
                  value={courseSearch.text}
                  onChange={(event) => courseSearch.change(event.target.value)}
                />
              </div>
          }
        />
        <section className="rounded-card border border-rule" role="tabpanel" aria-label={COURSE_STATUS_LABELS[status]}>
          <CourseList
            isFailed={isListFailed}
            data={courses.data}
            setup={setup}
            isOwner={isOwner}
            listStatus={status}
            isFiltered={!!courseSearch.search}
            hasNextPage={courses.hasNextPage}
            isLoadingMore={courses.isFetchingNextPage}
            onRetry={handleRetry}
            onLoadMore={() => void courses.fetchNextPage()}
            onAdd={handleAdd}
            renderActions={(course) => <CourseActions course={course} onEdit={handleEdit} onSetStatus={handleSetStatus} />}
          />
        </section>
      </div>

      <CourseDialog dialogRef={dialogRef} organizationId={organizationId} mode={dialogMode} departments={departments.data ?? []} onSaved={handleSaved} />
    </div>
  )
}

interface CourseListProps {
  isFailed: boolean
  data?: LoadedCourses
  setup: CourseSetup
  isOwner: boolean
  listStatus: CourseStatus
  isFiltered: boolean
  hasNextPage: boolean
  isLoadingMore: boolean
  onRetry: () => void
  onLoadMore: () => void
  onAdd: () => void
  renderActions: (course: Course) => ReactNode
}

function CourseList({ isFailed, data, setup, isOwner, listStatus, isFiltered, hasNextPage, isLoadingMore, onRetry, onLoadMore, onAdd, renderActions }: CourseListProps) {
  if (isFailed) return <LoadError what="courses" onRetry={onRetry} />
  if (!data || setup === 'LOADING') return <SkeletonRows />
  if (data.courses.length === 0) return <EmptyCourses setup={setup} isOwner={isOwner} listStatus={listStatus} isFiltered={isFiltered} onAdd={onAdd} />

  return (
    <div className="grid min-w-0 justify-items-center gap-4 pb-4">
      <CourseTable courses={data.courses} renderActions={renderActions} />
      {hasNextPage ? (
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

interface EmptyCoursesProps {
  setup: Exclude<CourseSetup, 'LOADING'>
  isOwner: boolean
  listStatus: CourseStatus
  isFiltered: boolean
  onAdd: () => void
}

function EmptyCourses({ setup, isOwner, listStatus, isFiltered, onAdd }: EmptyCoursesProps) {
  if (isFiltered) {
    return <EmptyMessage icon={Layers} title="No courses match." text="Try another name, code or level." />
  }
  if (listStatus === 'ARCHIVED') {
    return <EmptyMessage icon={Layers} title="No archived courses." text="Courses you archive show here." />
  }
  switch (setup) {
    case 'NEEDS_DEPARTMENT':
      if (!isOwner) {
        return <EmptyMessage icon={Layers} title="No departments yet." text="Ask the owner to add one, then you can add courses." />
      }
      return (
        <EmptyMessage icon={Layers} title="Add a department first." text="Every course belongs to a department.">
          <Link className="button button--primary min-h-11 px-4 text-base" to="/dashboard/locations">
            Go to Locations and departments
          </Link>
        </EmptyMessage>
      )
    case 'READY':
      return (
        <EmptyMessage icon={Layers} title="No courses yet." text="Add your first course. You open groups from it.">
          <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={onAdd}>
            <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
            Add course
          </button>
        </EmptyMessage>
      )
    default: {
      const unknown: never = setup
      throw new Error(`Unknown course setup: ${String(unknown)}`)
    }
  }
}
