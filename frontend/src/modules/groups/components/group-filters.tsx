import { useId } from 'react'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import type { CourseOption } from '@shigjetademy/shared/courses'
import { SelectField } from '#/components/SelectField'
import { getCourseOptionLabel } from '../utils/course-option-label'

/** The chosen course and year; '' for any */
export type GroupListFilters = {
  courseId: string
  yearId: string
}

interface GroupFiltersProps {
  filters: GroupListFilters
  courses: CourseOption[]
  years: AcademicYear[]
  onChange: (filters: GroupListFilters) => void
}

/** Narrows the list to one course, one school year, or both */
export function GroupFilters({ filters, courses, years, onChange }: GroupFiltersProps) {
  const ids = { course: useId(), year: useId() }
  return (
    <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1" role="group" aria-label="Filters">
      <SelectField id={ids.course} label="Filter by course" value={filters.courseId} onChange={(event) => onChange({ ...filters, courseId: event.target.value })}>
        <option value="">All courses</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {getCourseOptionLabel(course)}
          </option>
        ))}
      </SelectField>
      <SelectField id={ids.year} label="Filter by school year" value={filters.yearId} onChange={(event) => onChange({ ...filters, yearId: event.target.value })}>
        <option value="">All school years</option>
        {years.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
          </option>
        ))}
      </SelectField>
    </div>
  )
}
