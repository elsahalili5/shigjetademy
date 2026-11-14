import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotificationBell } from './NotificationBell'

describe('NotificationBell', () => {
  it('shows a Notifications button', () => {
    render(<NotificationBell />)

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })
})
