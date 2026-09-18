# Linux-Style Customization Guide

## Easy Tweaks You Can Make

### 1. Change Animation Speed

**Make blinking faster/slower:**
```css
/* Current: 1.2s cycle */
@keyframes blink-bracket {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Faster (0.8s): */
.nav-tab.attention::before {
  animation: blink-bracket 0.8s ease-in-out infinite;
}

/* Slower (2s): */
.nav-tab.attention::before {
  animation: blink-bracket 2s ease-in-out infinite;
}
```

---

### 2. Change Indicator Characters

**Replace `[!]` with something else:**
```css
/* Current: */
.nav-tab.attention::before {
  content: '[!]';
}

/* Alternatives: */
content: '▲';       /* Triangle only */
content: '⚠';       /* Warning emoji */
content: '<!>';     /* Angle brackets */
content: '>>>';     /* Chevrons (very Linux) */
content: '[ALERT]'; /* Full word */
content: '⚡';      /* Lightning bolt */
```

**Replace block characters:**
```css
/* Panel edge critical indicator */
.panel.priority-critical::before {
  content: '▐';  /* Current: right half block */
  /* Alternatives: */
  content: '█';  /* Full block */
  content: '║';  /* Double vertical line */
  content: '┃';  /* Heavy vertical line */
  content: '▌';  /* Left half block */
}
```

**Change section header prefix:**
```css
/* Normal state */
.section-title::before {
  content: '┌─';  /* Current */
  /* Alternatives: */
  content: '▶';   /* Simple arrow */
  content: '»';   /* Guillemet */
  content: '//';  /* Comment-style */
  content: '>';   /* Shell prompt style */
}

/* Alert state */
.section-header.has-alert .section-title::before {
  content: '├▶';  /* Current */
  /* Alternatives: */
  content: '⚠▶';  /* Warning + arrow */
  content: '!▶';  /* Exclamation + arrow */
  content: '>>>';  /* Triple chevron */
}
```

---

### 3. Adjust Border Thickness

**Critical panel borders:**
```css
.panel.priority-critical {
  border-left: 3px solid var(--critical);  /* Current */
  
  /* Thicker (more dramatic): */
  border-left: 5px solid var(--critical);
  
  /* Thinner (subtle): */
  border-left: 2px solid var(--critical);
}
```

**Stat card top borders:**
```css
#stat-bar .sc.stat-critical {
  border-top: 2px solid var(--critical);  /* Current */
  
  /* Thicker: */
  border-top: 4px solid var(--critical);
}
```

---

### 4. Change Glow Intensity

**Critical panel glow:**
```css
@keyframes panel-urgent-pulse {
  0%, 100% { 
    box-shadow: 0 0 12px rgba(200,90,74,0.2);  /* Current: subtle */
  }
  50% { 
    box-shadow: 0 0 20px rgba(200,90,74,0.4);
  }
}

/* More intense glow: */
@keyframes panel-urgent-pulse {
  0%, 100% { 
    box-shadow: 0 0 20px rgba(200,90,74,0.4);
  }
  50% { 
    box-shadow: 0 0 32px rgba(200,90,74,0.7);  /* Bright */
  }
}

/* No glow (just border): */
@keyframes panel-urgent-pulse {
  0%, 100%, 50% { 
    box-shadow: none;
  }
}
```

---

### 5. Disable Specific Animations

**Turn off blinking (keep color/borders):**
```css
/* Add this to disable all blink animations: */
.nav-tab.attention::before,
.panel.priority-critical::before,
.alert-item.crit::before,
#stat-bar .sc.stat-critical::before {
  animation: none !important;
  opacity: 1 !important;
}
```

**Turn off pulse glow:**
```css
.panel.priority-critical {
  animation: none !important;
}
```

---

### 6. Change Indicator Positions

**Move stat card triangle:**
```css
#stat-bar .sc.stat-critical::before {
  /* Current: top-right */
  top: 4px;
  right: 8px;
  
  /* Top-left: */
  top: 4px;
  left: 8px;
  right: auto;
  
  /* Bottom-right: */
  top: auto;
  bottom: 4px;
  right: 8px;
}
```

**Move panel block character:**
```css
.panel.priority-critical::before {
  /* Current: top-left */
  left: -3px;
  top: 8px;
  
  /* Center-left: */
  top: 50%;
  transform: translateY(-50%);
  
  /* Bottom-left: */
  top: auto;
  bottom: 8px;
}
```

---

### 7. Customize Alert Item Hover

**Change hover animation:**
```css
.alert-item:hover {
  /* Current: slide right 2px */
  transform: translateX(2px);
  
  /* Scale up slightly: */
  transform: scale(1.02);
  
  /* Lift up: */
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  
  /* No animation: */
  transform: none;
}
```

---

### 8. Adjust Timestamp Brackets

**Change bracket style:**
```css
.alert-ts::before { content: '['; }  /* Current */
.alert-ts::after  { content: ']'; }

/* Alternatives: */
/* Angle brackets: */
.alert-ts::before { content: '<'; }
.alert-ts::after  { content: '>'; }

/* Pipes: */
.alert-ts::before { content: '|'; }
.alert-ts::after  { content: '|'; }

/* Guillemets: */
.alert-ts::before { content: '«'; }
.alert-ts::after  { content: '»'; }

/* No brackets: */
.alert-ts::before { content: ''; }
.alert-ts::after  { content: ''; }
```

---

### 9. Change Priority Thresholds

**Make indicators trigger earlier/later:**

Edit `src/renderers/overview.js`:
```javascript
// Current thresholds in renderStatBar():
if (healthy < nodes.length / 2) {
  devicesCard.classList.add('stat-critical');  // <50% healthy
} else if (healthy < nodes.length) {
  devicesCard.classList.add('stat-warning');   // <100% healthy
}

// More sensitive (trigger earlier):
if (healthy < nodes.length * 0.7) {           // <70% healthy
  devicesCard.classList.add('stat-critical');
} else if (healthy < nodes.length) {
  devicesCard.classList.add('stat-warning');
}

// Less sensitive (only very bad states):
if (healthy < nodes.length * 0.3) {           // <30% healthy
  devicesCard.classList.add('stat-critical');
} else if (healthy < nodes.length * 0.7) {    // <70% healthy
  devicesCard.classList.add('stat-warning');
}
```

**Latency thresholds:**
```javascript
// Current:
if (avgLat > 200) latencyCard.classList.add('stat-critical');
else if (avgLat > 100) latencyCard.classList.add('stat-warning');

// More strict:
if (avgLat > 150) latencyCard.classList.add('stat-critical');
else if (avgLat > 75) latencyCard.classList.add('stat-warning');
```

---

### 10. Add Your Own Priority Levels

**Add a "degrading" state (orange, not red):**

1. Add CSS:
```css
.panel.priority-degrading {
  border-left: 2px solid var(--warning);
  box-shadow: -1px 0 0 var(--warning);
}

.panel.priority-degrading::before {
  content: '▌';
  position: absolute;
  left: -2px;
  top: 8px;
  color: var(--warning);
  opacity: 0.5;
}
```

2. Use in JavaScript:
```javascript
if (criticalCondition) {
  panel.classList.add('priority-critical');
} else if (degradingCondition) {
  panel.classList.add('priority-degrading');  // New state
} else if (warningCondition) {
  panel.classList.add('priority-warning');
}
```

---

## Pre-Made Themes

### Minimal (Less Visual Noise)
```css
/* Turn off all block characters */
.panel.priority-critical::before,
.panel.priority-warning::before,
.alert-item.crit::before,
.alert-item.warn::before {
  display: none;
}

/* Keep borders and top indicators only */
.nav-tab.attention::before {
  content: '▲';  /* Simple triangle */
  left: 8px;
}
```

### Maximum Attention (Very Aggressive)
```css
/* Faster blink */
.nav-tab.attention::before {
  animation: blink-bracket 0.6s ease-in-out infinite;
}

/* Brighter glow */
@keyframes panel-urgent-pulse {
  0%, 100% { box-shadow: 0 0 24px rgba(200,90,74,0.5); }
  50% { box-shadow: 0 0 40px rgba(200,90,74,0.8); }
}

/* Thicker borders */
.panel.priority-critical {
  border-left: 5px solid var(--critical);
}
```

### Subtle (Professional/Corporate)
```css
/* Slower, gentler animations */
.nav-tab.attention::before {
  animation: blink-bracket 3s ease-in-out infinite;
}

/* No glows, just borders */
.panel.priority-critical {
  animation: none;
  box-shadow: none;
}

/* Thinner borders */
.panel.priority-critical {
  border-left: 2px solid var(--critical);
}
```

---

## Testing Your Changes

1. **Edit `public/styles.css`** with your changes
2. **Refresh browser** (Ctrl+Shift+R / Cmd+Shift+R to force reload)
3. **Start a simulation** and wait for alerts
4. **Check each indicator type**:
   - Nav tabs
   - Stat cards
   - Alert panel
   - Section headers

No npm restart needed for CSS changes!

---

## Reverting Changes

To remove all Linux-style indicators, search and delete these classes in `styles.css`:

- `.nav-tab.attention::before`
- `.panel.priority-critical`
- `.panel.priority-warning`
- `.section-title::before`
- `.section-header.has-alert .section-title::before`
- `.alert-item.crit::before`
- `.alert-item.warn::before`
- `.alert-ts::before` and `.alert-ts::after`
- `#stat-bar .sc.stat-critical`

Then remove the class additions in JavaScript (search for `.classList.add('priority-')`).
