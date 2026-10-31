import type { ReactNode } from 'react'
import { School } from 'lucide-react'
import type { MySchool, MySchoolPeriod } from '@shigjetademy/shared/students'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { useFormatDay } from '#/lib/use-format-date'
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
  if (!data) return <MySchoolSkeleton />

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
      <SectionCard title="This school year">
        <dl className="grid grid-cols-2 gap-4 px-5 py-4 max-[560px]:grid-cols-1">
          <PeriodDetail term="School year" period={data.academic_year} emptyText="No school year set yet" />
          <PeriodDetail term="Term" period={data.term} emptyText="No term right now" />
        </dl>
      </SectionCard>
    </>
  )
}

interface DetailProps {
  term: string
  children: ReactNode
}

function Detail({ term, children }: DetailProps) {
  return (
    <div className="grid gap-1">
      <dt className="text-[0.87rem] font-[650] text-ink-3">{term}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  )
}

interface PeriodDetailProps {
  term: string
  period: MySchoolPeriod | null
  emptyText: string
}

function PeriodDetail({ term, period, emptyText }: PeriodDetailProps) {
  const formatDay = useFormatDay()
  if (!period) {
    return (
      <Detail term={term}>
        <span className="font-normal text-ink-2">{emptyText}</span>
      </Detail>
    )
  }
  return (
    <Detail term={term}>
      <span className="grid gap-0.5">
        <span>{period.name}</span>
        <span className="tabular text-[0.93rem] font-normal text-ink-2">
          {formatDay(period.start_date)} – {formatDay(period.end_date)}
        </span>
      </span>
    </Detail>
  )
}

function MySchoolSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading">
      {[0, 1].map((section) => (
        <div key={section} className="grid gap-3 rounded-card border border-rule px-5 py-4" aria-hidden="true">
          <span className="h-4 w-36 animate-pulse rounded bg-mist" />
          <span className="h-3.5 w-64 max-w-full animate-pulse rounded bg-mist" />
          <span className="h-3.5 w-48 animate-pulse rounded bg-mist" />
        </div>
      ))}
    </div>
  )
}
