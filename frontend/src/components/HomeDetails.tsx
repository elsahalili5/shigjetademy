import type { ReactNode } from 'react'
import type { CurrentPeriod } from '@shigjetademy/shared/academic-periods'
import { SectionCard } from '#/components/SectionCard'
import { useFormatDay } from '#/lib/use-format-date'

// The read-only pieces a student's and a lecturer's home pages share

interface DetailProps {
  term: string
  children: ReactNode
}

/** One labelled value inside a <dl> */
export function Detail({ term, children }: DetailProps) {
  return (
    <div className="grid gap-1">
      <dt className="text-[0.87rem] font-[650] text-ink-3">{term}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  )
}

interface PeriodDetailProps {
  term: string
  period: CurrentPeriod | null
  emptyText: string
}

/** A school year or term with its days, or a line saying there is none */
export function PeriodDetail({ term, period, emptyText }: PeriodDetailProps) {
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

interface SchoolYearCardProps {
  academicYear: CurrentPeriod | null
  term: CurrentPeriod | null
}

/** The current school year and the term today falls in */
export function SchoolYearCard({ academicYear, term }: SchoolYearCardProps) {
  return (
    <SectionCard title="This school year">
      <dl className="grid grid-cols-2 gap-4 px-5 py-4 max-[560px]:grid-cols-1">
        <PeriodDetail term="School year" period={academicYear} emptyText="No school year set yet" />
        <PeriodDetail term="Term" period={term} emptyText="No term right now" />
      </dl>
    </SectionCard>
  )
}

/** Two cards of placeholder lines while a home page loads */
export function HomeSkeleton() {
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
