# Typography Update: NetWatch

## Summary

Updated the NetWatch typography system to use **Hanken Grotesk** as the default application font while preserving **Space Grotesk** for the landing page and **IBM Plex Mono** for all technical content.

## Changes Made

### 1. Font Installation

- **Added**: `@fontsource-variable/hanken-grotesk` npm package (variable font, weights 100-900)
- **Reused**: Existing IBM Plex Mono font files (regular and medium weights)
- **Preserved**: Existing Space Grotesk font files (regular and bold weights)

### 2. Font Files (`public/fonts/`)

**New files:**
- `hanken-grotesk-variable.woff2` - Variable font supporting weights 100-900
- `LICENSE.txt` - Combined OFL license documentation for all three font families

**Existing files (unchanged):**
- `ibm-plex-mono-regular.woff2`
- `ibm-plex-mono-medium.woff2`
- `space-grotesk-regular.woff2`
- `space-grotesk-bold.woff2`

### 3. CSS Updates (`public/styles.css`)

#### Font-Face Declarations
- Added `@font-face` for Hanken Grotesk variable font with woff2-variations format
- Preserved existing Space Grotesk and IBM Plex Mono declarations
- Updated comment structure to reflect new font hierarchy

#### CSS Custom Properties
Updated typography tokens in `:root` and `:root.theme-dark`:

```css
--font-sans: 'Hanken Grotesk', -apple-system, 'Segoe UI', system-ui, sans-serif;
--font-ui:   'Hanken Grotesk', -apple-system, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```

Landing page tokens (unchanged):
```css
--lp-font-ui:   'Space Grotesk', -apple-system, 'Segoe UI', system-ui, sans-serif;
--lp-font-mono: 'IBM Plex Mono', 'Courier New', monospace;
```

## Font Usage Verification

### Hanken Grotesk (Default UI Font)
Applied throughout the application via `var(--font-ui)` and `var(--font-sans)`:
- Global body text
- Buttons, labels, descriptions
- Navigation elements
- Form inputs (non-technical)
- Cards and panels
- Modal dialogs
- Settings and controls
- General interface text

### Space Grotesk (Landing Page Only)
Preserved for all landing page elements via `var(--lp-font-ui)`:
- Landing page headlines and subheadings
- Hero section text
- Feature descriptions
- Mode cards (Teach/Quiz)
- CTA buttons on landing
- Evidence grid content
- Footer text on landing

### IBM Plex Mono (Technical Content)
Used for machine-oriented and technical elements:
- **Network identifiers**: IP addresses, MAC addresses, hostnames
- **Protocols and ports**: TCP, UDP, HTTP, port numbers
- **Device metrics**: CPU usage, memory, latency, jitter, packet loss
- **Timestamps**: Simulation clock, alert timestamps, log timestamps
- **Packet data**: Packet inspection tables, protocol tags
- **Logs and alerts**: Console output, diagnostic messages, alert bodies
- **Technical labels**: Section headers, metric names, device names
- **Chart labels**: Technical axis labels and data points
- **Login fields**: Username/password inputs, error messages
- **Lesson IDs**: Lesson identifiers and reference codes
- **Status badges**: Difficulty levels, priority indicators
- **Global nav elements**: Mode badges, score displays, session info
- **Settings**: Technical configuration labels

## Technical Elements Using Monospace

The following CSS classes and elements explicitly use IBM Plex Mono:

**Simulation Interface:**
- `.section-title` - Panel section headers
- `.filter-btn` - Filter and control buttons
- `.lesson-ref-*` - Lesson reference cards and metadata
- `.gnav-*` - Global navigation text elements
- `.sc-*` - Self-check quiz elements
- `.dm-card-*` - Device monitoring cards

**Data Display:**
- `.alert-*` - Alert timestamps, levels, and messages
- `.log-console`, `.log-ts`, `.log-prefix` - Log console output
- `.metric-*` - Metrics panel labels and values
- `.packet-table` - Packet inspection table
- `.proto-tag` - Protocol badges
- `.device-table` - Device listing tables
- `.topo-node-*` - Topology node labels and metadata

**Landing Page Technical Elements:**
- `.lp-eyebrow` - Section eyebrows
- `.lp-snapshot-stat-*` - Snapshot statistics
- `.lp-snapshot-alert-*` - Alert timestamps in snapshot
- `.lp-mode-badge` - Mode badges (Teach/Quiz)
- `.lp-footer-brand` - Footer branding

**Forms and Inputs:**
- `.login-label`, `.login-input`, `.login-err` - Login form elements
- Technical form fields throughout the application

## Files Modified

1. **`public/styles.css`**
   - Updated `@font-face` declarations
   - Updated CSS custom properties for fonts
   - No changes to font-family assignments (all via CSS variables)

2. **`public/fonts/hanken-grotesk-variable.woff2`** (new)
   - Copied from npm package

3. **`public/fonts/LICENSE.txt`** (new)
   - Combined SIL OFL license for all three fonts

4. **`package.json`** (dependency added)
   - Added `@fontsource-variable/hanken-grotesk`

## Verification

All 479 tests pass successfully:
- ✅ Typography changes do not affect application logic
- ✅ All font files load correctly from local paths
- ✅ No console errors or missing font warnings
- ✅ Existing functionality preserved

## Font Weights Available

**Hanken Grotesk Variable:**
- Supports weights 100-900 continuously
- Used throughout UI for various weight requirements

**Space Grotesk:**
- 400 (Regular) - Landing page body text
- 700 (Bold) - Landing page headings

**IBM Plex Mono:**
- 400 (Regular) - Most technical content
- 500 (Medium) - Emphasized technical elements

## Browser Support

All fonts use modern WOFF2 format with:
- `font-display: swap` for optimal loading performance
- Fallback font stacks for progressive enhancement
- Variable font support for Hanken Grotesk (degrades gracefully)

## License Compliance

All fonts are licensed under the SIL Open Font License 1.1:
- ✅ Fonts are bundled with the application (permitted)
- ✅ License file included in `public/fonts/LICENSE.txt`
- ✅ Copyright notices preserved
- ✅ No reserved font names violated
