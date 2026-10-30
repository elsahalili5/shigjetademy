import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '#/components/LegalPage'

export const Route = createFileRoute('/(app)/privacy')({
  component: () => <LegalPage kind="privacy" />,
})
