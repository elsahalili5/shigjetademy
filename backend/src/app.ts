import express from 'express'
import cors from 'cors'
import academicPeriodsRoutes from '@modules/academic-periods/academic-periods.routes.ts'
import activityRoutes from '@modules/activity/activity.routes.ts'
import authRoutes from '@modules/auth/auth.routes.ts'
import invitationRoutes from '@modules/invitations/invitations.routes.ts'
import organizationInvitationRoutes from '@modules/invitations/organization-invitations.routes.ts'
import locationRoutes from '@modules/location/location.routes.ts'
import organizationRoutes from '@modules/organization/organization.routes.ts'
import organizationSettingsRoutes from '@modules/organization-settings/organization-settings.routes.ts'
import studentHomeRoutes from '@modules/student-home/student-home.routes.ts'
import studentRoutes from '@modules/students/students.routes.ts'
import userRoutes from '@modules/users/user.routes.ts'

export const app = express()

app.use(cors())
app.use(express.json({ limit: '20kb' }))

app.use('/api/activity', activityRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/organizations', organizationRoutes)
app.use('/api/organizations', locationRoutes)
app.use('/api/organizations', academicPeriodsRoutes)
app.use('/api/organizations', organizationSettingsRoutes)
app.use('/api/organizations', studentRoutes)
app.use('/api/organizations', organizationInvitationRoutes)
app.use('/api/organizations', studentHomeRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})
