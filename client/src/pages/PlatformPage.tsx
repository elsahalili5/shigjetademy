import { PageHeader } from '../components/PageHeader'
import { Patchwork } from '../components/Patchwork'
import { Features } from '../components/Features'
import { Workflow } from '../components/Workflow'
import { useTitle } from '../lib/router'

export function PlatformPage() {
  useTitle('Platform · Shigjetademy')
  return (
    <>
      <PageHeader
        id="platform-page-title"
        title={
          <>
            One platform for the <em>whole term.</em>
          </>
        }
        intro="Enrolment, timetables, attendance, fees, grades and messages share the same students and the same classes, so every step feeds the next."
      />
      <Patchwork />
      <Features />
      <Workflow />
    </>
  )
}
