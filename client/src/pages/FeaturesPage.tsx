import { PageHeader } from '../components/PageHeader'
import { Features } from '../components/Features'
import { DayTimeline } from '../components/DayTimeline'
import { useTitle } from '../lib/router'

export function FeaturesPage() {
  useTitle('Features · Shigjetademy')
  return (
    <>
      <PageHeader
        id="features-page-title"
        title={
          <>
            The tools behind <em>every class.</em>
          </>
        }
        intro="Students and enrolment, scheduling and attendance, payments and invoicing, grades, reports and messaging. Each one works with the others."
      />
      <Features />
      <DayTimeline />
    </>
  )
}
