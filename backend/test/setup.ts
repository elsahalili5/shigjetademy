import { beforeEach } from 'vitest'
import { prisma } from '@lib/prisma.ts'

// Each test starts from empty tables
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Student", "AcademicHoliday", "AcademicTerm", "AcademicYear", "ActivityLog", "OrganizationSettings", "Department", "Location", "Invitation", "Membership", "Organization", "RefreshTokens", "UserTokens", "UserRole", "Role", "User" RESTART IDENTITY CASCADE',
  )
})
