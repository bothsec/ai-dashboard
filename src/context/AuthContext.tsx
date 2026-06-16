import { createContext, useContext, memo, useState, useMemo, useCallback, useEffect } from 'react';
import { setAuthToken } from '../services/chatService';

// Module-level shared state (works across all component instances)
let _user: { role: string; username: string } | null = null;
const listeners = new Set<(u: { role: string; username: string } | null) => void>();

function notify(u: { role: string; username: string } | null) {
  _user = u;
  listeners.forEach(fn => fn(u));
}

export { _user as authUser };
export function setAuthUser(user: { role: string; username: string } | null) { notify(user); }
export function getAuthUser() { return _user; }

interface AuthContextValue {
  user: { role: string; username: string } | null;
  setUser: (u: { role: string; username: string } | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = memo(function AuthProvider({ children }: { children: React.ReactNode }) {
  // This React state is only for triggering re-renders — the source of truth is module-level _user
  const [user, _setUser] = useState<{ role: string; username: string } | null>(_user);

  // Sync React state with module state when module state changes
  useEffect(() => {
    const handler = (u: typeof _user) => _setUser(u ?? null);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const setUser = useCallback((u: typeof _user) => notify(u), []);
  const logout = useCallback(() => { setAuthToken(null); notify(null); }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, setUser, logout }), [user, setUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
});