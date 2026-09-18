# NetWatch Design Update: Linux System Monitor Aesthetic

## Overview
Implemented visual hierarchy improvements inspired by Linux terminal monitoring tools like `htop`, `btop`, and system dashboards.

## What Was Added

### 1. **Nav Tab Attention Indicators**
Tabs with critical data now show a blinking `[!]` prefix in monospace font.

**Logic (in `app.js::updateTabAttention()`):**
- **Alerts tab**: `[!]` if critical alerts exist
- **Topology tab**: `[!]` if any nodes are critical/offline
- **Devices tab**: `[!]` if multiple devices degraded
- **Packets tab**: `[!]` if >5 flagged (anomalous) packets

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│ [!] Alerts    Topology    Devices    Packets  ...  │  ← blinking bracket
└─────────────────────────────────────────────────────┘
```

---

### 2. **Stat Bar Priority Indicators**
Cards in the stat bar show:
- **Red top border + blinking triangle** (▲) for critical thresholds
- **Amber top border + triangle** for warning thresholds
- **Green top border** for healthy state

**Thresholds:**
| Metric | Critical | Warning |
|--------|----------|---------|
| Devices Healthy | <50% healthy | <100% healthy |
| Alerts | Any critical | Any warning |
| Avg Latency | >200ms | >100ms |
| Avg CPU | >85% | >70% |
| Packet Loss | >5% | >3% |

**Visual:**
```
╔═══════════════╗  ← Red border = critical
║ ▲             ║  ← Blinking triangle
║ Devices       ║
║ 3/7           ║
╚═══════════════╝
```

---

### 3. **Panel Priority Borders**
Panels (like the alert list) get terminal-style box-drawing borders when they contain critical/warning data.

**Features:**
- **Critical panels**: 3px left red border + corner block character `▐` (blinking)
- **Warning panels**: 2px left amber border + dimmed block character
- **Subtle pulsing glow** on critical panels

**CSS classes:**
- `.panel.priority-critical` — for panels with critical alerts
- `.panel.priority-warning` — for panels with warnings
- `.panel.priority-attention` — for panels needing focus (cyan border)

---

### 4. **Section Header Indicators**
Section titles (`┌─ SECTION NAME`) change their prefix when containing alerts:

- **Normal**: `┌─` (thin border character)
- **Critical**: `├▶` (branch + arrow, blinking red)
- **Warning**: `├▶` (branch + arrow, amber)

**Example:**
```
├▶ ACTIVE ALERTS & EVENTS   ← Critical alert indicator
```

---

### 5. **Alert Item Enhancements**
Individual alert rows now have:
- **Timestamp brackets**: `[12:34]` instead of plain `12:34`
- **Block character on left edge**: `▌` (critical = blinking red, warning = dimmed amber)
- **Slide-in hover effect**: items shift 2px right on hover

---

### 6. **Color System Updates**
No color token changes yet, but the design now uses:
- **Block drawing characters**: `▐`, `▌`, `┌`, `├`, `▶`, `▲`
- **Consistent monospace hierarchy**: System info = mono, prose = sans
- **Terminal aesthetic**: Sharp borders, high contrast, functional indicators

---

## Files Modified

### CSS (`public/styles.css`)
1. `.nav-tab` — added `.nav-tab.attention::before` for `[!]` prefix
2. `.panel` — added `.priority-critical`, `.priority-warning`, `.priority-attention` classes
3. `.section-title` — added `::before` pseudo-element for box-drawing prefixes
4. `.section-header` — added `.has-alert`, `.has-warning` modifiers
5. `#stat-bar .sc` — added `.stat-critical`, `.stat-warning`, `.stat-healthy` classes
6. `.alert-item` — enhanced with `::before` block characters and hover effects
7. `.alert-ts` — added `::before` and `::after` for bracket wrapping

### JavaScript

**`src/app.js`:**
- Added `updateTabAttention()` function (called from `renderAll()`)
- Logic determines which tabs get `[!]` based on state

**`src/renderers/overview.js`:**
- Enhanced `renderStatBar()` to add `.stat-critical`, `.stat-warning`, `.stat-healthy` classes to cards
- Uses thresholds to determine priority level

**`src/renderers/alerts.js`:**
- Enhanced `renderAlerts()` to add `.priority-critical` / `.priority-warning` to panel container
- Adds `.has-alert` / `.has-warning` to section header

---

## How to Test

1. **Start a simulation** (any scenario)
2. **Wait for alerts to fire** (usually around :10-:30 seconds)
3. **Observe**:
   - Stat bar cards with degraded metrics show red/amber borders and blinking triangles
   - Alerts tab shows `[!] Alerts` prefix (blinking)
   - Alert panel has red left border with blinking block character
   - Section header shows `├▶ ACTIVE ALERTS` instead of `┌─`
   - Topology tab may show `[!]` if nodes are critical
4. **Switch tabs** while alerts are active — attention indicators remain on inactive tabs

---

## Design Philosophy

Inspired by Linux system monitors:
- **Information density** — pack more signals into less space
- **Functional aesthetics** — every decoration conveys status
- **Terminal heritage** — monospace, box-drawing, ASCII art, blinking indicators
- **No guesswork** — critical states demand attention through movement + color

This update makes NetWatch feel like a **professional network operations center tool** rather than a web app, reinforcing the educational goal: "learn to read what engineers use."

---

## Next Steps (Not Implemented Yet)

1. Add panel priority to **Topology** and **Devices** panels (not just Alerts)
2. Implement **link thickness** in topology SVG based on traffic volume
3. Add **degrading/recovering** color states (orange/light-green)
4. Add **keyboard shortcuts** overlay (e.g., press `?` to show: `A=Alerts, T=Topology, D=Devices`)
5. Consider **vertical side indicator** (like IDE error stripe) showing which panels have issues

---

## Compatibility

- All existing functionality preserved
- No breaking changes to HTML IDs or structure
- Graceful degradation: if elements missing, no errors thrown
- CSS classes additive only (never removed existing styles)
