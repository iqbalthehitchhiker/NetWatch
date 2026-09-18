# NetWatch Linux-Style Visual Guide

## Quick Reference: What Changed

### Before vs After

#### **Nav Tabs**
```
BEFORE:
┌─────────────────────────────────────────┐
│  Overview  Topology  Alerts  Packets    │
└─────────────────────────────────────────┘

AFTER (when critical alerts exist):
┌─────────────────────────────────────────┐
│  Overview  Topology  [!] Alerts  Packets│  ← Blinking [!] indicator
└─────────────────────────────────────────┘
```

---

#### **Stat Bar Cards**
```
BEFORE:
╔══════════════╗
║ Devices      ║
║ Healthy      ║
║ 3/7          ║
╚══════════════╝

AFTER (critical state):
╔══════════════╗ ← Red top border (2px)
║ ▲           ║ ← Blinking triangle (top-right)
║ Devices     ║
║ Healthy     ║
║ 3/7         ║ ← Red value
║ Investigate ║
╚══════════════╝
   Red glow
```

---

#### **Alert Panel**
```
BEFORE:
┌─────────────────────────────────────────┐
│ ACTIVE ALERTS & EVENTS                  │
├─────────────────────────────────────────┤
│ │ 00:23  Gateway Overload  CRITICAL     │
│ │        High packet rate...            │
├─────────────────────────────────────────┤
│ │ 00:15  CPU Warning       WARNING      │
└─────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────┐
│ ├▶ ACTIVE ALERTS & EVENTS               │ ← Changed prefix (blinking)
├─────────────────────────────────────────┤
│║▌[00:23] Gateway Overload  CRITICAL     │ ← Block char + brackets
│║         High packet rate...            │ ← Red dim background
├─────────────────────────────────────────┤
│║▌[00:15] CPU Warning       WARNING      │ ← Amber dim background
└─────────────────────────────────────────┘
 ↑ Red left border (3px) + blinking block
```

---

#### **Section Headers**
```
Normal state:
┌─ MONITORED DEVICES

Warning state:
├▶ MONITORED DEVICES  (amber)

Critical state:
├▶ MONITORED DEVICES  (red, blinking)
```

---

## Character Reference

### Box Drawing Characters Used
- `┌` — Top-left corner (normal section)
- `├` — Left T-junction (alert section)
- `▶` — Right arrow (attention)
- `▐` — Right half block (panel edge, blinking)
- `▌` — Left half block (alert item edge)
- `▲` — Up triangle (stat card warning)

### When Each Appears

| Character | Where | When |
|-----------|-------|------|
| `[!]` | Nav tabs | Critical condition in that tab's data |
| `▲` | Stat cards (top-right) | Metric exceeds threshold |
| `▐` | Panel left edge | Panel contains critical data |
| `▌` | Alert item left edge | Individual alert row |
| `├▶` | Section headers | Section has alerts/warnings |
| `[00:23]` | Alert timestamps | Always (brackets added) |

---

## Color Coding

### Stat Bar Indicators
```css
.stat-critical  → Red border + red background tint
.stat-warning   → Amber border
.stat-healthy   → Green border
```

### Panel Priority
```css
.priority-critical  → Red left border (3px) + pulsing glow
.priority-warning   → Amber left border (2px)
.priority-attention → Cyan outline
```

---

## Animation Types

1. **Blink** (1.2-1.5s cycle)
   - `[!]` tab prefix
   - `▐` panel block
   - `▌` critical alert block
   - `▲` critical stat triangle
   - `├▶` section prefix

2. **Pulse** (2s cycle)
   - Critical panel glow (subtle)

3. **Slide** (0.2s)
   - Alert items on hover (2px right shift)

---

## Keyboard Accessibility

All visual indicators are **supplementary** — critical information is also conveyed through:
- Text labels ("CRITICAL", "WARNING")
- Color (meets WCAG AA contrast ratios)
- Semantic HTML (`role`, `aria-live`, `aria-label`)

Screen readers will announce:
- Alert count badges
- Status changes in stat cards
- New alerts via `aria-live="polite"`

---

## Browser Compatibility

### Box-Drawing Characters
Supported in all modern browsers with monospace fonts:
- ✅ Windows: Consolas, Cascadia Code, JetBrains Mono
- ✅ macOS: SF Mono, Menlo, Monaco
- ✅ Linux: DejaVu Sans Mono, Liberation Mono

### CSS Animations
- `animation: blink` — works in all browsers since 2015
- `animation: panel-urgent-pulse` — CSS keyframes (universal support)
- No JavaScript animation dependencies

### Fallback
If box-drawing characters don't render:
- Brackets `[!]` still readable with ASCII
- Triangles `▲` fall back to similar Unicode symbols
- Block characters can be replaced with `|` or `│` if needed

---

## Usage Examples

### Adding a New Priority Panel

```javascript
// In your renderer:
const panel = document.getElementById('my-panel');
panel.classList.remove('priority-critical', 'priority-warning');

if (hasCriticalData) {
  panel.classList.add('priority-critical');
} else if (hasWarningData) {
  panel.classList.add('priority-warning');
}
```

### Adding Tab Attention

```javascript
const tab = document.getElementById('tab-myview');
tab.classList.remove('attention');

if (needsAttention) {
  tab.classList.add('attention');  // [!] appears
}
```

### Adding Section Alert Indicator

```javascript
const section = document.querySelector('.section-header');
section.classList.remove('has-alert', 'has-warning');

if (hasCritical) {
  section.classList.add('has-alert');  // ├▶ red, blinking
} else if (hasWarning) {
  section.classList.add('has-warning');  // ├▶ amber
}
```

---

## Testing Checklist

Start any scenario and verify:

- [ ] **Stat cards** show colored top borders when metrics degrade
- [ ] **Blinking triangle** (▲) appears in critical stat cards
- [ ] **Alert tab** shows `[!]` prefix when alerts fire
- [ ] **Topology tab** shows `[!]` when nodes go critical
- [ ] **Alert panel** has red left border with blinking `▐`
- [ ] **Section header** changes from `┌─` to `├▶` (red, blinking)
- [ ] **Individual alerts** have `▌` block on left edge
- [ ] **Timestamps** wrapped in brackets: `[00:23]`
- [ ] **Hover effect** on alert items (2px slide)

---

## Performance Notes

- **Low overhead**: CSS-only animations (no JavaScript timers)
- **GPU-accelerated**: transforms and opacity changes only
- **Selective rendering**: priority classes only added when state changes
- **No layout thrashing**: all indicators use `position: absolute` or pseudo-elements

---

## Philosophy

This design follows **terminal monitoring tool aesthetics**:

1. **High information density** — no wasted space
2. **Movement attracts attention** — blinking = "look here now"
3. **Redundant encoding** — color + shape + position + animation
4. **Monospace hierarchy** — data is mono, prose is sans
5. **Functional decoration** — every visual element has semantic meaning

Students learn that professional tools prioritize **signal over noise**.

---

## Inspiration

Based on these Linux tools:
- `htop` — process monitor with colored bars and status characters
- `btop` — system resource monitor with box-drawing graphs
- `tmux` — terminal multiplexer with status line indicators
- `nethogs` — network bandwidth monitor per process
- `iftop` — network traffic analyzer with live bar charts

Screenshot references: [Add screenshots here after testing in browser]
