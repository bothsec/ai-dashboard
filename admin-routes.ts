import type { Database } from 'sql.js';
import initSqlJs from "sql.js";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import express from "express";

const AUTH_COOKIE_NAME = "ai_auth";
const AUTH_COOKIE_MAXAGE = 86400;
const AUTH_COOKIE_MAXAGE = 86400;

export const ALL_FEATURES = {
  url_summarizer: { label: "URL Summarizer", category: "input" },
  prompt_engineer: { label: "Prompt Engineer", category: "input" },
  markdown_preview: { label: "Markdown Preview", category: "input" },
  compact_mode: { label: "Compact Mode", category: "input" },
  message_edit: { label: "Edit Last Message", category: "input" },
  message_retry: { label: "Retry Message", category: "input" },
  message_reactions: { label: "Message Reactions", category: "chat" },
  message_labels: { label: "Message Labels", category: "chat" },
  chat_branching: { label: "Chat Branching", category: "chat" },
  chat_pinning: { label: "Chat Pinning", category: "chat" },
  chat_renaming: { label: "Chat Renaming", category: "chat" },
  continue_response: { label: "Continue Response", category: "chat" },
  export_chat: { label: "Export Chat", category: "chat" },
  bookmarks: { label: "Bookmarks", category: "chat" },
  chat_search: { label: "Chat Search", category: "chat" },
  mini_mode: { label: "Mini Mode", category: "ui" },
  chat_themes: { label: "Chat Themes", category: "ui" },
  streaming_hud: { label: "Streaming HUD", category: "ui" },
  chat_stats: { label: "Chat Stats", category: "ui" },
  shortcuts: { label: "Keyboard Shortcuts", category: "ui" },
} as const;

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) throw new Error("Database not initialized — call initDatabase() first");
  return _db;
}

export async function initDatabase(): Promise<void> {
  const DATA_DIR = process.env.DATA_DIR ?? "/home/ubuntu/ai-dashboard";
  const DB_PATH = `${DATA_DIR}/users.db`;

  // Ensure data directory exists
  await import("fs").then(fs => fs.mkdirSync(DATA_DIR, { recursive: true }));

  const SQL = await initSqlJs({
    locateFile: () => require.resolve("sql.js/dist/sql-wasm.wasm"),
  });

  let raw: Buffer | null = null;
  try {
    const { readFileSync } = await import("fs");
    raw = readFileSync(DB_PATH);
  } catch {
    // DB doesn't exist yet — will be created fresh
  }

  _db = raw ? new SQL.Database(raw) : new SQL.Database();

  // Create tables
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS user_features (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, feature_name)
    )
  `);

  // Bootstrap default admin if no users exist
  const count = (_db.exec("SELECT COUNT(*) FROM users")[0]?.values[0]?.[0] as number) ?? 0;
  if (count === 0) {
    const username = process.env.AUTH_USERNAME || "admin";
    const password = process.env.AUTH_SECRET_TOKEN || "admin";
    const hash = bcrypt.hashSync(password, 10);
    _db.run(
      "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)",
      [username, hash]
    );
  }

  saveDb();
}

export function saveDb(): void {
  const DATA_DIR = process.env.DATA_DIR ?? "/home/ubuntu/ai-dashboard";
  const DB_PATH = `${DATA_DIR}/users.db`;
  const data = getDb().export();
  import("fs").then(fs => fs.writeFileSync(DB_PATH, Buffer.from(data)));
}

export async function validateSession(
  token: string
): Promise<{ userId: number; username: string; isAdmin: boolean } | null> {
  const db = getDb();
  const rows = db.exec(
    `SELECT u.id, u.username, u.is_admin FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > datetime('now') AND u.is_active = 1`,
    [token]
  );
  const row = rows[0]?.values[0];
  if (!row) return null;
  return {
    userId: row[0] as number,
    username: row[1] as string,
    isAdmin: (row[2] as number) === 1,
  };
}

export function createSession(userId: number): string {
  const db = getDb();
  const token = randomUUID();
  const expires = new Date(Date.now() + AUTH_COOKIE_MAXAGE * 1000).toISOString();
  db.run(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    [token, userId, expires]
  );
  saveDb();
  return token;
}

export function deleteSession(token: string): void {
  getDb().run("DELETE FROM sessions WHERE id = ?", [token]);
  saveDb();
}

function cookieDomain(req: express.Request): string {
  const raw = req.headers["x-forwarded-host"];
  const host = Array.isArray(raw) ? raw[0] : raw;
  const domain = typeof host === "string" ? host.split(",")[0].split(":")[0] : undefined;
  if (domain && /^(ai\.khmerjob\.tech|khmerjob\.tech|140\.238\.43\.61|localhost)$/.test(domain)) {
    return `; Domain=${domain}`;
  }
  return "";
}

export function registerAdminRoutes(app: express.Application): void {
  // ── Auth routes ──────────────────────────────────────────────────────────

  // POST /api/auth/login
  app.post("/api/auth/login", express.json(), (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: { message: "username and password required" } });
      return;
    }
    const db = getDb();
    const rows = db.exec("SELECT id, password_hash, is_admin FROM users WHERE username = ? AND is_active = 1", [username]);
    const row = rows[0]?.values[0];
    if (!row || !bcrypt.compareSync(password, row[1] as string)) {
      res.status(401).json({ error: { message: "Invalid credentials" } });
      return;
    }
    const userId = row[0] as number;
    const token = createSession(userId);
    res.setHeader(
      "Set-Cookie",
      `${AUTH_COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${AUTH_COOKIE_MAXAGE}${cookieDomain(req)}`
    );
    res.json({ ok: true, username });
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", express.json(), (req, res) => {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
    if (match) deleteSession(match[1]);
    res.setHeader(
      "Set-Cookie",
      `${AUTH_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${cookieDomain(req)}`
    );
    res.json({ ok: true });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (req, res) => {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
    if (!match) { res.status(401).json({ error: { message: "Not authenticated" } }); return; }
    const user = await validateSession(match[1]);
    if (!user) { res.status(401).json({ error: { message: "Session expired" } }); return; }
    res.json({ userId: user.userId, username: user.username, isAdmin: user.isAdmin });
  });

  // GET /api/auth/status
  app.get("/api/auth/status", (_req, res) => {
    res.json({ authRequired: true });
  });

  // ── Feature manifest ─────────────────────────────────────────────────────

  // GET /api/admin/features
  app.get("/api/admin/features", (_req, res) => {
    res.json({ features: ALL_FEATURES });
  });

  // ── Admin middleware ─────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.use("/api/admin", async (req, res, next) => {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
    if (!match) { res.status(401).json({ error: { message: "Unauthorized" } }); return; }
    const user = await validateSession(match[1]);
    if (!user) { res.status(401).json({ error: { message: "Session expired" } }); return; }
    if (!user.isAdmin) { res.status(403).json({ error: { message: "Admin access required" } }); return; }
    (req as express.Request & { user: typeof user }).user = user;
    next();
  });

  // ── User CRUD ────────────────────────────────────────────────────────────

  // GET /api/admin/users
  app.get("/api/admin/users", (_req, res) => {
    const rows = getDb().exec(
      "SELECT id, username, is_admin, is_active, created_at FROM users ORDER BY id"
    );
    const users = (rows[0]?.values ?? []).map(row => ({
      id: row[0], username: row[1], is_admin: row[2] === 1,
      is_active: row[3] === 1, created_at: row[4],
    }));
    res.json({ users });
  });

  // POST /api/admin/users
  app.post("/api/admin/users", express.json(), (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: { message: "username and password required" } });
      return;
    }
    if (username.length < 3 || password.length < 6) {
      res.status(400).json({ error: { message: "username ≥3 chars, password ≥6 chars" } });
      return;
    }
    const hash = bcrypt.hashSync(password, 10);
    try {
      getDb().run(
        "INSERT INTO users (username, password_hash, is_admin, is_active) VALUES (?, ?, 0, 1)",
        [username, hash]
      );
      const row = getDb().exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] as number;
      saveDb();
      res.json({ id: row, username, is_admin: false, is_active: true });
    } catch (e: unknown) {
      res.status(409).json({ error: { message: "Username already taken" } });
    }
  });

  // PATCH /api/admin/users/:id
  app.patch("/api/admin/users/:id", express.json(), (req, res) => {
    const id = parseInt(req.params.id);
    const { is_active, password } = req.body ?? {};
    if (is_active !== undefined) {
      getDb().run("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?", [is_active ? 1 : 0, id]);
    }
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      getDb().run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [hash, id]);
    }
    saveDb();
    res.json({ ok: true });
  });

  // DELETE /api/admin/users/:id
  app.delete("/api/admin/users/:id", (req, res) => {
    const id = parseInt(req.params.id);
    getDb().run("DELETE FROM user_features WHERE user_id = ?", [id]);
    getDb().run("DELETE FROM sessions WHERE user_id = ?", [id]);
    getDb().run("DELETE FROM users WHERE id = ?", [id]);
    saveDb();
    res.json({ ok: true });
  });

  // ── Per-user feature toggles ─────────────────────────────────────────────

  // GET /api/admin/users/:id/features
  app.get("/api/admin/users/:id/features", (req, res) => {
    const userId = parseInt(req.params.id);
    const rows = getDb().exec("SELECT feature_name, enabled FROM user_features WHERE user_id = ?", [userId]);
    const map: Record<string, boolean> = {};
    for (const [name, enabled] of rows[0]?.values ?? []) {
      map[name as string] = (enabled as number) === 1;
    }
    res.json({ features: map });
  });

  // PUT /api/admin/users/:id/features
  app.put("/api/admin/users/:id/features", express.json(), (req, res) => {
    const userId = parseInt(req.params.id);
    const { features } = req.body as { features: Record<string, boolean> };
    if (!features) { res.status(400).json({ error: { message: "features object required" } }); return; }

    // Upsert all features for this user
    for (const [name, enabled] of Object.entries(features)) {
      if (!(name in ALL_FEATURES)) continue;
      getDb().run(
        `INSERT INTO user_features (user_id, feature_name, enabled) VALUES (?, ?, ?)
         ON CONFLICT(user_id, feature_name) DO UPDATE SET enabled = excluded.enabled`,
        [userId, name, enabled ? 1 : 0]
      );
    }
    saveDb();
    res.json({ ok: true });
  });
}