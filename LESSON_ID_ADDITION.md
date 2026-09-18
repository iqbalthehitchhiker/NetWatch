# Lesson ID Display on Quiz Mode Cards

## Overview
Added lesson ID display to quiz mode lesson selection cards for better reference and identification.

---

## Visual Change

### Before
```
┌─────────────────────────────────┐
│ ● BEGINNER                      │
│                                 │
│ The DDoS That Came From Outside │
│ ▸ Focus device: GW-1            │
│ A volumetric SYN flood...       │
│ ─────────────────────────────── │
│ Branch Office | Start Lesson →  │
└─────────────────────────────────┘
```

### After
```
┌─────────────────────────────────┐
│ ● BEGINNER          DDOS_EDGE   │  ← Lesson ID added
│                                 │
│ The DDoS That Came From Outside │
│ ▸ Focus device: GW-1            │
│ A volumetric SYN flood...       │
│ ─────────────────────────────── │
│ Branch Office | Start Lesson →  │
└─────────────────────────────────┘
```

---

## Implementation Details

### HTML Structure Change

**Before:**
```html
<div class="lesson-card">
  <span class="lesson-diff">BEGINNER</span>
  <div class="lesson-card-title">...</div>
  ...
</div>
```

**After:**
```html
<div class="lesson-card">
  <div class="lesson-card-header">
    <span class="lesson-diff">BEGINNER</span>
    <span class="lesson-id">ddos_edge</span>
  </div>
  <div class="lesson-card-title">...</div>
  ...
</div>
```

### CSS Styling

#### Card Header Container
```css
.lesson-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}
```

#### Lesson ID Badge
```css
.lesson-id {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  background: var(--panel2);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 3px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Hover state */
.lesson-card:hover .lesson-id {
  color: var(--accent);
  border-color: var(--accent);
}
```

---

## Design Rationale

### Why Add Lesson IDs?

1. **Reference:** Students and instructors can refer to specific lessons by ID
2. **Debugging:** Easier to identify lessons in logs, URLs, or support requests
3. **Administrative:** Instructors using Admin Reset need to know lesson IDs
4. **Professional:** Matches real-world software where resources have identifiers

### Design Choices

#### Positioning: Top Right
- Non-intrusive (doesn't compete with difficulty badge)
- Scannable (consistent position across all cards)
- Balanced layout (difficulty left, ID right)

#### Styling: Subtle but Visible
- Muted color by default (secondary info)
- Accent color on hover (becomes prominent when engaged)
- Monospace font (technical identifier aesthetic)
- Small size (10px) - readable but not dominant
- Uppercase (matches identifier conventions)

#### Not Added to Skill Cards (Teach Mode)
- Skill IDs are internal implementation details
- Students don't need to reference skills by ID
- Keeps Teach mode simpler and less technical

---

## Use Cases

### For Students
- "I'm stuck on lesson `DB_SLOWDOWN`"
- "Which lesson covers BGP issues?" → Look for `BGP_LEAK`

### For Instructors
- Admin Reset form: "Enter NPM and Lesson ID"
- Now students can easily provide the ID from the card
- No need to guess or check lesson title spelling

### For Developers
- API calls use lesson IDs internally
- Now visible in UI for easier debugging
- Matches backend database records

---

## Files Modified

1. **`src/app.js`**
   - `renderLessonSelect()` — Added `.lesson-card-header` wrapper
   - Added `.lesson-id` span with `${l.id}`

2. **`public/styles.css`**
   - Added `.lesson-card-header` flexbox container
   - Added `.lesson-id` badge styling
   - Updated `.lesson-diff` to remove bottom margin (now in header)

---

## Example Lesson IDs

Current lessons in the system:
- `ddos_edge` — The DDoS That Came From Outside
- `db_slowdown` — The Database Query That Wouldn't End
- `gpu_thermal` — The GPU Cluster Thermal Throttling
- `internal_overload` — The Overload That Came From Inside
- `web_leak` — The Web Server That Forgot to Let Go
- `loop_storm` — The Broadcast Storm on the LAN

---

## Testing

✅ All 414 tests pass
✅ No breaking changes
✅ Layout responsive on mobile (header wraps gracefully)
✅ Hover state works correctly

---

## Accessibility

- Color is not the only indicator (text always present)
- Sufficient contrast in both light and dark themes
- Hover state has clear visual feedback
- Uppercase text-transform may affect screen readers (reads letter-by-letter)
  - Acceptable because IDs are intended to be read as identifiers

---

## Future Enhancements

### Potential Additions
1. **Tooltip:** Show full lesson ID on hover (if truncated)
2. **Copy button:** Click to copy lesson ID to clipboard
3. **Filter by ID:** Search box that filters cards by ID
4. **URL parameter:** Deep link to specific lesson card via `?lesson=ddos_edge`

### Not Recommended
- ❌ Don't make ID too prominent (not primary info)
- ❌ Don't add to skill cards (keeps Teach mode simple)
- ❌ Don't show internal database IDs (confusing, no benefit)

---

## Visual Examples

### Card States

#### Normal State
```
┌─────────────────────────────────┐
│ ●● INTERMEDIATE    GPU_THERMAL  │  ← Muted gray ID
│                                 │
│ The GPU Cluster Thermal...      │
└─────────────────────────────────┘
```

#### Hover State
```
┌─────────────────────────────────┐
│ ●● INTERMEDIATE    GPU_THERMAL  │  ← Accent blue ID
│                   ↑             │
│ The GPU Cluster Thermal...      │  (card lifted, shadow visible)
└─────────────────────────────────┘
```

#### Mobile/Small Screen
```
┌──────────────────┐
│ ● BEGINNER       │
│ DDOS_EDGE        │  ← Wraps to second line if needed
│                  │
│ The DDoS That... │
└──────────────────┘
```

---

## Comparison: Quiz vs Teach

### Quiz Mode Cards (Have ID)
```
┌─────────────────────────────────┐
│ ● BEGINNER          DDOS_EDGE   │  ← ID shown
│ The DDoS That Came From Outside │
│ ▸ Focus device: GW-1            │
└─────────────────────────────────┘
```

### Teach Mode Cards (No ID)
```
┌─────────────────────────────────┐
│ ✓ COMPLETE                      │  ← Completion badge instead
│ Reading Network Topology        │
│ Learn to interpret...           │
│ APPEARS IN: DDoS • DB Slowdown  │
└─────────────────────────────────┘
```

This distinction makes sense:
- **Quiz mode** = Technical, graded, formal → IDs visible
- **Teach mode** = Exploratory, practice, informal → IDs hidden
