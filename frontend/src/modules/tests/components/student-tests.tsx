import { useId, useState } from 'react'
import { FileQuestion } from 'lucide-react'
import type { StudentTest } from '@shigjetademy/shared/tests'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useMyTests } from '../hooks/use-my-tests'
import { splitStudentTests } from '../utils/student-sections'
import { StudentTestItem } from './student-test-item'

interface StudentTestsProps {
  organizationId: string
}

/** For students: every group's tests in one place, Upcoming first and Past under it */
export function StudentTests({ organizationId }: StudentTestsProps) {
  const tests = useMyTests(organizationId)
  // The moment the page opened, read once, so rendering stays pure
  const [now] = useState(() => new Date())

  if (tests.status === 'error') return <LoadError what="tests" onRetry={() => void tests.refetch()} />
  if (!tests.data) return <SkeletonRows />
  if (tests.data.length === 0) return <EmptyMessage icon={FileQuestion} title="No tests yet." text="Tests set for your groups show here." />
  const { upcoming, past } = splitStudentTests({ tests: tests.data, now })
  return (
    <div className="grid gap-6 px-[clamp(20px,3.4vw,44px)] pb-10">
      <StudentTestSection title="Upcoming" emptyText="No tests coming up." tests={upcoming} isPast={false} />
      <StudentTestSection title="Past" emptyText="No tests held yet." tests={past} isPast />
    </div>
  )
}

interface StudentTestSectionProps {
  title: string
  emptyText: string
  tests: StudentTest[]
  isPast: boolean
}

function StudentTestSection({ title, emptyText, tests, isPast }: StudentTestSectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2.5 font-data text-[0.84rem] tracking-[0.06em] text-ink-2 uppercase">
        {title}
      </h2>
      {tests.length === 0 ? (
        <p className="rounded-card border border-rule px-5 py-4 text-ink-2">{emptyText}</p>
      ) : (
        <ul className="rounded-card border border-rule">
          {tests.map((test) => (
            <StudentTestItem key={test.id} test={test} isPast={isPast} />
          ))}
        </ul>
      )}
    </section>
  )
}
