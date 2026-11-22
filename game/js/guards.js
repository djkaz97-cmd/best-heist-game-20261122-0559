// The guards: three lanterns on fixed routes. They walk, dwell, stare when a
// sight holds for 0.9 s, search the last seen spot for 3 s, and can be pulled
// off the route by a door or a thrown coin. Their lantern cone is a raycast
// polygon, so a wall cuts it hard.

import {
  GUARD_DEFS,
  boxBlocked,
  center,
  dist,
  angleDiff,
  lineBlocked,
} from './level.js';
import { stageOf, addHeat, bust } from './alarm.js';

const CONE_HALF = 0.42;
const CONE_RANGE = 232;

export function createGuards() {
  return GUARD_DEFS.map((def) => {
    const start = center(def.start.tx, def.start.ty);
    const route = def.route.map((w) => center(w.tx, w.ty));
    const target = route[def.next] ?? route[0];
    return {
      name: def.name,
      short: def.short,
      x: start.x,
      y: start.y,
      heading: Math.atan2(target.y - start.y, target.x - start.x),
      route,
      next: def.next,
      speed: def.speed,
      dwell: def.dwell,
      state: 'patrol',
      dwellT: 0,
      sightT: 0,
      stareT: 0,
      searchT: 0,
      lastSeen: null,
      lure: null,
      contact: 0,
      walkPhase: 0,
      scanT: 0,
    };
  });
}

/** The fan a guard's lantern throws, in radians: wider while it stares, wider still on watch. */
export function guardCone(g, guard) {
  let half = CONE_HALF;
  if (guard.state === 'stare') half *= 1.3;
  if (stageOf(g.alarm) >= 1) half *= 1.12;
  return { half, range: CONE_RANGE, eye: 5 };
}

/** Whether this guard has an unbroken sight of the thief right now. */
export function guardSees(g, guard) {
  if (g.mode !== 'play') return false;
  const p = g.player;
  const cone = guardCone(g, guard);
  const eyeY = guard.y - cone.eye;
  const d = Math.hypot(p.x - guard.x, p.y - eyeY);
  if (d > cone.range) return false;
  const to = Math.atan2(p.y - eyeY, p.x - guard.x);
  if (Math.abs(angleDiff(to, guard.heading)) > cone.half) return false;
  return !lineBlocked(guard.x, eyeY, p.x, p.y, {
    doorOpen: g.doorOpen,
    lowCover: p.crouch,
    smokes: g.smokes,
    vitrineOpen: g.vitrineOpen,
  });
}

function turnTo(guard, target, rate, dt) {
  const d = angleDiff(target, guard.heading);
  const step = rate * dt;
  guard.heading += Math.abs(d) <= step ? d : Math.sign(d) * step;
}

function moveToward(g, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 1.5) return 0;
  const step = Math.min(d, speed * dt);
  const ux = dx / d;
  const uy = dy / d;
  let moved = 0;
  if (!boxBlocked(guard.x + ux * step, guard.y, 8, g.doorOpen)) {
    guard.x += ux * step;
    moved += step;
  }
  if (!boxBlocked(guard.x, guard.y + uy * step, 8, g.doorOpen)) {
    guard.y += uy * step;
    moved += step;
  }
  if (moved > 0.01) turnTo(guard, Math.atan2(dy, dx), 2.6, dt);
  guard.walkPhase += moved * 0.06;
  return moved;
}

function nearestWaypoint(guard) {
  let best = 0;
  let bestD = Infinity;
  guard.route.forEach((w, i) => {
    const d = Math.hypot(w.x - guard.x, w.y - guard.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function resumePatrol(guard) {
  guard.state = 'patrol';
  guard.next = nearestWaypoint(guard);
  guard.dwellT = 0;
  guard.sightT = 0;
  guard.stareT = 0;
  guard.searchT = 0;
  guard.lure = null;
}

/** Send the nearest guard within `radius` to stand at (x, y) for `seconds`. */
export function lureNearestGuard(g, x, y, radius, seconds) {
  let best = null;
  let bestD = radius;
  for (const guard of g.guards) {
    const d = dist(guard, { x, y });
    if (d < bestD) {
      bestD = d;
      best = guard;
    }
  }
  if (!best) return null;
  best.lure = { x, y, t: seconds };
  best.state = 'lure';
  best.sightT = 0;
  best.contact = 0;
  return best;
}

/** The guard a thrown coin pulls, choosing by distance to the coin. */
export function nearestGuardTo(g, point, radius) {
  let best = null;
  let bestD = radius;
  for (const guard of g.guards) {
    const d = dist(guard, point);
    if (d < bestD) {
      bestD = d;
      best = guard;
    }
  }
  return best;
}

function think(g, guard, dt) {
  const sees = guardSees(g, guard);
  if (sees) {
    guard.sightT += dt;
    guard.lastSeen = { x: g.player.x, y: g.player.y };
  } else {
    guard.sightT = Math.max(0, guard.sightT - dt * 1.4);
  }

  if (guard.state === 'patrol') {
    if (sees && guard.sightT >= 0.9 && guard.lastSeen) {
      guard.state = 'stare';
      guard.stareT = 0;
      if (g.sound) g.sound.sting();
      return;
    }
    const target = guard.route[guard.next];
    if (!target) return;
    const d = Math.hypot(target.x - guard.x, target.y - guard.y);
    if (d < 2) {
      guard.dwellT += dt;
      if (guard.dwellT >= guard.dwell) {
        guard.dwellT = 0;
        guard.next = (guard.next + 1) % guard.route.length;
      }
    } else {
      const pace = guard.speed * (stageOf(g.alarm) >= 1 ? 1.15 : 1);
      moveToward(g, guard, target.x, target.y, pace, dt);
    }
    return;
  }

  if (guard.state === 'stare') {
    guard.stareT += dt;
    if (guard.lastSeen) turnTo(guard, Math.atan2(guard.lastSeen.y - (guard.y - 5), guard.lastSeen.x - guard.x), 5.2, dt);
    if (guard.stareT >= 1.1) {
      if (guard.lastSeen) {
        guard.state = 'search';
        guard.searchT = 0;
        guard.scanT = 0;
      } else {
        resumePatrol(guard);
      }
    }
    return;
  }

  if (guard.state === 'search') {
    const spot = guard.lastSeen;
    if (!spot) {
      resumePatrol(guard);
      return;
    }
    const d = Math.hypot(spot.x - guard.x, spot.y - guard.y);
    if (d > 12) {
      moveToward(g, guard, spot.x, spot.y, guard.speed * 1.05, dt);
    } else {
      guard.searchT += dt;
      guard.scanT += dt;
      guard.heading += Math.sin(guard.scanT * 2.2) * 1.6 * dt;
      if (sees && guard.sightT >= 0.9) {
        guard.state = 'stare';
        guard.stareT = 0;
        return;
      }
      if (guard.searchT >= 3) resumePatrol(guard);
    }
    return;
  }

  if (guard.state === 'lure') {
    const spot = guard.lure;
    guard.lure.t -= dt;
    if (spot) moveToward(g, guard, spot.x, spot.y, guard.speed * 1.1, dt);
    if (!spot || guard.lure.t <= 0) resumePatrol(guard);
  }
}

export function updateGuards(g, dt) {
  if (g.mode !== 'play') return;
  for (const guard of g.guards) {
    think(g, guard, dt);
    const d = Math.hypot(g.player.x - guard.x, g.player.y - guard.y);
    if (d < 16 && g.mode === 'play') {
      guard.contact += dt;
      addHeat(g, 14 * dt, guard.name);
      if (guard.contact >= 0.35) {
        bust(g, guard.name);
        return;
      }
    } else {
      guard.contact = Math.max(0, guard.contact - dt * 2);
    }
  }
}

