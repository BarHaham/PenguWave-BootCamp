import { useState } from "react";
import type { User } from "../types";
import { useSession } from "../context/SessionContext";
import { isAdmin } from "../utils/auth";
import { EmptyState } from "../components/states/States";

// Seed data. NOTE: passwords are intentionally absent — the original starter
// stored and rendered plaintext passwords in this table, which the API contract
// explicitly forbids. A real client never receives password material.
const SEED_USERS: User[] = [
  { id: "1", email: "admin@penguwave.io", role: "admin", status: "active" },
  { id: "2", email: "analyst@penguwave.io", role: "analyst", status: "active" },
  { id: "3", email: "viewer@penguwave.io", role: "viewer", status: "disabled" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UsersPage() {
  const { session } = useSession();
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("analyst");
  const [error, setError] = useState("");

  // Authorization gate. The original page had a TODO admitting this was missing,
  // so any visitor could manage users. We block non-admins in the UI; the real
  // enforcement point is the backend (which should also return 403).
  if (!isAdmin(session)) {
    return (
      <div className="page-container">
        <EmptyState
          icon="🔒"
          title="Admins only"
          message={
            session
              ? "Your role doesn’t have access to user management."
              : "Sign in as an admin to manage users."
          }
        />
      </div>
    );
  }

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (users.some((u) => u.email === email)) {
      setError("A user with that email already exists.");
      return;
    }
    // Password creation is a backend concern (hashing, policy) — the client only
    // submits the request. We don't capture or store a password here.
    setUsers((prev) => [...prev, { id: String(Date.now()), email, role: newRole, status: "active" }]);
    setNewEmail("");
    setNewRole("analyst");
    setError("");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (id === "1") return; // guard: don't delete the seed admin in the demo
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">Manage who can access PenguWave.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>New User</h3>
          <form onSubmit={handleAddUser}>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="new-email">Email</label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@penguwave.io"
              />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="new-role">Role</label>
              <select id="new-role" value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ maxWidth: 220 }}>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Create User
            </button>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span style={{ color: user.status === "active" ? "var(--sev-low)" : "var(--text-faint)" }}>
                    {user.status}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn-ghost btn-danger"
                    onClick={() => handleDelete(user.id)}
                    disabled={user.id === "1"}
                    title={user.id === "1" ? "The seed admin can’t be removed in the demo" : "Delete user"}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && <EmptyState title="No users" message="Add a user to get started." />}
    </div>
  );
}
