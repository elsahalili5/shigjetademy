// Create a login for someone, since the website has no public sign-up.
// Usage: npm run create-user -- "Full Name" email@school.edu "Organization"
// The password is typed in (not echoed) so it never lands in shell history.
import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline'
import { hashPassword, loadUsers, saveUsers } from '../src/auth.js'

const [name, rawEmail, organization] = process.argv.slice(2)
const email = (rawEmail ?? '').trim().toLowerCase()

if (!name || !organization || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run create-user -- "Full Name" email@school.edu "Organization"')
  process.exit(1)
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream }
    let shown = false
    out._writeToOutput = (s: string) => {
      if (!shown) {
        out.output.write(s)
        shown = true
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

const users = await loadUsers()
if (users.some((u) => u.email === email)) {
  console.error(`An account for ${email} already exists.`)
  process.exit(1)
}

const password = await askHidden('Password (min 8 characters): ')
if (password.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const { salt, hash } = await hashPassword(password)
users.push({ id: randomUUID(), name: name.trim(), email, organization: organization.trim(), salt, hash, createdAt: new Date().toISOString() })
await saveUsers(users)
console.log(`Created login for ${name} <${email}>.`)
