// The floor plan of the Meridian wing: one 40x19 tile museum, all of it on screen.
// This module is the only place that knows the map, what blocks a body or a
// sight line, and where the guards and cameras are posted.

export const TILE = 32;
export const COLS = 40;
export const ROWS = 19;
export const HUD = 96;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const WORLD_H = ROWS * TILE;

// '#' wall, '.' gallery, ',' atrium, 'v' vault, 'c' corridor, '~' vent duct,
// 'D' service door, 'V' vitrine, 'P' plinth, '=' low cover, 'X' fire escape.
const RAW = [
  '########################################',
  '#cccccccccccccccccccccccccccccvvvvvvvvv#',
  '#cccccccccccccccccccccccccccccvvvvvvvvv#',
  '#cc##########~~~~~~~~~~~~~~~~~vvvvvvvvv#',
  '#cc##########~################vvvVVvvvv#',
  '#cc##########~#,,,,,,,,,,,,,,#vvvVVvvvv#',
  '#cc##########~#,,,,,,,,,,,,,,cvvvvvvvvv#',
  '#cc##########~#,,==,,,,,,,,,,cvvvvvvvvv#',
  '#cc##########~#,,,,,,,,,,,,,,###########',
  '#cc##########~#,,,,,PPP,,,,,,###########',
  '##D##########~#,,,,,PPP,,,,,,###########',
  '#.............#,,,,,,,,,,,,,,###########',
  '#.............c,,,,,,,,,,,==,###########',
  '#...==....==..c,,,,,,,,,,,,,,###########',
  '#.............#,,,,,,,,,,,,,,###########',
  '#.............#,,,,,,,,,,,,,,###########',
  '#.............##########################',
  '######XX################################',
  '########################################',
];

if (RAW.length !== ROWS) throw new Error(`level: ${RAW.length} rows, expected ${ROWS}`);
RAW.forEach((row, y) => {
  if (row.length !== COLS) throw new Error(`level: row ${y} is ${row.length} tiles, expected ${COLS}`);
});

const TILES = RAW.join('');

/** The tile character at a tile coordinate; outside the museum reads as wall. */
export function tileChar(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return TILES[ty * COLS + tx];
}

/** The tile under a world point. */
export function tileAt(px, py) {
  return { tx: Math.floor(px / TILE), ty: Math.floor(py / TILE) };
}

/** The tile character under a world point. */
export function tileCharAt(px, py) {
  return tileChar(Math.floor(px / TILE), Math.floor(py / TILE));
}

/** Whether a tile can be stood on, given the service door's state. */
export function walkable(tx, ty, doorOpen = false) {
  const ch = tileChar(tx, ty);
  if (ch === '#' || ch === 'V' || ch === 'P') return false;
  if (ch === 'D') return doorOpen;
  return true;
}

/** Whether a body of half-extent `half` at (x, y) overlaps a wall, the vitrine, the plinth or a shut door. */
export function boxBlocked(x, y, half, doorOpen = false) {
  const minX = Math.floor((x - half) / TILE);
  const maxX = Math.floor((x + half - 0.001) / TILE);
  const minY = Math.floor((y - half) / TILE);
  const maxY = Math.floor((y + half - 0.001) / TILE);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      const ch = tileChar(tx, ty);
      if (ch === '#' || ch === 'V' || ch === 'P') return true;
      if (ch === 'D' && !doorOpen) return true;
    }
  }
  return false;
}

/** Whether the point is on a low cover tile. */
export function onCover(px, py) {
  return tileCharAt(px, py) === '=';
}

/** Whether the point is in the crawlspace. */
export function inVent(px, py) {
  return tileCharAt(px, py) === '~';
}

/** A point at a tile's centre, in world pixels. */
export function center(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** Straight-line distance. */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The angle wrapped to -PI..PI. */
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** The shortest signed turn from `from` to `to`. */
export function angleDiff(to, from) {
  return wrapAngle(to - from);
}

/** The distance from a point to a segment. */
export function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** The smoke disc a segment crosses first, or null: smoke cuts every sight line. */
export function smokeOnSegment(smokes, x1, y1, x2, y2) {
  if (!smokes || smokes.length === 0) return null;
  for (const s of smokes) {
    if (s.life <= 0) continue;
    if (pointSegmentDistance(s.x, s.y, x1, y1, x2, y2) < s.r) return s;
  }
  return null;
}

/**
 * Whether a sight line is cut. Walls, the vitrine, the plinth and a shut door
 * always cut it; a smoke disc cuts it; low cover cuts it for guards while the
 * thief crouches (cameras look over it).
 */
export function lineBlocked(x1, y1, x2, y2, opts) {
  const doorOpen = opts && opts.doorOpen;
  const hideLow = opts && opts.lowCover;
  const smokes = opts && opts.smokes;
  const vitrineOpen = opts && opts.vitrineOpen;
  if (smokes && smokeOnSegment(smokes, x1, y1, x2, y2)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(len / 5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ch = tileCharAt(x1 + dx * t, y1 + dy * t);
    if (ch === '#' || ch === 'P') return true;
    if (ch === 'V' && !vitrineOpen) return true;
    if (ch === 'D' && !doorOpen) return true;
    if (hideLow && ch === '=') return true;
  }
  return false;
}

/** Where a ray from (x, y) at `angle` stops: a wall, a shut door, a smoke disc or its range. */
export function rayDistance(x, y, angle, maxDist, opts) {
  const doorOpen = opts && opts.doorOpen;
  const smokes = opts && opts.smokes;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let stop = maxDist;
  if (smokes && smokes.length) {
    for (const s of smokes) {
      if (s.life <= 0) continue;
      const ox = x - s.x;
      const oy = y - s.y;
      const b = ox * dx + oy * dy;
      const c = ox * ox + oy * oy - s.r * s.r;
      const disc = b * b - c;
      if (disc <= 0) continue;
      const entry = -b - Math.sqrt(disc);
      if (entry > 0 && entry < stop) stop = entry;
    }
  }
  const step = 2.5;
  for (let d = 2.5; d <= stop; d += step) {
    const ch = tileCharAt(x + dx * d, y + dy * d);
    if (ch === '#' || ch === 'P') return Math.max(0, d - step * 0.5);
    if (ch === 'V' && !(opts && opts.vitrineOpen)) return Math.max(0, d - step * 0.5);
    if (ch === 'D' && !doorOpen) return Math.max(0, d - step * 0.5);
  }
  return stop;
}

/** The fan a lantern or a lens throws, cut by walls and smoke: a closed polygon. */
export function conePolygon(x, y, heading, halfAngle, range, opts, rays = 30) {
  const pts = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = heading - halfAngle + (halfAngle * 2 * i) / rays;
    const d = rayDistance(x, y, a, range, opts);
    pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return pts;
}

/** Everything the game needs to know about where things are. */
export const GEOM = {
  spawn: { x: 3.2 * TILE, y: 16.0 * TILE },
  jewel: { x: 34 * TILE, y: 5 * TILE },
  vitrine: { x: 33 * TILE, y: 4 * TILE, w: 2 * TILE, h: 2 * TILE },
  door: { x: 2.5 * TILE, y: 10.5 * TILE },
  escape: { x: 7 * TILE, y: 17.5 * TILE },
  escapeTiles: [
    { tx: 6, ty: 17 },
    { tx: 7, ty: 17 },
  ],
  plinth: { x: 20 * TILE, y: 9 * TILE, w: 3 * TILE, h: 2 * TILE },
};

export const ROOM_FILL = {
  '.': '#1a2038',
  ',': '#161d34',
  v: '#121a30',
  c: '#111727',
  '~': '#0b111e',
  '=': '#141a2e',
  D: '#111727',
  X: '#0d1a22',
};

/** Three lanterns on three loopy patrols. */
export const GUARD_DEFS = [
  {
    name: 'GUARD 1',
    short: 'G1',
    route: [
      { tx: 3, ty: 15 },
      { tx: 12, ty: 15 },
    ],
    start: { tx: 12, ty: 15 },
    next: 0,
    speed: 50,
    dwell: 1.5,
  },
  {
    name: 'GUARD 2',
    short: 'G2',
    route: [
      { tx: 17, ty: 6 },
      { tx: 26, ty: 6 },
      { tx: 26, ty: 13 },
      { tx: 17, ty: 13 },
    ],
    start: { tx: 17, ty: 6 },
    next: 1,
    speed: 57,
    dwell: 0.7,
  },
  {
    name: 'GUARD 3',
    short: 'G3',
    route: [
      { tx: 31, ty: 7 },
      { tx: 37, ty: 7 },
      { tx: 37, ty: 2 },
      { tx: 31, ty: 2 },
    ],
    start: { tx: 37, ty: 7 },
    next: 2,
    speed: 47,
    dwell: 0.9,
  },
];

/** Three ceiling lenses with a sweep apiece. */
export const CAMERA_DEFS = [
  { name: 'CAM-1', x: 15.2 * TILE, y: 5.2 * TILE, base: 0.92, sweep: 0.55, period: 7.4, range: 268, phase: 0 },
  { name: 'CAM-2', x: 27.8 * TILE, y: 14.8 * TILE, base: -2.28, sweep: 0.55, period: 8.6, range: 262, phase: 0.9 },
  { name: 'CAM-3', x: 37.8 * TILE, y: 1.2 * TILE, base: 2.55, sweep: 0.55, period: 7.9, range: 252, phase: 1.9 },
];

/** The searchlight that wakes with the lockdown. */
export const SEARCHLIGHT = {
  x: GEOM.escape.x,
  y: GEOM.escape.y,
  range: 236,
  half: 0.17,
  period: 6.4,
};
