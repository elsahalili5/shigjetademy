import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './client'

const MAX_RETRIES = 3
const FIRST_SERVER_ERROR = 500

// A 4xx answer won't change on retry (not found, forbidden), so only network and server errors are retried
const shouldRetry = (failureCount: number, error: unknown) => {
  const status = isApiError(error) ? error.response?.status : undefined
  const isClientError = status !== undefined && status < FIRST_SERVER_ERROR
  return !isClientError && failureCount < MAX_RETRIES
}

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } })
