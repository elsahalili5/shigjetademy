import { beforeEach } from 'vitest'
import { setMailTransport } from '@lib/mailer.ts'
import { prisma } from '@lib/prisma.ts'
import { clearPlatformSettingsCache } from '@modules/platform-settings/platform-settings.service.ts'
import { clearSentEmails, recordEmail } from './fake-mailer.ts'

setMailTransport(recordEmail)

// Each test starts from empty tables, an empty outbox and a clean platform settings cache
beforeEach(async () => {
  clearSentEmails()
  clearPlatformSettingsCache()
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Group", "Course", "LecturerLocation", "Lecturer", "Student", "AcademicHoliday", "AcademicTerm", "AcademicYear", "ActivityLog", "OrganizationSettings", "PlatformSettings", "Department", "Location", "Invitation", "Membership", "Organization", "RefreshTokens", "UserTokens", "UserRole", "Role", "User" RESTART IDENTITY CASCADE',
  )
})
