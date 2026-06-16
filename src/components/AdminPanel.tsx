import { useState, useEffect, useCallback, memo } from 'react';
import { X, UserPlus, Trash2, Shield, User, Loader2, AlertCircle } from 'lucide-react';
import { getAuthToken } from '../services/chatService';

interface UserRecord {
  id: number;
  username: string;
  role: string;
  created_at: number;
  last_login: number | null;
}

interface Props {
  onClose: () => void;
}

export const AdminPanel = memo(function AdminPanel({ onClose }: Props) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load users');
      setUsers(data.users);
    } catch (e: any) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const token = getAuthToken();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create user');
      setUsers(prev => [...prev, data.user]);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setShowCreate(false);
    } catch (e: any) {
      setCreateError(e.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }, [newUsername, newPassword, newRole]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete this user?')) return;
    setDeletingId(id);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to delete user');
      }
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Admin Panel</h2>
              <p className="text-gray-400 text-xs">User Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            aria-label="Close admin panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-400 justify-center py-8">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
                  <div className="w-9 h-9 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    {u.role === 'admin' ? (
                      <Shield className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{u.username}</p>
                    <p className="text-gray-500 text-xs">
                      {u.role === 'admin' ? 'Admin' : 'User'} · created {formatDate(u.created_at)}
                      {u.last_login ? ` · last login ${formatDate(u.last_login)}` : ''}
                    </p>
                  </div>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={deletingId === u.id}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                      aria-label={`Delete user ${u.username}`}
                    >
                      {deletingId === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create user form */}
          {showCreate && (
            <form onSubmit={handleCreate} className="mt-4 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 space-y-3">
              <h3 className="text-white text-sm font-medium">Create New User</h3>
              {createError && (
                <p className="text-red-400 text-xs">{createError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="Username"
                  autoFocus
                  className="flex-1 bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as 'user' | 'admin')}
                  className="bg-gray-900/80 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Password"
                  className="flex-1 bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={creating || !newUsername.trim() || !newPassword}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(''); }}
                  className="px-3 py-2 text-gray-400 hover:text-white text-sm rounded-lg border border-gray-600 hover:border-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!showCreate && (
          <div className="px-6 py-4 border-t border-gray-700">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        )}
      </div>
    </div>
  );
});