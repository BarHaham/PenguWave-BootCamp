import { Link, NavLink } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { isAdmin } from "../utils/auth";

interface NavbarProps {
  onLoginClick: () => void;
}

export default function Navbar({ onLoginClick }: NavbarProps) {
  const { session, logout } = useSession();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">PenguWave 🐧</Link>
      </div>
      <div className="navbar-right">
        <div className="navbar-links">
          <NavLink to="/dashboard">Overview</NavLink>
          <NavLink to="/events">Events</NavLink>
          {/* Users is admin-only; hide the entry point for everyone else. */}
          {isAdmin(session) && <NavLink to="/users">Users</NavLink>}
        </div>
        {session ? (
          <span className="navbar-user">
            <strong>{session.email}</strong> · {session.role}{" "}
            <button className="btn-ghost" onClick={logout}>
              Sign out
            </button>
          </span>
        ) : (
          <button onClick={onLoginClick} className="btn">
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}
