# Lesson Selection Page Redesign

## Overview
Improved the lesson selection page to make it more visually engaging while maintaining NetWatch's professional network-monitoring aesthetic. The lesson cards are now the clear visual focus, with centered introductory content and subtle supporting elements.

## Key Changes

### 1. Layout Transformation

#### Three-Column Grid Layout
- **Left Column (180px)**: Subtle network status display with miniature topology
- **Center Column (fluid)**: Main content with centered intro and lesson grid
- **Right Column (180px)**: Monitoring feed with metric sparklines and packet indicators

#### Responsive Behavior
- Side columns shrink at narrower widths (1200px → 140px columns)
- Side elements hide completely on mobile/tablet (<968px)
- Lesson grid switches to single column on smaller screens

### 2. Centered Introduction Section

Replaced the left-aligned header with a centered, hierarchical intro:

```
SELECT A SCENARIO
    ↓
Network Diagnosis Trainer
    ↓
[Description paragraph]
    ↓
[5-stage workflow pipeline]
```

**Elements:**
- Small uppercase eyebrow label
- Large, prominent title (36px)
- Constrained description (max 640px width)
- Visual workflow pipeline with numbered steps (01-05)
- Subtle "← Home" link at top

### 3. Enhanced Lesson Cards

**Visual Improvements:**
- Increased card height (380px) for better presence
- Larger title (21px) with improved typography
- Added visual preview area (80px height) with scenario-specific SVG graphics
- Enhanced hover effects with larger lift (6px) and stronger glow
- Stronger accent color integration throughout card
- Improved button states with slide-in animation

**Information Hierarchy:**
1. Difficulty badge + Lesson ID (top)
2. Lesson title
3. Focus device indicator
4. **Visual preview** (NEW)
5. Description
6. Topology name + Start button (footer)

### 4. Scenario-Specific Visual Previews

Each lesson card includes a small, contextual visualization:

| Lesson | Visual Element |
|--------|----------------|
| **DDoS at the Edge** | Traffic bars climbing + gateway node under attack |
| **Database Slowdown** | Latency spike chart + database icon |
| **GPU Thermal** | Temperature bars climbing + GPU chip icon |
| **Internal Overload** | Connection flood lines between gateway and client |
| **Memory Leak** | Memory usage bars growing + server icon |
| **Loop Storm** | Circular broadcast arrows + switch node with wave effects |

**Design Principles:**
- Self-contained SVG (no external assets)
- Uses semantic color palette (green/amber/red)
- Compact (200×80px viewBox)
- Reinforces lesson content without clutter
- Respects card's accent color variable

### 5. Side Monitoring Elements

#### Left Side: Network Status
- "NETWORK STATUS" module title
- Device/Link/Alert counters with colored dots
- Small abstract topology diagram (4 nodes)
- Sticky positioning (stays visible on scroll)

#### Right Side: Monitoring Feed
- "MONITORING FEED" module title
- Metric readouts with sparkline charts (Latency, CPU, Packet Loss)
- Mini packet feed with protocol indicators
- All values show placeholder "—" (ambient, not functional)

**Visual Language:**
- Muted, subtle — never compete with lesson cards
- Uses semantic colors (cyan, amber, green, purple)
- Compact monospace typography
- Feels like instrumentation framing the main content

### 6. Color Enhancement

Introduced more semantic color throughout:

| Color | Meaning | Usage |
|-------|---------|-------|
| **Cyan** | Active / telemetry | Workflow numbers, side module accents |
| **Green** | Healthy / normal | Healthy status dots, low difficulty |
| **Amber** | Warning / degraded | Warning status, medium difficulty |
| **Red** | Critical / incident | Critical status, high difficulty, preview elements |
| **Purple** | Packet / evidence | Packet protocol indicators |
| **Gray** | Inactive | Placeholder values, muted text |

### 7. Workflow Pipeline Redesign

Replaced simple text buttons with a visual pipeline:

**Before:**
```
Select scenario → Observe network → Detect anomaly → ...
```

**After:**
```
┌────┐     ┌────┐     ┌────┐     ┌────┐     ┌────┐
│ 01 │  →  │ 02 │  →  │ 03 │  →  │ 04 │  →  │ 05 │
└────┘     └────┘     └────┘     └────┘     └────┘
Select    Observe    Detect   Investigate  Diagnose
```

- Numbered circular badges with cyan accent
- Uppercase labels
- Centered in bordered panel
- More visual hierarchy

## Files Modified

### HTML (`index.html`)
- Replaced `.select-hero` structure with `.select-container` three-column grid
- Added `.select-side-left` and `.select-side-right` monitoring modules
- Centralized intro content in `.select-center`
- Restructured workflow from `.select-loop` to `.select-workflow`

### CSS (`public/styles.css`)
**Added:**
- `.select-container` — three-column grid layout
- `.select-center` — center content wrapper
- `.select-intro` — centered introduction section
- `.select-eyebrow`, `.select-title`, `.select-description` — typography hierarchy
- `.select-workflow` — visual pipeline container
- `.workflow-step`, `.workflow-num`, `.workflow-label`, `.workflow-arrow` — pipeline elements
- `.select-side`, `.side-module` — side monitoring containers
- `.side-status-*`, `.side-metric-*`, `.side-packet-*` — monitoring element styles
- `.lesson-card-preview` — visual preview container
- Updated `.lesson-card` dimensions and hover effects
- Enhanced responsive breakpoints for three-column layout

**Modified:**
- Increased `.lesson-card` min-height to 380px
- Enhanced hover states (6px lift, stronger shadows)
- Improved card typography (21px title)
- Updated responsive behavior for side elements

### JavaScript (`src/app.js`)
**Added:**
- `generateLessonPreviewSVG(lessonId)` — returns scenario-specific SVG markup
- Updated `renderLessonSelect()` to include preview and topology name

**Modified:**
- Imported `TOPOLOGIES` from lessons.js
- Added preview SVG to card template
- Replaced placeholder "—" with actual topology name

## Design Philosophy

### What Changed
- **Layout:** From left-aligned to centered with subtle framing
- **Hierarchy:** Clearer visual flow from intro → workflow → lessons
- **Color:** More semantic use of monitoring palette
- **Cards:** More prominent with contextual previews
- **Space:** Intentionally occupied with ambient monitoring elements

### What Stayed the Same
- Dark, restrained aesthetic
- Technical/monitoring console character
- Clean geometry and compact typography
- All existing functionality and navigation
- No external assets or dependencies
- Single-file HTML prototype architecture

### Design Principles Applied
✓ Lesson cards are the dominant visual focus  
✓ Introduction is centered and hierarchical  
✓ Side elements are subtle and supporting  
✓ More semantic color without being "busy"  
✓ Feels like a network monitoring environment  
✓ Professional training application, not consumer SaaS  
✓ Self-contained (CSS/SVG only, no images)  
✓ Responsive and usable at different widths  

## Visual Hierarchy (Final)

1. **Lesson cards** — largest, most colorful, interactive
2. **Main heading** — centered, 36px, prominent
3. **Workflow pipeline** — visual, numbered, clear
4. **Side monitoring elements** — subtle, ambient, muted
5. **Background/borders** — restrained, geometric

## Testing Checklist

- [x] Lesson cards remain visually dominant
- [x] Introduction is centered and readable
- [x] Side elements don't compete with cards
- [x] Visual previews reflect scenario content
- [x] Workflow pipeline is clear and sequential
- [x] Color is semantic and restrained
- [x] Existing scenario selection works
- [x] Existing navigation works
- [x] No external assets introduced
- [x] Responsive at different widths
- [x] Only lesson select page modified
- [x] NetWatch aesthetic preserved

## Browser Compatibility

- Modern CSS Grid (all major browsers)
- CSS Custom Properties (all major browsers)
- SVG inline rendering (all major browsers)
- No bleeding-edge features used

## Future Enhancements (Out of Scope)

- Animate side monitoring elements when lessons load
- Make side element values dynamic based on selected lesson
- Add micro-interactions to visual previews on hover
- Progressive enhancement for motion preferences
- Filter/sort lessons by difficulty or focus
