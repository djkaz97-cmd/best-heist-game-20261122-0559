// Boot: one fixed 60 Hz loop, the keys, the mouse, the shot staging and the
// little debug handle the acceptance test drives. This is the only module that
// owns the canvas and the game state.

import { HUD, VIEW_W, VIEW_H, dist } from './level.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuards, updateGuards, guardSees } from './guards.js';
import { createCameras, updateCameras, cameraSees } from './cameras.js';
import { updateAlarm } from './alarm.js';
import { createTools, useTool, updateTools } from './tools.js';
import { drawWorld, invalidateStatic, C } from './render.js';
import { drawHud, drawTitle, drawWin, drawLose } from './hud.js';
import { Sound } from './audio.js';
import { stageShot, pinShot, shotFrames } from './shots.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const STEP = 1 / 60;
const sound = new Sound();

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  crouch: false,
  act: false,
};

const NOTICE_COLORS = {
  gold: C.gold,
  amber: C.amber,
  teal: C.teal,
  alarm: C.alarm,
  smoke: C.smoke,
  cream: C.cream,
};

function createState(seed) {
  return {
    seed,
    shot: null,
    mode: 'title',
    time: 0,
    tick: 0,
    player: createPlayer(),
    guards: createGuards(),
    cameras: createCameras(),
    tools: createTools(),
    smokes: [],
    coins: [],
    loopT: 0,
    alarm: 0,
    peak: 0,
    alarmGrace: 0,
    gainNow: 0,
    lastWatcher: null,
    watcher: null,
    doorOpen: false,
    doorNoise: 0,
    vitrineOpen: false,
    winT: 0,
    winVan: 0,
    loseT: 0,
    stats: { escapeTime: 0, peak: 0, watchers: new Set() },
    notices: [],
    input,
    aim: { x: VIEW_W / 2, y: 300 },
    sound,
    frozen: false,
  };
}

let g = createState(Number(new URLSearchParams(location.search).get('seed')) || 7);

function notice(text, color, life) {
  g.notices.push({
    text,
    color: NOTICE_COLORS[color] || color || C.cream,
    life: life || 2.6,
  });
  if (g.notices.length > 4) g.notices.shift();
}

g.notice = notice;

function startRun() {
  const seed = g.seed;
  const soundRef = sound;
  const frozenRef = false;
  Object.assign(g, createState(seed));
  g.sound = soundRef;
  g.input = input;
  g.notice = notice;
  g.frozen = frozenRef;
  g.mode = 'play';
  g.time = 0;
  g.alarmGrace = 0.45;
  sound.reset();
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.crouch = false;
  input.act = false;
  invalidateStatic();
  draw(g);
}

function step(state, dt) {
  const s = state;
  if (s.mode === 'play') {
    s.time += dt;
    s.tick += 1;
    updatePlayer(s, dt);
    if (s.mode !== 'play') {
      if (s.mode === 'win') s.stats.peak = Math.round(s.peak);
      finishStep(s, dt);
      return;
    }
    updateGuards(s, dt);
    if (s.mode !== 'play') {
      finishStep(s, dt);
      return;
    }
    updateCameras(s, dt);
    updateTools(s, dt);

    const watchers = [];
    for (const guard of s.guards) {
      if (guardSees(s, guard)) {
        watchers.push({
          label: guard.name,
          distance: Math.hypot(guard.x - s.player.x, guard.y - s.player.y),
          camera: false,
          locked: false,
        });
      }
    }
    for (const cam of s.cameras) {
      if (cameraSees(s, cam)) {
        watchers.push({
          label: cam.name,
          distance: Math.hypot(cam.x - s.player.x, cam.y - s.player.y),
          camera: true,
          locked: cam.locked,
        });
      }
    }
    updateAlarm(s, dt, watchers);
  } else if (s.mode === 'win') {
    s.winT += dt;
    s.winVan += dt;
  } else if (s.mode === 'lose') {
    s.loseT += dt;
  } else if (s.mode === 'title') {
    s.time += dt;
  }
  finishStep(s, dt);
}

function finishStep(s, dt) {
  if (s.doorNoise > 0) s.doorNoise = Math.max(0, s.doorNoise - dt);
  for (const n of s.notices) n.life -= dt;
  if (s.notices.length && s.notices[0].life <= 0) s.notices = s.notices.filter((n) => n.life > 0);
  s.sound.update(s, dt);
}

function draw(s) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.translate(0, HUD);
  drawWorld(ctx, s);
  ctx.restore();
  if (s.mode === 'title') {
    drawTitle(ctx, s);
    return;
  }
  drawHud(ctx, s);
  if (s.mode === 'win') drawWin(ctx, s);
  if (s.mode === 'lose') drawLose(ctx, s);
}

// ---------------------------------------------------------------- shots

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
if (shotName) {
  stageShot(g, shotName);
  const frames = shotFrames(shotName);
  for (let i = 0; i < frames; i++) step(g, STEP);
  pinShot(g, shotName);
  g.frozen = true;
  draw(g);
}

// ---------------------------------------------------------------- input

function aimFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  g.aim.x = ((event.clientX - rect.left) * VIEW_W) / rect.width;
  g.aim.y = ((event.clientY - rect.top) * VIEW_H) / rect.height - HUD;
}

function keyDown(event) {
  const code = event.code;
  if (
    code === 'Space' ||
    code === 'Enter' ||
    code === 'ArrowUp' ||
    code === 'ArrowDown' ||
    code === 'ArrowLeft' ||
    code === 'ArrowRight' ||
    code === 'Tab'
  ) {
    event.preventDefault();
  }
  sound.unlock();
  if (event.repeat) return;

  if (code === 'Space' || code === 'Enter') {
    if (g.mode === 'title') {
      startRun();
      return;
    }
  }
  if (code === 'KeyR') {
    if (g.mode === 'play' || g.mode === 'win' || g.mode === 'lose') {
      startRun();
      return;
    }
  }
  if (g.mode === 'play' && !g.frozen) {
    if (code === 'Digit1') useTool(g, 0);
    if (code === 'Digit2') useTool(g, 1);
    if (code === 'Digit3') useTool(g, 2);
  }

  switch (code) {
    case 'KeyW':
    case 'ArrowUp':
      input.up = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      input.down = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      input.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      input.right = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      input.crouch = true;
      break;
    case 'KeyE':
      input.act = true;
      break;
    default:
      break;
  }
}

function keyUp(event) {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      input.up = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      input.down = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      input.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      input.right = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      input.crouch = false;
      break;
    case 'KeyE':
      input.act = false;
      break;
    default:
      break;
  }
}

window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);
window.addEventListener('mousemove', aimFromEvent);
window.addEventListener('mousedown', (event) => {
  sound.unlock();
  aimFromEvent(event);
  if (g.mode === 'title' || g.mode === 'win' || g.mode === 'lose') startRun();
});
window.addEventListener('blur', () => {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.crouch = false;
  input.act = false;
});

// ---------------------------------------------------------------- loop

let last = 0;
let acc = 0;

function frame(now) {
  if (g.frozen) return;
  if (!last) last = now;
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.2) dt = 0.2;
  acc += dt;
  let stepped = 0;
  while (acc >= STEP && stepped < 8) {
    step(g, STEP);
    acc -= STEP;
    stepped += 1;
  }
  if (stepped === 8) acc = 0;
  draw(g);
  requestAnimationFrame(frame);
}

if (!shotName) {
  draw(g);
  requestAnimationFrame(frame);
}

window.__velvet = {
  get state() {
    return g;
  },
  input,
  step: (n = 1) => {
    for (let i = 0; i < n; i++) step(g, STEP);
    draw(g);
  },
  draw: () => draw(g),
  start: startRun,
  restart: startRun,
  useTool: (index) => useTool(g, index),
  shot: (name) => {
    stageShot(g, name);
    const frames = shotFrames(name);
    for (let i = 0; i < frames; i++) step(g, STEP);
    pinShot(g, name);
    g.frozen = true;
    draw(g);
  },
  aim: (x, y) => {
    g.aim.x = x;
    g.aim.y = y;
  },
  dist,
};
