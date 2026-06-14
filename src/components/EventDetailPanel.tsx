import { useEffect, useRef } from "react";
import type { SecurityEvent } from "../types";
import SeverityBadge from "./SeverityBadge";
import { formatAbsolute, formatRelative } from "../utils/format";

interface Props {
  event: SecurityEvent;
  /** Other events sharing this asset or a tag — surfaced for context. */
  related: SecurityEvent[];
  onClose: () => void;
  onSelectRelated: (e: SecurityEvent) => void;
}

/**
 * Slide-over inspector for a single event.
 *
 * SECURITY: the description is rendered as plain text via JSX (`{...}`), NOT via
 * dangerouslySetInnerHTML / el.innerHTML as the original did with a no-op
 * sanitizer. Event data is untrusted (the mock set even contains a live
 * `<img onerror=...>` payload), and these descriptions are not rich text, so
 * the correct fix is to never interpret them as HTML.
 */
export default function EventDetailPanel({ event, related, onClose, onSelectRelated }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Esc to close + basic focus management for accessibility.
  useEffect(() => {
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} aria-hidden />
      <aside
        className="detail-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Event details: ${event.title}`}
      >
        <div className="detail-head">
          <div>
            <SeverityBadge severity={event.severity} />
            <h2 style={{ marginTop: 8 }}>{event.title}</h2>
          </div>
          <button ref={closeBtnRef} className="btn-ghost" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="detail-body">
          <dl className="detail-meta">
            <dt>Event ID</dt>
            <dd className="mono">{event.id}</dd>
            <dt>Time</dt>
            <dd>
              {formatAbsolute(event.timestamp)}{" "}
              <span style={{ color: "var(--text-faint)" }}>({formatRelative(event.timestamp)})</span>
            </dd>
            <dt>Asset</dt>
            <dd className="mono">
              {event.assetHostname}
              {event.assetIp !== "—" ? ` (${event.assetIp})` : ""}
            </dd>
            <dt>Source IP</dt>
            <dd className="mono">{event.sourceIp}</dd>
            <dt>Reported by</dt>
            <dd className="mono">{event.userId}</dd>
          </dl>

          {event.tags.length > 0 && (
            <>
              <div className="detail-section-title">Tags</div>
              <div>
                {event.tags.map((t) => (
                  <span key={t} className="tag-chip" style={{ cursor: "default" }}>
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="detail-section-title">Description</div>
          {/* Plain text — intentionally NOT HTML. See security note above. */}
          <div className="detail-desc">{event.description}</div>

          {related.length > 0 && (
            <>
              <div className="detail-section-title">Related events ({related.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {related.map((r) => (
                  <button
                    key={r.id}
                    className="btn-ghost"
                    style={{ textAlign: "left", width: "100%" }}
                    onClick={() => onSelectRelated(r)}
                  >
                    <span className="row-gap">
                      <SeverityBadge severity={r.severity} />
                      <span style={{ flex: 1 }}>{r.title}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="detail-section-title">Raw event data</div>
          <pre className="json-view">{JSON.stringify(event, null, 2)}</pre>
        </div>
      </aside>
    </>
  );
}
