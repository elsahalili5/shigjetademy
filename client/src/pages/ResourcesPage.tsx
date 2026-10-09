import { PageHeader } from '../components/PageHeader'
import { Faq } from '../components/Faq'
import { useTitle } from '../lib/router'

export function ResourcesPage() {
  useTitle('Resources · Shigjetademy')
  return (
    <>
      <PageHeader
        id="resources-page-title"
        title={
          <>
            Answers before you <em>get started.</em>
          </>
        }
        intro="Common questions about Shigjetademy, and a direct line to our team for anything else."
      />
      <Faq />
    </>
  )
}
