import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { clearSession, getSession, setSession as persist, type Session } from "../utils/auth";

interface SessionContextValue {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * App-wide session, kept in one place so role-aware UI (e.g. the admin-only
 * Users page) reads from a single source instead of prop-drilling auth state
 * through the router.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => getSession());

  const login = useCallback((s: Session) => {
    persist(s);
    setSessionState(s);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
