import { createContext, useContext } from 'react';

interface AuthCtx { isAdmin: boolean; }
export const AuthContext = createContext<AuthCtx>({ isAdmin: false });
export const useAuth = () => useContext(AuthContext);