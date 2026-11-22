import { TrendingUp } from 'lucide-react'
import type { GradeOverview } from '@shigjetademy/shared/grades'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getGroupLabel } from '#/modules/grades/utils/group-label'
import { useGradeOverview } from '../hooks/use-grade-overview'
import { toReportSearch } from '../utils/report-search'
import type { ReportSearch } from '../utils/report-search'
import { getTermLabel } from '../utils/term-label'
import { GroupAveragesChart } from './group-averages-chart'
import { GroupOverviewTable } from './group-overview-table'
import { GroupReport } from './group-report'
import { OverviewStats } from './overview-stats'

const SECTION_CLASS = 'px-[clamp(20px,3.4vw,44px)]'

interface GroupOverviewProps {
  organizationId: string
  /** The picked term and group, kept in the address so a student's report links back to them */
  search: ReportSearch
  onSearchChange: (search: ReportSearch) => void
}

/** The term and group pickers, and how each group the member reaches did in that term, or one group's students */
export function GroupOverview({ organizationId, search, onSearchChange }: GroupOverviewProps) {
  const pickedTermId = search.term_id ?? null
  const pickedGroupId = search.group_id ?? null
  const overview = useGradeOverview({ organizationId, termId: pickedTermId })

  const handleTermPick = (termId: string) => onSearchChange(toReportSearch({ termId, groupId: pickedGroupId }))

  const handleGroupPick = (groupId: string | null) => onSearchChange(toReportSearch({ termId: pickedTermId, groupId }))

  if (overview.status === 'error') return <LoadError what="reports" onRetry={() => void overview.refetch()} />
  if (!overview.data) return <SkeletonRows />
  // Only a group still in the overview, so one the member lost shows the overview again
  const groupId = overview.data.groups.some(({ group }) => group.id === pickedGroupId) ? pickedGroupId : null
  return (
    <>
      <div className={`${SECTION_CLASS} flex flex-wrap items-end gap-4 pb-5`}>
        <TermPicker overview={overview.data} pickedTermId={pickedTermId} onPick={handleTermPick} />
        {overview.data.groups.length > 0 ? <GroupPicker overview={overview.data} groupId={groupId} onPick={handleGroupPick} /> : null}
      </div>
      <div className={`${SECTION_CLASS} grid gap-4 pt-4 pb-10`}>
        {groupId ? (
          <GroupReport organizationId={organizationId} groupId={groupId} termId={overview.data.term?.id ?? null} />
        ) : (
          <GroupOverviewContent overview={overview.data} isUpdating={overview.isPlaceholderData} />
        )}
      </div>
    </>
  )
}

/** The picker's value for the overview of every group */
const ALL_GROUPS = ''

interface GroupPickerProps {
  overview: GradeOverview
  groupId: string | null
  onPick: (groupId: string | null) => void
}

/** Every group at once, or one group's students */
function GroupPicker({ overview, groupId, onPick }: GroupPickerProps) {
  return (
    <div className="w-[min(100%,320px)]">
      <SelectField id="report-group-picker" label="Group" value={groupId ?? ALL_GROUPS} onChange={(event) => onPick(event.target.value === ALL_GROUPS ? null : event.target.value)}>
        <option value={ALL_GROUPS}>All groups</option>
        {overview.groups.map(({ group }) => (
          <option key={group.id} value={group.id}>
            {getGroupLabel(group)}
          </option>
        ))}
      </SelectField>
    </div>
  )
}

interface TermPickerProps {
  overview: GradeOverview
  pickedTermId: string | null
  onPick: (termId: string) => void
}

/** Picks the term the report covers; without terms, every date counts */
function TermPicker({ overview, pickedTermId, onPick }: TermPickerProps) {
  if (!overview.term) return <p className="text-ink-2">No terms are set up, so this covers every date.</p>
  return (
    <div className="w-[min(100%,320px)]">
      <SelectField id="report-term-picker" label="Term" value={pickedTermId ?? overview.term.id} onChange={(event) => onPick(event.target.value)}>
        {overview.terms.map((term) => (
          <option key={term.id} value={term.id}>
            {getTermLabel(term)}
          </option>
        ))}
      </SelectField>
    </div>
  )
}

interface GroupOverviewContentProps {
  overview: GradeOverview
  isUpdating: boolean
}

function GroupOverviewContent({ overview, isUpdating }: GroupOverviewContentProps) {
  if (overview.groups.length === 0) return <EmptyMessage icon={TrendingUp} title="No groups yet." text="Reports show here once you have a group." />
  return (
    // The last term's numbers stay up, faded, while the next term's load
    <div className={`grid gap-4 transition-opacity ${isUpdating ? 'opacity-60' : ''}`}>
      <OverviewStats overview={overview} />
      <GroupAveragesChart groups={overview.groups} />
      <GroupOverviewTable overview={overview} isUpdating={isUpdating} />
    </div>
  )
}
