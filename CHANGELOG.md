# NetWatch Changelog

## [Unreleased] - Phase 2: UI/UX Enhancements

### Added - Linux-Style Visual Hierarchy (2024)

**Design Philosophy:** Terminal monitoring aesthetic inspired by `htop`, `btop`, and system dashboards.

#### Nav Tab Attention Indicators
- Blinking `[!]` prefix on tabs containing critical data
- Automatically updated based on simulation state
- Triggers: Critical alerts (Alerts tab), critical nodes (Topology tab), multiple degraded devices (Devices tab), >5 anomalous packets (Packets tab)

#### Stat Bar Priority Indicators  
- Colored top borders (red/amber/green) on metric cards
- Blinking triangle `▲` indicator for threshold violations
- Dynamic thresholds:
  - Devices: <50% healthy = critical, <100% = warning
  - Alerts: any critical = critical, any warning = warning
  - Latency: >200ms = critical, >100ms = warning
  - CPU: >85% = critical, >70% = warning
  - Packet Loss: >5% = critical, >3% = warning

#### Panel Priority Borders
- Critical panels: 3px red left border + blinking block character `▐`
- Warning panels: 2px amber left border + dimmed block character
- Subtle pulsing glow on critical panels

#### Section Header Indicators
- Box-drawing prefixes that change with state:
  - Normal: `┌─` (thin corner)
  - Critical: `├▶` (branch + arrow, blinking red)
  - Warning: `├▶` (branch + arrow, amber)

#### Enhanced Alert Items
- Blinking block character `▌` on critical/warning alert edges
- Timestamp brackets: `[00:23]` instead of plain text
- Color-coded dim backgrounds
- 2px slide-in hover effect

#### Files Modified
- `public/styles.css` — All visual styles (~150 lines added)
- `src/app.js` — Added `updateTabAttention()` function
- `src/renderers/overview.js` — Enhanced `renderStatBar()` with priority classes
- `src/renderers/alerts.js` — Enhanced `renderAlerts()` with panel/section priority

#### Documentation Added
- `DESIGN_UPDATE_LINUX_STYLE.md` — Technical implementation reference
- `LINUX_STYLE_VISUAL_GUIDE.md` — Visual guide with ASCII art examples
- `LINUX_STYLE_CUSTOMIZATION.md` — Customization guide with themes
- Updated `tasks.md` — Added Phase 2 implementation tasks

#### Tests
- ✅ All 414 existing tests pass
- Zero breaking changes to HTML structure or JavaScript APIs
- CSS classes additive only
- Graceful degradation if elements missing

---

## [2.0.0] - Two-Tier Architecture Release

### Added
- Backend Node.js/Express server with SQLite database
- JWT-based authentication (students + instructors)
- Attempt gating system (3 attempts per lesson per student)
- Result recording (append-only, server-side timestamps)
- Admin reset functionality (instructor-only)
- Teach Mode (no login, localStorage progress tracking)
- Quiz Mode (login required, server-side scoring)
- Explain Panel (Teach Mode only, 50+ content entries)
- Self-Check system (3-tier questions: recall, reading, synthesis)
- Skill-based learning path (4 skills with reference cards)
- Modular frontend (ES modules, no build step)
- Comprehensive test suite (414 tests, 11 files)

### Changed
- Refactored from single-file HTML to modular architecture
- Extracted simulation engine to `src/engine.js` (mode-agnostic)
- Lesson data moved to `src/lessons.js` (pure data module)
- Split renderers into separate files (overview, topology, alerts, packets, charts, logs)

### Security
- JWT tokens stored in memory only (never localStorage)
- Bcrypt password hashing (12 rounds)
- No plaintext passwords in frontend
- Attempt counter per (student, lesson) pair
- Result records append-only (no updates or deletes)

---

## [1.0.1] - Single-File Prototype

### Added
- Initial single-file HTML simulator
- 6 network incident scenarios
- 3 topology templates
- Basic monitoring dashboard (6 panels)
- Diagnosis modal with MCQ
- Hint system
- Packet capture simulation
- Alert generation
- Log console

---

## Version Numbering

NetWatch follows [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes to architecture or API
- MINOR: New features, backward-compatible
- PATCH: Bug fixes, no new features

Current: **2.0.0** (two-tier architecture)  
Next: **2.1.0** (UI/UX enhancements complete)
