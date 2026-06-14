import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="notfound">
      <pre>
{`
       .--.
      |o_o |
      |:_/ |
     //   \\ \\
    (|     | )
   /'\\_   _/\`\\
   \\___)=(___/
`}
      </pre>
      <h1>404</h1>
      <p style={{ fontSize: 18, color: "var(--text-dim)", marginBottom: 8 }}>
        This penguin got lost at sea 🐧
      </p>
      <p style={{ color: "var(--text-faint)", marginBottom: 30 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard">← Back to shore</Link>
    </div>
  );
}
