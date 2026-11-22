// The ceiling lenses: three wall mounts on slow opposing sweeps. A lens that
// catches the thief locks its heading onto him and reads him at 1.55x. The loop
// tap freezes all three for five seconds.

import {
  CAMERA_DEFS,
  angleDiff,
  rayDistance,
  lineBlocked,
} from './level.js';
import { stageOf } from './alarm.js';

export const CAMERA_HALF = 0.235;

export function createCameras() {
  return CAMERA_DEFS.map((def) => ({
    name: def.name,
    x: def.x,
    y: def.y,
    base: def.base,
    sweep: def.sweep,
    period: def.period,
    range: def.range,
    phase: def.phase,
    heading: def.base,
    locked: false,
    lockT: 0,
    blink: 0,
    sweepT: 0,
  }));
}

/** What one camera shows: a tight red fan, which the loop tap turns teal and blind. */
export function cameraCone(g, cam) {
  return {
    half: CAMERA_HALF,
    range: cam.range,
    frozen: g.loopT > 0,
    locked: cam.locked,
  };
}

/** Whether this lens has an unbroken sight of the thief right now. */
export function cameraSees(g, cam) {
  if (g.mode !== 'play') return false;
  if (g.loopT > 0) return false;
  const p = g.player;
  const d = Math.hypot(p.x - cam.x, p.y - cam.y);
  if (d > cam.range) return false;
  const to = Math.atan2(p.y - cam.y, p.x - cam.x);
  if (Math.abs(angleDiff(to, cam.heading)) > CAMERA_HALF) return false;
  return !lineBlocked(cam.x, cam.y, p.x, p.y, {
    doorOpen: g.doorOpen,
    lowCover: false,
    smokes: g.smokes,
    vitrineOpen: g.vitrineOpen,
  });
}

/** Where the lens wants to point this frame: a sine sweep, faster on lockdown. */
export function sweepHeading(g, cam) {
  const speed = stageOf(g.alarm) >= 2 ? 1.35 : 1;
  const t = g.time * speed + cam.phase;
  return cam.base + cam.sweep * Math.sin((Math.PI * 2 * t) / cam.period);
}

export function updateCameras(g, dt) {
  if (g.loopT > 0) g.loopT = Math.max(0, g.loopT - dt);
  for (const cam of g.cameras) {
    cam.blink += dt;
    const sees = cameraSees(g, cam);
    if (sees) {
      cam.lockT = 1.4;
      cam.locked = true;
    } else if (cam.lockT > 0) {
      cam.lockT = Math.max(0, cam.lockT - dt);
      if (cam.lockT <= 0) cam.locked = false;
    }
    if (g.loopT > 0) {
      cam.locked = false;
      continue;
    }
    if (sees) {
      const to = Math.atan2(g.player.y - cam.y, g.player.x - cam.x);
      const d = angleDiff(to, cam.heading);
      const step = 4.6 * dt;
      cam.heading += Math.abs(d) <= step ? d : Math.sign(d) * step;
    } else if (!cam.locked) {
      const desired = sweepHeading(g, cam);
      const wall = rayDistance(cam.x, cam.y, desired, 46, {
        doorOpen: g.doorOpen,
        smokes: g.smokes,
        vitrineOpen: g.vitrineOpen,
      });
      if (wall >= 44) cam.heading = desired;
    }
    cam.sweepT += dt;
  }
}
