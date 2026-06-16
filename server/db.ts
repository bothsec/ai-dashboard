import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import type { User, ChatSession } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');

mkdirSync(DATA_DIR, { recursive: true });

interface UserRecord extends User {
  password_hash: string;
}

interface Database {
  users: UserRecord[];
  sessions: ChatSession[];
}

let db: Database = { users: [], sessions: [] };

function load(): void {
  if (existsSync(USERS_FILE)) {
    try {
      db = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
    } catch {
      db = { users: [], sessions: [] };
    }
  }
  // Seed admin if missing
  if (!db.users.find(u => u.username === 'admin')) {
    const hash = bcrypt.hashSync(process.env.AUTH_SECRET_TOKEN || 'admin', 10);
    db.users.push({ id: 1, username: 'admin', password_hash: hash, role: 'admin', created_at: Date.now(), last_login: null });
    save();
  }
}

function save(): void {
  writeFileSync(USERS_FILE, JSON.stringify(db, null, 2));
}

load();

// User operations
export function createUser(username: string, password: string, role: string = 'user'): User {
  if (db.users.find(u => u.username === username)) {
    throw new Error('User already exists');
  }
  const hash = bcrypt.hashSync(password, 10);
  const id = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  const user: UserRecord = { id, username, password_hash: hash, role, created_at: Date.now(), last_login: null };
  db.users.push(user);
  save();
  return { id, username, role, created_at: user.created_at, last_login: null };
}

export function verifyUser(username: string, password: string): User | null {
  const user = db.users.find(u => u.username === username);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  user.last_login = Date.now();
  save();
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at, last_login: user.last_login };
}

export function listUsers(): User[] {
  return db.users.map(({ password_hash: _, ...u }) => u);
}

export function deleteUser(id: number): void {
  db.users = db.users.filter(u => !(u.id === id && u.role !== 'admin'));
  db.sessions = db.sessions.filter(s => s.user_id !== id);
  save();
}

export function getUserById(id: number): User | null {
  const user = db.users.find(u => u.id === id);
  if (!user) return null;
  const { password_hash: _, ...u } = user;
  return u;
}

// Session operations
export function createSession(userId: number, title: string = 'New Chat'): ChatSession {
  const id = db.sessions.length > 0 ? Math.max(...db.sessions.map(s => s.id)) + 1 : 1;
  const session: ChatSession = { id, user_id: userId, title, created_at: Date.now(), updated_at: Date.now() };
  db.sessions.push(session);
  save();
  return session;
}

export function listSessions(userId: number): ChatSession[] {
  return db.sessions.filter(s => s.user_id === userId).sort((a, b) => b.updated_at - a.updated_at);
}

export function deleteSession(id: number, userId: number): void {
  db.sessions = db.sessions.filter(s => !(s.id === id && s.user_id === userId));
  save();
}

export function updateSessionTitle(id: number, userId: number, title: string): void {
  const s = db.sessions.find(s => s.id === id && s.user_id === userId);
  if (s) { s.title = title; s.updated_at = Date.now(); save(); }
}