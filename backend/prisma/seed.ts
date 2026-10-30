import 'dotenv/config'
import bcrypt from 'bcrypt'
import { prisma } from '../src/lib/prisma.ts'
import { ROLES } from '../src/lib/roles.ts'

const BCRYPT_ROUNDS = 10

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in backend/.env')
  }

  const role = await prisma.role.upsert({
    where: { name: ROLES.PLATFORM_ADMIN },
    update: {},
    create: { name: ROLES.PLATFORM_ADMIN, normalized_name: 'platform_admin', description: 'Runs the Shigjetademy platform' },
  })
  console.log('Roles created')

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      first_name: 'Platform',
      last_name: 'Admin',
      email,
      password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      status: 'ACTIVE',
      email_confirmed: true,
    },
  })
  await prisma.userRole.upsert({
    where: { user_id_role_id: { user_id: admin.id, role_id: role.id } },
    update: {},
    create: { user_id: admin.id, role_id: role.id },
  })
  console.log(`Platform admin ready: ${email}`)
}

main()
  .then(() => console.log('Seed finished'))
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
