import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const AUTH_STORAGE_KEY = 'pe_demo_auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  login(email: string, password: string): boolean;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_STORAGE_KEY) === 'true',
  );

  const login = useCallback((email: string, password: string) => {
    const expectedEmail = import.meta.env.VITE_APP_LOGIN_EMAIL;
    const expectedPassword = import.meta.env.VITE_APP_LOGIN_PASSWORD;
    const credentialsAreConfigured = Boolean(expectedEmail && expectedPassword);
    const credentialsAreValid =
      credentialsAreConfigured && email.trim() === expectedEmail && password === expectedPassword;

    if (credentialsAreValid) {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      setIsAuthenticated(true);
    }

    return credentialsAreValid;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      login,
      logout,
    }),
    [isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
