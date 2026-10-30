import axios from 'axios'
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// One axios instance for every API call. The auth interceptors (access token, refresh on 401) attach here later.
export const axiosClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

export type ApiClient = {
  get<TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse>
  post<TResponse, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig<TBody>): Promise<TResponse>
  put<TResponse, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig<TBody>): Promise<TResponse>
  patch<TResponse, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig<TBody>): Promise<TResponse>
  delete<TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse>
}

type ApiEnvelope<TResponse> = { data: TResponse }

// Endpoints may wrap their payload as { data }; callers always get the payload itself
const isApiEnvelope = <TResponse>(payload: TResponse | ApiEnvelope<TResponse>): payload is ApiEnvelope<TResponse> =>
  typeof payload === 'object' && payload !== null && 'data' in payload

const getData = <TResponse>(response: AxiosResponse<TResponse | ApiEnvelope<TResponse>>) => {
  const payload = response.data
  return isApiEnvelope(payload) ? payload.data : payload
}

export const apiClient: ApiClient = {
  get: (url, config) => axiosClient.get(url, config).then(getData),
  post: (url, body, config) => axiosClient.post(url, body, config).then(getData),
  put: (url, body, config) => axiosClient.put(url, body, config).then(getData),
  patch: (url, body, config) => axiosClient.patch(url, body, config).then(getData),
  delete: (url, config) => axiosClient.delete(url, config).then(getData),
}

export const isApiError = (error: unknown): error is AxiosError<{ error?: string }> => axios.isAxiosError(error)
