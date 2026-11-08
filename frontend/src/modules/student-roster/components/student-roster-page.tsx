import { useId, useState } from 'react'
import { Search, Users } from 'lucide-react'
import type { RosterEntry } from '@shigjetademy/shared/student-roster'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import type { UseQueryResult } from '@tanstack/react-query'
import { useStudentRoster } from '../hooks/use-student-roster'
import { filterRoster } from '../utils/filter-roster'
import { StudentRosterTable } from './student-roster-table'

interface StudentRosterPageProps {
  organizationId: string
}

const DEFAULT_SUBTITLE = 'Your students, in the groups you currently teach.'

/** "14 students across 3 groups.", read once the roster has loaded */
const rosterSubtitle = (entries: RosterEntry[]) => {
  if (entries.length === 0) return DEFAULT_SUBTITLE
  const students = new Set(entries.map((entry) => entry.student_id)).size
  const groups = new Set(entries.map((entry) => entry.group.id)).size
  return `${students} student${students === 1 ? '' : 's'} across ${groups} group${groups === 1 ? '' : 's'}.`
}

/** A lecturer's students, one row per student per group, in the groups they currently teach */
export function StudentRosterPage({ organizationId }: StudentRosterPageProps) {
  const roster = useStudentRoster(organizationId)
  const [search, setSearch] = useState('')
  const searchId = useId()

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Users} title="Students" subtitle={roster.data ? rosterSubtitle(roster.data) : DEFAULT_SUBTITLE} />

      <div className="grid min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <SectionCard
          title="Students"
          action={
            roster.data && roster.data.length > 0 ? (
              <div className="relative w-[min(100%,300px)]">
                <label htmlFor={searchId} className="visually-hidden">
                  Search students
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" size={17} strokeWidth={2} aria-hidden="true" />
                <input
                  id={searchId}
                  type="search"
                  placeholder="Name, email or group"
                  className="min-h-10 w-full rounded-full border border-rule-strong bg-white pr-4 pl-10 text-[0.95rem] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            ) : null
          }
        >
          <StudentRosterContent roster={roster} search={search} />
        </SectionCard>
      </div>
    </div>
  )
}

interface StudentRosterContentProps {
  roster: UseQueryResult<RosterEntry[]>
  search: string
}

function StudentRosterContent({ roster, search }: StudentRosterContentProps) {
  if (roster.status === 'error') return <LoadError what="students" onRetry={() => void roster.refetch()} />
  if (!roster.data) return <SkeletonRows />
  if (roster.data.length === 0) return <EmptyMessage icon={Users} title="No students yet" text="Once you’re teaching a group with students, they’ll show up here." />

  const matches = filterRoster(roster.data, search)
  if (matches.length === 0) return <EmptyMessage icon={Search} title="No matches" text="Try a different name, email or group." />
  return <StudentRosterTable entries={matches} />
}
