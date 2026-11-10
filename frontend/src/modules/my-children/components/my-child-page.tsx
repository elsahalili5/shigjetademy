import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { MyChildDetail } from '@shigjetademy/shared/guardians'
import { RescheduledLessons } from '#/components/RescheduledLessons'
import { SectionCard } from '#/components/SectionCard'
import { getScheduleLabel } from '#/modules/groups/utils/schedule-label'
import { StudentDetailView } from '#/modules/student-roster/components/student-detail-page'
import { useMyChild } from '../hooks/use-my-child'
import { useMyChildren } from '../hooks/use-my-children'

interface MyChildPageProps {
  organizationId: string
  studentId: string
}

/** One linked child as their guardian reads it: groups, weekly schedule, moved lessons and attendance, read-only */
export function MyChildPage({ organizationId, studentId }: MyChildPageProps) {
  const child = useMyChild({ organizationId, studentId })

  const renderSections = (detail: MyChildDetail): ReactNode => (
    <>
      <ChildSwitcher organizationId={organizationId} studentId={studentId} />
      <SectionCard title="Weekly schedule">
        <WeeklySchedule groups={detail.groups} />
      </SectionCard>
      <SectionCard title="Rescheduled lessons">
        <RescheduledLessons lessons={detail.rescheduled_lessons} />
      </SectionCard>
    </>
  )

  return <StudentDetailView detail={child} viewer="GUARDIAN" renderExtraSections={renderSections} />
}

interface WeeklyScheduleProps {
  groups: MyChildDetail['groups']
}

function WeeklySchedule({ groups }: WeeklyScheduleProps) {
  if (groups.length === 0) return <p className="px-5 py-4 text-ink-2">No lessons scheduled right now.</p>
  return (
    <ul aria-label="Weekly schedule">
      {groups.map((group) => (
        <li key={group.id} className="grid gap-0.5 border-b border-rule px-5 py-3 last:border-b-0">
          <span className="font-semibold">{group.name}</span>
          <span className="text-[0.93rem] text-ink-2">{[group.course, group.academic_term, group.location].filter(Boolean).join(' · ')}</span>
          <span className="tabular text-[0.93rem] text-ink-2">{getScheduleLabel(group.schedule) || 'No schedule'}</span>
        </li>
      ))}
    </ul>
  )
}

interface ChildSwitcherProps {
  organizationId: string
  studentId: string
}

/** Links to each of the guardian's children, so switching never goes through the list; only shown with more than one child */
function ChildSwitcher({ organizationId, studentId }: ChildSwitcherProps) {
  const children = useMyChildren(organizationId)
  if (!children.data || children.data.length < 2) return null
  return (
    <nav aria-label="Switch child" className="flex flex-wrap gap-2">
      {children.data.map((child) => (
        <Link
          key={child.id}
          to="/dashboard/my-children/$studentId"
          params={{ studentId: child.id }}
          aria-current={child.id === studentId ? 'page' : undefined}
          className="chip chip--navy no-underline aria-[current=page]:ring-2 aria-[current=page]:ring-green-deep"
        >
          {child.first_name} {child.last_name}
        </Link>
      ))}
    </nav>
  )
}
