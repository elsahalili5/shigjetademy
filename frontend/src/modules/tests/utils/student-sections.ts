import type { StudentTest } from '@shigjetademy/shared/tests'

type SplitStudentTestsParams = {
  /** Soonest first, as the server lists them */
  tests: StudentTest[]
  now: Date
}

/** Upcoming (not held yet) soonest first, and Past latest first */
export const splitStudentTests = ({ tests, now }: SplitStudentTestsParams) => ({
  upcoming: tests.filter((test) => new Date(test.held_at) > now),
  past: tests.filter((test) => new Date(test.held_at) <= now).reverse(),
})
