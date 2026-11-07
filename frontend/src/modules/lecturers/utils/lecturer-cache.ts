import type { InfiniteData } from '@tanstack/react-query'
import type { Lecturer, LecturerPage } from '@shigjetademy/shared/lecturers'

type ReplaceLecturerParams = {
  data: InfiniteData<LecturerPage, number> | undefined
  saved: Lecturer
}

/** The loaded pages with one lecturer replaced by their saved version; counts stay, since a login change doesn't move a lecturer between tabs */
export const replaceLecturer = ({ data, saved }: ReplaceLecturerParams) =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({ ...page, lecturers: page.lecturers.map((lecturer) => (lecturer.id === saved.id ? saved : lecturer)) })),
  }
