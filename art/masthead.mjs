// SI masthead generator.  Run:  node art/masthead.mjs
//
// The S is one curve (its "spine") traced around two stacked ellipses.
// Instead of stroking that curve once, we sample it and draw LINES parallel
// copies of it, offset along the curve's normal. Next to it stands a plain
// solid I. Everything below is plain geometry; change a number, run again.
//
// Writes: art/masthead-dark.svg, art/masthead-light.svg, art/construction.svg

import { writeFileSync } from 'node:fs'

// ---- Geometry (SVG units; y grows downward) ----------------------------
const W = 1600, H = 360            // canvas: short and wide
const CAP = 264                    // letter height
const TOP = (H - CAP) / 2          // cap line
const BASE = TOP + CAP             // baseline
const STROKE = 66                  // width of the S stroke and of the I
const LINES = 13                   // parallel curves that make up the S
const HAIR = 3.3                   // width of each of those curves
const SX = 260                     // horizontal centre of the S
const RX = 74                      // half-width of the lower bowl
const RX_TOP = RX * 0.93           // upper bowl a little narrower, as in most type
const RY = (CAP - STROKE) / 4      // half-height of each bowl (S sits exactly on cap line and baseline)
const GAP = 72                     // space between S and I
const IX = SX + RX + STROKE / 2 + GAP
const START = 28, TURN = 270, END = -152 // spine angles in degrees (see spine())
const SAMPLES = 480

const THEMES = {
  dark:  { bg: '#080D1A', halo: '#101C36', s: '#6B93FF', i: '#4677FF', rule: '#1A2747', build: '#2A3D6E' },
  light: { bg: '#EDF1F7', halo: '#FFFFFF', s: '#1A2FA0', i: '#1A2FA0', rule: '#D3DAE8', build: '#B5C1DD' },
}

// ---- The spine ---------------------------------------------------------
// Upper bowl: start at the right terminal (START deg), run counter-clockwise
// over the top and down the left side to the bowl's lowest point (TURN deg),
// which is also the highest point of the lower bowl. Lower bowl: run clockwise
// from 90 deg round the right side and bottom to the left terminal (END deg).
const C1 = TOP + STROKE / 2 + RY   // centre of upper bowl
const C2 = C1 + 2 * RY             // centre of lower bowl
const at = (cy, rx, deg) => {
  const t = deg * Math.PI / 180
  return [SX + rx * Math.cos(t), cy - RY * Math.sin(t)]
}
function spine(n = SAMPLES) {
  const a = TURN - START, b = 90 - END, pts = []
  for (let k = 0; k <= n; k++) {
    const u = (k / n) * (a + b)
    pts.push(u <= a ? at(C1, RX_TOP, START + u) : at(C2, RX, 90 - (u - a)))
  }
  return pts
}

// Unit normal at every sample, from the neighbouring samples.
function normals(pts) {
  return pts.map((_, k) => {
    const p = pts[Math.max(0, k - 1)], q = pts[Math.min(pts.length - 1, k + 1)]
    const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy)
    return [-dy / len, dx / len]
  })
}

// Parallel copy j of the spine. Each copy starts and stops a few samples
// later than the one before, so the terminals end in a clean diagonal cut.
function parallel(pts, nrm, j) {
  const f = j / (LINES - 1)
  const d = -STROKE / 2 + STROKE * f + (f - 0.5) * -HAIR // keep outer edges inside STROKE
  const from = Math.round(4 + 12 * f), to = pts.length - Math.round(16 - 12 * f)
  const out = []
  for (let k = from; k < to; k++) out.push([pts[k][0] + nrm[k][0] * d, pts[k][1] + nrm[k][1] * d])
  return out
}

const path = pts => pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')

// ---- Drawing -----------------------------------------------------------
function masthead(theme, { construction = true } = {}) {
  const c = THEMES[theme]
  const pts = spine(), nrm = normals(pts)
  const mid = [SX, C1 + RY] // where the two bowls touch
  let s = ''
  for (let j = 0; j < LINES; j++)
    s += `<path d="${path(parallel(pts, nrm, j))}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>SI monogram: an S drawn as ${LINES} parallel curves beside a solid I</title>
<defs><radialGradient id="halo" cx="${SX + 60}" cy="${H / 2}" r="${H * 1.05}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="${c.halo}"/><stop offset="1" stop-color="${c.bg}"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="${c.bg}"/>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
<g stroke="${c.rule}" stroke-width="1.5">
<line x1="0" x2="${W}" y1="${TOP}" y2="${TOP}"/><line x1="0" x2="${W}" y1="${BASE}" y2="${BASE}"/>
<line x1="${SX}" x2="${W}" y1="${mid[1]}" y2="${mid[1]}"/></g>
${construction ? `<g fill="none" stroke="${c.build}" stroke-width="1.5"><ellipse cx="${SX}" cy="${C1}" rx="${RX_TOP}" ry="${RY}"/><ellipse cx="${SX}" cy="${C2}" rx="${RX}" ry="${RY}"/></g>` : ''}
<g fill="none" stroke="${c.s}" stroke-width="${HAIR}" stroke-linecap="round">${s}</g>
<rect x="${IX}" y="${TOP}" width="${STROKE}" height="${CAP}" fill="${c.i}"/>
<circle cx="${mid[0]}" cy="${mid[1]}" r="5" fill="${c.i}"/>
</svg>
`
}

// A labelled diagram for art/README.md: spine, normals, offsets.
function construction() {
  const c = THEMES.light, pts = spine(), nrm = normals(pts)
  const ink = '#1B2540', soft = '#8C99B8'
  const spineD = path(pts)
  let normalsD = ''
  for (let k = 20; k < pts.length - 10; k += 24) {
    const p = pts[k], n = nrm[k], h = STROKE / 2
    normalsD += `M${(p[0] - n[0] * h).toFixed(1)} ${(p[1] - n[1] * h).toFixed(1)}L${(p[0] + n[0] * h).toFixed(1)} ${(p[1] + n[1] * h).toFixed(1)}`
  }
  let s = ''
  for (let j = 0; j < LINES; j++) s += `<path d="${path(parallel(pts, nrm, j))}"/>`
  const label = (x, y, t, a = 'start') => `<text x="${x}" y="${y}" text-anchor="${a}">${t}</text>`
  const shift = 760 // second copy of the S, finished, to the right
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 60}" width="${W}" height="${H + 60}">
<rect width="${W}" height="${H + 60}" fill="${c.bg}"/>
<g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="22" fill="${ink}">
${label(SX, H + 36, '1 · spine + normals', 'middle')}${label(SX + shift, H + 36, '2 · ' + LINES + ' offsets along the normals', 'middle')}
${label(SX + RX + 18, C1 - RY + 8, 'upper bowl')}${label(SX + RX + 18, C2 + RY - 2, 'lower bowl')}
${label(SX + RX + 18, C1 + RY + 8, 'bowls touch')}</g>
<g fill="none" stroke="${soft}" stroke-width="1.5" stroke-dasharray="6 6">
<ellipse cx="${SX}" cy="${C1}" rx="${RX_TOP}" ry="${RY}"/><ellipse cx="${SX}" cy="${C2}" rx="${RX}" ry="${RY}"/></g>
<path d="${normalsD}" stroke="${soft}" stroke-width="1.5"/>
<path d="${spineD}" fill="none" stroke="${c.s}" stroke-width="4"/>
<circle cx="${SX}" cy="${C1 + RY}" r="6" fill="${c.i}"/>
<g transform="translate(${shift} 0)" fill="none" stroke="${c.s}" stroke-width="${HAIR}" stroke-linecap="round">${s}</g>
<rect x="${IX + shift}" y="${TOP}" width="${STROKE}" height="${CAP}" fill="${c.i}"/>
</svg>
`
}

const out = name => new URL(name, import.meta.url)
writeFileSync(out('masthead-dark.svg'), masthead('dark'))
writeFileSync(out('masthead-light.svg'), masthead('light'))
writeFileSync(out('construction.svg'), construction())
console.log('wrote art/masthead-dark.svg, art/masthead-light.svg, art/construction.svg')
