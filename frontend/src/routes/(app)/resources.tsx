import { PageHeader } from '#/components/PageHeader'
import { Faq } from '#/components/Faq'
import { useTitle } from '#/lib/use-title'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/resources')({
  component: ResourcesPage,
})

function ResourcesPage() {
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
