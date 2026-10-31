import type { InfiniteData } from '@tanstack/react-query'
import type { Student, StudentPage } from '@shigjetademy/shared/students'

/** The loaded pages with one student replaced by their saved version; counts stay, since a login change doesn't move a student between tabs */
export const replaceStudent = ({ data, saved }: { data: InfiniteData<StudentPage, number> | undefined; saved: Student }) =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({ ...page, students: page.students.map((student) => (student.id === saved.id ? saved : student)) })),
  }
