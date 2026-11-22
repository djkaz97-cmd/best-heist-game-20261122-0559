// The alarm: one number from 0 to 100, three stages, a fair grace, and the
// searchlight that wakes with the lockdown. Every sight adds heat; every quiet
// stretch bleeds it away.

import { lineBlocked, conePolygon, SEARCHLIGHT } from './level.js';

export const WATCH_AT = 40;
export const LOCKDOWN_AT = 75;

/** 0 CALM, 1 WATCH, 2 LOCKDOWN. */
export function stageOf(value) {
  if (value >= LOCKDOWN_AT) return 2;
  if (value >= WATCH_AT) return 1;
  return 0;
}

export const STAGE_NAMES = ['CALM', 'WATCH', 'LOCKDOWN'];

/** The alarm gain a watcher at distance d adds, in points per second. */
export function gainForDistance(d) {
  if (d < 92) return 45;
  if (d < 176) return 22;
  return 10;
}

export function bust(g, source) {
  if (g.mode !== 'play') return;
  g.alarm = 100;
  g.peak = 100;
  g.mode = 'lose';
  g.loseT = 0;
  g.watcher = source;
  g.stats.watchers.add(source);
  g.player.moving = false;
  if (g.sound) g.sound.bust();
}

/** Add alarm heat outside the sight loop (tools, a guard's hand). */
export function addHeat(g, amount, source) {
  if (g.mode !== 'play') return;
  g.alarm = Math.min(100, g.alarm + amount);
  g.peak = Math.max(g.peak, g.alarm);
  if (source) g.lastWatcher = source;
  if (g.alarm >= 100) bust(g, source || g.lastWatcher || 'THE HOUSE');
}

/** The searchlight's current heading, sweeping up into the gallery from the fire escape. */
export function searchlightHeading(g) {
  return -Math.PI / 2 + 0.62 * Math.sin((Math.PI * 2 * g.time) / SEARCHLIGHT.period);
}

/** Whether the lockdown searchlight holds the thief in its beam. */
export function searchlightSees(g) {
  if (stageOf(g.alarm) < 2 || g.mode !== 'play') return false;
  const h = searchlightHeading(g);
  const dx = g.player.x - SEARCHLIGHT.x;
  const dy = g.player.y - SEARCHLIGHT.y;
  const d = Math.hypot(dx, dy);
  if (d > SEARCHLIGHT.range) return false;
  let diff = Math.atan2(dy, dx) - h;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > SEARCHLIGHT.half) return false;
  return !lineBlocked(SEARCHLIGHT.x, SEARCHLIGHT.y, g.player.x, g.player.y, {
    doorOpen: g.doorOpen,
    lowCover: false,
    smokes: g.smokes,
    vitrineOpen: g.vitrineOpen,
  });
}

/** The searchlight's fan, for the renderer. */
export function searchlightCone(g) {
  return conePolygon(
    SEARCHLIGHT.x,
    SEARCHLIGHT.y,
    searchlightHeading(g),
    SEARCHLIGHT.half,
    SEARCHLIGHT.range,
    { doorOpen: g.doorOpen, smokes: g.smokes, vitrineOpen: g.vitrineOpen },
    18,
  );
}

/**
 * The meter. `watchers` is the list of what sees the thief this frame:
 * { label, distance, camera, locked }. The searchlight is added here.
 */
export function updateAlarm(g, dt, watchers) {
  if (g.mode !== 'play') return;
  let gain = 0;
  let loudest = null;
  for (const w of watchers) {
    let add = gainForDistance(w.distance);
    if (g.player.crouch) add *= 0.5;
    if (w.camera && w.locked) add *= 1.55;
    gain += add;
    loudest = w.label;
    g.stats.watchers.add(w.label);
  }
  if (searchlightSees(g)) {
    gain += 20;
    loudest = 'EXIT SEARCHLIGHT';
    g.stats.watchers.add('EXIT SEARCHLIGHT');
  }
  if (gain > 0) {
    g.alarmGrace = 0.45;
    g.lastWatcher = loudest;
    g.alarm = Math.min(100, g.alarm + gain * dt);
    g.peak = Math.max(g.peak, g.alarm);
    g.gainNow = gain;
    if (g.alarm >= 100) {
      bust(g, loudest || 'THE HOUSE');
      return;
    }
  } else {
    g.gainNow = 0;
    g.alarmGrace -= dt;
    if (g.alarmGrace <= 0) {
      g.alarm = Math.max(0, g.alarm - 6 * dt);
    }
  }
}

/** The stage the frame is in, for the HUD and the sound. */
export function alarmSnapshot(g) {
  const stage = stageOf(g.alarm);
  return {
    value: g.alarm,
    stage,
    name: STAGE_NAMES[stage],
    searchlight: stage === 2,
  };
}
