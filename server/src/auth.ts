import { Router } from 'express'
import type { Request, Response } from 'express'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

// Minimal email + password auth. There is no public sign-up: accounts are created with
// `npm run create-user` (see scripts/create-user.ts). Passwords are hashed with scrypt and a per-user salt;
// sessions are random tokens in an httpOnly cookie, held in memory (they reset when the server restarts).

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

export type User = {
  id: string
  name: string
  email: string
  organization: string
  salt: string
  hash: string
  createdAt: string
}

const DATA_DIR = new URL('../data/', import.meta.url)
const USERS_FILE = new URL('users.json', DATA_DIR)
const COOKIE = 'sgj_session'
const SESSION_DAYS = 14
const KEYLEN = 64

const sessions = new Map<string, { userId: string; expires: number }>()

// Simple in-memory rate limit on failed logins, per email and per IP
const failures = new Map<string, { count: number; until: number }>()
const MAX_FAILS = 5
const LOCK_MS = 10 * 60 * 1000

export async function loadUsers(): Promise<User[]> {
  try {
    return JSON.parse(await readFile(USERS_FILE, 'utf8')) as User[]
  } catch {
    return []
  }
}

// Writes are serialized so two sign-ups at once cannot overwrite each other
let writeQueue: Promise<unknown> = Promise.resolve()
export function saveUsers(users: User[]) {
  writeQueue = writeQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(USERS_FILE, JSON.stringify(users, null, 2))
  })
  return writeQueue
}

export async function hashPassword(password: string, salt = randomBytes(16)) {
  const hash = await scrypt(password, salt, KEYLEN)
  return { salt: salt.toString('hex'), hash: hash.toString('hex') }
}

async function verifyPassword(password: string, user: User) {
  const hash = await scrypt(password, Buffer.from(user.salt, 'hex'), KEYLEN)
  const stored = Buffer.from(user.hash, 'hex')
  return stored.length === hash.length && timingSafeEqual(stored, hash)
}

function readCookie(req: Request, name: string) {
  const header = req.headers.cookie ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

function startSession(res: Response, userId: string) {
  const token = randomBytes(32).toString('hex')
  const maxAge = SESSION_DAYS * 24 * 60 * 60 * 1000
  sessions.set(token, { userId, expires: Date.now() + maxAge })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
  })
}

function currentUserId(req: Request) {
  const token = readCookie(req, COOKIE)
  if (!token) return null
  const s = sessions.get(token)
  if (!s || s.expires < Date.now()) {
    if (s) sessions.delete(token)
    return null
  }
  return s.userId
}

const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, organization: u.organization })

const text = (body: Record<string, unknown>, key: string, max = 200) =>
  typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, max) : ''

function locked(key: string) {
  const f = failures.get(key)
  return !!f && f.count >= MAX_FAILS && f.until > Date.now()
}

function noteFailure(key: string) {
  const f = failures.get(key)
  const count = f && f.until > Date.now() ? f.count + 1 : 1
  failures.set(key, { count, until: Date.now() + LOCK_MS })
}

export const auth = Router()

auth.post('/login', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const email = text(body, 'email').toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const keys = [`e:${email}`, `ip:${req.ip}`]

  if (keys.some(locked)) {
    res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
    return
  }

  const user = (await loadUsers()).find((u) => u.email === email)
  // Same message for unknown email and wrong password, so accounts cannot be discovered
  if (!user || !(await verifyPassword(password, user))) {
    keys.forEach(noteFailure)
    res.status(401).json({ error: 'That email and password don’t match an account.' })
    return
  }

  keys.forEach((k) => failures.delete(k))
  startSession(res, user.id)
  res.json({ user: publicUser(user) })
})

auth.get('/me', async (req, res) => {
  const id = currentUserId(req)
  const user = id ? (await loadUsers()).find((u) => u.id === id) : null
  if (!user) {
    res.status(401).json({ user: null })
    return
  }
  res.json({ user: publicUser(user) })
})

auth.post('/logout', (req, res) => {
  const token = readCookie(req, COOKIE)
  if (token) sessions.delete(token)
  res.clearCookie(COOKIE, { path: '/' })
  res.status(204).end()
})
