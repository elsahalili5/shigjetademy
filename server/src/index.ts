import express from 'express'
import cors from 'cors'
import { appendFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

const ORG_TYPES = ['School', 'Academy', 'Training centre', 'Independent educator', 'Other']
const DATA_DIR = new URL('../data/', import.meta.url)

app.post('/api/demo-requests', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const text = (key: string, max = 200) => (typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, max) : '')
  const request = {
    id: randomUUID(),
    name: text('name'),
    email: text('email'),
    organization: text('organization'),
    orgType: text('orgType'),
    size: text('size'),
    createdAt: new Date().toISOString(),
  }

  if (!request.name || !request.organization || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
    res.status(400).json({ error: 'Some details are missing or invalid.' })
    return
  }
  if (!ORG_TYPES.includes(request.orgType)) {
    res.status(400).json({ error: 'Choose a valid organization type.' })
    return
  }

  try {
    await mkdir(DATA_DIR, { recursive: true })
    await appendFile(new URL('demo-requests.jsonl', DATA_DIR), JSON.stringify(request) + '\n')
    res.status(201).json({ id: request.id })
  } catch (err) {
    console.error('Could not save demo request', err)
    res.status(500).json({ error: 'The server could not save your request.' })
  }
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
