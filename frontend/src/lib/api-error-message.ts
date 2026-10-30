import { isApiError } from '#/api/client'

/** Copy for a failed request: offline, the server's own message, or the fallback */
export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (isApiError(error) && !error.response) {
    return 'We couldn’t reach Shigjetademy. Check your connection and try again.'
  }
  return (isApiError(error) ? error.response?.data?.error : undefined) ?? fallback
}
