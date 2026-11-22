// The thief: a walk with corners that slide, a crouch that hides behind low
// cover, the slow crawlspace, and the three hold-to-act moments (case, door,
// fire escape). The body is a circle of radius ~7 against 32 px tiles.

import { GEOM, boxBlocked, tileAt, tileChar, inVent, dist } from './level.js';
import { lureNearestGuard } from './guards.js';

const RADIUS = 7;
const WALK = 152;
const CROUCH = 74;
const VENT = 78;

export function createPlayer() {
  return {
    x: GEOM.spawn.x,
    y: GEOM.spawn.y,
    facing: -Math.PI / 2,
    crouch: false,
    vent: false,
    carrying: false,
    moving: false,
    walkPhase: 0,
    hold: null,
    prompt: null,
  };
}

/** The two legal seams between the crawlspace and the rooms: the gallery ceiling and the vault. */
function ventSeam(to, from) {
  const pair = (ax, ay, bx, by) =>
    (to.tx === ax && to.ty === ay && from.tx === bx && from.ty === by) ||
    (to.tx === bx && to.ty === by && from.tx === ax && from.ty === ay);
  return pair(13, 10, 13, 11) || pair(29, 3, 30, 3);
}

function canOccupy(g, x, y, fromX, fromY) {
  if (boxBlocked(x, y, RADIUS, g.doorOpen)) return false;
  const to = tileAt(x, y);
  const from = tileAt(fromX, fromY);
  const toVent = tileChar(to.tx, to.ty) === '~';
  const fromVent = tileChar(from.tx, from.ty) === '~';
  if (toVent !== fromVent && !ventSeam(to, from)) return false;
  return true;
}

/** The one thing E can do where the thief stands, or null. */
export function interactionAt(g) {
  const p = g.player;
  if (p.carrying && dist(p, GEOM.escape) < 52) {
    return { kind: 'escape', need: 0, text: 'PRESS E — OUT THROUGH THE FIRE ESCAPE' };
  }
  if (!p.carrying && !g.vitrineOpen && dist(p, GEOM.jewel) < 58) {
    return { kind: 'vitrine', need: 1.5, text: 'HOLD E — TAKE THE MERIDIAN STAR' };
  }
  if (!g.doorOpen && dist(p, GEOM.door) < 50) {
    return { kind: 'door', need: 1.2, text: 'HOLD E — OPEN THE SERVICE DOOR' };
  }
  return null;
}

function takeJewel(g) {
  const p = g.player;
  g.vitrineOpen = true;
  p.carrying = true;
  p.hold = null;
  if (g.sound) g.sound.chime();
  g.notice('THE MERIDIAN STAR IS YOURS — GET TO THE FIRE ESCAPE', 'gold', 5);
  g.alarm = Math.min(99, g.alarm + 6);
  g.peak = Math.max(g.peak, g.alarm);
}

function openDoor(g) {
  g.doorOpen = true;
  g.doorNoise = 1.4;
  g.player.hold = null;
  if (g.sound) g.sound.doorGroan();
  lureNearestGuard(g, GEOM.door.x, GEOM.door.y, 470, 3.2);
  g.notice('THE SERVICE DOOR GROANS — SOMETHING HEARD IT', 'amber', 4);
}

function escape(g) {
  const p = g.player;
  g.stats.escapeTime = g.time;
  g.mode = 'win';
  g.winT = 0;
  g.winVan = 0;
  g.player.hold = null;
  if (g.sound) g.sound.getaway();
}

export function updatePlayer(g, dt) {
  const p = g.player;
  const input = g.input;
  if (g.mode !== 'play') {
    p.moving = false;
    p.prompt = null;
    return;
  }

  const vent = inVent(p.x, p.y);
  p.vent = vent;
  p.crouch = input.crouch || vent;

  let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const speed = vent ? VENT : p.crouch ? CROUCH : WALK;
  if (ix !== 0 || iy !== 0) {
    const len = Math.hypot(ix, iy);
    ix /= len;
    iy /= len;
    const stepX = ix * speed * dt;
    const stepY = iy * speed * dt;
    if (stepX !== 0 && canOccupy(g, p.x + stepX, p.y, p.x, p.y)) p.x += stepX;
    if (stepY !== 0 && canOccupy(g, p.x, p.y + stepY, p.x, p.y)) p.y += stepY;
    p.facing = Math.atan2(iy, ix);
    p.walkPhase += speed * dt * 0.055;
    p.moving = true;
  } else {
    p.moving = false;
  }

  const here = interactionAt(g);
  p.prompt = here;
  if (here && input.act) {
    if (here.kind === 'escape') {
      escape(g);
      return;
    }
    if (!p.hold || p.hold.kind !== here.kind) p.hold = { kind: here.kind, t: 0 };
    p.hold.t += dt;
    if (here.kind === 'vitrine' && p.hold.t >= 1.5) takeJewel(g);
    if (here.kind === 'door' && p.hold.t >= 1.2) openDoor(g);
  } else {
    p.hold = null;
  }
}

/** The hold ring the renderer draws above the thief, or null. */
export function holdProgress(g) {
  const p = g.player;
  if (!p.hold || !p.prompt) return null;
  const need = p.prompt.need;
  return { t: Math.min(1, p.hold.t / need), need, text: p.prompt.text };
}
