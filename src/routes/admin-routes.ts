/**
 * Admin routes — JSON file user DB with session-based auth.
 * Simple: no WASM, no native deps, just fs read/write.
 */
import { Router } from 'express';
import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');

interface User { id: number; name: string; email: string; password_hash: string; role: string; features: string; created_at: string; }
interface Session { id: string; user_id: number; expires_at: string; }

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

// Init default admin user
function initDefault() {
  const users = getUsers();
  if (users.length === 0) {
    saveUsers([{
      id: 1,
      name: 'vorreakboth',
      email: 'vorreakboth@admin.local',
      password_hash: 'admin123',
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
    user: { id: user.id, name: user.name, email: user.email, role: user.role, features: JSON.parse(user.features || '{}') }
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
    if (!user || user.password_hash !== password) { res.status(401).json({ error: { message: 'Invalid credentials.' } }); return; }
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessions = getSessions();
    sessions.push({ id: sessionId, user_id: user.id, expires_at: expiresAt });
    saveSessions(sessions);
    res.setHeader('Set-Cookie', `session_id=${sessionId}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, features: JSON.parse(user.features || '{}') } });
  });

  // Logout
  admin.post('/logout', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (sid) {
      saveSessions(getSessions().filter(s => s.id !== sid));
    }
    res.setHeader('Set-Cookie', `session_id=; HttpOnly; Path=/; Max-Age=0`);
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
    res.json({ users: users.map(u => ({ ...u, features: JSON.parse(u.features || '{}') })) });
  });

  // Create user
  admin.post('/users', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (!sid) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sid);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    const { name, email, password, role, features } = req.body as Record<string, string>;
    if (!name || !email || !password) { res.status(400).json({ error: { message: 'name, email, password required.' } }); return; }
    const users = getUsers();
    const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser: User = { id, name, email, password_hash: password, role: role || 'user', features: features || '{}', created_at: new Date().toISOString() };
    users.push(newUser);
    saveUsers(users);
    res.json({ user: { ...newUser, features: JSON.parse(newUser.features || '{}') } });
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
    const body = req.body as Record<string, string>;
    if (body.name !== undefined) users[idx].name = body.name;
    if (body.email !== undefined) users[idx].email = body.email;
    if (body.password !== undefined) users[idx].password_hash = body.password;
    if (body.role !== undefined) users[idx].role = body.role;
    if (body.features !== undefined) users[idx].features = typeof body.features === 'string' ? body.features : JSON.stringify(body.features);
    saveUsers(users);
    res.json({ user: { ...users[idx], features: JSON.parse(users[idx].features || '{}') } });
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