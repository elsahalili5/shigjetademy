import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import academicPeriodsRoutes from '@modules/academic-periods/academic-periods.routes.ts'
import activityRoutes from '@modules/activity/activity.routes.ts'
import attendanceRoutes from '@modules/attendance/attendance.routes.ts'
import authRoutes from '@modules/auth/auth.routes.ts'
import courseRoutes from '@modules/courses/courses.routes.ts'
import groupRoutes from '@modules/groups/groups.routes.ts'
import guardianRoutes from '@modules/guardians/guardians.routes.ts'
import invitationRoutes from '@modules/invitations/invitations.routes.ts'
import organizationInvitationRoutes from '@modules/invitations/organization-invitations.routes.ts'
import lecturerHomeRoutes from '@modules/lecturer-home/lecturer-home.routes.ts'
import lecturerRoutes from '@modules/lecturers/lecturers.routes.ts'
import lessonPlanRoutes from '@modules/attendance/lesson-plans.routes.ts'
import locationRoutes from '@modules/location/location.routes.ts'
import myChildrenRoutes from '@modules/my-children/my-children.routes.ts'
import organizationRoutes from '@modules/organization/organization.routes.ts'
import organizationSettingsRoutes from '@modules/organization-settings/organization-settings.routes.ts'
import platformSettingsRoutes from '@modules/platform-settings/platform-settings.routes.ts'
import roomRoutes from '@modules/rooms/room.routes.ts'
import scheduleRoutes from '@modules/schedule/schedule.routes.ts'
import studentHomeRoutes from '@modules/student-home/student-home.routes.ts'
import studentRoutes from '@modules/students/students.routes.ts'
import parentNotesRoutes from '@modules/parent-notes/parent-notes.routes.ts'
import studentRosterRoutes from '@modules/student-roster/student-roster.routes.ts'
import userRoutes from '@modules/users/user.routes.ts'

export const app = express()

app.use(cors())
app.use(express.json({ limit: '20kb' }))

// Serves uploaded files (e.g. profile avatars) stored on local disk; nosniff stops a browser from
// reinterpreting a served file as something other than the content type we set for it
app.use(
  '/api/uploads',
  express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '../uploads'), {
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }),
)

app.use('/api/activity', activityRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/organizations', organizationRoutes)
app.use('/api/platform', platformSettingsRoutes)
app.use('/api/organizations', locationRoutes)
app.use('/api/organizations', roomRoutes)
app.use('/api/organizations', scheduleRoutes)
app.use('/api/organizations', academicPeriodsRoutes)
app.use('/api/organizations', organizationSettingsRoutes)
app.use('/api/organizations', studentRoutes)
app.use('/api/organizations', guardianRoutes)
app.use('/api/organizations', lecturerRoutes)
app.use('/api/organizations', courseRoutes)
app.use('/api/organizations', groupRoutes)
app.use('/api/organizations', attendanceRoutes)
app.use('/api/organizations', lessonPlanRoutes)
app.use('/api/organizations', organizationInvitationRoutes)
app.use('/api/organizations', studentHomeRoutes)
app.use('/api/organizations', lecturerHomeRoutes)
app.use('/api/organizations', myChildrenRoutes)
app.use('/api/organizations', studentRosterRoutes)
app.use('/api/organizations', parentNotesRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})
