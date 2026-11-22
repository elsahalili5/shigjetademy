/** What /dashboard/performance and a student's report keep in the address: the picked term and group */
export type ReportSearch = {
  term_id?: string
  group_id?: string
}

type ToReportSearchParams = {
  termId: string | null
  groupId: string | null
}

/** Only the keys that have a value, so the address has no empty ones */
export const toReportSearch = ({ termId, groupId }: ToReportSearchParams): ReportSearch => ({ ...(termId ? { term_id: termId } : {}), ...(groupId ? { group_id: groupId } : {}) })

/** The term and group in the address, ignoring anything that isn't a string; the server refuses ids it doesn't know */
export const validateReportSearch = (search: Record<string, unknown>): ReportSearch =>
  toReportSearch({ termId: typeof search.term_id === 'string' ? search.term_id : null, groupId: typeof search.group_id === 'string' ? search.group_id : null })
