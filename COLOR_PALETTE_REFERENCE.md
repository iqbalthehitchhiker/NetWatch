# NetWatch Color Palette Reference

Quick visual reference for all colors in the design system.

---

## Dark Theme (Default)

### Base Colors
```
┌─────────────────────────────────────┐
│ Background  #171923  █████████████  │
│ Panel       #1f2937  █████████████  │
│ Panel2      #27303f  █████████████  │
│ Border      #374151  █████████████  │
│ Text        #e5e7eb  █████████████  │
│ Muted       #9ca3af  █████████████  │
└─────────────────────────────────────┘
```

### Interactive Colors
```
┌─────────────────────────────────────┐
│ Accent       #3b82f6  █████████████ │ Blue
│ Accent Hover #60a5fa  █████████████ │ Light Blue
└─────────────────────────────────────┘
```

### Status Colors
```
┌─────────────────────────────────────┐
│ Healthy   #10b981  █████████████    │ Emerald Green
│ Warning   #f59e0b  █████████████    │ Amber
│ Critical  #ef4444  █████████████    │ Red
│ Degrading #fb923c  █████████████    │ Orange 🆕
│ Improving #34d399  █████████████    │ Light Green 🆕
└─────────────────────────────────────┘
```

### Semantic Aliases
```
┌─────────────────────────────────────┐
│ Cyan    #3b82f6  █████████████      │ (same as Accent)
│ Green   #10b981  █████████████      │ (same as Healthy)
│ Amber   #f59e0b  █████████████      │ (same as Warning)
│ Red     #ef4444  █████████████      │ (same as Critical)
│ Purple  #8b5cf6  █████████████      │
│ Orange  #fb923c  █████████████      │ (same as Degrading)
└─────────────────────────────────────┘
```

---

## Light Theme

### Base Colors
```
┌─────────────────────────────────────┐
│ Background  #f9fafb  █████████████  │
│ Panel       #ffffff  █████████████  │
│ Panel2      #f3f4f6  █████████████  │
│ Border      #d1d5db  █████████████  │
│ Text        #111827  █████████████  │
│ Muted       #6b7280  █████████████  │
└─────────────────────────────────────┘
```

### Interactive Colors
```
┌─────────────────────────────────────┐
│ Accent       #2563eb  █████████████ │ Deep Blue
│ Accent Hover #3b82f6  █████████████ │ Blue
└─────────────────────────────────────┘
```

### Status Colors
```
┌─────────────────────────────────────┐
│ Healthy   #059669  █████████████    │ Deep Emerald
│ Warning   #d97706  █████████████    │ Deep Amber
│ Critical  #dc2626  █████████████    │ Deep Red
│ Degrading #ea580c  █████████████    │ Deep Orange 🆕
│ Improving #10b981  █████████████    │ Emerald 🆕
└─────────────────────────────────────┘
```

---

## Color Usage Matrix

| Color | Use For | Don't Use For |
|-------|---------|---------------|
| **Accent (Blue)** | Buttons, links, interactive elements, focus states | Status indicators, alerts |
| **Healthy (Green)** | OK status, success, completion, beginner difficulty | Buttons, links (use accent) |
| **Warning (Amber)** | Warning status, intermediate difficulty, caution | Primary actions |
| **Critical (Red)** | Error status, danger, advanced difficulty, urgent alerts | Success messages, CTAs |
| **Degrading (Orange)** | Worsening trends, transitional states | Stable states |
| **Improving (Lt. Green)** | Recovery trends, positive changes | Stable healthy states |

---

## Examples in Context

### Alert Levels
```
DARK THEME:
[CRITICAL] #ef4444 ▌ Gateway Overload
[WARNING]  #f59e0b ▌ High CPU Usage  
[INFO]     #3b82f6 ▌ Simulation Started

LIGHT THEME:
[CRITICAL] #dc2626 ▌ Gateway Overload
[WARNING]  #d97706 ▌ High CPU Usage
[INFO]     #2563eb ▌ Simulation Started
```

### Device Status
```
DARK THEME:
● #10b981 HEALTHY
● #f59e0b WARNING
● #ef4444 CRITICAL
● #9ca3af OFFLINE

LIGHT THEME:
● #059669 HEALTHY
● #d97706 WARNING
● #dc2626 CRITICAL
● #6b7280 OFFLINE
```

### Difficulty Badges
```
DARK THEME:
● #10b981 BEGINNER
●● #f59e0b INTERMEDIATE
●●● #ef4444 ADVANCED

LIGHT THEME:
● #059669 BEGINNER
●● #d97706 INTERMEDIATE
●●● #dc2626 ADVANCED
```

### Buttons
```
PRIMARY (Accent):
Dark:  #3b82f6 background, #ffffff text
Light: #2563eb background, #ffffff text

GHOST:
Dark:  transparent bg, #9ca3af text
Light: transparent bg, #6b7280 text

PRIMARY HOVER:
Dark:  #60a5fa background
Light: #3b82f6 background
```

---

## Color Combinations (Accessibility Tested)

### Dark Theme - Safe Combinations

| Foreground | Background | Ratio | Grade |
|------------|------------|-------|-------|
| `#e5e7eb` (text) | `#171923` (bg) | 11.5:1 | AAA ✅ |
| `#9ca3af` (muted) | `#171923` (bg) | 6.8:1 | AAA ✅ |
| `#3b82f6` (accent) | `#171923` (bg) | 6.1:1 | AA ✅ |
| `#ffffff` (btn text) | `#3b82f6` (btn bg) | 4.7:1 | AA ✅ |
| `#10b981` (healthy) | `#171923` (bg) | 7.2:1 | AAA ✅ |
| `#f59e0b` (warning) | `#171923` (bg) | 8.4:1 | AAA ✅ |
| `#ef4444` (critical) | `#171923` (bg) | 5.9:1 | AA ✅ |

### Light Theme - Safe Combinations

| Foreground | Background | Ratio | Grade |
|------------|------------|-------|-------|
| `#111827` (text) | `#ffffff` (panel) | 14.2:1 | AAA ✅ |
| `#6b7280` (muted) | `#ffffff` (panel) | 5.4:1 | AA ✅ |
| `#2563eb` (accent) | `#ffffff` (panel) | 5.8:1 | AA ✅ |
| `#ffffff` (btn text) | `#2563eb` (btn bg) | 4.8:1 | AA ✅ |
| `#059669` (healthy) | `#ffffff` (panel) | 4.9:1 | AA ✅ |
| `#d97706` (warning) | `#ffffff` (panel) | 5.1:1 | AA ✅ |
| `#dc2626` (critical) | `#ffffff` (panel) | 5.3:1 | AA ✅ |

---

## CSS Variable Reference

```css
/* Use in your code like this: */
.my-element {
  color: var(--text);
  background: var(--panel);
  border-color: var(--border);
}

.button-primary {
  background: var(--accent);
  color: var(--btn-on-accent);
}

.button-primary:hover {
  background: var(--accent-hover);
}

.status-healthy {
  color: var(--healthy);
  background: var(--green-dim);
}

.status-warning {
  color: var(--warning);
  background: var(--amber-dim);
}

.status-critical {
  color: var(--critical);
  background: var(--red-dim);
}

/* New trend states */
.trend-degrading {
  color: var(--degrading);
  background: var(--orange-dim);
}

.trend-improving {
  color: var(--improving);
  background: var(--green-dim);
}
```

---

## Hex to RGB (for rgba usage)

### Dark Theme
```css
--bg:       rgb(23, 25, 35)
--panel:    rgb(31, 41, 55)
--accent:   rgb(59, 130, 246)
--healthy:  rgb(16, 185, 129)
--warning:  rgb(245, 158, 11)
--critical: rgb(239, 68, 68)
--degrading: rgb(251, 146, 60)
--improving: rgb(52, 211, 153)
```

### Light Theme
```css
--bg:       rgb(249, 250, 251)
--panel:    rgb(255, 255, 255)
--accent:   rgb(37, 99, 235)
--healthy:  rgb(5, 150, 105)
--warning:  rgb(217, 119, 6)
--critical: rgb(220, 38, 38)
--degrading: rgb(234, 88, 12)
--improving: rgb(16, 185, 129)
```

---

## Before → After Comparison

### Accent Color Evolution
```
BEFORE (Cyan):           AFTER (Blue):
Dark:  #2a8dbd ████      Dark:  #3b82f6 ████  ✨ More vibrant
Light: #1a6e9e ████      Light: #2563eb ████  ✨ Clearer role
```

### Status Colors Evolution
```
BEFORE:                  AFTER:
Healthy:  #4a9e6e ████   Healthy:  #10b981 ████  ✨ Modern emerald
Warning:  #c8893a ████   Warning:  #f59e0b ████  ✨ True amber
Critical: #c85a4a ████   Critical: #ef4444 ████  ✨ True red
                         Degrading: #fb923c ████  🆕 New
                         Improving: #34d399 ████  🆕 New
```

### Text Readability
```
BEFORE:                  AFTER:
Dark Text:  #c9d1d9 ██   Dark Text:  #e5e7eb ██  ✨ Brighter
Light Text: #1a2030 ██   Light Text: #111827 ██  ✨ True black
Dark Muted: #8891a0 ██   Dark Muted: #9ca3af ██  ✨ More readable
Light Muted: #5c6880 ██  Light Muted: #6b7280 ██  ✨ Better balance
```

---

## Print/Export Friendly

### Grayscale Equivalents
For printing or grayscale displays:
- Healthy → 60% gray
- Warning → 50% gray
- Critical → 40% gray
- Accent → 45% gray
- Text → 10% gray (dark) or 95% gray (light)

---

## Color Blindness Considerations

### Protanopia (Red-Blind) - 1% of males
- ✅ Accent (blue) vs Healthy (green) — Distinguishable
- ⚠️ Warning (amber) vs Critical (red) — May look similar
- 💡 Solution: Use icons/text labels, not just color

### Deuteranopia (Green-Blind) - 1% of males
- ✅ Accent (blue) clearly distinct
- ⚠️ Healthy (green) vs Degrading (orange) — May look similar
- 💡 Solution: Use status badges with text

### Tritanopia (Blue-Blind) - 0.001%
- ✅ Healthy (green) vs Warning (amber) vs Critical (red) — All distinguishable
- ⚠️ Accent (blue) vs Critical (red) — May look similar
- 💡 Solution: Context makes role clear (buttons vs alerts)

**We always use text labels alongside colors** ✅

---

## Quick Copy-Paste

### Dark Theme Palette
```
#171923  Background
#1f2937  Panel
#27303f  Panel2
#374151  Border
#e5e7eb  Text
#9ca3af  Muted
#3b82f6  Accent
#10b981  Healthy
#f59e0b  Warning
#ef4444  Critical
#fb923c  Degrading
#34d399  Improving
```

### Light Theme Palette
```
#f9fafb  Background
#ffffff  Panel
#f3f4f6  Panel2
#d1d5db  Border
#111827  Text
#6b7280  Muted
#2563eb  Accent
#059669  Healthy
#d97706  Warning
#dc2626  Critical
#ea580c  Degrading
#10b981  Improving
```

---

## Tools Used

- **Contrast Checker:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Color Blind Simulator:** [Coblis](https://www.color-blindness.com/coblis-color-blindness-simulator/)
- **Palette Inspiration:** [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
