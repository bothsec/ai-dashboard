/**
 * Admin routes — JSON file user DB with session-based auth.
 * Simple: no WASM, no native deps, just fs read/write.
 */
import { Router } from 'express';
import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');

interface User { id: number; name: string; email: string; password_hash: string; role: string; features: string; created_at: string; }
interface Session { id: string; user_id: number; expires_at: string; }
interface PublicUser { id: number; name: string; email: string; role: string; features: Record<string, boolean>; created_at: string; }

function readJson<T>(path: string, defaultVal: T): T {
  try {
    if (!existsSync(path)) return defaultVal;
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch { return defaultVal; }
}

function writeJson(path: string, data: unknown) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function getUsers(): User[] { return readJson<User[]>(USERS_FILE, []); }
function saveUsers(users: User[]) { writeJson(USERS_FILE, users); }
function getSessions(): Session[] { return readJson<Session[]>(SESSIONS_FILE, []); }
function saveSessions(sessions: Session[]) { writeJson(SESSIONS_FILE, sessions); }

const PASSWORD_HASH_PREFIX = 'scrypt';
const PASSWORD_KEYLEN = 64;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, PASSWORD_KEYLEN).toString('hex');
  return `${PASSWORD_HASH_PREFIX}:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith(`${PASSWORD_HASH_PREFIX}:`)) {
    // Legacy plaintext value. Login handler migrates it after successful auth.
    return stored === password;
  }
  const [, salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const candidate = scryptSync(password, salt, PASSWORD_KEYLEN);
  const expected = Buffer.from(storedHash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

function isPasswordHash(value: string): boolean {
  return value.startsWith(`${PASSWORD_HASH_PREFIX}:`);
}

function adminCookie(value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `session_id=${value}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function parseFeatures(features: unknown): Record<string, boolean> {
  if (!features) return {};
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, boolean>
        : {};
    } catch {
      return {};
    }
  }
  return typeof features === 'object' && !Array.isArray(features)
    ? features as Record<string, boolean>
    : {};
}

function stringifyFeatures(features: unknown): string {
  return JSON.stringify(parseFeatures(features));
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    features: parseFeatures(user.features),
    created_at: user.created_at,
  };
}

// Init default admin user
function initDefault() {
  const users = getUsers();
  if (users.length === 0) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    saveUsers([{
      id: 1,
      name: process.env.ADMIN_NAME || 'vorreakboth',
      email: process.env.ADMIN_EMAIL || 'vorreakboth@admin.local',
      password_hash: hashPassword(defaultPassword),
      role: 'admin',
      features: '{}',
      created_at: new Date().toISOString()
    }]);
    saveSessions([]);
  }
}
initDefault();

function validateSession(sessionId: string) {
  const sessions = getSessions();
  const now = new Date();
  const valid = sessions.find(s => s.id === sessionId && new Date(s.expires_at) > now);
  if (!valid) return null;
  const users = getUsers();
  const user = users.find(u => u.id === valid.user_id);
  if (!user) return null;
  return {
    userId: valid.user_id,
    user: toPublicUser(user)
  };
}

function getSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/session_id=([^;]+)/);
  return m ? m[1] : null;
}

export function registerAdminRoutes(app: import('express').Application) {
  const admin = Router();
  admin.use(express.json());

  // Login
  admin.post('/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string } || {};
    if (!email || !password) { res.status(400).json({ error: { message: 'Email and password required.' } }); return; }
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (!user || !verifyPassword(password, user.password_hash)) { res.status(401).json({ error: { message: 'Invalid credentials.' } }); return; }
    if (!isPasswordHash(user.password_hash)) {
      user.password_hash = hashPassword(password);
      saveUsers(users);
    }
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessions = getSessions();
    sessions.push({ id: sessionId, user_id: user.id, expires_at: expiresAt });
    saveSessions(sessions);
    res.setHeader('Set-Cookie', adminCookie(sessionId, 7 * 24 * 60 * 60));
    res.json({ user: toPublicUser(user) });
  });

  // Logout
  admin.post('/logout', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (sid) {
      saveSessions(getSessions().filter(s => s.id !== sid));
    }
    res.setHeader('Set-Cookie', adminCookie('', 0));
    res.json({ ok: true });
  });

  // Me
  admin.get('/me', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (!sid) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sid);
    if (!val || !val.user) { res.status(401).json({ error: { message: 'Invalid session.' } }); return; }
    res.json({ user: val.user });
  });

  // List users
  admin.get('/users', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (!sid) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sid);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    const users = getUsers();
    res.json({ users: users.map(toPublicUser) });
  });

  // Create user
  admin.post('/users', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (!sid) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sid);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    const { name, email, password, role, features } = req.body as Record<string, unknown>;
    if (!name || !email || !password) { res.status(400).json({ error: { message: 'name, email, password required.' } }); return; }
    const users = getUsers();
    if (users.some(u => u.email === email)) { res.status(409).json({ error: { message: 'Email already exists.' } }); return; }
    const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser: User = {
      id,
      name: String(name),
      email: String(email),
      password_hash: hashPassword(String(password)),
      role: role === 'admin' ? 'admin' : 'user',
      features: stringifyFeatures(features),
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    res.json({ user: toPublicUser(newUser) });
  });

  // Update user
  admin.put('/users/:id', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (!sid) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sid);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    const id = Number(req.params.id);
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) { res.status(404).json({ error: { message: 'User not found.' } }); return; }
    const body = req.body as Record<string, unknown>;
    if (body.name !== undefined) users[idx].name = String(body.name);
    if (body.email !== undefined) users[idx].email = String(body.email);
    if (body.password !== undefined) users[idx].password_hash = hashPassword(String(body.password));
    if (body.role !== undefined) users[idx].role = body.role === 'admin' ? 'admin' : 'user';
    if (body.features !== undefined) users[idx].features = stringifyFeatures(body.features);
    saveUsers(users);
    res.json({ user: toPublicUser(users[idx]) });
  });

  // Delete user
  admin.delete('/users/:id', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (!sid) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sid);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    const id = Number(req.params.id);
    if (id === val.userId) { res.status(400).json({ error: { message: 'Cannot delete yourself.' } }); return; }
    const users = getUsers();
    const filtered = users.filter(u => u.id !== id);
    saveUsers(filtered);
    saveSessions(getSessions().filter(s => s.user_id !== id));
    res.json({ ok: true });
  });

  app.use('/api/admin', admin);
}