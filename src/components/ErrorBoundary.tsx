import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level safety net. A render error anywhere in the tree would otherwise
 * unmount the whole app and leave a blank page — fatal during a live demo. We
 * catch it, log it for debugging, and show a recoverable fallback instead.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In a real deployment this would go to an error-reporting service.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="state-block" role="alert" style={{ margin: "80px auto", maxWidth: 520 }}>
          <div className="state-icon" aria-hidden>
            🐧💥
          </div>
          <h3>Something went wrong</h3>
          <p>An unexpected error broke this view. Reloading usually fixes it.</p>
          <p style={{ color: "var(--text-faint)", fontSize: 12, fontFamily: "monospace" }}>
            {this.state.error.message}
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
