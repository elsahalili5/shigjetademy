import { beforeEach } from 'vitest'
import { setMailTransport } from '@lib/mailer.ts'
import { prisma } from '@lib/prisma.ts'
import { clearSentEmails, recordEmail } from './fake-mailer.ts'

setMailTransport(recordEmail)

// Each test starts from empty tables and an empty outbox
beforeEach(async () => {
  clearSentEmails()
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Student", "AcademicHoliday", "AcademicTerm", "AcademicYear", "ActivityLog", "OrganizationSettings", "Department", "Location", "Invitation", "Membership", "Organization", "RefreshTokens", "UserTokens", "UserRole", "Role", "User" RESTART IDENTITY CASCADE',
  )
})
