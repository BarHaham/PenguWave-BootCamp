// Thin API client for a future PenguWave backend (see docs/api_contract.md).
//
// This frontend currently runs on mock data (see src/data/eventsSource.ts), but
// this module is kept as the single integration point so wiring a real backend
// is a localized change.
//
// SECURITY changes vs. the original starter:
//  - Removed the hardcoded `API_TOKEN = "pw_live_sk_..."`. Committing a live
//    service key is a real secret leak; clients must never ship a static
//    privileged credential. The base URL now comes from an env var.
//  - Removed `console.log("Login attempt:", email, password)` — credentials are
//    never written to logs.
//  - The per-user auth token is sent as a Bearer header, obtained at login.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handle(res);
  if (data.token) localStorage.setItem("token", data.token);
  return data;
}

export async function logout() {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", headers: authHeaders() }).catch(() => {});
  localStorage.removeItem("token");
}

export async function getEvents() {
  return handle(await fetch(`${API_URL}/api/events`, { headers: authHeaders() }));
}

export async function getUsers() {
  return handle(await fetch(`${API_URL}/api/users`, { headers: authHeaders() }));
}

export async function createUser(user: { email: string; role: string }) {
  return handle(
    await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(user),
    })
  );
}

export async function deleteUser(id: string) {
  return handle(
    await fetch(`${API_URL}/api/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
  );
}
