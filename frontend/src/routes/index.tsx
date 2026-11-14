import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireGuest } from '#/lib/route-guard'

// The site opens on the app, not the marketing pages (those live at /home): signed-in users go to their home, everyone else to log in
export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    requireGuest(context.queryClient)
    throw redirect({ to: '/login' })
  },
})
