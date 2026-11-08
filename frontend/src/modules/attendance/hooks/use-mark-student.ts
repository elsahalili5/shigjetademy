import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AttendanceRegister, AttendanceStatus } from '@shigjetademy/shared/attendance'
import { attendanceApi } from '../api/attendance-api'
import type { RegisterParams } from '../api/attendance-api'
import { registerQueryKey } from './use-attendance-register'

type UseMarkStudentParams = RegisterParams & {
  studentId: string
}

/**
 * Saves one student's mark and writes the saved student into the register; a failed save leaves the register as it was.
 * The register is asked again once the save settles, so an older answer never stays over a newer mark.
 */
export function useMarkStudent({ studentId, ...params }: UseMarkStudentParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: AttendanceStatus) => attendanceApi.markStudent({ ...params, studentId, status }),
    onSuccess: (saved) =>
      queryClient.setQueryData<AttendanceRegister>(registerQueryKey(params), (register) =>
        register ? { ...register, students: register.students.map((student) => (student.id === saved.id ? saved : student)) } : register,
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: registerQueryKey(params) }),
  })
}
