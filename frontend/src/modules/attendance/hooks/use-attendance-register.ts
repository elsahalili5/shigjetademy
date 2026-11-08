import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '../api/attendance-api'
import type { RegisterParams } from '../api/attendance-api'
import { getMsUntil } from '../utils/ms-until'
import { attendanceQueryKey } from './use-attendance-sessions'

// Asks a moment after the boundary, so the server's clock has passed it too
const REFETCH_GRACE_MS = 1000

// setTimeout fires at once for anything longer
const MAX_TIMEOUT_MS = 2_147_483_647

export const registerQueryKey = ({ organizationId, groupId, date, startTime }: RegisterParams) => [...attendanceQueryKey(organizationId), 'register', groupId, date, startTime] as const

type UseAttendanceRegisterParams = RegisterParams & {
  /** The organization's time zone, where the lesson's times are */
  timeZone: string
}

/** One session's register, asked again when the session opens and when it locks, so the page follows without a refresh */
export function useAttendanceRegister({ timeZone, ...params }: UseAttendanceRegisterParams) {
  const register = useQuery({ queryKey: registerQueryKey(params), queryFn: () => attendanceApi.register(params) })
  const opensAt = register.data?.start_time
  const locksAt = register.data?.end_time
  const { date } = params
  // Stable across renders, so the timers aren't reset by every new answer
  const refetchRegister = register.refetch

  // A timer per boundary still ahead, cleared when the register changes or the page closes
  useEffect(() => {
    if (!opensAt || !locksAt) return
    const now = new Date()
    const timers = [opensAt, locksAt]
      .map((time) => getMsUntil({ now, timeZone, day: date, time }) + REFETCH_GRACE_MS)
      .filter((ms) => ms > REFETCH_GRACE_MS && ms < MAX_TIMEOUT_MS)
      .map((ms) => window.setTimeout(() => void refetchRegister(), ms))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [opensAt, locksAt, date, timeZone, refetchRegister])

  return register
}
