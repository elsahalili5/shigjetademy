import { apiClient, isApiError } from './client'

type UploadFormParams = {
  url: string
  /** The text fields sent beside the file */
  fields: Record<string, string>
  /** Left out for a form sent without one */
  file?: File | null
  /** post by default; put to change what was sent before */
  method?: 'post' | 'put'
}

/** The fields and the file as one multipart body; the file goes under "file" */
const toFormData = ({ fields, file }: Pick<UploadFormParams, 'fields' | 'file'>) => {
  const formData = new FormData()
  for (const [name, value] of Object.entries(fields)) formData.append(name, value)
  if (file) formData.append('file', file)
  return formData
}

/** Sends a file with the fields beside it. The client sends JSON by default; a multipart type lets the browser send the form with its boundary. */
export const uploadForm = <TResponse>({ url, fields, file, method = 'post' }: UploadFormParams) =>
  apiClient[method]<TResponse, FormData>(url, toFormData({ fields, file }), { headers: { 'Content-Type': 'multipart/form-data' } })

const readErrorMessage = (body: unknown) => {
  if (typeof body !== 'object' || body === null || !('error' in body)) return undefined
  return typeof body.error === 'string' ? body.error : undefined
}

/** A failed blob request carries its JSON error as a Blob; reading it back lets the server's message show instead of the status code */
const readBlobError = async (error: unknown) => {
  if (!isApiError(error) || !error.response || !(error.response.data instanceof Blob)) return error
  const text = await error.response.data.text()
  try {
    const body: unknown = JSON.parse(text)
    error.response.data = { error: readErrorMessage(body) ?? text }
  } catch {
    // Not JSON: the text itself is the reason
    error.response.data = { error: text || undefined }
  }
  return error
}

/** Fetches a private file through the client, so the request carries the member's token; a plain link would not */
export const downloadFile = (url: string) =>
  apiClient.get<Blob>(url, { responseType: 'blob' }).catch(async (error: unknown) => {
    throw await readBlobError(error)
  })
