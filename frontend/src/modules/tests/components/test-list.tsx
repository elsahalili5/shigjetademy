import { FileQuestion } from 'lucide-react'
import type { Test } from '@shigjetademy/shared/tests'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { TestItem } from './test-item'

interface TestListProps {
  organizationId: string
  timeZone: string
  status: 'pending' | 'error' | 'success'
  tests?: Test[]
  onRetry: () => void
}

/** The chosen group's tests, soonest first */
export function TestList({ organizationId, timeZone, status, tests, onRetry }: TestListProps) {
  if (status === 'error') return <LoadError what="tests" onRetry={onRetry} />
  if (!tests) return <SkeletonRows />
  if (tests.length === 0) return <EmptyMessage icon={FileQuestion} title="No tests here yet." text="Tests set for this group show here." />
  return (
    <ul className="rounded-card border border-rule" aria-label="Tests">
      {tests.map((test) => (
        <TestItem key={test.id} organizationId={organizationId} test={test} timeZone={timeZone} />
      ))}
    </ul>
  )
}
