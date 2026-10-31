import express from 'express'
import cors from 'cors'
import activityRoutes from '@modules/activity/activity.routes.ts'
import authRoutes from '@modules/auth/auth.routes.ts'
import locationRoutes from '@modules/location/location.routes.ts'
import organizationRoutes from '@modules/organization/organization.routes.ts'
import organizationSettingsRoutes from '@modules/organization-settings/organization-settings.routes.ts'
import userRoutes from '@modules/users/user.routes.ts'

export const app = express()

app.use(cors())
app.use(express.json({ limit: '20kb' }))

app.use('/api/activity', activityRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/organizations', organizationRoutes)
app.use('/api/organizations', locationRoutes)
app.use('/api/organizations', organizationSettingsRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})
