import type { MouseEvent, ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { Course } from '@shigjetademy/shared/courses'
import { CLICKABLE_ROW_CLASS, ROW_ACTIONS_ATTRIBUTE, ROW_LINK_CLASS, isRowClickIgnored } from '#/lib/row-click'

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
  const navigate = useNavigate()

  // The whole row opens the course; the name stays a real link for keyboards and screen readers
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (isRowClickIgnored(event)) return
    void navigate({ to: '/dashboard/courses/$courseId', params: { courseId: course.id } })
  }

  return (
    <tr className={`border-b border-rule last:border-b-0 ${CLICKABLE_ROW_CLASS}`} onClick={handleRowClick}>
      <td className={CELL_CLASS}>
        <span className="grid gap-0.5 leading-tight">
          <Link to="/dashboard/courses/$courseId" params={{ courseId: course.id }} className={ROW_LINK_CLASS}>
            {course.name}
          </Link>
          {course.code ? <span className="text-[0.88rem] text-ink-3">{course.code}</span> : null}
          <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{getDetails(course)}</span>
        </span>
      </td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{course.level}</td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{course.department.name}</td>
      <td className={`${CELL_CLASS} w-px text-right whitespace-nowrap`} {...ROW_ACTIONS_ATTRIBUTE}>
        {actions}
      </td>
    </tr>
  )
}
