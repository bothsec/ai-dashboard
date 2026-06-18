/**
 * Admin routes — SQLite user DB with session-based auth.
 */
import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../../data');
const DB_PATH = join(DATA_DIR, 'users.db');

let dbInstance: initSqlJs.Database | null = null;
let dbInitPromise: Promise<initSqlJs.Database> | null = null;

async function getDbInstance(): Promise<initSqlJs.Database> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file: string) => join(__dirname, '../../../node_modules/sql.js/dist', file)
    });

    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

    if (existsSync(DB_PATH)) {
      dbInstance = new SQL.Database(readFileSync(DB_PATH));
    } else {
      dbInstance = new SQL.Database();
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          features TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);
      // Default admin: vorreakboth / password "admin123"
      dbInstance.run(
        `INSERT INTO users (name, email, password_hash, role, features) VALUES (?, ?, ?, ?, ?)`,
        ['vorreakboth', 'vorreakboth@admin.local', 'admin123', 'admin', '{}']
      );
      saveDb(dbInstance);
    }
    return dbInstance;
  })();

  return dbInitPromise;
}

function saveDb(db: initSqlJs.Database) {
  try {
    const data = db.export();
    const buf = Buffer.from(data);
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DB_PATH, buf);
  } catch (e) { console.error('[Admin] saveDb failed:', e); }
}

function validateSession(sessionId: string): { userId: number; user?: { id: number; name: string; email: string; role: string; features: Record<string, boolean> } } | null {
  if (!dbInstance) return null;
  try {
    const stmt = dbInstance.prepare(`SELECT user_id, expires_at FROM sessions WHERE id = ?`);
    stmt.bind([sessionId]);
    if (!stmt.step()) { stmt.free(); return null; }
    const row = stmt.getAsObject() as { user_id: number; expires_at: string };
    stmt.free();
    if (new Date(row.expires_at) < new Date()) {
      dbInstance.run(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
      saveDb(dbInstance);
      return null;
    }
    const userStmt = dbInstance.prepare(`SELECT id, name, email, role, features FROM users WHERE id = ?`);
    userStmt.bind([row.user_id]);
    if (!userStmt.step()) { userStmt.free(); return null; }
    const user = userStmt.getAsObject() as { id: number; name: string; email: string; role: string; features: string };
    userStmt.free();
    return { userId: row.user_id, user: { ...user, features: JSON.parse(user.features || '{}') } };
  } catch { return null; }
}

function getSessionFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session_id=([^;]+)/);
  return match ? match[1] : null;
}

export function registerAdminRoutes(app: import('express').Application) {
  const adminRouter = Router();

  // Login
  adminRouter.post('/login', async (req, res) => {
    try {
      const db = await getDbInstance();
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: { message: 'Email and password required.' } });
        return;
      }
      const stmt = db.prepare(`SELECT id, name, email, password_hash, role, features FROM users WHERE email = ?`);
      stmt.bind([email]);
      if (!stmt.step()) {
        stmt.free();
        res.status(401).json({ error: { message: 'Invalid credentials.' } });
        return;
      }
      const user = stmt.getAsObject() as { id: number; name: string; email: string; password_hash: string; role: string; features: string };
      stmt.free();
      if (user.password_hash !== password) {
        res.status(401).json({ error: { message: 'Invalid credentials.' } });
        return;
      }
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      db.run(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`, [sessionId, user.id, expiresAt]);
      saveDb(db);
      res.setHeader('Set-Cookie', `session_id=${sessionId}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`);
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, features: JSON.parse(user.features || '{}') } });
    } catch (e: unknown) {
      console.error('[/api/admin/login]', e);
      res.status(500).json({ error: { message: 'Internal server error.' } });
    }
  });

  // Logout
  adminRouter.post('/logout', (req, res) => {
    const sessionId = getSessionFromCookie(req.headers.cookie);
    if (sessionId && dbInstance) {
      try {
        dbInstance.run(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
        saveDb(dbInstance);
      } catch { /* ignore */ }
    }
    res.setHeader('Set-Cookie', `session_id=; HttpOnly; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });

  // Current session user
  adminRouter.get('/me', (req, res) => {
    const sessionId = getSessionFromCookie(req.headers.cookie);
    if (!sessionId) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sessionId);
    if (!val || !val.user) { res.status(401).json({ error: { message: 'Invalid session.' } }); return; }
    res.json({ user: val.user });
  });

  // List users
  adminRouter.get('/users', async (req, res) => {
    const sessionId = getSessionFromCookie(req.headers.cookie);
    if (!sessionId) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sessionId);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    try {
      const db = await getDbInstance();
      const stmt = db.prepare(`SELECT id, name, email, role, features, created_at FROM users ORDER BY id`);
      const users: unknown[] = [];
      while (stmt.step()) users.push(stmt.getAsObject());
      stmt.free();
      const parsed = (users as Array<{ id: number; name: string; email: string; role: string; features: string; created_at: string }>).map(u => ({
        ...u, features: JSON.parse(u.features || '{}')
      }));
      res.json({ users: parsed });
    } catch (e: unknown) {
      console.error('[/api/admin/users]', e);
      res.status(500).json({ error: { message: 'Failed to fetch users.' } });
    }
  });

  // Create user
  adminRouter.post('/users', async (req, res) => {
    const sessionId = getSessionFromCookie(req.headers.cookie);
    if (!sessionId) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sessionId);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    try {
      const db = await getDbInstance();
      const { name, email, password, role, features } = req.body as { name?: string; email?: string; password?: string; role?: string; features?: string };
      if (!name || !email || !password) { res.status(400).json({ error: { message: 'name, email, password required.' } }); return; }
      db.run(`INSERT INTO users (name, email, password_hash, role, features) VALUES (?, ?, ?, ?, ?)`,
        [name, email, password, role || 'user', features || '{}']);
      saveDb(db);
      const stmt = db.prepare(`SELECT id, name, email, role, features, created_at FROM users WHERE email = ?`);
      stmt.bind([email]);
      stmt.step();
      const user = stmt.getAsObject() as { id: number; name: string; email: string; role: string; features: string; created_at: string };
      stmt.free();
      res.json({ user: { ...user, features: JSON.parse(user.features || '{}') } });
    } catch (e: unknown) {
      console.error('[/api/admin/users POST]', e);
      res.status(500).json({ error: { message: (e as Error).message || 'Failed to create user.' } });
    }
  });

  // Update user
  adminRouter.put('/users/:id', async (req, res) => {
    const sessionId = getSessionFromCookie(req.headers.cookie);
    if (!sessionId) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sessionId);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    const { id } = req.params;
    const updates: string[] = [];
    const params: unknown[] = [];
    const body = req.body as Record<string, unknown>;
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.email !== undefined) { updates.push('email = ?'); params.push(body.email); }
    if (body.password !== undefined) { updates.push('password_hash = ?'); params.push(body.password); }
    if (body.role !== undefined) { updates.push('role = ?'); params.push(body.role); }
    if (body.features !== undefined) { updates.push('features = ?'); params.push(typeof body.features === 'string' ? body.features : JSON.stringify(body.features)); }
    if (updates.length === 0) { res.status(400).json({ error: { message: 'No fields to update.' } }); return; }
    params.push(Number(id));
    try {
      const db = await getDbInstance();
      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params as any);
      saveDb(db);
      const stmt = db.prepare(`SELECT id, name, email, role, features, created_at FROM users WHERE id = ?`);
      stmt.bind([Number(id)]);
      stmt.step();
      const user = stmt.getAsObject() as { id: number; name: string; email: string; role: string; features: string; created_at: string };
      stmt.free();
      res.json({ user: { ...user, features: JSON.parse(user.features || '{}') } });
    } catch (e: unknown) {
      console.error('[/api/admin/users PUT]', e);
      res.status(500).json({ error: { message: (e as Error).message || 'Failed to update user.' } });
    }
  });

  // Delete user
  adminRouter.delete('/users/:id', async (req, res) => {
    const sessionId = getSessionFromCookie(req.headers.cookie);
    if (!sessionId) { res.status(401).json({ error: { message: 'Not authenticated.' } }); return; }
    const val = validateSession(sessionId);
    if (!val || !val.user || val.user.role !== 'admin') { res.status(403).json({ error: { message: 'Forbidden.' } }); return; }
    const { id } = req.params;
    if (Number(id) === val.userId) { res.status(400).json({ error: { message: 'Cannot delete yourself.' } }); return; }
    try {
      const db = await getDbInstance();
      db.run(`DELETE FROM sessions WHERE user_id = ?`, [Number(id)]);
      db.run(`DELETE FROM users WHERE id = ?`, [Number(id)]);
      saveDb(db);
      res.json({ ok: true });
    } catch (e: unknown) {
      console.error('[/api/admin/users DELETE]', e);
      res.status(500).json({ error: { message: 'Failed to delete user.' } });
    }
  });

  app.use('/api/admin', adminRouter);
}