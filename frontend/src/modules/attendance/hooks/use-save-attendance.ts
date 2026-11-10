import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AttendanceRegister, AttendanceStatus } from '@shigjetademy/shared/attendance'
import { attendanceApi } from '../api/attendance-api'
import type { RegisterParams } from '../api/attendance-api'
import { registerQueryKey } from './use-attendance-register'

/** Marks staged but not yet saved, by student id */
export type PendingMarks = Record<string, AttendanceStatus>

/** What happened to one student's pending mark once a save was attempted */
export type SaveAttendanceOutcome =
  | { studentId: string; outcome: 'saved'; student: AttendanceRegister['students'][number] }
  | { studentId: string; outcome: 'failed'; error: unknown }

/**
 * Saves every pending mark at once, independently, and writes each saved student into the register; a failed mark
 * leaves the register as it was, so the caller can keep it pending and retry. The register is asked again once every
 * save has settled, so an older answer never stays over a newer mark.
 */
export function useSaveAttendance(params: RegisterParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pendingMarks: PendingMarks): Promise<SaveAttendanceOutcome[]> => {
      const entries = Object.entries(pendingMarks)
      const results = await Promise.allSettled(entries.map(([studentId, status]) => attendanceApi.markStudent({ ...params, studentId, status })))
      return entries.map(([studentId], index) => {
        const result = results[index]
        return result.status === 'fulfilled' ? { studentId, outcome: 'saved', student: result.value } : { studentId, outcome: 'failed', error: result.reason }
      })
    },
    onSuccess: (outcomes) =>
      queryClient.setQueryData<AttendanceRegister>(registerQueryKey(params), (register) => {
        const saved = new Map(outcomes.filter((outcome) => outcome.outcome === 'saved').map((outcome) => [outcome.studentId, outcome.student]))
        return register && saved.size > 0 ? { ...register, students: register.students.map((student) => saved.get(student.id) ?? student) } : register
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: registerQueryKey(params) }),
  })
}
