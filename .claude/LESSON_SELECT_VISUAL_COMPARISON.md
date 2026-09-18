# Lesson Selection Page: Visual Comparison

## Before → After

### Layout Structure

**BEFORE:**
```
┌─────────────────────────────────────────────────────────────┐
│ Select a scenario      Network Diagnosis Trainer   [← Home] │
├─────────────────────────────────────────────────────────────┤
│ [Description paragraph left-aligned...]                      │
│                                                              │
│ Select → Observe → Detect → Investigate → Diagnose          │
│                                                              │
│ ┌────────────────┐  ┌────────────────┐                      │
│ │  LESSON CARD   │  │  LESSON CARD   │                      │
│ │                │  │                │                      │
│ └────────────────┘  └────────────────┘                      │
│                                                              │
│ ┌────────────────┐  ┌────────────────┐                      │
│ │  LESSON CARD   │  │  LESSON CARD   │                      │
│ │                │  │                │                      │
│ └────────────────┘  └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

**AFTER:**
```
┌──────┬─────────────────────────────────────────────┬──────┐
│      │              [← Home]                       │      │
│ NET  │                                             │ MON  │
│ WORK │      SELECT A SCENARIO                      │  I   │
│      │   Network Diagnosis Trainer                 │ TOR  │
│ STT  │   [Centered description...]                 │  I   │
│  A   │                                             │  N   │
│ TUS  │   ┌──┐   ┌──┐   ┌──┐   ┌──┐   ┌──┐        │  G   │
│      │   │01│ → │02│ → │03│ → │04│ → │05│        │      │
│ [□]  │   └──┘   └──┘   └──┘   └──┘   └──┘        │ Lat  │
│ [□]  │   Select Observe Detect Investigate...     │ CPU  │
│ [□]  │                                             │ Loss │
│      │        Available Scenarios                  │      │
│ [^]  │                                             │ [==] │
│ [^]  │ ┌──────────────────┐  ┌──────────────────┐│ [==] │
│ [^]  │ │   ● BEGINNER     │  │  ●● INTERMEDIATE ││ [==] │
│ [^]  │ │   DDoS at Edge   │  │  Database Slow   ││      │
│      │ │   [Preview SVG]  │  │  [Preview SVG]   ││ [pkt]│
│      │ │   Description... │  │  Description...  ││ [pkt]│
│      │ │   [Start →]      │  │  [Start →]       ││ [pkt]│
│      │ └──────────────────┘  └──────────────────┘│      │
│      │                                             │      │
└──────┴─────────────────────────────────────────────┴──────┘
```

### Card Comparison

**BEFORE:**
```
┌─────────────────────────────┐
│ ● BEGINNER      [ddos_edge] │ ← Header: badges
│                             │
│ DDoS at the Edge            │ ← Title (19px)
│                             │
│ ◆ Focus: Gateway / Router   │ ← Focus device
│                             │
│ Users report the branch     │ ← Description
│ office site is unreachable  │
│ and slow. Watch the...      │
│                             │
├─────────────────────────────┤
│ —              [Start →]    │ ← Footer: topology + button
└─────────────────────────────┘
  320px min-height, moderate hover
```

**AFTER:**
```
┌─────────────────────────────┐
│ ● BEGINNER      [ddos_edge] │ ← Header: badges
│                             │
│ DDoS at the Edge            │ ← Title (21px, larger)
│                             │
│ ◆ Focus: Gateway / Router   │ ← Focus device
│                             │
│ ┌───────────────────────┐   │ ← NEW: Visual preview
│ │  [Traffic bars + GW]  │   │    80px SVG graphic
│ │  [under attack viz]   │   │    Semantic colors
│ └───────────────────────┘   │
│                             │
│ Users report the branch     │ ← Description
│ office site is unreachable  │
│ and slow. Watch the...      │
│                             │
├─────────────────────────────┤
│ Branch Office   [Start →]   │ ← Footer: actual topology name
└─────────────────────────────┘
  380px min-height, stronger hover (6px lift)
```

### Visual Preview Examples

**DDoS at the Edge:**
```
Traffic flooding visualization:
████ ████ ████ ████ ████       [GW!]
 ||   |||  ||||  █████ █████  ← attack
```

**Database Slowdown:**
```
Latency spike chart:
    ___________
   /           
  /             [DB]
_/              [DB]
```

**GPU Thermal:**
```
Temperature bars climbing:
█  ██ ███ ████ █████      [GPU]
                           [==]
```

**Loop Storm:**
```
Broadcast loop:
    ╭─────╮
    │ SW! │
    ╰─────╯
  ))) ((( ))) waves
```

### Workflow Pipeline Comparison

**BEFORE:**
```
Select scenario → Observe network → Detect anomaly → Investigate → Diagnose
```

**AFTER:**
```
 ┌──┐       ┌──┐       ┌──┐       ┌──┐       ┌──┐
 │01│   →   │02│   →   │03│   →   │04│   →   │05│
 └──┘       └──┘       └──┘       └──┘       └──┘
Select    Observe    Detect   Investigate  Diagnose
```

### Side Elements

**LEFT SIDE (Network Status):**
```
┌───────────────────┐
│ NETWORK STATUS    │
├───────────────────┤
│ ● Devices    —    │
│ ● Links      —    │
│ ● Alerts     0    │
│                   │
│     [^]           │
│    /   \          │
│   [^]  [^]        │
│     \ /           │
│     [^]           │
│                   │
│  Mini topology    │
└───────────────────┘
```

**RIGHT SIDE (Monitoring Feed):**
```
┌───────────────────┐
│ MONITORING FEED   │
├───────────────────┤
│ Latency      —    │
│ [sparkline ∿∿∿∿]  │
│                   │
│ CPU          —    │
│ [sparkline ∿∿∿∿]  │
│                   │
│ Pkt Loss     —    │
│                   │
│ [00:00]  TCP      │
│ [00:01]  UDP      │
│ [00:02]  ICMP     │
└───────────────────┘
```

## Key Visual Improvements

### 1. Hierarchy
- **Before:** Left-aligned, less clear hierarchy
- **After:** Centered, stepped progression (eyebrow → title → description → workflow → cards)

### 2. Focus
- **Before:** Cards compete with other elements for attention
- **After:** Cards are unmistakably the main content, supported by subtle framing

### 3. Color
- **Before:** Mostly monochromatic with accent color on hover
- **After:** Semantic color throughout (cyan/green/amber/red/purple) for status/monitoring context

### 4. Information Density
- **Before:** Minimal preview of lesson content, lots of empty space
- **After:** Visual previews show what each lesson is about, space feels intentionally occupied

### 5. Professional Polish
- **Before:** Functional but sparse
- **After:** Feels like a complete monitoring training application with ambient instrumentation

## Responsive Behavior

### Desktop (>1200px)
```
[Side 180px] [Center fluid] [Side 180px]
    All three columns visible
```

### Tablet (968-1200px)
```
[Side 140px] [Center fluid] [Side 140px]
    Narrower side columns
```

### Mobile (<968px)
```
[Center full-width]
    Side columns hidden
    Single-column card grid
```

## Color Usage

| Element | Color | Purpose |
|---------|-------|---------|
| Workflow numbers | Cyan | Active/interactive |
| Difficulty badges | Green/Amber/Red | Progression level |
| Visual previews | Red/Amber/Green | Incident severity |
| Status dots | Green/Cyan/Gray | Network health |
| Packet protocols | Purple | Evidence/forensics |
| Side module text | Muted gray | Ambient/supporting |

## Typography Scale

| Element | Before | After |
|---------|--------|-------|
| Main title | — | 36px |
| Card title | 19px | 21px |
| Description | 15px | 15px |
| Workflow labels | 11px | 11px |
| Side module text | — | 10px |
| Eyebrow | — | 10px uppercase |

## Spacing

| Element | Before | After |
|---------|--------|-------|
| Card min-height | 320px | 380px |
| Card gap | 24px | 28px |
| Side column width | — | 180px |
| Visual preview height | — | 80px |
| Hover lift | 4px | 6px |

## Summary

The redesign transforms the lesson selection page from a functional list into an intentional, hierarchy-driven experience that:

✓ Makes lesson cards the clear visual hero  
✓ Centers and clarifies the introduction  
✓ Adds context with subtle ambient monitoring  
✓ Shows what each lesson is about through visuals  
✓ Uses color semantically for monitoring context  
✓ Feels like a professional training application  
✓ Maintains the NetWatch dark, technical aesthetic  
✓ Remains fully self-contained (no external assets)  
✓ Works responsively across screen sizes  
