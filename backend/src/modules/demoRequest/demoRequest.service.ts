import { appendFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import type { CreateDemoRequestInput, CreateDemoRequestResponse } from '@shigjetademy/shared'
import { DATA_DIR } from '@lib/dataDir.ts'

const DEMO_REQUESTS_FILE = new URL('demo-requests.jsonl', DATA_DIR)

export const DemoRequestService = {
  createDemoRequest: async (input: Required<CreateDemoRequestInput>): Promise<CreateDemoRequestResponse> => {
    const request = { id: randomUUID(), ...input, createdAt: new Date().toISOString() }
    await mkdir(DATA_DIR, { recursive: true })
    await appendFile(DEMO_REQUESTS_FILE, JSON.stringify(request) + '\n')
    return { id: request.id }
  },
}
