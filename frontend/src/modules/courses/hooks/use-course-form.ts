import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { courseSchema } from '@shigjetademy/shared/courses'
import type { Course, CourseInput } from '@shigjetademy/shared/courses'

/** The course being edited, or none when adding */
export function useCourseForm(course?: Course) {
  return useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: course?.name ?? '',
      code: course?.code ?? '',
      description: course?.description ?? '',
      level: course?.level ?? '',
      department_id: course?.department.id ?? '',
    },
  })
}
