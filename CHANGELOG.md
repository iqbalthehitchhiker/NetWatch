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


### Enhanced - Lesson Selection Page Redesign (2024)

**Design Philosophy:** Centered, hierarchical introduction with lesson cards as the visual focus, framed by subtle ambient monitoring elements.

#### Layout Transformation
- Three-column grid: side monitoring elements (180px) + centered content (fluid) + monitoring feed (180px)
- Centered introduction section with clear hierarchy (eyebrow → title → description → workflow)
- Visual workflow pipeline with numbered steps replacing simple text buttons
- Responsive: side elements hide on narrow screens, grid adapts to single column

#### Enhanced Lesson Cards
- Increased card height (380px) for better presence
- Added scenario-specific visual previews (80px SVG graphics per lesson)
- Larger title typography (21px) with improved hierarchy
- Enhanced hover effects: 6px lift + stronger glow + color transitions
- Display actual topology name in footer (replaced placeholder)
- Visual previews use semantic monitoring colors (red/amber/green/purple)

#### Visual Previews by Scenario
- **DDoS at the Edge:** Traffic bars + gateway node under attack
- **Database Slowdown:** Latency spike chart + database icon
- **GPU Thermal:** Temperature bars + GPU chip icon
- **Internal Overload:** Connection flood lines
- **Memory Leak:** Growing memory bars + server icon
- **Loop Storm:** Broadcast arrows + switch with wave effects

#### Side Monitoring Elements
- **Left:** Network status display with device/link/alert counters + miniature topology SVG
- **Right:** Monitoring feed with metric sparklines (latency/CPU/packet loss) + packet feed
- Sticky positioning for persistent context
- Muted colors — never compete with lesson cards
- Ambient, non-functional (placeholder values)

#### Color Enhancement
- More semantic use of monitoring palette throughout
- Cyan = active/telemetry, Green = healthy, Amber = warning, Red = critical, Purple = packets
- Color-coded difficulty badges with dot indicators (● ●● ●●●)
- Enhanced visual contrast for better hierarchy

#### Files Modified
- `index.html` — Restructured lesson select HTML with three-column grid
- `public/styles.css` — Added ~400 lines of layout/card/side element styles
- `src/app.js` — Added `generateLessonPreviewSVG()` function, enhanced `renderLessonSelect()`
- Imported `TOPOLOGIES` from lessons.js for displaying topology names

#### Documentation Added
- `LESSON_SELECT_REDESIGN.md` — Complete redesign documentation with before/after comparisons


### Enhanced - Skill/Practice Card Redesign (2024)

**Design Philosophy:** Elegant, refined cards that balance the lesson cards with clearer writing and sophisticated visual design.

#### Content Improvements
- **Rewritten descriptions:** More natural, conversational language; removed verbose AI-generated style
- **Concise explanations:** Focused on essential information without over-explaining
- **Better readability:** Shorter sentences, clearer structure, improved flow

#### Visual Redesign
- **Icon-based headers:** Each skill type (topology/charts/alerts/packets) has a custom SVG icon
- **Panel tags:** Prominent, colored badges showing which panel the skill targets
- **Elegant spacing:** More generous padding (32px) and improved vertical rhythm
- **Refined hover states:** Subtle 4px lift with sophisticated shadow and glow
- **Completion badges:** Repositioned to top-right corner with checkmark indicator

#### Card Structure
```
┌─ [accent line] ─────────────────────────────┐
│                        [✓ COMPLETE] (if done)│
│  [Icon]  [Panel Tag]                        │
│                                              │
│  Skill Title                                 │
│                                              │
│  Clear, concise description text...          │
│                                              │
│  ─────────────────────────────────────────  │
│  Used in                                     │
│  [Lesson] [Lesson] [Lesson]                 │
│  ─────────────────────────────────────────  │
│  [Practice →]                                │
└──────────────────────────────────────────────┘
```

#### Typography & Color
- Icon and panel tag use cyan accent for consistency
- Title: 20px, same weight as lesson cards
- Description: 13.5px with 1.8 line-height for readability
- Related lesson tags: Individual pills instead of bullet list
- Monospace fonts for technical elements (panel tags, buttons)

#### Content Changes (Condensed Writing)

**Before (Topology):**
"Each node circle is outlined and tinted with a health colour: green (healthy), amber (warning or degraded), red (critical), and grey (offline). A text label below the node name — WARN, DEGRADED, CRIT — duplicates the colour so health state is never conveyed by colour alone. Links between nodes change colour by latency and packet loss: grey is normal; amber appears when latency exceeds 50 ms or loss exceeds 1.5%; red and thicker when latency exceeds 200 ms or loss exceeds 5%. In Teach mode, clicking any non-external node opens the Explain panel for that device type."

**After (Topology):**
"Nodes use color to show health: green for healthy, amber for warning, red for critical, and gray when offline. Text labels reinforce the color so nothing depends on color alone. Links between nodes change color based on latency and packet loss—gray is normal, amber appears above 50ms latency or 1.5% loss, and red indicates severe degradation above 200ms or 5% loss."

Similar condensation applied to all four skill descriptions (Charts, Alerts, Packets).

#### Files Modified
- `src/lessons.js` — Rewrote all SKILLS body text (4 skills × ~60% shorter)
- `src/app.js` — Added `getSkillIcon()` function, redesigned `renderSkillSelect()` with new card structure
- `public/styles.css` — Added ~200 lines of new skill card styles with icon/header/footer components

#### Design Goals Achieved
✓ More natural, human writing style  
✓ Clearer information hierarchy  
✓ Elegant visual design matching lesson cards  
✓ Icon-based quick identification  
✓ Better use of space and typography  
✓ Refined hover interactions  
✓ Professional, classy aesthetic  
