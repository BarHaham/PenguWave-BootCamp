// Minimal client-side session helpers.
//
// SECURITY NOTE: this is a frontend-only app, so "auth" here is a UX gate, not a
// trust boundary — a determined user can flip localStorage. Real enforcement
// must live in the backend (Track A). We model a session just well enough to
// demonstrate role-aware UI (e.g. gating the Users page behind `admin`).

export interface Session {
  email: string;
  role: "admin" | "analyst" | "viewer";
}

const KEY = "pw_session";

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function isAdmin(session: Session | null): boolean {
  return session?.role === "admin";
}
