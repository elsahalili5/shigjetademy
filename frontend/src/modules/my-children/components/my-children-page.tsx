import { ChevronRight, UsersRound } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { MyChild } from '@shigjetademy/shared/guardians'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useMyChildren } from '../hooks/use-my-children'

interface MyChildrenPageProps {
  organizationId: string
  organizationName: string
}

/** A guardian's home: the children linked to them, each opening their own page */
export function MyChildrenPage({ organizationId, organizationName }: MyChildrenPageProps) {
  const children = useMyChildren(organizationId)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={UsersRound} title="My children" subtitle={organizationName} />
      <div className="grid max-w-[880px] gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <SectionCard title="Children">
          <ChildList status={children.status} items={children.data} onRetry={() => void children.refetch()} />
        </SectionCard>
      </div>
    </div>
  )
}

interface ChildListProps {
  status: 'pending' | 'error' | 'success'
  items?: MyChild[]
  onRetry: () => void
}

function ChildList({ status, items, onRetry }: ChildListProps) {
  if (status === 'error') return <LoadError what="your children" onRetry={onRetry} />
  if (!items) return <SkeletonRows />
  if (items.length === 0) return <EmptyMessage icon={UsersRound} title="No children linked yet." text="When your school links a child to you, they show up here." />
  return (
    <ul aria-label="Children">
      {items.map((child) => (
        <li key={child.id} className="border-b border-rule last:border-b-0">
          <Link
            to="/dashboard/my-children/$studentId"
            params={{ studentId: child.id }}
            className="flex items-center justify-between gap-3 px-5 py-4 font-semibold text-ink no-underline transition-colors duration-150 hover:bg-mist"
          >
            {child.first_name} {child.last_name}
            <ChevronRight size={18} strokeWidth={1.9} className="text-ink-3" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
