import { useState, useEffect, useCallback, memo } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { setAuthToken } from '../services/chatService';
import { KhmerAiLogo } from './KhmerAiLogo';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate = memo(function AuthGate({ children }: AuthGateProps) {
  const [authRequired, setAuthRequired] = useState<boolean | null>(null); // null = loading
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already authenticated via cookie on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          // Already logged in via cookie
          if (!cancelled) setAuthRequired(false);
        } else if (res.status === 401) {
          // Not authenticated — check if auth is required at all
          const statusRes = await fetch('/api/auth/status');
          if (!cancelled) {
            if (!statusRes.ok) {
              // Auth status endpoint is down — fail closed for safety
              setAuthRequired(true);
              return;
            }
            const data = await statusRes.json().catch(() => ({ authRequired: true }));
            setAuthRequired(data.authRequired ?? true);
          }
        } else {
          // Unexpected non-OK status — treat as auth required
          if (!cancelled) setAuthRequired(true);
        }
      } catch {
        if (!cancelled) {
          // Network error — fail closed (require auth on reconnect)
          setAuthRequired(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Store token in memory for API calls (cookie handles persistence)
        if (data.authEnabled !== false) {
          setAuthToken(password.trim());
        }
        setAuthRequired(false);
      } else {
        setError(data.error?.message || 'Login failed');
      }
    } catch {
      setError('Connection failed. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  }, [username, password]);

  // Still checking auth status
  if (authRequired === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-indigo-500 animate-pulse" />
          <p className="text-gray-400 text-sm">Checking access...</p>
        </div>
      </div>
    );
  }

  // Auth required — show login modal
  if (authRequired) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="w-full max-w-sm mx-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col items-center mb-6">
              <KhmerAiLogo size="lg" aria-label="Khmer AI secure access logo" className="mb-4" />
              <h1 className="text-xl font-semibold text-white">Khmer AI</h1>
              <p className="text-gray-400 text-sm mt-1 text-center">
                Enter your credentials to continue
              </p>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username"
                  autoFocus
                  autoComplete="username"
                  className="w-full bg-gray-900/80 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full bg-gray-900/80 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="text-gray-600 text-xs text-center mt-5">
              This server is protected
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Auth not required — render app
  return <>{children}</>;
});