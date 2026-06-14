import { useEffect, useRef, useState } from "react";
import { useSession } from "../context/SessionContext";
import type { Session } from "../utils/auth";

interface LoginModalProps {
  onClose: () => void;
}

/**
 * Demo sign-in.
 *
 * This is a frontend-only app with no auth backend, so we don't pretend to
 * verify credentials against a server. Instead we model a session locally to
 * drive role-aware UI. Changes from the original:
 *  - No `console.log(email, password)` — credentials are never logged.
 *  - No empty `.catch()` swallowing every error.
 *  - The modal can't be dismissed by an accidental backdrop click into an
 *    unauthenticated state without intent (Esc / ✕ still close it).
 * Real authentication belongs in the backend (Track A).
 */

// Demo accounts → role mapping. Password is accepted but never stored.
const DEMO_ROLES: Record<string, Session["role"]> = {
  "admin@penguwave.io": "admin",
  "analyst@penguwave.io": "analyst",
  "viewer@penguwave.io": "viewer",
};

export default function LoginModal({ onClose }: LoginModalProps) {
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      setError("Please enter both an email and a password.");
      return;
    }
    // Infer role from the demo directory; default unknown emails to read-only.
    const role = DEMO_ROLES[normalized] ?? "viewer";
    login({ email: normalized, role });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 id="login-title">Sign In</h2>
        <p className="modal-sub">Enter your credentials to access PenguWave.</p>
        <form onSubmit={handleSubmit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%" }}>
            Sign In
          </button>
        </form>
        <div className="hint-box">
          Demo accounts (any password): <code>admin@penguwave.io</code>,{" "}
          <code>analyst@penguwave.io</code>, <code>viewer@penguwave.io</code>
        </div>
      </div>
    </div>
  );
}
