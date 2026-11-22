// The four staged frames. Each one puts the real game state where the frame
// needs it, then lets the real update loop run six fixed steps and freezes.
// A seed paints the same grain, so a shot is reproducible.

import { GEOM } from './level.js';

const T = 32;

function tools(g, smoke, coin, loop) {
  g.tools[0].charges = smoke;
  g.tools[1].charges = coin;
  g.tools[2].charges = loop;
}

function guardAt(guard, x, y, heading, state = 'patrol', stareT = 0) {
  guard.x = x;
  guard.y = y;
  guard.heading = heading;
  guard.state = state;
  guard.stareT = stareT;
  guard.sightT = state === 'stare' ? 1 : 0;
  guard.lastSeen = null;
  guard.lure = null;
  guard.contact = 0;
}

function cameraAt(cam, heading, phase) {
  cam.heading = heading;
  cam.phase = phase;
  cam.locked = false;
  cam.lockT = 0;
}

function clean(g) {
  g.mode = 'play';
  g.time = 0;
  g.tick = 0;
  g.alarm = 0;
  g.peak = 0;
  g.alarmGrace = 2;
  g.doorOpen = false;
  g.doorNoise = 0;
  g.vitrineOpen = false;
  g.smokes = [];
  g.coins = [];
  g.loopT = 0;
  g.notices = [];
  g.watcher = null;
  g.lastWatcher = null;
  g.player.carrying = false;
  g.player.crouch = false;
  g.player.hold = null;
  g.player.prompt = null;
  g.player.x = GEOM.spawn.x;
  g.player.y = GEOM.spawn.y;
  g.player.facing = -Math.PI / 2;
  g.stats.escapeTime = 0;
  g.stats.peak = 0;
  g.stats.watchers = new Set();
  tools(g, 2, 2, 1);
}

/** Put the state where the shot's frame needs it, before the fixed steps. */
export function stageShot(g, name) {
  clean(g);
  g.shot = name;

  if (name === 'cover') {
    g.player.x = 18.4 * T;
    g.player.y = 12.875 * T;
    g.player.facing = -2.35;
    g.alarm = 34;
    g.peak = 34;
    guardAt(g.guards[0], 3.6 * T, 15.4 * T, 0.1);
    guardAt(g.guards[1], 21.875 * T, 13.4 * T, -2.35, 'stare', 0.2);
    guardAt(g.guards[2], 36.5 * T, 2.2 * T, 3.0);
    cameraAt(g.cameras[0], 0.76, -0.3);
    cameraAt(g.cameras[1], -2.42, 0.4);
    tools(g, 2, 2, 1);
    return;
  }

  if (name === 'smoke') {
    g.player.x = 17.5 * T;
    g.player.y = 13.4 * T;
    g.player.facing = Math.atan2(13.2 * T - 13.4 * T, 24.5 * T - 17.5 * T);
    g.alarm = 56;
    g.peak = 56;
    guardAt(g.guards[1], 24.5 * T, 13.2 * T, Math.atan2(13.4 * T - 13.2 * T, 17.5 * T - 24.5 * T), 'stare', 0.2);
    g.smokes.push({ x: 672, y: 425.6, r: 58, life: 4, max: 4, seed: 21 });
    tools(g, 1, 2, 1);
    return;
  }

  if (name === 'loot') {
    g.vitrineOpen = true;
    g.player.carrying = true;
    g.player.x = 34 * T;
    g.player.y = 6.3 * T;
    g.player.facing = -Math.PI / 2;
    g.alarm = 62;
    g.peak = 62;
    g.watcher = 'CAM-3';
    guardAt(g.guards[2], 30.6 * T, 6.9 * T, 3.0, 'stare', 0.2);
    const cam = g.cameras[2];
    cam.heading = Math.atan2(g.player.y - cam.y, g.player.x - cam.x);
    cam.locked = true;
    cam.lockT = 1.4;
    tools(g, 1, 2, 1);
    return;
  }

  if (name === 'win') {
    g.mode = 'win';
    g.winT = 1.5;
    g.vitrineOpen = true;
    g.player.carrying = true;
    g.player.x = GEOM.escape.x;
    g.player.y = GEOM.escape.y;
    g.player.facing = -Math.PI / 2;
    g.alarm = 86;
    g.peak = 86;
    g.watcher = 'CAM-3';
    g.stats.escapeTime = 112;
    g.stats.peak = 52;
    g.stats.watchers = new Set(['CAM-3', 'GUARD 3']);
    tools(g, 1, 1, 1);
  }
}

/** Re-pin the exact pose after the fixed steps, so the frame is the one specified. */
export function pinShot(g, name) {
  if (name === 'cover') {
    g.player.x = 18.4 * T;
    g.player.y = 12.875 * T;
    g.player.facing = -2.35;
    g.player.crouch = false;
    g.player.vent = false;
    g.alarm = 34;
    g.peak = 34;
    guardAt(g.guards[0], 3.6 * T, 15.4 * T, 0.1);
    guardAt(g.guards[1], 21.875 * T, 13.4 * T, -2.35, 'stare', 0.2);
    guardAt(g.guards[2], 36.5 * T, 2.2 * T, 3.0);
    cameraAt(g.cameras[0], 0.76, -0.3);
    cameraAt(g.cameras[1], -2.42, 0.4);
    tools(g, 2, 2, 1);
  } else if (name === 'smoke') {
    g.player.x = 17.5 * T;
    g.player.y = 13.4 * T;
    g.player.crouch = false;
    g.alarm = 56;
    g.peak = 56;
    guardAt(g.guards[1], 24.5 * T, 13.2 * T, Math.atan2(13.4 * T - 13.2 * T, 17.5 * T - 24.5 * T), 'stare', 0.2);
    g.smokes = [{ x: 672, y: 425.6, r: 58, life: 4, max: 4, seed: 21 }];
    tools(g, 1, 2, 1);
  } else if (name === 'loot') {
    g.vitrineOpen = true;
    g.player.carrying = true;
    g.player.x = 34 * T;
    g.player.y = 6.3 * T;
    g.player.facing = -Math.PI / 2;
    g.alarm = 62;
    g.peak = 62;
    guardAt(g.guards[2], 30.6 * T, 6.9 * T, 3.0, 'stare', 0.2);
    const cam = g.cameras[2];
    cam.heading = Math.atan2(g.player.y - cam.y, g.player.x - cam.x);
    cam.locked = true;
    cam.lockT = 1.4;
    tools(g, 1, 2, 1);
  } else if (name === 'win') {
    g.mode = 'win';
    g.winT = 1.5;
    g.vitrineOpen = true;
    g.player.carrying = true;
    g.player.x = GEOM.escape.x;
    g.player.y = GEOM.escape.y;
    g.alarm = 86;
    g.stats.escapeTime = 112;
    g.stats.peak = 52;
    g.stats.watchers = new Set(['CAM-3', 'GUARD 3']);
    tools(g, 1, 1, 1);
  }
}

export function shotFrames(name) {
  return name === 'win' ? 0 : 6;
}
