/**
 * Admin routes — JSON file user DB with session-based auth.
 * Simple: no WASM, no native deps, just fs read/write.
 */
import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');
const AUDIT_FILE = join(DATA_DIR, 'audit-log.json');
const AUDIT_MAX_ENTRIES = 500;

interface User { id: number; name: string; email: string; password_hash: string; role: string; features: string; created_at: string; }
interface Session { id: string; user_id: number; expires_at: string; }
interface PublicUser { id: number; name: string; email: string; role: string; features: Record<string, boolean>; created_at: string; }
interface AuditEntry {
  ts: string;
  actor_id: number | null;
  actor_email: string | null;
  action: 'login_success' | 'login_failure' | 'logout' | 'user_created' | 'user_updated' | 'user_deleted';
  target_id: number | null;
  target_email: string | null;
  details: string | null;
}

function readJson<T>(path: string, defaultVal: T): T {
  try {
    if (!existsSync(path)) return defaultVal;
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch { return defaultVal; }
}

function writeJson(path: string, data: unknown) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  // Atomic write: serialize to <path>.tmp, fsync via close, then rename over the target.
  // POSIX rename is atomic on the same filesystem, so a crash mid-write leaves the previous
  // good file intact instead of corrupting it with a partial JSON body.
  const tmp = `${path}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, path);
  } catch (err) {
    // Best-effort cleanup of the partial tmp file so we don't accumulate orphans.
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function getUsers(): User[] { return readJson<User[]>(USERS_FILE, []); }
function saveUsers(users: User[]) { writeJson(USERS_FILE, users); }
function getSessions(): Session[] { return readJson<Session[]>(SESSIONS_FILE, []); }
function saveSessions(sessions: Session[]) { writeJson(SESSIONS_FILE, sessions); }
function getAuditLog(): AuditEntry[] { return readJson<AuditEntry[]>(AUDIT_FILE, []); }

// Append a new audit entry. Caps log to AUDIT_MAX_ENTRIES newest-first.
// Failures here must NEVER break the calling route — audit is best-effort
// observability, not a critical-path operation.
function recordAudit(entry: Omit<AuditEntry, 'ts'>): void {
  try {
    const log = getAuditLog();
    log.unshift({ ts: new Date().toISOString(), ...entry });
    if (log.length > AUDIT_MAX_ENTRIES) log.length = AUDIT_MAX_ENTRIES;
    writeJson(AUDIT_FILE, log);
  } catch { /* ignore audit write errors */ }
}

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

const requireLoginRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts. Try again later.' } },
});

export function registerAdminRoutes(app: import('express').Application) {
  const admin = Router();
  admin.use(express.json());

  // Login
  admin.post('/login', requireLoginRateLimit, (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string } || {};
    if (!email || !password) {
      recordAudit({ actor_id: null, actor_email: email || null, action: 'login_failure', target_id: null, target_email: email || null, details: 'missing credentials' });
      res.status(400).json({ error: { message: 'Email and password required.' } }); return;
    }
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      recordAudit({ actor_id: null, actor_email: email, action: 'login_failure', target_id: user?.id ?? null, target_email: email, details: 'invalid credentials' });
      res.status(401).json({ error: { message: 'Invalid credentials.' } }); return;
    }
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
    recordAudit({ actor_id: user.id, actor_email: user.email, action: 'login_success', target_id: user.id, target_email: user.email, details: null });
    res.json({ user: toPublicUser(user) });
  });

  // Logout
  admin.post('/logout', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    let actorId: number | null = null;
    let actorEmail: string | null = null;
    if (sid) {
      const sessions = getSessions();
      const sess = sessions.find(s => s.id === sid);
      if (sess) {
        actorId = sess.user_id;
        const actor = getUsers().find(u => u.id === sess.user_id);
        actorEmail = actor?.email ?? null;
      }
      saveSessions(sessions.filter(s => s.id !== sid));
    }
    res.setHeader('Set-Cookie', adminCookie('', 0));
    recordAudit({ actor_id: actorId, actor_email: actorEmail, action: 'logout', target_id: actorId, target_email: actorEmail, details: null });
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
    recordAudit({ actor_id: val.userId, actor_email: val.user.email, action: 'user_created', target_id: newUser.id, target_email: newUser.email, details: `role=${newUser.role}` });
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
    const changes: string[] = [];
    if (body.name !== undefined) { changes.push(`name`); users[idx].name = String(body.name); }
    if (body.email !== undefined) { changes.push('email'); users[idx].email = String(body.email); }
    if (body.password !== undefined) { changes.push('password'); users[idx].password_hash = hashPassword(String(body.password)); }
    if (body.role !== undefined) { changes.push(`role:${body.role}`); users[idx].role = body.role === 'admin' ? 'admin' : 'user'; }
    if (body.features !== undefined) {
      const before = parseFeatures(users[idx].features);
      const after = parseFeatures(body.features);
      const added = Object.keys(after).filter(k => after[k] === true && before[k] !== true);
      const removed = Object.keys(before).filter(k => before[k] === true && after[k] !== true);
      if (added.length || removed.length) changes.push(`features:+${added.join(',') || ''}${removed.length ? '-' + removed.join(',') : ''}`);
      users[idx].features = stringifyFeatures(body.features);
    }
    saveUsers(users);
    recordAudit({ actor_id: val.userId, actor_email: val.user.email, action: 'user_updated', target_id: users[idx].id, target_email: users[idx].email, details: changes.join(' ') || 'no-op' });
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
    const target = users.find(u => u.id === id);
    const filtered = users.filter(u => u.id !== id);
    saveUsers(filtered);
    saveSessions(getSessions().filter(s => s.user_id !== id));
    if (target) recordAudit({ actor_id: val.userId, actor_email: val.user.email, action: 'user_deleted', target_id: target.id, target_email: target.email, details: null });
    res.json({ ok: true });
  });

  // Audit log (admin only) — returns the most recent entries, newest first.
  admin.get('/audit-logs', (req, res) => {
    const sid = getSessionCookie(req.headers.cookie);
    if (!sid) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sid);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, AUDIT_MAX_ENTRIES));
    const entries = getAuditLog().slice(0, limit);
    res.json({ entries });
  });

  app.use('/api/admin', admin);
}