import { isApiError } from '#/api/client'

// A malformed id is refused as invalid; to the person it is a report that doesn't exist
const NOT_FOUND_STATUSES = [400, 404]

/** Whether the server answered that the record doesn't exist or isn't the member's to read, so trying again won't help */
export const isNotFoundError = (error: unknown) => isApiError(error) && NOT_FOUND_STATUSES.includes(error.response?.status ?? 0)
