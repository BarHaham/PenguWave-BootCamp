# PenguWave — Security Operations Portal (Frontend Track)

A security operations dashboard for analysts triaging security events. This is
the **Frontend Track (B)** submission: it takes the bare starter and turns it
into a usable SOC portal, while fixing the security and quality issues found in
the original code.

> Built on the starter described in [`ASSIGNMENT.md`](./ASSIGNMENT.md). Runs
> entirely on the bundled mock data (`data/mock_events.json`) — no backend
> required.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint     # eslint (clean)
```

## What I built

- **Overview dashboard** — stat cards (totals, per-severity, 24h / 7d / 30d
  activity), a severity **donut**, an **events-over-time** timeline, top
  affected hosts, common tags, and a "needs attention" list of the latest
  CRITICAL/HIGH events. Every tile deep-links into a pre-filtered events view.
- **Events workspace** — debounced full-text search; multi-select severity, tag,
  and date-range filters; sortable columns; a slide-over **detail panel** with
  metadata, related events, and the raw JSON.
- **URL-driven filters** — active filters live entirely in the **URL** (shareable
  / bookmarkable / back-button friendly). A filtered link like
  `/events?sev=CRITICAL,HIGH` reproduces the exact view; the bare `/events` nav
  link is always a clean slate.
- **Export** — download the *current filtered view* as CSV or JSON.
- **Robust state handling** — loading skeletons, separate empty vs. no-match
  states, an error state with retry, and a banner when malformed records are
  dropped.
- **Role-aware UI** — a session model gates the Users page behind the `admin`
  role and adapts the navbar.

## Key design decisions & tradeoffs

- **Hand-built SVG charts instead of Recharts/Chart.js.** The charts I needed
  (donut, bar list, area timeline) are ~40 lines each. Avoiding a charting
  dependency means zero React-19 peer-dependency risk, smaller bundle, full
  control over the theme, and code I can fully explain. Tradeoff: I'd reach for a
  library if requirements grew (axes, tooltips, zoom).
- **Normalize messy data at the boundary, not in components.** A single
  `normalizeEvent` coerces every raw record into a guaranteed-shaped
  `SecurityEvent` (handles missing fields, bad timestamps, unknown severities,
  non-array tags). Components stay simple; bad records are counted and reported
  rather than crashing the table.
- **Client-side filtering.** With ~60 mock events, filtering/sorting in the
  browser is instant and gives the best UX. At real scale this moves
  server-side; the `filterAndSort` function and the `useEvents` async boundary
  are structured so that swap is localized.
- **URL as the single source of truth for filters.** Shareable investigative
  views beat hidden in-memory state for a SOC tool. I deliberately do *not*
  persist filters to localStorage: navigating to **Events** should give a clean
  slate, while arriving from an Overview tile (`?sev=…`) should preserve intent.
  Deriving state purely from the URL makes both behaviors fall out for free.
- **Auth is an honest UX gate.** There's no backend, so I don't pretend to verify
  credentials. The session drives role-aware UI; real authn/authz is a backend
  concern (Track A) and the UI gate is explicitly *not* a trust boundary.

## What I fixed from the original code

Security:

- **Stored XSS (live & exploitable).** `sanitizeHtml()` was a no-op, yet event
  descriptions were injected via `dangerouslySetInnerHTML` / `el.innerHTML` — and
  the data contains a real `<img src=x onerror=alert(document.cookie)>` payload.
  Fix: render descriptions as **plain text** (they aren't rich text), removing
  the HTML sink entirely.
- **Committed secret.** Removed the hardcoded `pw_live_sk_...` API key from
  `src/api.ts`; base URL now comes from `VITE_API_URL`.
- **Credential logging.** Removed `console.log` of email + password on login.
- **Password exposure.** Dropped `User.password` from the model and the plaintext
  password column in the Users table (the API contract forbids it).
- **Missing authorization.** The Users page (which had a `// TODO` admitting it)
  is now gated behind the `admin` role.
- **CSV injection.** Export now neutralizes formula-injection (`=`,`+`,`-`,`@`)
  and applies RFC-4180 escaping the old `toCsv` lacked.
- Added a real `.gitignore` (deps, build output, `.env`) — the starter had none.

Correctness / quality:

- Added the **CRITICAL** severity the type union omitted (critical events were
  rendering as green/"safe").
- Introduced an async data layer with loading/error/empty states (the page
  imported JSON synchronously).
- Replaced prop-drilled/ad-hoc state with a session context, memoized filtering,
  and split the monolithic `utils.ts` into focused modules.
- Accessibility: ARIA labels, keyboard-reachable rows, sortable-header
  `aria-sort`, Esc-to-close + focus management in dialogs, focus-visible rings.

## Project structure

```
src/
  components/        SeverityBadge, FilterBar, ExportMenu, EventDetailPanel,
                     charts/ (Donut, BarList, Timeline), states/
  context/           SessionContext
  data/              normalize, eventsSource, analytics, filter
  hooks/             useEvents, useEventFilters, useDebounced
  pages/             DashboardPage, EventsPage, UsersPage, NotFound
  utils/             format, export, auth
```

## Future improvements (given more time)

- Wire the real backend via the existing `src/api.ts` client (Track A).
- Row selection for exporting a hand-picked subset; PDF report export.
- Table virtualization + pagination for 10k+ events.
- Saved filter presets and a custom filter builder.
- Component/unit tests (the pure `filter`, `normalize`, `analytics`, and CSV
  escaping functions are written to be easily testable).
- Real-time event streaming (WebSocket) and toast notifications.
