import { Link } from '@tanstack/react-router'
import { ArrowLeft, Layers, UsersRound } from 'lucide-react'
import type { CourseDetail } from '@shigjetademy/shared/courses'
import { isApiError } from '#/api/client'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { Detail } from '#/components/HomeDetails'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { GroupTable } from '#/modules/groups/components/group-table'
import { useCourse } from '../hooks/use-course'
import { COURSE_STATUS_LABELS } from '../utils/status-labels'

// A malformed id is refused as invalid; to the person it is a course that doesn't exist
const NOT_FOUND_STATUSES = [400, 404]

interface CourseDetailPageProps {
  organizationId: string
  courseId: string
}

/** Everything about one course and the groups it runs, read-only; editing and archiving stay on the Courses table */
export function CourseDetailPage({ organizationId, courseId }: CourseDetailPageProps) {
  const course = useCourse({ organizationId, courseId })
  const isNotFound = isApiError(course.error) && NOT_FOUND_STATUSES.includes(course.error.response?.status ?? 0)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Layers} title={course.data?.name ?? 'Course'} subtitle={course.data ? `${course.data.level} · ${course.data.department.name}` : 'Something you teach'}>
        <Link className="button button--ghost min-h-11 px-4 text-base" to="/dashboard/courses">
          <ArrowLeft size={17} strokeWidth={2.2} aria-hidden="true" />
          Back to Courses
        </Link>
      </DashboardPageHeader>
      <div className="grid min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <CourseDetailContent course={course.data} status={course.status} isNotFound={isNotFound} onRetry={() => void course.refetch()} />
      </div>
    </div>
  )
}

interface CourseDetailContentProps {
  course?: CourseDetail
  status: 'pending' | 'error' | 'success'
  isNotFound: boolean
  onRetry: () => void
}

function CourseDetailContent({ course, status, isNotFound, onRetry }: CourseDetailContentProps) {
  // A failed refetch keeps the page that's already loaded
  if (!course) {
    if (isNotFound) return <EmptyMessage icon={Layers} title="Course not found." text="It may belong to another organization, or the link is old." />
    if (status === 'error') return <LoadError what="course" onRetry={onRetry} />
    return <SkeletonRows />
  }

  return (
    <>
      <SectionCard title="Details">
        <dl className="grid max-w-[880px] grid-cols-2 gap-4 px-5 py-4 max-[560px]:grid-cols-1">
          <Detail term="Code">{course.code ?? <NotSet text="No code" />}</Detail>
          <Detail term="Level">{course.level}</Detail>
          <Detail term="Department">{course.department.name}</Detail>
          <Detail term="Status">{COURSE_STATUS_LABELS[course.status]}</Detail>
          <Detail term="Description">{course.description ?? <NotSet text="No description" />}</Detail>
        </dl>
      </SectionCard>
      <SectionCard title="Groups">
        {course.groups.length === 0 ? (
          <EmptyMessage icon={UsersRound} title="No groups yet." text="Groups you add to this course on the Groups page show here." />
        ) : (
          <div className="pb-2">
            <GroupTable groups={course.groups} variant="course" />
          </div>
        )}
      </SectionCard>
    </>
  )
}

interface NotSetProps {
  text: string
}

function NotSet({ text }: NotSetProps) {
  return <span className="font-normal text-ink-2">{text}</span>
}
