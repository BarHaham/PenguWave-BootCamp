# PenguWave — Presentation Guide

> Reference doc for the 5-minute presentation. Everything here is grounded in the
> actual code as it stands today. Numbers below come from the bundled
> `data/mock_events.json` (59 events: **1 CRITICAL, 14 HIGH, 23 MEDIUM, 21 LOW**).

---

## 1. Executive Summary

I took **PenguWave** — a bare React + TypeScript starter with mock data, a
no-op sanitizer, and several real security holes — and turned it into a
**security-operations dashboard** an analyst could actually triage with: an
at-a-glance Overview, a fast filter/search/sort events workspace, a detail
inspector, and filtered CSV/JSON export. Along the way I reviewed the original
code as if it were a teammate's PR and fixed a **live stored-XSS vulnerability**,
a committed API key, credential logging, plaintext-password exposure, a missing
authorization gate, and a type bug that rendered **CRITICAL events as "safe."**
The value proposition: an analyst sees the most dangerous threats first, can
slice the data any way an investigation demands, and can trust that the tool
itself isn't a new attack surface.

---

## 2. Feature Breakdown

### Dashboard Overview (`/dashboard`)
- **Shows:** total + per-severity stat cards; 24h / 7d / 30d activity; a
  severity **donut**; an **events-over-time** area chart; top affected hosts;
  most common tags; a "needs attention" feed of the latest CRITICAL/HIGH events.
- **Why it matters:** an analyst starting a shift needs the shape of the threat
  landscape in one screen — *how many criticals, where, trending up or down.*
- **Implementation:** a single `computeStats` pass over the events derives every
  figure (severity counts, time windows, host/tag tallies, daily timeline). It
  takes `now` as an injected argument, so it's pure and deterministic. Charts are
  **hand-built SVG** (no charting library). Every tile **deep-links** into a
  pre-filtered events view (e.g. the CRITICAL card → `/events?sev=CRITICAL`).

### Advanced Filtering & Search (`/events`)
- **Capabilities:** debounced full-text **search** (title, description, host,
  IPs, id, tags); **multi-select severity** pills; **multi-select tag** filter;
  **date-range** (from/to); all combinable; sortable columns.
- **Why each matters:** severity = triage by threat level; date range = scope an
  incident window; tags = pivot by attack type (`ransomware`, `brute-force`);
  search = chase a specific host/IP/indicator.
- **How they combine:** filters are **AND-ed** across dimensions (severity AND
  date AND tag AND search) and **OR-ed** within a dimension (HIGH *or* CRITICAL).
  The whole filter state lives in the **URL**, so any view is shareable and
  back-button friendly.

### Event Details & Inspection
- **Drill-in:** click (or keyboard-Enter) any row to open a slide-over panel.
- **Shows:** severity, title, **exact timestamp** + relative, event id, affected
  asset (hostname + IP), source IP, reporter, tags, **related events** (same
  asset or shared tag), and the **raw JSON**.
- **Why it matters:** incident investigation is about correlation — the related-
  events list and raw payload let an analyst pivot and verify without leaving the
  panel. Esc closes it; focus moves to the close button for accessibility.

### Data Export
- **Formats:** **CSV** (spreadsheets, ticketing, management reports) and **JSON**
  (feeding another tool / script / SIEM).
- **Key behavior:** export reflects the **current filtered view** — if you're
  looking at only CRITICAL events, that's exactly what exports.
- **Why it's critical:** SOC work is collaborative; analysts hand off evidence.
  The CSV path is **hardened against formula injection** (`= + - @`) and
  RFC-4180-escaped, so an export can't execute when opened in Excel.

### Smart Sorting & Data Handling
- **Default sort:** by **severity, CRITICAL → HIGH → MEDIUM → LOW.** Severity is
  also a **secondary** sort under every other column, so the most critical item
  always wins a tie and never gets buried.
- **Edge cases:** loading **skeletons**; distinct **empty** ("no events yet") vs
  **no-match** ("no events match your filters" + clear button) states; an
  **error** state with retry; and a banner counting any **malformed records**
  dropped at the data boundary.

---

## 3. Key Design Decisions & Tradeoffs

### Decision 1 — Severity-first sorting
- **What:** default sort is severity (CRITICAL first), not time.
- **Why:** in security ops, **threat level beats recency** — a CRITICAL from this
  morning matters more than a LOW from a minute ago.
- **Tradeoff:** newest-first isn't the default; you click the **Time** column for
  it. I mitigated this by keeping severity a *secondary* sort, so even time-sorted
  views surface criticals first within a tie.
- **Justification:** mirrors how SIEM/SOC tooling prioritizes by severity.

### Decision 2 — Multi-select filters with unmistakable visual state
- **What:** multiple severities can be active at once.
- **Why:** analysts routinely triage **CRITICAL + HIGH together.**
- **Alternative considered:** single-select (click replaces). Rejected as too
  limiting — but it *did* surface a real UX risk: with two filters lit, a user can
  forget one is active. So active pills now **fill with their severity color and a
  ✓**, while inactive ones are thin tinted outlines. The capability stays; the
  ambiguity is gone.

### Decision 3 — Precise timestamps
- **What:** exact `MMM DD, YYYY, hh:mm AM/PM` instead of vague "last year."
- **Why:** investigation needs **exact timing** to correlate events and build a
  timeline.
- **Refinement:** events within 7 days show a friendly **relative** label ("3
  hours ago") with the **exact time on hover**; older events show the full
  timestamp directly. Best of both — scannable *and* precise.

### Decision 4 — Dependency-free, hand-built SVG charts
- **What:** the donut, bar list, and area timeline are ~40 lines of SVG each, not
  Recharts/Chart.js.
- **Why:** zero React-19 peer-dependency risk, a smaller bundle, full control over
  the dark theme, and **code I can fully explain** in this presentation.
- **Tradeoff:** I'd adopt a library the moment requirements grow (interactive
  tooltips, axes, zoom, brushing).

### Decision 5 — Normalize messy data at the boundary
- **What:** one `normalizeEvent` coerces every raw record into a
  guaranteed-shaped `SecurityEvent` (missing fields, bad timestamps, unknown
  severities, non-array tags), and **counts** anything unusable.
- **Why:** components stay simple and never defend against `undefined`; bad data
  is *reported* (the "dropped records" banner) instead of crashing the table.
- **Tradeoff:** a tiny bit of upfront ceremony for a lot of downstream safety.

### Decision 6 — URL as the single source of truth for filters
- **What:** filter state is derived purely from URL query params — no localStorage
  filter persistence.
- **Why:** shareable/bookmarkable investigative views, *and* it makes navigation
  behavior fall out for free — `?sev=CRITICAL` from an Overview tile preserves
  intent, while the bare **Events** nav link is always a clean slate. (I tried
  localStorage restore first and removed it precisely because it broke the
  clean-slate expectation.)

---

## 4. Code Review Findings — What I Fixed

### Security
1. **Stored XSS (live & exploitable).** `sanitizeHtml()` was a **no-op**, yet
   descriptions were injected via `dangerouslySetInnerHTML` / `innerHTML` — and
   the mock data contains a real `<img src=x onerror=alert(document.cookie)>`
   payload. **Fix:** render descriptions as **plain text** through JSX (they
   aren't rich text), removing the HTML sink entirely.
2. **Committed secret.** A hardcoded `pw_live_sk_...` API key in `src/api.ts`.
   **Fix:** removed; base URL now comes from `VITE_API_URL`.
3. **Credential logging.** Login did `console.log(email, password)`. **Fix:**
   removed — credentials are never logged.
4. **Plaintext password exposure.** `User.password` was modeled and rendered in
   the Users table. **Fix:** dropped from the type and the UI (the API contract
   forbids returning password material).
5. **Missing authorization.** The Users page had a `// TODO` admitting anyone
   could manage users. **Fix:** gated behind the `admin` role (with the honest
   caveat that the real enforcement point is the backend).
6. **CSV / formula injection.** Export now neutralizes `= + - @` and applies
   RFC-4180 escaping the old `toCsv` lacked.
7. Added a real **`.gitignore`** (deps, build output, `.env`) — the starter had
   none.

### Quality / Correctness
1. **CRITICAL missing from the severity type union** — so critical events fell
   through to the default and rendered green/"safe." **Fix:** added CRITICAL as
   the highest tier; it's the single source of truth for badges, sort rank, and
   filters.
2. **Synchronous JSON import, no states.** **Fix:** an async data layer
   (`useEvents`) with loading/error/empty/retry states and abortable fetches.
3. **Monolithic `utils.ts` + ad-hoc state.** **Fix:** split into focused modules
   (`normalize`, `filter`, `analytics`, `format`, `export`), a `SessionContext`,
   and memoized filtering.
4. **Accessibility gaps.** **Fix:** ARIA labels, `aria-pressed`/`aria-sort`,
   keyboard-reachable rows, Esc-to-close + focus management in dialogs,
   focus-visible rings, `prefers-reduced-motion` support.

---

## 5. Technical Highlights

- **TypeScript strict mode** on — no `any`, fully-typed `SecurityEvent` boundary.
- **Error boundary** wrapping the app — a render crash shows a recoverable
  fallback instead of a blank screen (important for a live demo).
- **URL-driven filter state** — shareable, bookmarkable, back-button friendly;
  invalid `sort`/`dir`/`sev` params are validated and fall back to safe defaults.
- **Memoized work** — `filterAndSort`, dashboard stats, tag list, and related-
  events are all `useMemo`'d; search input is debounced.
- **Dependency-light** — only `react`, `react-dom`, `react-router-dom` at runtime;
  charts are hand-rolled SVG. Production bundle ≈ **94 KB gzipped**.
- **Accessibility** — keyboard navigation, ARIA roles/labels, modal focus
  management, reduced-motion.
- **Responsive** — a mobile layout breakpoint (≤820px) and motion-reduction
  media queries. *(Honest scope: it adapts, but I optimized for the analyst's
  desktop first.)*
- **Clean gates** — `eslint` clean, `tsc` strict clean, `npm run build` clean,
  zero console errors on any page.

---

## 6. What I'd Add With More Time

- **Real backend** via the existing `src/api.ts` seam (auth, events, users).
- **Real-time streaming** (WebSocket) + toast notifications for new criticals.
- **Table virtualization + pagination** for 10k+ events (see Q&A).
- **Saved filter presets** / a custom filter builder.
- **Row-selection export** (hand-pick a subset) and **PDF report** export.
- **Automated tests** — the pure functions (`filterAndSort`, `normalizeEvent`,
  `computeStats`, CSV escaping) are written to be trivially unit-testable.
- **Light theme** — the UI is built on CSS custom properties, so it's a variable
  swap, not a rewrite.
- **ML-assisted triage** — anomaly scoring / clustering of related events.

---

## 7. Demo Script (~5 min)

> Note: the data is anchored to **today**, so you'll see live relative times
> ("a few hours ago") and a populated 24h/7d/30d — not stale dates.

**[0:00–0:30] Overview**
> "This is the Overview. At a glance: **1 CRITICAL** event that needs immediate
> attention, **14 HIGH**, and the full severity distribution in the donut. The
> activity timeline shows recent volume, and 'Needs attention' lists the latest
> critical/high events with how long ago they fired. Every tile is a shortcut —
> clicking a card jumps straight into a pre-filtered events view."

**[0:30–1:30] Events — filtering**
> "Here's the events workspace. By default it's sorted **by severity, CRITICAL
> first** — in a SOC, threat level matters more than recency. Watch the severity
> filter: I click **HIGH** and it shows only HIGH — the pill fills solid with a ✓
> so the active state is unmistakable. I can combine them — **CRITICAL + HIGH**
> together, a real triage view. Clicking a lit pill again toggles it off. Search
> runs across every field — title, host, IP, tags — and it's debounced so it
> stays instant. And notice the URL updates as I filter: I can copy this link and
> hand a teammate the exact view."

**[1:30–2:30] Event details & investigation**
> "Click any event and the inspector slides over. I get everything needed to
> investigate: the **exact timestamp**, the affected asset and its IP, the source
> IP, the tags, and the **raw event JSON**. Down here, **related events** — same
> asset or shared tag — so I can pivot without losing context. Precision is
> deliberate: I show an exact time like *Jun 14, 2026, 8:00 AM*, with a friendly
> 'hours ago' for recent events and the exact time on hover."

**[2:30–3:00] Export & workflow**
> "Analysts hand off evidence. I export the **current filtered view** — so if I'm
> looking at only criticals, that's what exports — as **CSV** for spreadsheets or
> **JSON** for tooling. The CSV is hardened against formula injection, so an
> export can't execute when someone opens it in Excel."

**[3:00–4:00] Key decisions**
> "Two decisions I want to call out. **Severity-first sorting** — I default to
> threat level, not time, and keep severity as a secondary sort everywhere so a
> critical never gets buried. **Multi-select with clear visual state** — analysts
> need CRITICAL and HIGH together, so I kept multi-select but made the active
> pills impossible to misread, because the real risk wasn't the feature, it was
> not knowing what's on."

**[4:00–5:00] Code quality & what I fixed**
> "I reviewed the starter like a teammate's PR. The biggest find was a **live
> stored-XSS** — the sanitizer was a no-op and descriptions were injected as HTML,
> and the data literally contains an `onerror` payload. I render as plain text
> now, killing the sink. I also pulled a **committed API key**, stopped **logging
> credentials**, removed **plaintext passwords**, gated the **Users page** behind
> admin, and hardened **CSV export**. And a subtle correctness bug: **CRITICAL was
> missing from the type union**, so critical events rendered as 'safe' green — I
> made severity the single source of truth. With more time I'd wire the real
> backend and add real-time streaming and tests."

---

## 8. Q&A Talking Points

**Q: Why dark mode only?**
> SOC/NOC analysts work long shifts in low-light rooms; dark UIs reduce eye
> strain and make severity colors pop. It's not locked in — the whole theme is
> CSS custom properties, so a light theme is a variable swap. I prioritized the
> core analyst workflow over a second theme in the time I had.

**Q: How does it handle real-time data?**
> Today it loads from an async boundary (`useEvents`) that simulates a fetch with
> loading/error states — so the UI is already built for asynchronous data, not a
> synchronous import. Swapping in a real `GET /api/events` is localized to that
> hook and `src/api.ts`. For true real-time I'd add a WebSocket feed and merge new
> events into state, with a toast when a new CRITICAL arrives.

**Q: What about performance with thousands of events?**
> At ~60 events, client-side filter/sort is instant and gives the best UX, and the
> heavy work is memoized. At 10k+ I'd push filtering/sorting **server-side** — the
> `filterAndSort` function and the `useEvents` boundary are structured so that's a
> localized change — and add **list virtualization + pagination** so the DOM only
> renders what's visible. I deliberately didn't virtualize now: it'd be complexity
> the current scale doesn't justify.

**Q: Why multi-select filters instead of single-select?**
> Triage is rarely one severity — analysts look at CRITICAL and HIGH together.
> Single-select would force re-clicking and lose that combined view. The honest
> risk with multi-select is forgetting a filter is active, so I solved *that*
> directly: active pills fill with their severity color and a checkmark, and you
> can toggle any of them off with one click.

**Q: Is the auth real?**
> No — and I'm explicit about that in the code. It's a frontend-only track, so the
> session is a **UX gate** (it drives role-aware UI like hiding the Users page),
> not a trust boundary. Real authn/authz belongs in the backend, which should also
> return 403. I didn't want to *pretend* it was secure.

**Q: Why remove the localStorage filter persistence you'd added?**
> I built it, then realized it fought the expected navigation: clicking **Events**
> should be a clean slate, but a restored filter made it sticky. Deriving filter
> state purely from the URL gives both behaviors for free — preserve intent when
> you arrive with `?sev=…`, clean slate from the nav link. Knowing when to *remove*
> code is part of owning it.

---

## 9. README

A full `README.md` already ships in the repo and is kept in sync with the code
(setup, feature list, design decisions, "what I fixed," project structure, future
work). The skeleton, for reference:

```markdown
# PenguWave — Security Operations Portal (Frontend Track)

One-line: turns the bare starter into a usable SOC dashboard and fixes the
security/quality issues in the original code. Runs on bundled mock data — no
backend required.

## Setup
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint     # eslint (clean)

## What I built
- Overview dashboard (stats, donut, timeline, hosts, tags, needs-attention)
- Events workspace (debounced search; multi-select severity/tag/date filters;
  sortable columns; slide-over detail panel with related events + raw JSON)
- URL-driven filters (shareable; ?sev=… preserves intent, /events = clean slate)
- CSV/JSON export of the current filtered view (CSV injection-hardened)
- Robust states (loading / empty / no-match / error+retry / dropped-records)
- Role-aware UI (admin-gated Users page)

## Key design decisions
- Severity-first sort (threat level > recency), severity always secondary
- Multi-select filters with unmistakable active state
- Precise timestamps (relative for recent, exact on hover)
- Hand-built dependency-free SVG charts
- Normalize messy data at the boundary
- URL as the single source of truth for filters (no localStorage restore)

## What I fixed from the original
Security: stored XSS (no-op sanitizer + innerHTML), committed API key, credential
logging, plaintext passwords, missing Users authorization, CSV injection, no
.gitignore.
Quality: missing CRITICAL severity, synchronous JSON import (now async w/ states),
monolithic utils split, accessibility.

## Technologies
React 19, TypeScript (strict), React Router 7, Vite 7. No charting/runtime deps
beyond react / react-dom / react-router-dom.

## Future improvements
Real backend (api.ts seam), WebSocket streaming + toasts, virtualization +
pagination, saved filter presets, row-selection/PDF export, unit tests, light
theme.
```

---

## Quick-reference numbers (verify live before presenting)

| Metric | Value |
|---|---|
| Total events | 59 |
| CRITICAL / HIGH / MEDIUM / LOW | 1 / 14 / 23 / 21 |
| CRITICAL + High (combined card) | 15 |
| Runtime deps | react, react-dom, react-router-dom |
| Production bundle | ≈ 94 KB gzip |
| Gates | eslint clean · tsc strict clean · build clean · 0 console errors |
