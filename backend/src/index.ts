import express from 'express'
import cors from 'cors'
import { auth as authRoutes } from '@modules/auth/auth.routes.ts'
import demoRequestRoutes from '@modules/demoRequest/demoRequest.routes.ts'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '20kb' }))

app.use('/api/auth', authRoutes)
app.use('/api/demo-requests', demoRequestRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
