import React, { useState, useEffect, useCallback } from 'react';

interface User {
  id: number;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface FeatureMeta { label: string; category: string; }
type FeatureMap = Record<string, FeatureMeta>;

const CATEGORIES = ['input', 'chat', 'ui'] as const;
const CAT_LABELS: Record<string, string> = { input: '✏️ Input', chat: '💬 Chat', ui: '🖥️ UI' };

// ── API helpers ──────────────────────────────────────────────────────────────
async function api(path: string, opts?: RequestInit & { noAuth?: boolean }) {
  const { noAuth: _n, ...fetchOpts } = opts ?? {};
  const r = await fetch(path, { credentials: 'include', ...fetchOpts });
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`);
  return j;
}

// ── Section tabs ────────────────────────────────────────────────────────────
function SectionTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

// ── Users section ──────────────────────────────────────────────────────────
function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api('/api/admin/users') as { users: User[] };
      setUsers(d.users ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (tab === 'list') load(); }, [tab, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg('');
    try {
      await api('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: newUsername, password: newPassword }) });
      setMsg('User created');
      setNewUsername('');
      setNewPassword('');
      setTab('list');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(u: User) {
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !u.is_active }) });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function deleteUser(u: User) {
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab('list')} className={`px-3 py-1.5 text-sm rounded-t ${tab === 'list' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500'}`}>List</button>
        <button onClick={() => setTab('create')} className={`px-3 py-1.5 text-sm rounded-t ${tab === 'create' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500'}`}>+ New User</button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded">{error}</div>}
      {msg && <div className="bg-green-50 text-green-600 text-sm p-2 rounded">{msg}</div>}

      {tab === 'list' ? (
        loading ? <div className="py-8 text-center text-gray-400">Loading…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">User</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Created</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium">{u.username}</td>
                  <td className="py-2">{u.is_admin ? <span className="text-purple-600 text-xs font-medium px-1.5 py-0.5 bg-purple-50 rounded">admin</span> : <span className="text-gray-400 text-xs">user</span>}</td>
                  <td className="py-2"><span className={`text-xs px-1.5 py-0.5 rounded ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{u.is_active ? 'active' : 'disabled'}</span></td>
                  <td className="py-2 text-gray-400">{u.created_at.split(' ')[0]}</td>
                  <td className="py-2 flex gap-2">
                    <button onClick={() => toggleActive(u)} className={`text-xs px-2 py-1 rounded ${u.is_active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>{u.is_active ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => deleteUser(u)} className="text-xs px-2 py-1 rounded text-red-600 bg-red-50 hover:bg-red-100">Delete</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-400">No users yet</td></tr>}
            </tbody>
          </table>
        )
      ) : (
        <form onSubmit={create} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} required minLength={3} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="username" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="min 6 characters" />
          </div>
          <button type="submit" disabled={creating} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded hover:bg-blue-700 disabled:opacity-50">{creating ? 'Creating…' : 'Create User'}</button>
        </form>
      )}
    </div>
  );
}

// ── Feature toggles section ────────────────────────────────────────────────
function FeaturesSection() {
  const [features, setFeatures] = useState<FeatureMap>({});
  const [userFeatures, setUserFeatures] = useState<Record<string, boolean>>({});
  const [userList, setUserList] = useState<User[]>([]);
  const [selUser, setSelUser] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const [fData, uData] = await Promise.all([
        api('/api/admin/features') as Promise<{ features: FeatureMap }>,
        api('/api/admin/users') as Promise<{ users: User[] }>,
      ]);
      setFeatures(fData.features);
      setUserList(uData.users);
      if (uData.users.length > 0 && !selUser) setSelUser(uData.users[0].id);
    })().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selUser) return;
    (async () => {
      try {
        const d = await api(`/api/admin/users/${selUser}/features`) as { features: Record<string, boolean> };
        setUserFeatures(d.features ?? {});
      } catch {
        // user has no custom features yet
        setUserFeatures({});
      }
    })();
  }, [selUser]);

  async function toggleFeature(name: string) {
    const next = { ...userFeatures, [name]: !userFeatures[name] };
    setUserFeatures(next);
    setSaving(true);
    setMsg('');
    try {
      await api(`/api/admin/users/${selUser}/features`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features: next }) });
      setMsg('Saved');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-3">
      {msg && <div className={`text-sm p-2 rounded ${msg === 'Saved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{msg}</div>}

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">User:</label>
        <select value={selUser ?? ''} onChange={e => setSelUser(Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {userList.map(u => <option key={u.id} value={u.id}>{u.username} {u.is_admin ? '(admin)' : ''}</option>)}
        </select>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
      </div>

      {CATEGORIES.map(cat => {
        const feats = Object.entries(features).filter(([, m]) => m.category === cat);
        if (feats.length === 0) return null;
        return (
          <div key={cat}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">{CAT_LABELS[cat]}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {feats.map(([name, meta]) => {
                const enabled = name in userFeatures ? userFeatures[name] : true;
                return (
                  <button
                    key={name}
                    onClick={() => toggleFeature(name)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      enabled ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs flex-shrink-0 ${enabled ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                      {enabled ? '✓' : ''}
                    </span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Admin dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [section, setSection] = useState<'users' | 'features'>('users');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">⚙️ Admin Panel</h1>
          <p className="text-xs text-gray-400">Manage users and feature access</p>
        </div>
        <a href="/" className="text-sm text-blue-600 hover:text-blue-700">← Back to Chat</a>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b px-4 flex gap-1">
        <SectionTab label="Users" active={section === 'users'} onClick={() => setSection('users')} />
        <SectionTab label="Feature Toggles" active={section === 'features'} onClick={() => setSection('features')} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4">
          {section === 'users' ? <UsersSection /> : <FeaturesSection />}
        </div>
      </div>
    </div>
  );
}