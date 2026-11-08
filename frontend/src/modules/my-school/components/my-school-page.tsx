import { NotebookPen, School } from 'lucide-react'
import type { MySchool, MySchoolGroup } from '@shigjetademy/shared/students'
import type { StudentNoteEntry } from '@shigjetademy/shared/student-notes'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { Detail, HomeSkeleton, SchoolYearCard } from '#/components/HomeDetails'
import { LoadError } from '#/components/LoadError'
import { RescheduledLessons } from '#/components/RescheduledLessons'
import { SectionCard } from '#/components/SectionCard'
import { useFormatDateTime } from '#/lib/use-format-date'
import { getScheduleLabel } from '#/modules/groups/utils/schedule-label'
import { useMySchool } from '../hooks/use-my-school'

interface MySchoolPageProps {
  organizationId: string
  organizationName: string
}

/** A student's home: their school, their own record, their groups, their moved lessons and the current school year and term, read-only */
export function MySchoolPage({ organizationId, organizationName }: MySchoolPageProps) {
  const mySchool = useMySchool(organizationId)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={School} title="My school" subtitle={organizationName} />
      <div className="grid max-w-[880px] gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <MySchoolContent status={mySchool.status} data={mySchool.data} onRetry={() => void mySchool.refetch()} />
      </div>
    </div>
  )
}

interface MySchoolContentProps {
  status: 'pending' | 'error' | 'success'
  data?: MySchool
  onRetry: () => void
}

function MySchoolContent({ status, data, onRetry }: MySchoolContentProps) {
  if (status === 'error') return <LoadError what="school details" onRetry={onRetry} />
  if (!data) return <HomeSkeleton />

  return (
    <>
      <SectionCard title="Your record">
        {data.student ? (
          <dl className="grid grid-cols-2 gap-4 px-5 py-4 max-[560px]:grid-cols-1">
            <Detail term="Name">
              {data.student.first_name} {data.student.last_name}
            </Detail>
            <Detail term="Student number">
              <span className="tabular">{data.student.student_number}</span>
            </Detail>
          </dl>
        ) : (
          <p className="px-5 py-4 text-ink-2">Your school hasn’t linked your student record yet.</p>
        )}
      </SectionCard>
      {data.student ? (
        <>
          <SectionCard title="Your groups">
            <SchoolGroups groups={data.groups} />
          </SectionCard>
          <SectionCard title="Rescheduled lessons">
            <RescheduledLessons lessons={data.rescheduled_lessons} />
          </SectionCard>
          <SectionCard title="Notes">
            <SchoolNotes notes={data.notes} />
          </SectionCard>
        </>
      ) : null}
      <SchoolYearCard academicYear={data.academic_year} term={data.term} />
    </>
  )
}

/** "Mathematics · 2026–27 · Autumn term · Main campus" */
const getGroupDetails = (group: MySchoolGroup) => [group.course, group.academic_year, group.academic_term, group.location].filter(Boolean).join(' · ')

interface SchoolGroupsProps {
  groups: MySchoolGroup[]
}

function SchoolGroups({ groups }: SchoolGroupsProps) {
  if (groups.length === 0) return <p className="px-5 py-4 text-ink-2">You aren’t in any group yet.</p>
  return (
    <ul className="grid">
      {groups.map((group) => (
        <li key={group.id} className="grid gap-0.5 border-b border-rule px-5 py-3 last:border-b-0">
          <span className="font-semibold">{group.name}</span>
          <span className="text-[0.93rem] text-ink-2">{getGroupDetails(group)}</span>
          <span className="tabular text-[0.93rem] text-ink-2">{getScheduleLabel(group.schedule) || 'No schedule'}</span>
        </li>
      ))}
    </ul>
  )
}

interface SchoolNotesProps {
  notes: StudentNoteEntry[]
}

/** Read-only: body, group, the lecturer's name and when, newest first */
function SchoolNotes({ notes }: SchoolNotesProps) {
  const formatDateTime = useFormatDateTime()
  if (notes.length === 0) {
    return <EmptyMessage icon={NotebookPen} title="No notes yet" text="Notes your lecturers write about you will show up here." />
  }
  return (
    <ul aria-label="Notes">
      {notes.map((note) => (
        <li key={note.id} className="grid gap-1.5 border-b border-rule px-5 py-3.5 last:border-b-0">
          <p>{note.body}</p>
          <p className="text-[0.88rem] text-ink-3">
            {note.group.name} · {note.lecturer ? `${note.lecturer.first_name} ${note.lecturer.last_name}` : 'A deleted user'} · {formatDateTime(note.created_at)}
          </p>
        </li>
      ))}
    </ul>
  )
}
