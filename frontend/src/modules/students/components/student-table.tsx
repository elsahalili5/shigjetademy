import type { ReactNode } from 'react'
import { todayDay } from '@shigjetademy/shared/calendar-day'
import { getStudentName } from '@shigjetademy/shared/students'
import type { Student } from '@shigjetademy/shared/students'
import { useFormatDay } from '#/lib/use-format-date'
import { getAge } from '../utils/age'
import { StudentLoginStatus } from './student-login-status'
import type { Age } from '../utils/age'

const AGE_FORMATTERS = {
  year: new Intl.NumberFormat(undefined, { style: 'unit', unit: 'year', unitDisplay: 'long' }),
  month: new Intl.NumberFormat(undefined, { style: 'unit', unit: 'month', unitDisplay: 'long' }),
} as const satisfies Record<Age['unit'], Intl.NumberFormat>

const formatAge = (dateOfBirth: string) => {
  const age = getAge({ dateOfBirth, today: todayDay() })
  return AGE_FORMATTERS[age.unit].format(age.value)
}

const HEADER_CELL_CLASS = 'px-5 py-3 text-left text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-5 py-3.5 align-middle'

// Phones keep the name and the actions; the number shows under the name instead
const WIDE_ONLY_CLASS = 'max-[640px]:hidden'

interface StudentTableProps {
  students: Student[]
  renderActions: (student: Student) => ReactNode
}

export function StudentTable({ students, renderActions }: StudentTableProps) {
  const formatDay = useFormatDay()
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Students">
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Name
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Student number
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Age
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Enrolled on
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Login
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="border-b border-rule last:border-b-0">
              <td className={CELL_CLASS}>
                <span className="grid leading-tight">
                  <span className="font-semibold">{getStudentName(student)}</span>
                  <span className="tabular hidden text-[0.88rem] text-ink-3 max-[640px]:block">{student.student_number}</span>
                </span>
              </td>
              <td className={`${CELL_CLASS} tabular ${WIDE_ONLY_CLASS}`}>{student.student_number}</td>
              <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{student.date_of_birth ? formatAge(student.date_of_birth) : <span className="text-ink-3">Not recorded</span>}</td>
              <td className={`${CELL_CLASS} tabular ${WIDE_ONLY_CLASS}`}>{formatDay(student.enrolled_on)}</td>
              <td className={CELL_CLASS}>
                <StudentLoginStatus student={student} />
              </td>
              <td className={`${CELL_CLASS} text-right`}>{renderActions(student)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
