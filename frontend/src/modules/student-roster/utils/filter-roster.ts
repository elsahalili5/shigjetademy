import type { RosterEntry } from '@shigjetademy/shared/student-roster'
import { getStudentName } from '@shigjetademy/shared/students'

/** Entries whose name, email or group contain every word of the search, in any case */
export const filterRoster = (entries: RosterEntry[], search: string) => {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return entries
  return entries.filter((entry) => {
    const haystack = `${getStudentName(entry)} ${entry.email ?? ''} ${entry.group.name}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

/** Entries of one group, or all of them when no group is picked */
export const filterRosterByGroup = (entries: RosterEntry[], groupId: string) => (groupId ? entries.filter((entry) => entry.group.id === groupId) : entries)

type RosterGroup = RosterEntry['group']

/** The groups the entries belong to, each once, by name, for the group filter */
export const getRosterGroups = (entries: RosterEntry[]): RosterGroup[] => {
  const groups = new Map<string, RosterGroup>()
  for (const { group } of entries) groups.set(group.id, group)
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
}
