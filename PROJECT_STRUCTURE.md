# NetWatch — Project Structure

NetWatch is an interactive **network monitoring trainer**. Students watch scripted network incidents unfold in real time (DDoS, DB slowdown, GPU thermal throttle, etc.), observe live telemetry dashboards, and submit a multiple-choice root-cause diagnosis. Two modes: **Teach** (free exploration, no login) and **Quiz** (student login, attempt limits, server-side result recording). The stack is a Node/Express backend + a modular browser-native frontend (no build step).

---

## Directory Tree

```
NetWatch/
├── backend/                    # Node.js/Express API server
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware (requireStudent / requireInstructor)
│   ├── routes/
│   │   ├── admin.js            # POST /api/admin/reset — instructor resets attempt counters
│   │   ├── attempts.js         # POST /api/attempts — check + increment attempt gate
│   │   ├── auth.js             # POST /api/auth/login — student & instructor login
│   │   └── results.js          # POST/GET /api/results — record and retrieve diagnosis results
│   ├── constants.js            # Shared server-side constants (ATTEMPT_LIMIT, JWT_EXPIRY)
│   ├── db.js                   # SQLite data-access layer (all DB queries)
│   ├── seed.js                 # CLI script to create student / instructor accounts
│   └── server.js               # Express entry point; mounts routes, serves frontend static files
│
├── src/                        # Modular browser frontend (ES modules, no build step)
│   ├── renderers/
│   │   ├── alerts.js           # Renders the alert list panel
│   │   ├── charts.js           # Chart.js sparkline + history chart widgets
│   │   ├── logs.js             # Renders the system log panel
│   │   ├── overview.js         # Renders the stat bar and device grid
│   │   ├── packets.js          # Renders the packet capture panel
│   │   └── topology.js         # Renders and updates the SVG network diagram
│   ├── api.js                  # Fetch wrappers for all backend endpoints (data provider layer)
│   ├── app.js                  # Application controller — screen routing, sim bootstrap, event wiring
│   ├── auth.js                 # Client-side auth state (session token, mode, student/instructor identity)
│   ├── engine.js               # Pure simulation engine — tick loop, state factory, health computation
│   ├── explain-content.js      # Pure data — Teach Mode "Explain Panel" lookup table
│   ├── explain-content-bridge.js  # Glue between explain-content.js and DOM event delegation
│   ├── lessons.js              # Pure data — device types, topologies, incident scripts, lesson definitions
│   └── utils.js                # Shared pure helpers (form validation, string formatting)
│
├── tests/                      # Vitest test suite
│   ├── backend.test.js         # Backend API integration tests
│   ├── engine.test.js          # Simulation engine unit tests
│   ├── explain-content.test.js # Contract tests for explain-content.js completeness
│   ├── smoke.test.js           # Smoke tests enforcing engine purity contracts
│   ├── utils.test.js           # Utility function unit tests
│   └── verify.ps1              # PowerShell sanity-check script
│
├── netwatch backup/            # Historical standalone HTML snapshots (not served)
├── public/                     # Empty placeholder (backend serves root directly)
│
├── index.html                  # App entry point — full HTML, CSS design system, loads src/app.js
├── NetWatch_V1.0.1.html        # Standalone single-file predecessor (reference only, not served)
├── netwatch.db                 # SQLite database (students, instructors, attempts, results)
│
├── .env                        # Local environment variables (not committed)
├── .env.example                # Template for required environment variables
├── package.json                # Project manifest, scripts, and dependencies
├── package-lock.json           # Locked dependency tree
└── vitest.config.js            # Vitest test runner configuration
```

---

## Top-Level Folder Descriptions

| Folder | Role |
|---|---|
| `backend/` | Node.js/Express REST API — authentication (JWT), attempt gating, result recording, admin ops, and SQLite data access. Also serves the frontend as static files. |
| `src/` | Modular browser frontend — simulation engine, lesson data, API client, auth state, UI controller, and all DOM renderers. Runs directly in the browser with no build step. |
| `src/renderers/` | Six focused DOM-rendering modules, each responsible for one UI panel; they take `simState` as input and update the DOM, never owning state themselves. |
| `tests/` | Vitest test suite covering the backend API, simulation engine purity, explain-content contracts, and utility functions. |
| `public/` | Empty placeholder; the Express server serves `index.html` and `src/` from the project root directly. |
| `netwatch backup/` | 11 historical standalone `.html` snapshots from V1 and alpha/beta iterations before the two-tier refactor — not used by the running application. |

---

## Key Config Files

| File | Configures |
|---|---|
| `package.json` | Project name/version, `"type": "module"` (all files use ESM), npm scripts (`start`, `dev`, `test`, `seed:student`, `seed:instructor`), and all runtime + dev dependencies. |
| `vitest.config.js` | Vitest test runner — V8 coverage provider with text + HTML reporters, `node` environment (not jsdom, since tests target engine/backend rather than the browser DOM). |
| `.env.example` | Template for the three required environment variables: `JWT_SECRET` (server refuses to start without it), `PORT` (default 3000), `DB_PATH` (default `./netwatch.db`). |
| `.gitignore` | Files excluded from version control (`.env`, `node_modules/`, database files, etc.). |

---

## Key Implementation Files by Feature

### Simulation / Lesson Engine
- **`src/engine.js`** — the pure simulation engine. Exports `createInitialState` (builds runtime state from a lesson definition) and `tick` (called every second: fires incident stages, lerp-eases node telemetry toward scripted targets with noise, recomputes health status, updates chart series, generates packet evidence). No DOM, no auth, no network — independently testable. Contracts enforced by `tests/smoke.test.js`.
- **`src/lessons.js`** — the single source of truth for all lesson content. Exports `DEVICE_TYPES`, `BASELINE` telemetry, three `TOPOLOGIES` (branch office, AI cluster, small LAN), six `INCIDENTS` (scripted stage sequences), and six `LESSONS` (each wiring a topology + incident with MCQ options, hints, and a full explanation). Imported by both `src/engine.js` and `backend/routes/admin.js`.

### Data Provider / API Layer
- **`src/api.js`** — the frontend data provider interface. All communication between the frontend and backend passes through this module's named async wrappers (`login`, `loginInstructor`, `startAttempt`, `recordResult`, `getResults`, `getAllResults`, `adminReset`). Every function normalizes responses to `{ ok, ...data }` or `{ ok: false, error }`. `app.js` imports the entire module as `* as api` and never calls `fetch` directly.
- **`backend/db.js`** — the backend data-access layer. Exposes named functions for every database operation (`findStudentByNpm`, `findInstructorByUsername`, `getAttemptCount`, `incrementAttempt`, `insertResult`, `getResults`, `getAllResults`, `resetAttempt`). Route handlers call these and never write SQL directly.

### Chart Widgets
- **`src/renderers/charts.js`** — implements all Chart.js chart widgets. `initCharts()` creates three no-axes sparkline line charts (traffic, CPU, latency) and one axes-visible history chart. `updateCharts(state)` pushes rolling data from `state.series` (30-point window) and `state.history` (24-point, 5 s interval) into the charts each tick. Depends on `window.Chart` loaded from CDN in `index.html`.

### Network Topology View
- **`src/renderers/topology.js`** — `renderTopologySVG(state)` builds the SVG diagram from scratch on lesson load (nodes as labeled circles, links as lines). `renderTopologyColors(state)` updates node stroke colors by health status and link colors by latency/loss thresholds each tick. Includes non-color status text labels on nodes for accessibility.

### Teach Mode Explain Panel
- **`src/explain-content.js`** — pure data lookup table keyed by element type (`device:<type>`, `metric:<key>`, `alert:<level>`, `proto:<PROTO>`), used by the Teach Mode explain panel. `tests/explain-content.test.js` enforces that every device type, metric, alert level, and protocol has a corresponding entry.
