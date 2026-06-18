/* eslint-disable react-refresh/only-export-components */
import React, { memo, useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Trash2, Edit2, Check, Loader2, LogOut, Users, Shield } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const FEATURE_FLAGS = [
  { key: 'youtube',     label: 'YouTube Transcript' },
  { key: 'twitter',    label: 'Twitter Integration' },
  { key: 'urlSummarize', label: 'URL Summarizer' },
  { key: 'imageGen',   label: 'Image Generation' },
  { key: 'pdfExport',  label: 'PDF Export' },
  { key: 'codeExport', label: 'Code Export' },
  { key: 'webSearch',  label: 'Web Search' },
  { key: 'voiceInput', label: 'Voice Input' },
  { key: 'autoPlay',   label: 'Auto Play' },
  { key: 'multiModel', label: 'Multi-Model Toggle' },
] as const;

interface User {
  id: number; name: string; email: string; role: string;
  features: Record<string, boolean>;
}

interface Props { onClose: () => void; }

export const AdminDashboard = memo(function AdminDashboard({ onClose }: Props) {
  const { khLang } = useSettings();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginEmail, setLoginEmail] = useState('vorreakboth@admin.local');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({});

  const t = (en: string, kh?: string) => (khLang && kh ? kh : en);

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/users', { credentials: 'include' });
      if (r.status === 401) { setUser(null); return; }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `HTTP ${r.status}`);
      setUsers((await r.json()).users);
    } catch (e: unknown) { setError((e as Error).message); }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/me', { credentials: 'include' });
      if (r.status === 401) { setUser(null); setLoading(false); return; }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `HTTP ${r.status}`);
      const data = await r.json();
      setUser(data.user);
      await fetchUsers();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [fetchUsers]);

  useEffect(() => { checkSession(); }, [checkSession]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true); setError('');
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `HTTP ${r.status}`);
      const data = await r.json();
      setUser(data.user);
      await fetchUsers();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoggingIn(false); }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setUser(null); setUsers([]);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) { setError(t('All fields required','Field Required')); return; }
    setCreating(true); setError('');
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, features: {} }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `HTTP ${r.status}`);
      const data = await r.json();
      setUsers(prev => [...prev, data.user]);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setShowCreate(false);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setCreating(false); }
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm(t('Delete this user?','Confirm Delete'))) return;
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `HTTP ${r.status}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const startEdit = (u: User) => { setEditingId(u.id); setEditFeatures({ ...u.features }); };
  const cancelEdit = () => { setEditingId(null); setEditFeatures({}); };
  const toggleFeature = (key: string) => { setEditFeatures(prev => ({ ...prev, [key]: !prev[key] })); };

  const saveEdit = async (id: number) => {
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: editFeatures }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `HTTP ${r.status}`);
      const data = await r.json();
      setUsers(prev => prev.map(u => u.id === id ? data.user : u));
      setEditingId(null);
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const panelClass = 'bg-gray-900 border border-gray-700/50 text-gray-200';
  const inputClass = 'bg-gray-800 border-gray-700 text-gray-200 focus:border-indigo-500 focus:outline-none';
  const borderClass = 'border-gray-700/50';

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 ${panelClass}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-gray-200">Admin Login</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={login} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">Email</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
                className={`w-full px-3 py-2 rounded-lg text-sm border ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">Password</label>
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required
                className={`w-full px-3 py-2 rounded-lg text-sm border ${inputClass}`} />
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loggingIn}
              className="w-full py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              {loggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl ${panelClass}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderClass}`}>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Admin Dashboard</h2>
              <p className="text-xs text-gray-500">Signed in as {user.name} ({user.email})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
              <LogOut className="w-3.5 h-3.5" />Logout
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={`flex items-center justify-between px-6 py-3 border-b ${borderClass}`}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-300">{users.length} user(s)</span>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium">
            <UserPlus className="w-3.5 h-3.5" />Add User
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 px-4 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error} <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
            </div>
          )}

          {showCreate && (
            <div className="mx-6 mt-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
              <h3 className="text-sm font-semibold mb-3 text-gray-200">Create New User</h3>
              <form onSubmit={createUser} className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Name" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${inputClass}`} />
                <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${inputClass}`} />
                <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${inputClass}`} />
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${inputClass}`}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="col-span-2 flex items-center gap-2 justify-end">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200">Cancel</button>
                  <button type="submit" disabled={creating}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium disabled:opacity-60">
                    {creating && <Loader2 className="w-3 h-3 animate-spin" />}Create
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="p-6 space-y-3">
            {users.map(u => (
              <div key={u.id} className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-500/20 text-gray-400'}`}>
                      {u.role}
                    </span>
                  </div>
                  {user.id !== u.id && (
                    <div className="flex items-center gap-1">
                      {editingId === u.id ? (
                        <>
                          <button onClick={() => saveEdit(u.id)} className="p-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors" title="Save"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEdit} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors" title="Edit features"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {editingId === u.id ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FEATURE_FLAGS.map(flag => (
                      <button key={flag.key} onClick={() => toggleFeature(flag.key)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${editFeatures[flag.key]
                          ? 'bg-green-500/15 border-green-500/30 text-green-300' : 'bg-gray-700/50 border-gray-600/50 text-gray-400'}`}>
                        {editFeatures[flag.key] && <Check className="w-3 h-3" />}
                        {flag.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {FEATURE_FLAGS.filter(f => u.features?.[f.key]).map(flag => (
                      <span key={flag.key} className="px-2 py-0.5 rounded text-[10px] bg-green-500/15 text-green-300 border border-green-500/20">{flag.label}</span>
                    ))}
                    {Object.values(u.features || {}).every(v => !v) && (
                      <span className="text-xs text-gray-600">— All features disabled</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});