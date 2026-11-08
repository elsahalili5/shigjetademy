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
