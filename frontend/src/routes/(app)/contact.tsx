import { PageHeader } from '#/components/PageHeader'
import { Demo } from '#/components/Demo'
import { ContactChannels } from '#/components/ContactChannels'
import { useTitle } from '#/lib/use-title'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/contact')({
  component: ContactPage,
})

function ContactPage() {
  useTitle('Contact · Shigjetademy')
  return (
    <>
      <PageHeader
        id="contact-page-title"
        title={
          <>
            Talk to the <em>Shigjetademy team.</em>
          </>
        }
        intro="Tell us a little about your organization and how you run your classes. We’ll get back to you to arrange a walkthrough or answer your questions."
      />
      <ContactChannels />
      <Demo />
    </>
  )
}
