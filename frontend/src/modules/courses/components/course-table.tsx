import type { ReactNode } from 'react'
import type { Course } from '@shigjetademy/shared/courses'

const HEADER_CELL_CLASS = 'px-5 py-3 text-left text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-5 py-3.5 align-middle'

// Phones keep the name and the actions; level and department show under the name instead
const WIDE_ONLY_CLASS = 'max-[640px]:hidden'

const NARROW_ONLY_CLASS = 'hidden max-[640px]:block'

/** "B2 · Sciences" */
const getDetails = (course: Course) => `${course.level} · ${course.department.name}`

interface CourseTableProps {
  courses: Course[]
  renderActions: (course: Course) => ReactNode
}

export function CourseTable({ courses, renderActions }: CourseTableProps) {
  return (
    // Scrolls sideways on narrow screens, so the row actions never wrap
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Courses">
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Name
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Level
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Department
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <CourseRow key={course.id} course={course} actions={renderActions(course)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface CourseRowProps {
  course: Course
  actions: ReactNode
}

function CourseRow({ course, actions }: CourseRowProps) {
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className={CELL_CLASS}>
        <span className="grid gap-0.5 leading-tight">
          <span className="font-semibold">{course.name}</span>
          {course.code ? <span className="text-[0.88rem] text-ink-3">{course.code}</span> : null}
          <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{getDetails(course)}</span>
        </span>
      </td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{course.level}</td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{course.department.name}</td>
      <td className={`${CELL_CLASS} w-px text-right whitespace-nowrap`}>{actions}</td>
    </tr>
  )
}
