import { useState } from 'react'
import { Archive, Award } from 'lucide-react'
import type { Gradebook, GradeGroup } from '@shigjetademy/shared/grades'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { StatusTabs } from '#/components/StatusTabs'
import { useGradebook } from '../hooks/use-gradebook'
import { useGradeGroups } from '../hooks/use-grade-groups'
import { filterGradebook, getGradebookFilterCounts, GRADEBOOK_AVERAGE_LABELS, GRADEBOOK_FILTER_LABELS, GRADEBOOK_FILTERS } from '../utils/gradebook-filter'
import type { GradebookFilter } from '../utils/gradebook-filter'
import { GradebookTable } from './gradebook-table'

interface GroupGradesProps {
  organizationId: string
}

/** For lecturers and staff: the gradebook of the groups they reach, one at a time */
export function GroupGrades({ organizationId }: GroupGradesProps) {
  const groups = useGradeGroups(organizationId)

  if (groups.status === 'error') return <LoadError what="groups" onRetry={() => void groups.refetch()} />
  if (!groups.data) return <SkeletonRows />
  if (groups.data.length === 0) return <EmptyMessage icon={Award} title="No groups yet." text="Grades show here once you have a group." />
  return <PickedGroupGrades organizationId={organizationId} groups={groups.data} />
}

interface PickedGroupGradesProps extends GroupGradesProps {
  groups: GradeGroup[]
}

const groupLabel = (group: GradeGroup) => `${group.name} · ${group.course_name}${group.is_archived ? ' (archived)' : ''}`

/** The group picker, and the chosen group's gradebook under it */
function PickedGroupGrades({ organizationId, groups }: PickedGroupGradesProps) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const group = groups.find((item) => item.id === pickedId) ?? groups[0]

  return (
    <>
      <div className="px-[clamp(20px,3.4vw,44px)] pb-5">
        <div className="w-[min(100%,320px)]">
          <SelectField id="grade-group-picker" label="Group" value={group.id} onChange={(event) => setPickedId(event.target.value)}>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>
                {groupLabel(item)}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <div className="grid gap-4 px-[clamp(20px,3.4vw,44px)] pt-4 pb-10">
        {group.is_archived ? (
          <p className="flex items-center gap-2 rounded-xl bg-kraft-wash px-4 py-3 font-[550] text-kraft-ink">
            <Archive size={17} strokeWidth={2} aria-hidden="true" />
            This group is archived. Its grades stay readable.
          </p>
        ) : null}
        <GroupGradebook organizationId={organizationId} groupId={group.id} />
      </div>
    </>
  )
}

interface GroupGradebookProps {
  organizationId: string
  groupId: string
}

function GroupGradebook({ organizationId, groupId }: GroupGradebookProps) {
  const gradebook = useGradebook({ organizationId, groupId })

  if (gradebook.status === 'error') return <LoadError what="gradebook" onRetry={() => void gradebook.refetch()} />
  if (!gradebook.data) return <SkeletonRows />
  if (gradebook.data.columns.length === 0) return <EmptyMessage icon={Award} title="No marks here yet." text="Assignments with points and tests show here, and fill in as you mark them." />
  if (gradebook.data.rows.length === 0) return <EmptyMessage icon={Award} title="No students in this group." text="Students enrolled in the group show here." />
  return <FilteredGradebook gradebook={gradebook.data} />
}

interface FilteredGradebookProps {
  gradebook: Gradebook
}

/** The gradebook, with tabs to show only its assignments or only its tests when it has both */
function FilteredGradebook({ gradebook }: FilteredGradebookProps) {
  const [filter, setFilter] = useState<GradebookFilter>('ALL')
  const counts = getGradebookFilterCounts(gradebook)
  const hasBothKinds = counts.ASSIGNMENT > 0 && counts.TEST > 0
  // Another group may lack the kind picked before, so it shows everything
  const shownFilter = hasBothKinds ? filter : 'ALL'

  return (
    <>
      {hasBothKinds ? (
        <StatusTabs label="Show columns" statuses={GRADEBOOK_FILTERS} labels={GRADEBOOK_FILTER_LABELS} counts={counts} current={shownFilter} onChange={setFilter} />
      ) : null}
      <GradebookTable gradebook={filterGradebook({ gradebook, filter: shownFilter })} averageLabel={GRADEBOOK_AVERAGE_LABELS[shownFilter]} />
    </>
  )
}
