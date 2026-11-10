import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import type { UserInfo, LoginResponse } from '@/types/auth';
import { loginApi, fetchUserInfo, refreshApi, logoutApi } from '@/services/authApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOKEN_KEY = 'bom_access_token';
const TOKEN_EXPIRES_KEY = 'bom_token_expires';
const USER_KEY = 'bom_user';
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // refresh 5 min before expiry
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // logout after 30 min idle
const IDLE_WARNING_MS = 15 * 60 * 1000; // warn at 15 min idle
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
  refreshUser: () => Promise<void>;
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
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Token helpers ───────────────────────────────────────────────────────

  const getToken = useCallback((): string | null => {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }, []);

  const isRemembered = useCallback((): boolean => {
    return localStorage.getItem(TOKEN_KEY) !== null;
  }, []);

  const setToken = useCallback((token: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }, []);

  const setTokenExpiry = useCallback((expiresAt: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt);
    } else {
      sessionStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt);
    }
  }, []);

  const clearToken = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRES_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
    if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    tokenRefreshTimerRef.current = null;
  }, []);

  // ─── Token refresh ───────────────────────────────────────────────────────

  const doRefresh = useCallback(async () => {
    const res: LoginResponse = await refreshApi();
    const remember = isRemembered();
    setToken(res.access_token, remember);
    setTokenExpiry(res.expires_at, remember);
    setUser(res.user);
    return res.expires_at;
  }, [isRemembered, setToken, setTokenExpiry, setUser]);

  const scheduleTokenRefresh = useCallback((expiresAt: string) => {
    const msUntilRefresh = new Date(expiresAt).getTime() - Date.now() - REFRESH_BEFORE_EXPIRY_MS;
    if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    tokenRefreshTimerRef.current = setTimeout(async () => {
      try {
        const nextExpiresAt = await doRefresh();
        scheduleTokenRefresh(nextExpiresAt);
      } catch {
        clearToken();
        broadcastAuthError();
      }
    }, Math.max(msUntilRefresh, 0));
  }, [doRefresh, clearToken]);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const userInfo = await fetchUserInfo(token);
      setUser(userInfo);
    } catch {
      clearToken();
      broadcastAuthError();
    }
  }, [getToken, setUser, clearToken]);

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

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    // mousemove fires continuously while the pointer moves — throttle so we
    // don't reset two timers on every pixel of movement.
    let lastReset = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastReset > 5000) {
        lastReset = now;
        resetIdleTimer();
      }
    };

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

  // ─── Global runtime error catchers ───────────────────────────────────────

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      toast.error('An unexpected error occurred. Please reload the page.');
      // eslint-disable-next-line no-console
      console.error('Global error:', event.error);
    };
    const onUnhandled = (event: PromiseRejectionEvent) => {
      toast.error('An unexpected async error occurred. Please reload the page.');
      // eslint-disable-next-line no-console
      console.error('Unhandled rejection:', event.reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);

  // ─── Restore session on mount ────────────────────────────────────────────

  useEffect(() => {
    const restore = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await refreshApi();
        const remember = isRemembered();
        setToken(res.access_token, remember);
        setTokenExpiry(res.expires_at, remember);
        setUser(res.user);
        scheduleTokenRefresh(res.expires_at);
      } catch {
        clearToken();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, [getToken, isRemembered, setToken, setTokenExpiry, setUser, clearToken, scheduleTokenRefresh]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const login = async (email: string, password: string, rememberMe = false) => {
    setError(null);
    setIsLoggingIn(true);
    try {
      const res: LoginResponse = await loginApi(email, password);
      setToken(res.access_token, rememberMe);
      setTokenExpiry(res.expires_at, rememberMe);
      setUser(res.user);
      scheduleTokenRefresh(res.expires_at);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = useCallback(() => {
    // Revoke the JWT server-side FIRST — the request interceptor reads the
    // token from storage, so this must run before clearToken(). Fire-and-
    // forget: logout must stay instant even if the request fails.
    if (getToken()) {
      logoutApi().catch(() => undefined);
    }
    setUser(null);
    clearToken();
    setShowIdleWarning(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, [clearToken, getToken]);

  const stayLoggedIn = () => {
    setShowIdleWarning(false);
    resetIdleTimer();
  };

  const clearError = () => setError(null);

  const hasPageAccess = (path: string): boolean => {
    if (!user) return false;
    if (user.is_super_admin) return true;
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
        refreshUser,
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
