# Typography Verification Checklist

## Visual Verification Steps

After implementation, verify the following in a running instance:

### 1. Font Loading (Browser DevTools → Network)
- [ ] `hanken-grotesk-variable.woff2` loads successfully (200 OK)
- [ ] `ibm-plex-mono-regular.woff2` loads successfully (200 OK)
- [ ] `ibm-plex-mono-medium.woff2` loads successfully (200 OK)
- [ ] `space-grotesk-regular.woff2` loads successfully (200 OK)
- [ ] `space-grotesk-bold.woff2` loads successfully (200 OK)
- [ ] No 404 errors for font files
- [ ] No external font requests to Google Fonts or other CDNs

### 2. Landing Page (Space Grotesk Preserved)
- [ ] Main headline uses Space Grotesk
- [ ] "NetWatch — Train. Diagnose. Master." subheading uses Space Grotesk
- [ ] Mode cards (Teach/Quiz) headings use Space Grotesk
- [ ] Evidence section labels use Space Grotesk
- [ ] CTA button text uses Space Grotesk
- [ ] Footer text uses Space Grotesk

### 3. Application Default (Hanken Grotesk)
- [ ] Lesson selection screen uses Hanken Grotesk for descriptions
- [ ] Button labels throughout the app use Hanken Grotesk
- [ ] Navigation labels use Hanken Grotesk
- [ ] Modal dialog text uses Hanken Grotesk
- [ ] Form labels (non-technical) use Hanken Grotesk
- [ ] Panel descriptions use Hanken Grotesk
- [ ] Settings drawer text uses Hanken Grotesk

### 4. Technical Content (IBM Plex Mono)

#### Global Navigation
- [ ] Mode badges (TEACH MODE / QUIZ MODE) use IBM Plex Mono
- [ ] Score display uses IBM Plex Mono
- [ ] Role badge (STUDENT / INSTRUCTOR) uses IBM Plex Mono
- [ ] Attempts counter uses IBM Plex Mono

#### Simulation Interface
- [ ] Section headers ("ALERTS", "PACKETS", "TOPOLOGY") use IBM Plex Mono
- [ ] Lesson ID display uses IBM Plex Mono
- [ ] Difficulty badges use IBM Plex Mono
- [ ] Scenario/lesson selector uses IBM Plex Mono for IDs

#### Network Data
- [ ] IP addresses in topology view use IBM Plex Mono
- [ ] MAC addresses in device tables use IBM Plex Mono
- [ ] Hostnames (gw1, sw1, pc1, etc.) use IBM Plex Mono
- [ ] Port numbers use IBM Plex Mono
- [ ] Protocol tags (TCP, UDP, HTTP, etc.) use IBM Plex Mono

#### Metrics & Performance
- [ ] CPU percentage values use IBM Plex Mono
- [ ] Memory usage values use IBM Plex Mono
- [ ] Latency numbers use IBM Plex Mono
- [ ] Jitter values use IBM Plex Mono
- [ ] Packet loss percentages use IBM Plex Mono
- [ ] Metric labels use IBM Plex Mono

#### Timestamps & Logs
- [ ] Simulation clock uses IBM Plex Mono
- [ ] Alert timestamps use IBM Plex Mono
- [ ] Log console output uses IBM Plex Mono
- [ ] Log timestamps use IBM Plex Mono
- [ ] Packet capture timestamps use IBM Plex Mono

#### Tables & Data Display
- [ ] Packet inspection table uses IBM Plex Mono
- [ ] Device table content uses IBM Plex Mono
- [ ] Alert list uses IBM Plex Mono
- [ ] Topology node labels use IBM Plex Mono
- [ ] Chart axis labels (technical) use IBM Plex Mono

#### Login & Forms
- [ ] Login form labels use IBM Plex Mono
- [ ] Username input field uses IBM Plex Mono
- [ ] Password input field uses IBM Plex Mono
- [ ] Error messages use IBM Plex Mono

### 5. Browser Console
- [ ] No CSS warnings or errors
- [ ] No "Failed to load font" errors
- [ ] No CORS errors for font files
- [ ] No missing font-family warnings

### 6. Cross-Browser Testing
Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### 7. Theme Toggle
- [ ] Fonts remain consistent when switching between light and dark themes
- [ ] Font weights remain readable in both themes
- [ ] No font loading flicker during theme change

### 8. Responsive Behavior
- [ ] Fonts render correctly on mobile viewport
- [ ] Font sizes scale appropriately at different breakpoints
- [ ] Monospace alignment doesn't break on narrow screens

### 9. Performance
- [ ] Variable font allows smooth weight transitions
- [ ] Font files load within acceptable time
- [ ] No layout shift during font loading (font-display: swap working)
- [ ] Page remains readable during font load

### 10. Accessibility
- [ ] Text remains readable at system zoom levels (100%, 125%, 150%, 200%)
- [ ] Font contrast meets WCAG requirements
- [ ] Technical content (monospace) remains distinguishable from prose

## Expected Font Sizes

### Hanken Grotesk
- Body: 13px (simulation), 15-16px (landing)
- Buttons: 12-17px
- Navigation: 13-15px
- Modals: 13-14px

### Space Grotesk
- Landing headlines: 40-72px
- Landing subheadings: 18-21px
- Section headings: 24-48px
- Body text: 15-18px

### IBM Plex Mono
- Technical labels: 9-13px
- Data values: 10-18px
- Tables: 11-12px
- Logs: 11px
- Badges: 9-11px

## Common Issues to Check

- [ ] Variable font fallback works in older browsers
- [ ] No font mixing within single technical elements (all mono or all sans)
- [ ] Consistent monospace alignment in tables and lists
- [ ] No unexpected font changes during interactions
- [ ] Proper font loading order (critical CSS first)

## Automated Test Status

✅ All 479 tests passed
✅ No build errors
✅ No type errors
✅ No linting errors related to fonts
