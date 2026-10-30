import { execSync } from 'node:child_process'
import pg from 'pg'
import { TEST_DATABASE_URL } from '../vitest.config.ts'

const TEST_DATABASE_NAME = 'shigjetademy_test'

// Creates the test database once and brings it to the latest migration
export default async function globalSetup() {
  const adminUrl = TEST_DATABASE_URL.replace(`/${TEST_DATABASE_NAME}`, '/postgres')
  const client = new pg.Client({ connectionString: adminUrl })
  await client.connect()
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DATABASE_NAME])
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`)
  }
  await client.end()

  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL } })
}
