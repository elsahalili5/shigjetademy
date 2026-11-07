import { School } from 'lucide-react'
import type { MySchool } from '@shigjetademy/shared/students'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { Detail, HomeSkeleton, SchoolYearCard } from '#/components/HomeDetails'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { useMySchool } from '../hooks/use-my-school'

interface MySchoolPageProps {
  organizationId: string
  organizationName: string
}

/** A student's home: their school, their own record and the current school year and term, read-only */
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
      <SchoolYearCard academicYear={data.academic_year} term={data.term} />
    </>
  )
}
