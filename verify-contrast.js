// WCAG contrast ratio calculator
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return ((brightest + 0.05) / (darkest + 0.05)).toFixed(2);
}

// Dark mode palette (updated)
const dark = {
  bg: '#0a1628',
  surface: '#101b2e',
  surfaceAlt: '#162336',
  heroLeft: '#0B172A',
  heroRight: '#12243D',
  heroGradientFrom: '#0f1e35',
  heroGradientTo: '#0a1628',
  text: '#e8edf4',
  muted: '#8b95a6',
  brand: '#3b82f6',
  teach: '#22d3ee',
  quiz: '#6d28d9',
  cyanDecoration: '#06b6d4',
  statusOk: '#10b981',
  statusWarn: '#f59e0b',
  statusCrit: '#ef4444',
};

// Light mode palette (updated)
const light = {
  bg: '#f8fbff',
  surface: '#ffffff',
  surfaceAlt: '#f4f8fd',
  heroLeft: '#ffffff',
  heroRight: '#EAF5FF',
  heroGradientFrom: '#eaf5ff',
  heroGradientTo: '#f8fbff',
  text: '#101d32',
  muted: '#52607a',
  brand: '#2563eb',
  teach: '#0e7490',
  quiz: '#6d28d9',
  cyanDecoration: '#06b6d4',
  statusOk: '#059669',
  statusWarn: '#d97706',
  statusCrit: '#dc2626',
};

console.log('\n=== DARK MODE CONTRAST RATIOS ===\n');
console.log('--- Core text/background pairs ---');
console.log(`Text on bg:               ${contrast(dark.text, dark.bg)}:1`);
console.log(`Text on surface:          ${contrast(dark.text, dark.surface)}:1`);
console.log(`Text on surface-alt:      ${contrast(dark.text, dark.surfaceAlt)}:1`);
console.log(`Text on hero-from:        ${contrast(dark.text, dark.heroGradientFrom)}:1`);
console.log(`Muted on bg:              ${contrast(dark.muted, dark.bg)}:1`);
console.log(`Muted on surface:         ${contrast(dark.muted, dark.surface)}:1`);
console.log(`Muted on surface-alt:     ${contrast(dark.muted, dark.surfaceAlt)}:1`);
console.log('\n--- Brand & mode colors ---');
console.log(`Brand on bg:              ${contrast(dark.brand, dark.bg)}:1`);
console.log(`Brand on surface:         ${contrast(dark.brand, dark.surface)}:1`);
console.log(`Teach on bg:              ${contrast(dark.teach, dark.bg)}:1`);
console.log(`Quiz on bg:               ${contrast(dark.quiz, dark.bg)}:1`);
console.log(`Quiz button (white on quiz): ${contrast('#ffffff', dark.quiz)}:1`);
console.log(`Cyan decoration on bg:    ${contrast(dark.cyanDecoration, dark.bg)}:1`);
console.log('\n--- Hero split backgrounds ---');
console.log(`Text on hero-left:        ${contrast(dark.text, dark.heroLeft)}:1`);
console.log(`Text on hero-right:       ${contrast(dark.text, dark.heroRight)}:1`);
console.log('\n--- Status colors (snapshot) ---');
console.log(`Status OK on surface:     ${contrast(dark.statusOk, dark.surface)}:1`);
console.log(`Status Warn on surface:   ${contrast(dark.statusWarn, dark.surface)}:1`);
console.log(`Status Crit on surface:   ${contrast(dark.statusCrit, dark.surface)}:1`);

console.log('\n=== LIGHT MODE CONTRAST RATIOS ===\n');
console.log('--- Core text/background pairs ---');
console.log(`Text on bg:               ${contrast(light.text, light.bg)}:1`);
console.log(`Text on surface:          ${contrast(light.text, light.surface)}:1`);
console.log(`Text on surface-alt:      ${contrast(light.text, light.surfaceAlt)}:1`);
console.log(`Text on hero-from:        ${contrast(light.text, light.heroGradientFrom)}:1`);
console.log(`Muted on bg:              ${contrast(light.muted, light.bg)}:1`);
console.log(`Muted on surface:         ${contrast(light.muted, light.surface)}:1`);
console.log(`Muted on surface-alt:     ${contrast(light.muted, light.surfaceAlt)}:1`);
console.log('\n--- Brand & mode colors ---');
console.log(`Brand on bg:              ${contrast(light.brand, light.bg)}:1`);
console.log(`Brand on surface:         ${contrast(light.brand, light.surface)}:1`);
console.log(`Teach on bg:              ${contrast(light.teach, light.bg)}:1`);
console.log(`Quiz on bg:               ${contrast(light.quiz, light.bg)}:1`);
console.log(`Quiz button (white on quiz): ${contrast('#ffffff', light.quiz)}:1`);
console.log(`Cyan decoration on bg:    ${contrast(light.cyanDecoration, light.bg)}:1`);
console.log('\n--- Hero split backgrounds ---');
console.log(`Text on hero-left:        ${contrast(light.text, light.heroLeft)}:1`);
console.log(`Text on hero-right:       ${contrast(light.text, light.heroRight)}:1`);
console.log('\n--- Status colors (snapshot) ---');
console.log(`Status OK on surface:     ${contrast(light.statusOk, light.surface)}:1`);
console.log(`Status Warn on surface:   ${contrast(light.statusWarn, light.surface)}:1`);
console.log(`Status Crit on surface:   ${contrast(light.statusCrit, light.surface)}:1`);

console.log('\n=== WCAG AA REQUIREMENT: >=4.5:1 for normal text ===\n');
