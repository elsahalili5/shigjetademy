import { GraduationCap } from 'lucide-react'
import type { MyTeaching } from '@shigjetademy/shared/lecturers'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { Detail, HomeSkeleton, SchoolYearCard } from '#/components/HomeDetails'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { EMPLOYMENT_TYPE_LABELS } from '#/modules/lecturers/utils/employment-type-labels'
import { useMyTeaching } from '../hooks/use-my-teaching'
import { WelcomeBanner } from './welcome-banner'

interface MyTeachingPageProps {
  organizationId: string
  organizationName: string
  firstName: string
  /** The organization's time zone, for the greeting and today */
  timeZone: string
}

/** A lecturer's home: their organization, their own details and the current school year and term, read-only */
export function MyTeachingPage({ organizationId, organizationName, firstName, timeZone }: MyTeachingPageProps) {
  const myTeaching = useMyTeaching(organizationId)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={GraduationCap} title="My teaching" subtitle={organizationName} />
      {/* Spans the panel's full width, inside the page's side padding */}
      <div className="px-[clamp(20px,3.4vw,44px)] pb-5">
        <WelcomeBanner firstName={firstName} organizationName={organizationName} timeZone={timeZone} myTeaching={myTeaching.data} />
      </div>
      <div className="grid max-w-[880px] gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <MyTeachingContent status={myTeaching.status} data={myTeaching.data} onRetry={() => void myTeaching.refetch()} />
      </div>
    </div>
  )
}

interface MyTeachingContentProps {
  status: 'pending' | 'error' | 'success'
  data?: MyTeaching
  onRetry: () => void
}

function MyTeachingContent({ status, data, onRetry }: MyTeachingContentProps) {
  if (status === 'error') return <LoadError what="teaching details" onRetry={onRetry} />
  if (!data) return <HomeSkeleton />

  return (
    <>
      <SectionCard title="Your details">
        <LecturerDetails lecturer={data.lecturer} />
      </SectionCard>
      <SchoolYearCard academicYear={data.academic_year} term={data.term} />
    </>
  )
}

interface LecturerDetailsProps {
  lecturer: MyTeaching['lecturer']
}

function LecturerDetails({ lecturer }: LecturerDetailsProps) {
  if (!lecturer) return <p className="px-5 py-4 text-ink-2">Your school hasn’t linked your lecturer record yet.</p>
  return (
    <dl className="grid grid-cols-2 gap-4 px-5 py-4 max-[560px]:grid-cols-1">
      <Detail term="Name">
        {lecturer.first_name} {lecturer.last_name}
      </Detail>
      <Detail term="Employment">{EMPLOYMENT_TYPE_LABELS[lecturer.employment_type]}</Detail>
      <Detail term="Subjects">
        {lecturer.subjects.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {lecturer.subjects.map((subject) => (
              <li key={subject} className="inline-flex items-center rounded-full bg-green-wash px-2.5 py-0.5 text-[0.93rem] text-green-deep">
                {subject}
              </li>
            ))}
          </ul>
        ) : (
          <NotSet />
        )}
      </Detail>
      <Detail term="Department">{lecturer.department ?? <NotSet />}</Detail>
      <Detail term="Locations">{lecturer.locations.length > 0 ? lecturer.locations.join(', ') : <NotSet />}</Detail>
    </dl>
  )
}

function NotSet() {
  return <span className="font-normal text-ink-2">Not set yet</span>
}
