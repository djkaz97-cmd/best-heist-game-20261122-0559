// Every drawing call for the museum floor, its props, the vision fans and the
// people on it. Screen-print rules: flat fills, hard edges, per-tile hatching,
// halftone dots and no big gradients, so the frame stays crisp when shrunk and
// the PNG stays small.

import {
  TILE,
  COLS,
  ROWS,
  VIEW_W,
  WORLD_H,
  ROOM_FILL,
  GEOM,
  SEARCHLIGHT,
  tileChar,
  conePolygon,
} from './level.js';
import { guardCone } from './guards.js';
import { cameraCone } from './cameras.js';
import { stageOf, searchlightCone } from './alarm.js';
import { holdProgress } from './player.js';
import { makeRng, hash2 } from './rng.js';

export const C = {
  ink: '#0a0e1a',
  deep: '#141a2e',
  gallery: '#1a2038',
  atrium: '#161d34',
  vault: '#121a30',
  corridor: '#111727',
  vent: '#0b111e',
  cream: '#f4e8d0',
  amber: '#f0a25c',
  teal: '#3fb6a8',
  alarm: '#e0453a',
  gold: '#d9b26a',
  goldLight: '#f7e2a8',
  smoke: '#8f97a8',
};

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function makeDot(ctx, color, size, radius, alpha) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.globalAlpha = alpha;
  x.beginPath();
  x.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
  x.fill();
  return ctx.createPattern(c, 'repeat');
}

let PATTERNS = null;
function patterns(ctx) {
  if (PATTERNS) return PATTERNS;
  // Dots stay light on purpose: at thumbnail size a denser screen muddies the
  // fan into a solid block, so the crisp edge carries the read instead.
  PATTERNS = {
    amber: makeDot(ctx, C.amber, 7, 2.3, 1),
    alarm: makeDot(ctx, C.alarm, 7, 2.3, 1),
    teal: makeDot(ctx, C.teal, 7, 2.3, 1),
    cream: makeDot(ctx, C.cream, 8, 1.2, 0.75),
    smoke: makeDot(ctx, C.smoke, 6, 1.7, 0.7),
  };
  return PATTERNS;
}

let staticCanvas = null;
let staticSeed = -1;

/** Throw the cached floor away (a new run, a new seed). */
export function invalidateStatic() {
  staticCanvas = null;
  staticSeed = -1;
}

const FACE_FLOOR = new Set(['.', ',', 'v', 'c', '~', '=', 'D', 'X']);

function label(ctx, text, x, y, size, color, spacing, align = 'center', weight = 700) {
  ctx.save();
  ctx.font = `${weight} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore();
}

function bar(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function buildStatic(seed) {
  const c = document.createElement('canvas');
  c.width = VIEW_W;
  c.height = WORLD_H;
  const x = c.getContext('2d');
  const rng = makeRng(seed * 977 + 13);

  x.fillStyle = C.ink;
  x.fillRect(0, 0, VIEW_W, WORLD_H);

  // ---- floors: one flat colour per room, a per-tile hatch and halftone specks
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = tileChar(tx, ty);
      const fill = ROOM_FILL[ch];
      if (!fill) continue;
      const px = tx * TILE;
      const py = ty * TILE;
      let base = fill;
      if (ch === ',') base = (tx + ty) % 2 === 0 ? C.atrium : '#171e35';
      if (ch === '.') base = (tx + ty) % 2 === 0 ? C.gallery : '#192035';
      if (ch === 'v') base = (tx + ty) % 2 === 0 ? C.vault : '#131b31';
      x.fillStyle = base;
      x.fillRect(px, py, TILE, TILE);

      const grain = hash2(tx, ty, seed);
      if (ch === '.' || ch === ',' || ch === 'v') {
        x.globalAlpha = 0.05;
        x.strokeStyle = C.cream;
        x.lineWidth = 1;
        const off = 6 + grain * 14;
        x.beginPath();
        x.moveTo(px + 3, py + off);
        x.lineTo(px + TILE - 4, py + off - 5);
        x.stroke();
        x.globalAlpha = 0.04;
        x.beginPath();
        x.moveTo(px + off - 4, py + 3);
        x.lineTo(px + off + 4, py + TILE - 3);
        x.stroke();
        for (let k = 0; k < 2; k++) {
          const dx = 4 + hash2(tx * 3 + k, ty, seed + 5) * 24;
          const dy = 4 + hash2(tx, ty * 3 + k, seed + 9) * 24;
          x.fillStyle = C.cream;
          x.globalAlpha = 0.055;
          x.beginPath();
          x.arc(px + dx, py + dy, 1.1, 0, Math.PI * 2);
          x.fill();
        }
        if (ch === 'v') {
          x.globalAlpha = 1;
          x.strokeStyle = rgba(C.gold, 0.1);
          x.lineWidth = 1;
          x.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        }
      } else if (ch === 'c') {
        x.strokeStyle = rgba(C.cream, 0.05);
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(px + 8, py + 16.5);
        x.lineTo(px + TILE - 8, py + 16.5);
        x.stroke();
      } else if (ch === '~') {
        x.strokeStyle = rgba(C.cream, 0.14);
        x.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          x.beginPath();
          x.moveTo(px + 4, py + k * 8 + 1);
          x.lineTo(px + TILE - 4, py + k * 8 + 1);
          x.stroke();
        }
        x.strokeStyle = rgba(C.teal, 0.16);
        x.beginPath();
        x.moveTo(px + 4, py + 16.5);
        x.lineTo(px + TILE - 4, py + 16.5);
        x.stroke();
      } else if (ch === 'X') {
        x.fillStyle = rgba(C.teal, 0.12);
        x.fillRect(px, py, TILE, TILE);
        x.strokeStyle = rgba(C.teal, 0.7);
        x.lineWidth = 2;
        x.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
      }
      x.globalAlpha = 1;
    }
  }

  // ---- low cover: a teal hatch, a solid edge
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (tileChar(tx, ty) !== '=') continue;
      const px = tx * TILE;
      const py = ty * TILE;
      x.fillStyle = rgba(C.teal, 0.1);
      x.fillRect(px, py, TILE, TILE);
      x.strokeStyle = rgba(C.teal, 0.55);
      x.lineWidth = 2;
      x.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
      x.strokeStyle = rgba(C.teal, 0.4);
      x.lineWidth = 1.5;
      for (let k = -2; k < 4; k++) {
        x.beginPath();
        x.moveTo(px + k * 10 + 4, py + TILE - 3);
        x.lineTo(px + k * 10 + 18, py + 3);
        x.stroke();
      }
      x.fillStyle = rgba(C.teal, 0.9);
      x.fillRect(px + 3, py + 3, 5, 2);
    }
  }

  // ---- wall faces: a cream line on every face that meets a floor
  x.strokeStyle = C.cream;
  x.lineWidth = 2;
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (tileChar(tx, ty) !== '#') continue;
      const px = tx * TILE;
      const py = ty * TILE;
      if (FACE_FLOOR.has(tileChar(tx, ty - 1))) bar(x, px, py + 1, TILE, 0);
      if (FACE_FLOOR.has(tileChar(tx + 1, ty))) bar(x, px + TILE - 1, py, 0, TILE);
      if (FACE_FLOOR.has(tileChar(tx, ty + 1))) bar(x, px, py + TILE - 1, TILE, 0);
      if (FACE_FLOOR.has(tileChar(tx - 1, ty))) bar(x, px + 1, py, 0, TILE);
    }
  }

  // ---- the plinth: a solid marble block in the middle of the atrium
  {
    const p = GEOM.plinth;
    x.fillStyle = C.deep;
    x.fillRect(p.x, p.y, p.w, p.h);
    x.strokeStyle = rgba(C.cream, 0.85);
    x.lineWidth = 2;
    x.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
    x.fillStyle = rgba(C.gold, 0.1);
    x.fillRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
    x.strokeStyle = rgba(C.gold, 0.5);
    x.lineWidth = 1;
    x.strokeRect(p.x + 9, p.y + 9, p.w - 18, p.h - 18);
    // a small bronze on top
    x.fillStyle = rgba(C.teal, 0.7);
    x.beginPath();
    x.ellipse(p.x + p.w / 2, p.y + p.h / 2 - 2, 9, 12, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = C.gold;
    x.beginPath();
    x.arc(p.x + p.w / 2, p.y + p.h / 2 - 16, 6, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = rgba(C.cream, 0.6);
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(p.x + p.w / 2, p.y + p.h / 2 - 26);
    x.lineTo(p.x + p.w / 2, p.y + p.h / 2 - 18);
    x.stroke();
  }

  // ---- gallery picture frames on the wall above the floor
  const frames = [
    { x: 4 * TILE + 4, w: 56, color: C.teal },
    { x: 7 * TILE, w: 44, color: C.amber },
    { x: 9 * TILE + 8, w: 58, color: C.gold },
  ];
  for (const f of frames) {
    const y = 10 * TILE + 9;
    x.fillStyle = C.ink;
    x.fillRect(f.x, y, f.w, 22);
    x.strokeStyle = rgba(C.gold, 0.8);
    x.lineWidth = 2;
    x.strokeRect(f.x, y, f.w, 22);
    x.strokeStyle = rgba(f.color, 0.7);
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(f.x + 5, y + 17);
    x.lineTo(f.x + f.w * 0.4, y + 6);
    x.lineTo(f.x + f.w * 0.62, y + 13);
    x.lineTo(f.x + f.w - 6, y + 5);
    x.stroke();
  }

  // ---- vault deposit boxes along the top wall
  for (let i = 0; i < 9; i++) {
    const bx = 30 * TILE + 5 + i * 34;
    const by = 6;
    x.strokeStyle = rgba(C.gold, 0.5);
    x.lineWidth = 1;
    x.strokeRect(bx, by, 26, 18);
    x.fillStyle = rgba(C.gold, 0.22);
    x.fillRect(bx + 11, by + 7, 4, 4);
  }

  // ---- corridor pipes
  x.strokeStyle = rgba(C.cream, 0.18);
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(6, 54);
  x.lineTo(6, 300);
  x.moveTo(13, 70);
  x.lineTo(13, 310);
  x.stroke();

  // ---- service door: a slab from the corridor into the gallery
  {
    const px = 2 * TILE;
    const py = 10 * TILE;
    x.fillStyle = C.deep;
    x.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    x.strokeStyle = rgba(C.cream, 0.9);
    x.lineWidth = 2;
    x.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
    x.strokeStyle = rgba(C.teal, 0.9);
    x.lineWidth = 1;
    x.strokeRect(px + 7, py + 8, TILE - 14, TILE - 16);
    label(x, 'SERVICE', px + TILE / 2, py + TILE / 2, 7, rgba(C.teal, 0.95), 1, 'center', 700);
  }

  // ---- fire escape: a teal landing at the bottom wall
  {
    const px = 6 * TILE;
    const py = 17 * TILE;
    x.strokeStyle = rgba(C.teal, 0.8);
    x.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      x.beginPath();
      x.moveTo(px + 4 + k * 4, py + 6 + k * 8);
      x.lineTo(px + 60 - k * 4, py + 6 + k * 8);
      x.stroke();
    }
    x.fillStyle = rgba(C.teal, 0.14);
    x.fillRect(px, py, TILE * 2, TILE);
    label(x, 'EXIT', px + TILE, py + 27, 9, rgba(C.teal, 0.95), 3, 'center', 700);
  }

  // ---- room names, faint but always legible
  label(x, 'GALLERY', 7 * TILE, 14 * TILE + 12, 12, rgba(C.cream, 0.13), 5);
  label(x, 'ATRIUM', 21.5 * TILE, 12 * TILE + 4, 13, rgba(C.cream, 0.12), 6);
  label(x, 'VAULT', 34.5 * TILE, 3 * TILE + 12, 11, rgba(C.cream, 0.14), 5);
  label(x, 'SERVICE', 1.5 * TILE, 6 * TILE, 7, rgba(C.cream, 0.14), 2);
  label(x, 'VENT', 21 * TILE, 3 * TILE + 16, 8, rgba(C.teal, 0.18), 4);

  // ---- the press's own registration marks in the margin
  x.strokeStyle = rgba(C.cream, 0.2);
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(12, WORLD_H - 12);
  x.lineTo(32, WORLD_H - 12);
  x.moveTo(22, WORLD_H - 22);
  x.lineTo(22, WORLD_H - 2);
  x.stroke();

  return c;
}

function ensureStatic(g) {
  if (!staticCanvas || staticSeed !== g.seed) {
    staticCanvas = buildStatic(g.seed);
    staticSeed = g.seed;
  }
  return staticCanvas;
}

// ---------------------------------------------------------------- fans

function fan(ctx, pts, color, pattern, dashed) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = rgba(color, 0.07);
  ctx.fill();
  ctx.clip();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  ctx.fillStyle = pattern;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.strokeStyle = rgba(color, 0.92);
  ctx.lineWidth = dashed ? 2.5 : 3;
  ctx.setLineDash(dashed ? [7, 5] : []);
  ctx.stroke();
  ctx.restore();
}

function lantern(ctx, x, y, color) {
  ctx.fillStyle = rgba(color, 0.18);
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(C.ink, 0.9);
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ---------------------------------------------------------------- props

function drawVitrine(ctx, g) {
  const v = GEOM.vitrine;
  const t = g.time;
  const cx = v.x + v.w / 2;
  // floor pool, flat: no radial gradient
  ctx.fillStyle = rgba(C.amber, 0.09);
  ctx.beginPath();
  ctx.ellipse(cx, v.y + v.h + 18, 92, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(C.amber, 0.05);
  ctx.beginPath();
  ctx.ellipse(cx, v.y + v.h + 18, 140, 66, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.ink;
  ctx.fillRect(v.x - 3, v.y - 3, v.w + 6, v.h + 6);
  ctx.strokeStyle = rgba(C.cream, 0.95);
  ctx.lineWidth = 3;
  ctx.strokeRect(v.x - 1, v.y - 1, v.w + 2, v.h + 2);
  ctx.strokeStyle = rgba(C.gold, 0.9);
  ctx.lineWidth = 1;
  ctx.strokeRect(v.x + 5, v.y + 5, v.w - 10, v.h - 10);

  if (g.vitrineOpen) {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(v.x + 4, v.y + 4, v.w - 8, v.h - 8);
    ctx.strokeStyle = rgba(C.cream, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(v.x + 4, v.y + 4, v.w - 8, v.h - 8);
    // the lid, thrown back
    ctx.fillStyle = rgba(C.cream, 0.1);
    ctx.fillRect(v.x + 8, v.y - 15, v.w - 16, 13);
    ctx.strokeStyle = rgba(C.cream, 0.5);
    ctx.strokeRect(v.x + 8, v.y - 15, v.w - 16, 13);
  } else {
    ctx.fillStyle = rgba(C.cream, 0.07);
    ctx.fillRect(v.x + 4, v.y + 4, v.w - 8, v.h - 8);
    // glass shine: two thin hard lines
    ctx.strokeStyle = rgba(C.cream, 0.32);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(v.x + 12, v.y + 13);
    ctx.lineTo(v.x + 26, v.y + 58);
    ctx.moveTo(v.x + 21, v.y + 9);
    ctx.lineTo(v.x + 35, v.y + 54);
    ctx.stroke();
    drawJewel(ctx, cx, v.y + 32, t);
  }

  label(ctx, 'THE MERIDIAN STAR', cx, v.y + v.h + 13, 9, rgba(C.gold, 0.95), 2.2, 'center', 700);
}

function drawJewel(ctx, cx, cy, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  const r = 10;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = rgba(C.amber, 0.16);
  ctx.beginPath();
  ctx.arc(0, 0, r + 7 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
  // facet body
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.8, -r * 0.25);
  ctx.lineTo(r * 0.55, r * 0.7);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.55, r * 0.7);
  ctx.lineTo(-r * 0.8, -r * 0.25);
  ctx.closePath();
  ctx.fillStyle = C.gold;
  ctx.fill();
  ctx.strokeStyle = C.goldLight;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.moveTo(-r * 0.8, -r * 0.25);
  ctx.lineTo(r * 0.8, -r * 0.25);
  ctx.strokeStyle = rgba(C.goldLight, 0.7);
  ctx.lineWidth = 1;
  ctx.stroke();
  // four point sparkle
  const s = 9 + pulse * 7;
  ctx.fillStyle = rgba(C.goldLight, 0.85);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(2.2, -2.2);
  ctx.lineTo(s, 0);
  ctx.lineTo(2.2, 2.2);
  ctx.lineTo(0, s);
  ctx.lineTo(-2.2, 2.2);
  ctx.lineTo(-s, 0);
  ctx.lineTo(-2.2, -2.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDoor(ctx, g) {
  const x = 2 * TILE;
  const y = 10 * TILE;
  ctx.fillStyle = g.doorOpen ? '#070b14' : C.deep;
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = rgba(C.cream, 0.75);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
  if (g.doorOpen) {
    ctx.fillStyle = rgba(C.cream, 0.3);
    ctx.fillRect(x + 1, y + 26, 9, 14);
    ctx.strokeStyle = rgba(C.teal, 0.9);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 26, 9, 14);
  } else {
    ctx.strokeStyle = rgba(C.teal, 0.9);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 8, y + 8, TILE - 16, TILE - 16);
    label(ctx, 'E', x + TILE / 2, y + TILE / 2 + 1, 9, rgba(C.cream, 0.8), 0);
  }
  if (g.doorNoise > 0) {
    ctx.strokeStyle = rgba(C.amber, Math.min(0.7, g.doorNoise));
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2, 12 + k * 8 + (1.4 - g.doorNoise) * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawCameras(ctx, g) {
  const pat = patterns(ctx);
  for (const cam of g.cameras) {
    const cone = cameraCone(g, cam);
    const frozen = cone.frozen;
    const color = frozen ? C.teal : C.alarm;
    const pts = conePolygon(cam.x, cam.y, cam.heading, cone.half, cone.range, {
      doorOpen: g.doorOpen,
      smokes: g.smokes,
      vitrineOpen: g.vitrineOpen,
    }, 20);
    fan(ctx, pts, color, frozen ? pat.teal : pat.alarm, true);

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.heading);
    ctx.fillStyle = rgba(C.cream, 0.8);
    ctx.beginPath();
    ctx.arc(-11, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(C.cream, 0.65);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(-4, 0);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.strokeStyle = rgba(C.cream, 0.85);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(-4, -6, 15, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = frozen ? C.teal : color;
    const blink = frozen || Math.sin(g.time * 5.4 + cam.phase * 3) > -0.2 ? 1 : 0.35;
    ctx.globalAlpha = blink;
    ctx.beginPath();
    ctx.arc(11, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    label(ctx, cam.name, cam.x, cam.y - 13, 7.5, rgba(C.cream, 0.6), 1, 'center', 700);
    if (frozen) {
      ctx.fillStyle = rgba(C.teal, 0.18);
      ctx.fillRect(cam.x + 6, cam.y + 7, 30, 12);
      ctx.strokeStyle = rgba(C.teal, 0.9);
      ctx.lineWidth = 1;
      ctx.strokeRect(cam.x + 6, cam.y + 7, 30, 12);
      label(ctx, 'LOOP', cam.x + 21, cam.y + 13.5, 7, rgba(C.teal, 0.95), 1, 'center', 700);
    }
  }
}

function drawSearchlight(ctx, g) {
  if (stageOf(g.alarm) < 2) return;
  const pts = searchlightCone(g);
  const pat = patterns(ctx);
  fan(ctx, pts, C.cream, pat.cream, true);
  ctx.strokeStyle = rgba(C.alarm, 0.85);
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(SEARCHLIGHT.x, SEARCHLIGHT.y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  lantern(ctx, SEARCHLIGHT.x, SEARCHLIGHT.y, C.alarm);
}

// ---------------------------------------------------------------- actors

function drawGuard(ctx, g, guard) {
  const t = g.time;
  const eyeY = guard.y - 5;
  lantern(ctx, guard.x + Math.cos(guard.heading) * 10, eyeY + Math.sin(guard.heading) * 10, C.amber);

  ctx.fillStyle = rgba(C.ink, 0.55);
  ctx.beginPath();
  ctx.ellipse(guard.x, guard.y + 8, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.ink;
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // cream cap, turned with the body
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y - 3, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y - 3, 4.2, 0, Math.PI * 2);
  ctx.stroke();

  const look = guard.state === 'stare' ? 1 : 0.55;
  ctx.fillStyle = rgba(C.cream, look);
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.heading) * 5, guard.y + Math.sin(guard.heading) * 5 - 3, 1.6, 0, Math.PI * 2);
  ctx.fill();

  label(ctx, guard.short, guard.x, guard.y - 17, 7, rgba(C.amber, 0.8), 1, 'center', 700);
  if (guard.state === 'stare') {
    ctx.strokeStyle = rgba(C.alarm, 0.75);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14 + Math.sin(t * 8) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, g) {
  const p = g.player;
  const t = g.time;
  const crouch = p.crouch;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = rgba(C.cream, 0.12);
  ctx.beginPath();
  ctx.arc(0, 2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(C.cream, 0.28);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(0, 2, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (crouch) ctx.scale(1, 0.78);
  ctx.fillStyle = rgba(C.ink, 0.6);
  ctx.beginPath();
  ctx.ellipse(0, 7, 9, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // coat
  ctx.fillStyle = '#0d1322';
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // scarf
  ctx.strokeStyle = C.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -1, 4.6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // head, toward the facing
  const hx = Math.cos(p.facing) * 2.4;
  const hy = Math.sin(p.facing) * 2.4 - 2.6;
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(hx + Math.cos(p.facing) * 0.9, hy + Math.sin(p.facing) * 0.9, 1, 0, Math.PI * 2);
  ctx.fill();

  if (p.carrying) {
    const bob = Math.sin(t * 4) * 1.2;
    ctx.fillStyle = C.gold;
    ctx.strokeStyle = C.goldLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -9 + bob);
    ctx.lineTo(4, -5 + bob);
    ctx.lineTo(0, -1 + bob);
    ctx.lineTo(-4, -5 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- smoke and coins

function drawSmoke(ctx, g) {
  const pat = patterns(ctx);
  for (const s of g.smokes) {
    const fade = Math.min(1, s.life / 0.7);
    ctx.save();
    ctx.globalAlpha = 0.86 * fade;
    ctx.fillStyle = C.smoke;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = pat.smoke;
    ctx.fill();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = rgba(C.cream, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
    // three hard little curls so the shape reads as smoke, not a plate
    ctx.strokeStyle = rgba(C.cream, 0.25);
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = g.time * 0.6 + k * 2.1;
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(a) * s.r * 0.45, s.y + Math.sin(a) * s.r * 0.4, s.r * 0.28, a, a + 2.2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawCoins(ctx, g) {
  for (const c of g.coins) {
    const pulse = 1 + (2.4 - c.life) * 4;
    ctx.strokeStyle = rgba(C.gold, Math.min(0.7, c.life / 2.4));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(C.goldLight, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- notices

function drawNotices(ctx, g) {
  const list = g.notices.slice(-2);
  let y = 556;
  ctx.save();
  ctx.font = '700 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = list.length - 1; i >= 0; i--) {
    const n = list[i];
    const alpha = Math.min(1, n.life / 0.5);
    const w = Math.max(220, ctx.measureText(n.text).width + 34);
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(VIEW_W / 2 - w / 2, y - 9, w, 18);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(n.color || C.cream, 0.45);
    ctx.lineWidth = 1;
    ctx.strokeRect(VIEW_W / 2 - w / 2, y - 9, w, 18);
    ctx.fillStyle = n.color || C.cream;
    ctx.fillText(n.text, VIEW_W / 2, y + 1);
    y -= 22;
  }
  ctx.restore();
}

function drawPrompt(ctx, g) {
  const hp = holdProgress(g);
  const p = g.player;
  if (!hp && !p.prompt) return;
  const text = hp ? hp.text : p.prompt.text;
  const x = Math.max(150, Math.min(VIEW_W - 150, p.x));
  const y = Math.max(30, p.y - 34);
  ctx.save();
  ctx.font = '700 10px Georgia, serif';
  const w = Math.max(170, ctx.measureText(text).width + 26);
  ctx.fillStyle = 'rgba(7,11,20,0.82)';
  ctx.fillRect(x - w / 2, y - 11, w, 22);
  ctx.strokeStyle = rgba(C.cream, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - 11, w, 22);
  ctx.fillStyle = C.cream;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  if (hp) {
    ctx.fillStyle = rgba(C.cream, 0.25);
    ctx.fillRect(x - w / 2 + 6, y + 13, w - 12, 4);
    ctx.fillStyle = C.amber;
    ctx.fillRect(x - w / 2 + 6, y + 13, (w - 12) * hp.t, 4);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the frame

export function drawWorld(ctx, g) {
  const floor = ensureStatic(g);
  ctx.drawImage(floor, 0, 0);

  drawVitrine(ctx, g);
  drawDoor(ctx, g);
  drawSearchlight(ctx, g);
  drawCameras(ctx, g);
  for (const guard of g.guards) {
    const cone = guardCone(g, guard);
    const pts = conePolygon(guard.x, guard.y - 5, guard.heading, cone.half, cone.range, {
      doorOpen: g.doorOpen,
      smokes: g.smokes,
      vitrineOpen: g.vitrineOpen,
    }, 26);
    fan(ctx, pts, C.amber, patterns(ctx).amber, false);
  }

  drawSmoke(ctx, g);
  drawCoins(ctx, g);

  const actors = g.guards.map((guard) => ({ y: guard.y, draw: () => drawGuard(ctx, g, guard) }));
  actors.push({ y: g.player.y, draw: () => drawPlayer(ctx, g) });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.draw();

  drawPrompt(ctx, g);
  drawNotices(ctx, g);
}
