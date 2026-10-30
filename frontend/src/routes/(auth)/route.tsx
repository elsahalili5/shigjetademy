import { Outlet, createFileRoute } from '@tanstack/react-router'

// Auth pages stand alone: no site nav or footer
export const Route = createFileRoute('/(auth)')({
  component: Outlet,
})
