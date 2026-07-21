import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export type UserRole = 'ROLE_CUSTOMER' | 'ROLE_RESTAURANT' | 'ROLE_DRIVER';
export type PublicRegistrationRole = 'CUSTOMER' | 'DRIVER';
export type RegistrationField = 'username' | 'email' | 'password' | 'role';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  login(username: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  register(username: string, email: string, password: string, role: PublicRegistrationRole): Promise<AuthResult>;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  code?: string;
  status?: number;
  fieldErrors?: Partial<Record<RegistrationField, string>>;
}

interface ApiErrorBody {
  code?: string;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

async function readApiError(response: Response): Promise<ApiErrorBody | null> {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  return response.json().catch(() => null);
}

function registrationFallback(status: number): string {
  if (status === 403) {
    return 'La solicitud fue rechazada por la configuración de seguridad. Recarga la página e inténtalo nuevamente.';
  }
  if (status === 409) return 'El usuario o correo ya está registrado.';
  if (status === 429) return 'Se realizaron demasiados intentos. Espera unos minutos antes de volver a intentar.';
  if (status >= 500) return 'El servidor no pudo completar el registro. Inténtalo más tarde.';
  return 'Revisa los datos ingresados.';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if there's an active session via the /me endpoint
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include', // Send HttpOnly cookies
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role as UserRole,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Receive and store HttpOnly cookies
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role as UserRole,
        });
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  const register = useCallback(async (
    username: string,
    email: string,
    password: string,
    role: PublicRegistrationRole,
  ): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password, role }),
      });

      if (response.ok) return { success: true };

      const body = await readApiError(response);
      const allowedFields = new Set<RegistrationField>(['username', 'email', 'password', 'role']);
      const fieldErrors = Object.fromEntries(
        Object.entries(body?.fieldErrors ?? {}).filter(
          ([field, message]) => allowedFields.has(field as RegistrationField) && typeof message === 'string',
        ),
      ) as Partial<Record<RegistrationField, string>>;
      return {
        success: false,
        code: body?.code,
        status: response.status,
        fieldErrors,
        message: body?.error ?? body?.message ?? registrationFallback(response.status),
      };
    } catch {
      return { success: false, message: 'No se pudo conectar con el servidor.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Even if the request fails, clear the local state
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: user !== null,
      user,
      isLoading,
      login,
      logout,
      register,
    }),
    [user, isLoading, login, logout, register],
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
