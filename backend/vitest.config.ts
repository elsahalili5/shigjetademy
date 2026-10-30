import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export const TEST_DATABASE_URL = 'postgresql://shigjetademy:shigjetademy@localhost:5432/shigjetademy_test'

export default defineConfig({
  resolve: {
    alias: {
      '@generated': fromRoot('./src/generated'),
      '@lib': fromRoot('./src/lib'),
      '@modules': fromRoot('./src/modules'),
      '@shared': fromRoot('./src/shared'),
    },
  },
  test: {
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    // Every file shares the one test database, so files run one at a time
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    },
  },
})
