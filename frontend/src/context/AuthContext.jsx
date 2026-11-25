import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('foodie_user') || 'null'));
  const login = (value) => { localStorage.setItem('foodie_user', JSON.stringify(value)); setSession(value); };
  const logout = () => { localStorage.removeItem('foodie_user'); setSession(null); };
  return <AuthContext.Provider value={{ session, user: session?.user, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
