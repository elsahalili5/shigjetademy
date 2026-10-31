import { beforeEach } from 'vitest'
import { prisma } from '@lib/prisma.ts'

// Each test starts from empty tables
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "AcademicHoliday", "AcademicTerm", "AcademicYear", "ActivityLog", "Department", "Location", "Invitation", "Membership", "Organization", "RefreshTokens", "UserTokens", "UserRole", "Role", "User" RESTART IDENTITY CASCADE',
  )
})
