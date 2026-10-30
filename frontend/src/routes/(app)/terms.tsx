import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '#/components/LegalPage'

export const Route = createFileRoute('/(app)/terms')({
  component: () => <LegalPage kind="terms" />,
})
