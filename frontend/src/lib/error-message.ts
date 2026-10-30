import { AxiosError } from 'axios'
import { get } from 'react-hook-form'
import type { FieldErrors, FieldValues, Path } from 'react-hook-form'

const FALLBACK_MESSAGE = 'Something went wrong.'
const OFFLINE_MESSAGE = 'We couldn’t reach Shigjetademy. Check your connection and try again.'

const readString = (source: unknown, key: string): string | undefined => {
  if (typeof source !== 'object' || source === null || !(key in source)) return undefined
  const value: unknown = Reflect.get(source, key)
  return typeof value === 'string' ? value : undefined
}

/** One readable message for any error: the server's message first, then the error's own */
export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof AxiosError) {
    // No response at all means the request never reached the server
    if (!error.response) return OFFLINE_MESSAGE
    return readString(error.response.data, 'error') ?? readString(error.response.data, 'message') ?? error.message ?? FALLBACK_MESSAGE
  }

  if (error instanceof Error) {
    return error.message
  }

  return readString(error, 'error') ?? FALLBACK_MESSAGE
}

/** The first message per field from the server's validation answer ({ details: { fieldErrors } }) */
export const getFieldErrorsFromBackendError = (error: unknown): Record<string, string> => {
  if (!(error instanceof AxiosError)) {
    return {}
  }

  const details: unknown = typeof error.response?.data === 'object' && error.response.data !== null ? Reflect.get(error.response.data, 'details') : undefined
  const fieldErrors: unknown = typeof details === 'object' && details !== null ? Reflect.get(details, 'fieldErrors') : undefined
  if (typeof fieldErrors !== 'object' || fieldErrors === null) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]: [string, unknown]) => {
      const [first]: unknown[] = Array.isArray(messages) ? messages : []
      return typeof first === 'string' ? [[field, first]] : []
    }),
  )
}

type GetFieldErrorParams<TFormValues extends FieldValues> = {
  fieldName: Path<TFormValues>
  formErrors: FieldErrors<TFormValues>
  backendError: unknown
}

/** The form's own error for a field, or else the server's */
export const getFieldError = <TFormValues extends FieldValues>({ fieldName, formErrors, backendError }: GetFieldErrorParams<TFormValues>): string | undefined => {
  const formError: unknown = get(formErrors, fieldName)
  const formMessage = readString(formError, 'message')
  return formMessage ?? getFieldErrorsFromBackendError(backendError)[fieldName]
}
