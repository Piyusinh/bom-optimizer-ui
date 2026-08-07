import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { UserInfo, LoginResponse } from '@/types/auth';
import { loginApi, fetchUserInfo } from '@/services/authApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOKEN_KEY = 'bom_access_token';
const USER_KEY = 'bom_user';
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const IDLE_WARNING_MS = 2 * 60 * 1000; // show warning 2 min before logout
const AUTH_ERROR_EVENT = 'bom:auth-error';

// ─── Context Shape ───────────────────────────────────────────────────────────

interface UserContextValue {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  error: string | null;
  showIdleWarning: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  stayLoggedIn: () => void;
  clearError: () => void;
  hasPageAccess: (path: string) => boolean;
  getToken: () => string | null;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Token helpers ───────────────────────────────────────────────────────

  const getToken = useCallback((): string | null => {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }, []);

  const setToken = useCallback((token: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }, []);

  const clearToken = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // ─── Idle timeout ────────────────────────────────────────────────────────

  const resetIdleTimer = useCallback(() => {
    if (!user) return;

    setShowIdleWarning(false);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

    idleTimerRef.current = setTimeout(() => {
      logout();
    }, IDLE_TIMEOUT_MS);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handler = () => resetIdleTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

  // ─── Auth error listener (401 from API interceptor) ──────────────────────

  useEffect(() => {
    const handler = () => {
      setUser(null);
      clearToken();
    };
    window.addEventListener(AUTH_ERROR_EVENT, handler);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, handler);
  }, [clearToken]);

  // ─── Restore session on mount ────────────────────────────────────────────

  useEffect(() => {
    const restore = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const userInfo = await fetchUserInfo(token);
        setUser(userInfo);
      } catch {
        clearToken();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, [getToken, clearToken]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const login = async (email: string, password: string, rememberMe = false) => {
    setError(null);
    setIsLoggingIn(true);
    try {
      const res: LoginResponse = await loginApi(email, password);
      setToken(res.access_token, rememberMe);
      setUser(res.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    clearToken();
    setShowIdleWarning(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, [clearToken]);

  const stayLoggedIn = () => {
    setShowIdleWarning(false);
    resetIdleTimer();
  };

  const clearError = () => setError(null);

  const hasPageAccess = (path: string): boolean => {
    if (!user) return false;
    if (path === '/guide' || path === '/architecture') return true; // documentation pages, visible to every authenticated role
    if (user.role === 'admin') return true;
    return user.allowed_pages.includes(path);
  };

  // ─── Value ───────────────────────────────────────────────────────────────

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isLoggingIn,
        error,
        showIdleWarning,
        login,
        logout,
        stayLoggedIn,
        clearError,
        hasPageAccess,
        getToken,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useUser = (): UserContextValue => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within <UserProvider>');
  return ctx;
};

// ─── Broadcast helper (used by API interceptor) ──────────────────────────────

export function broadcastAuthError() {
  window.dispatchEvent(new Event(AUTH_ERROR_EVENT));
}
