// The belt: a smoke disc, a thrown coin, a loop tap. Five charges in all, each
// use costs six points of alarm heat, and the crawlspace refuses every one.

import { inVent, boxBlocked } from './level.js';
import { addHeat } from './alarm.js';
import { nearestGuardTo } from './guards.js';

export function createTools() {
  return [
    { key: '1', name: 'SMOKE', charges: 2, max: 2 },
    { key: '2', name: 'COIN', charges: 2, max: 2 },
    { key: '3', name: 'LOOP TAP', charges: 1, max: 1 },
  ];
}

export function unusedCharges(g) {
  return g.tools.reduce((n, t) => n + t.charges, 0);
}

function spend(g, index) {
  const tool = g.tools[index];
  tool.charges -= 1;
  addHeat(g, 6, tool.name);
  return tool;
}

/** Throw the coin toward a point, stopping at the first wall. */
function coinLanding(g, aim) {
  const p = g.player;
  let dx = aim.x - p.x;
  let dy = aim.y - p.y;
  let d = Math.hypot(dx, dy);
  if (d < 1) {
    dx = Math.cos(p.facing);
    dy = Math.sin(p.facing);
    d = 1;
  }
  const ux = dx / d;
  const uy = dy / d;
  const reach = Math.min(210, d);
  let last = { x: p.x + ux * 14, y: p.y + uy * 14 };
  for (let r = 14; r <= reach; r += 5) {
    const x = p.x + ux * r;
    const y = p.y + uy * r;
    if (boxBlocked(x, y, 3, g.doorOpen)) break;
    last = { x, y };
  }
  return last;
}

export function useTool(g, index) {
  const p = g.player;
  if (g.mode !== 'play') return;
  const tool = g.tools[index];
  if (!tool) return;
  if (inVent(p.x, p.y)) {
    g.notice('TOOLS ARE USELESS IN THE VENT', 'amber', 2.4);
    if (g.sound) g.sound.refuse();
    return;
  }
  if (tool.charges <= 0) {
    g.notice('NO CHARGES LEFT', 'alarm', 2);
    if (g.sound) g.sound.refuse();
    return;
  }

  if (index === 0) {
    spend(g, 0);
    g.smokes.push({
      x: p.x + Math.cos(p.facing) * 10,
      y: p.y + Math.sin(p.facing) * 10,
      r: 58,
      life: 4,
      max: 4,
      seed: (g.tick * 37) % 997,
    });
    if (g.sound) g.sound.smoke();
    g.notice('SMOKE — EVERY SIGHT LINE THROUGH IT IS CUT', 'smoke', 3);
    return;
  }

  if (index === 1) {
    spend(g, 1);
    const landing = coinLanding(g, g.aim);
    g.coins.push({ x: landing.x, y: landing.y, life: 2.4 });
    const guard = nearestGuardTo(g, landing, 340);
    if (guard) {
      guard.lure = { x: landing.x, y: landing.y, t: 3 };
      guard.state = 'lure';
      guard.sightT = 0;
      g.notice(`${guard.name} FOLLOWS THE COIN`, 'gold', 3);
    } else {
      g.notice('THE COIN RINGS ON EMPTY FLOOR', 'gold', 3);
    }
    if (g.sound) g.sound.coin();
    return;
  }

  spend(g, 2);
  g.loopT = 5;
  if (g.sound) g.sound.loop();
  g.notice('LOOP TAP — THE LENSES REPEAT FOR FIVE SECONDS', 'teal', 3.4);
}

export function updateTools(g, dt) {
  for (const s of g.smokes) s.life -= dt;
  if (g.smokes.length && g.smokes[0].life <= 0) g.smokes = g.smokes.filter((s) => s.life > 0);
  for (const c of g.coins) c.life -= dt;
  if (g.coins.length && g.coins[0].life <= 0) g.coins = g.coins.filter((c) => c.life > 0);
}
