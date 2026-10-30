import { createFileRoute, redirect } from '@tanstack/react-router'

// The dashboard opens on the first module
export const Route = createFileRoute('/dashboard/')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/$module', params: { module: 'students' } })
  },
})
