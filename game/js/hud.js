// The strip at the top of the frame: masthead, objective, the alarm meter and
// its three stage lamps, the tool belt and the clock. Then the title sheet, the
// paid card and the busted card, all in the same screen-print ink.

import { VIEW_W, VIEW_H, HUD, WORLD_H } from './level.js';
import { stageOf, STAGE_NAMES, WATCH_AT, LOCKDOWN_AT } from './alarm.js';
import { unusedCharges } from './tools.js';
import { C, rgba } from './render.js';

const MASTHEAD = 'VELVET HOUR';
const SUBTITLE = 'A SCREEN-PRINT MUSEUM HEIST';

function text(ctx, str, x, y, font, color, align = 'left', spacing = 0, baseline = 'alphabetic') {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(str, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore();
}

function rule(ctx, x, y, w, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 1);
}

export function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** The grade the job earns: time, peak alarm and unused charges, three points each. */
export function gradeOf({ time, peak, unused }) {
  const t = time <= 105 ? 3 : time <= 150 ? 2 : time <= 210 ? 1 : 0;
  const p = peak < 45 ? 3 : peak < 70 ? 2 : peak < 90 ? 1 : 0;
  const u = unused >= 5 ? 3 : unused >= 3 ? 2 : unused >= 1 ? 1 : 0;
  const points = t + p + u;
  const letter = points >= 8 ? 'S' : points >= 6 ? 'A' : points >= 3 ? 'B' : 'C';
  return { points, letter, t, p, u };
}

function drawAlarm(ctx, g) {
  const value = Math.round(g.alarm);
  const stage = stageOf(g.alarm);
  const stageColor = [C.teal, C.amber, C.alarm][stage];
  text(ctx, 'ALARM', 690, 20, '700 8px Georgia, serif', rgba(C.cream, 0.55), 'left', 2.4);
  text(ctx, String(value).padStart(2, '0'), 688, 47, '800 21px Georgia, serif', stageColor, 'left');

  const bx = 740;
  const by = 38;
  const bw = 200;
  const bh = 9;
  ctx.fillStyle = rgba(C.cream, 0.12);
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = C.alarm;
  ctx.fillRect(bx, by, (bw * Math.min(100, value)) / 100, bh);
  ctx.strokeStyle = rgba(C.cream, 0.55);
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  for (let i = 1; i < 10; i++) {
    const tall = i === 4;
    ctx.fillStyle = rgba(C.cream, tall ? 0.7 : 0.22);
    ctx.fillRect(bx + (bw * i) / 10, by + (tall ? -3 : 1), 1, tall ? bh + 5 : bh - 2);
  }
  ctx.fillStyle = rgba(C.cream, 0.7);
  ctx.fillRect(bx + bw * 0.75, by - 3, 1, bh + 5);

  const names = [STAGE_NAMES[0], `${STAGE_NAMES[1]} ${WATCH_AT}`, `${STAGE_NAMES[2]} ${LOCKDOWN_AT}`];
  const xs = [958, 1012, 1088];
  for (let i = 0; i < 3; i++) {
    const on = stage === i;
    const col = [C.teal, C.amber, C.alarm][i];
    ctx.fillStyle = on ? col : rgba(C.cream, 0.12);
    ctx.fillRect(xs[i], 36, 5, 5);
    text(
      ctx,
      names[i],
      xs[i] + 9,
      42,
      '700 7px Georgia, serif',
      on ? col : rgba(C.cream, 0.35),
      'left',
      0.8,
    );
  }
  text(ctx, 'DETECTION', 958, 56, '700 6px Georgia, serif', rgba(C.cream, 0.28), 'left', 1.4);
}

function drawTools(ctx, g) {
  const cells = [
    { x: 20, w: 222 },
    { x: 250, w: 222 },
    { x: 480, w: 222 },
  ];
  const labels = ['SMOKE', 'COIN', 'LOOP TAP'];
  for (let i = 0; i < 3; i++) {
    const tool = g.tools[i];
    const cell = cells[i];
    const spent = tool.charges <= 0;
    ctx.strokeStyle = rgba(C.cream, 0.16);
    ctx.lineWidth = 1;
    ctx.strokeRect(cell.x + 0.5, 62.5, cell.w, 29);
    ctx.fillStyle = rgba(C.cream, 0.06);
    ctx.fillRect(cell.x, 62, cell.w, 30);

    ctx.strokeStyle = rgba(spent ? C.cream : C.amber, spent ? 0.3 : 0.85);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cell.x + 6, 67, 19, 19);
    text(ctx, tool.key, cell.x + 15.5, 81, '800 11px Georgia, serif', spent ? rgba(C.cream, 0.35) : C.cream, 'center');
    text(
      ctx,
      labels[i],
      cell.x + 33,
      77,
      '700 8.5px Georgia, serif',
      spent ? rgba(C.cream, 0.35) : C.cream,
      'left',
      1.2,
    );
    // charge pips
    for (let k = 0; k < tool.max; k++) {
      const on = k < tool.charges;
      ctx.beginPath();
      ctx.arc(cell.x + 37 + k * 12, 84, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = on ? C.amber : rgba(C.cream, 0.12);
      ctx.fill();
      ctx.strokeStyle = rgba(C.cream, on ? 0.75 : 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    text(
      ctx,
      `${tool.charges}/${tool.max}`,
      cell.x + cell.w - 8,
      82,
      '700 7.5px Georgia, serif',
      spent ? rgba(C.alarm, 0.9) : rgba(C.cream, 0.5),
      'right',
      0.8,
    );
  }
  text(
    ctx,
    'SHIFT CROUCH · E INTERACT · 1 SMOKE · 2 COIN · 3 LOOP · R RESTART',
    726,
    82,
    '700 8.5px Georgia, serif',
    rgba(C.cream, 0.48),
    'left',
    1.6,
  );
}

/** The always-on strip. */
export function drawHud(ctx, g) {
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, VIEW_W, HUD);
  rule(ctx, 0, 0, VIEW_W, rgba(C.cream, 0.07));
  rule(ctx, 0, HUD - 1, VIEW_W, rgba(C.cream, 0.32));

  // masthead
  text(ctx, MASTHEAD, 22, 42, '800 29px Georgia, serif', rgba(C.amber, 0.9), 'left', 1);
  text(ctx, MASTHEAD, 20, 40, '800 29px Georgia, serif', C.cream, 'left', 1);
  text(ctx, SUBTITLE, 22, 56, '700 7px Georgia, serif', rgba(C.cream, 0.5), 'left', 2.1);

  // objective
  text(ctx, 'OBJECTIVE', 330, 20, '700 8px Georgia, serif', rgba(C.cream, 0.5), 'left', 2.2);
  const carrying = g.player.carrying;
  text(
    ctx,
    carrying ? 'REACH THE FIRE ESCAPE' : 'TAKE THE MERIDIAN STAR',
    330,
    43,
    '800 16px Georgia, serif',
    carrying ? C.teal : C.cream,
    'left',
    1,
  );
  text(
    ctx,
    carrying ? 'BOTTOM-LEFT · THE VAN IS WAITING' : 'THE VAULT IS TOP-RIGHT · THREE WAYS IN',
    330,
    58,
    '700 8px Georgia, serif',
    rgba(C.cream, 0.4),
    'left',
    1.5,
  );

  drawAlarm(ctx, g);

  // clock
  text(ctx, fmtTime(g.time), 1260, 44, '800 18px Georgia, serif', C.cream, 'right', 0.5);
  text(ctx, 'FLOOR 3 · 01:12 AM', 1260, 60, '700 7.5px Georgia, serif', rgba(C.cream, 0.45), 'right', 1.4);

  drawTools(ctx, g);

  // the 16 px printer's margin under the world
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, HUD + WORLD_H, VIEW_W, VIEW_H - HUD - WORLD_H);
  rule(ctx, 0, HUD + WORLD_H, VIEW_W, rgba(C.cream, 0.2));
  text(ctx, 'THE MERIDIAN WING · FLOOR 3', 16, HUD + WORLD_H + 11, '700 7px Georgia, serif', rgba(C.cream, 0.35), 'left', 1.5);
  text(ctx, SUBTITLE, VIEW_W - 16, HUD + WORLD_H + 11, '700 7px Georgia, serif', rgba(C.cream, 0.35), 'right', 1.5);
}

// ---------------------------------------------------------------- sheets

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(7,10,18,${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawTitle(ctx, g) {
  dim(ctx, 0.7);
  ctx.fillStyle = rgba(C.amber, 0.9);
  ctx.fillRect(0, 92, VIEW_W, 2);

  const pulse = 0.5 + 0.5 * Math.sin(g.time * 2.2);

  text(ctx, MASTHEAD, 646, 304, '800 92px Georgia, serif', C.amber, 'center', 2);
  text(ctx, MASTHEAD, 640, 298, '800 92px Georgia, serif', C.cream, 'center', 2);
  text(ctx, SUBTITLE, 640, 342, '700 14px Georgia, serif', rgba(C.cream, 0.8), 'center', 7);

  rule(ctx, 470, 362, 300, rgba(C.cream, 0.3));

  text(
    ctx,
    'WASD MOVE · SHIFT CROUCH · E INTERACT · MOUSE AIM · 1 SMOKE · 2 COIN · 3 LOOP TAP',
    640,
    396,
    '700 10.5px Georgia, serif',
    rgba(C.cream, 0.65),
    'center',
    1.8,
  );

  ctx.fillStyle = 'rgba(10,14,26,0.75)';
  ctx.fillRect(520, 436, 240, 58);
  ctx.strokeStyle = rgba(C.amber, 0.5 + pulse * 0.5);
  ctx.lineWidth = 2;
  ctx.strokeRect(520, 436, 240, 58);
  ctx.strokeStyle = rgba(C.cream, 0.25);
  ctx.lineWidth = 1;
  ctx.strokeRect(524, 440, 232, 50);
  text(ctx, 'START', 640, 473, '800 22px Georgia, serif', C.cream, 'center', 5);

  text(ctx, 'THREE WAYS IN. ONE WAY OUT.', 640, 556, '800 13px Georgia, serif', C.amber, 'center', 5);
  text(
    ctx,
    'SPACE / ENTER / CLICK',
    640,
    580,
    '700 8px Georgia, serif',
    rgba(C.cream, 0.45),
    'center',
    2.5,
  );
}

function drawVan(ctx, g, x, y) {
  ctx.save();
  ctx.translate(x, y);
  // body
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(300, 20);
  ctx.lineTo(340, 34);
  ctx.lineTo(352, 68);
  ctx.lineTo(340, 96);
  ctx.lineTo(0, 96);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  // windscreen and door
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(300, 28);
  ctx.lineTo(330, 38);
  ctx.lineTo(340, 62);
  ctx.lineTo(300, 62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(C.teal, 0.9);
  ctx.fillRect(28, 34, 236, 8);
  ctx.fillStyle = rgba(C.ink, 0.9);
  ctx.fillRect(150, 52, 4, 38);
  text(ctx, 'MERIDIAN', 40, 82, '800 16px Georgia, serif', C.ink, 'left', 4);
  // wheels
  for (const wx of [72, 280]) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(wx, 98, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.arc(wx, 98, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx, 98, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  // headlight triangles
  ctx.fillStyle = rgba(C.goldLight, 0.75);
  ctx.beginPath();
  ctx.moveTo(352, 72);
  ctx.lineTo(470, 44);
  ctx.lineTo(470, 104);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.arc(348, 71, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWin(ctx, g) {
  dim(ctx, 0.66);

  const ease = Math.min(1, g.winT / 1.05);
  const vanX = -400 + 470 * (1 - Math.pow(1 - ease, 3));
  drawVan(ctx, g, vanX, 522);

  const cardX = 318;
  const cardY = 84;
  const cardW = 644;
  const cardH = 548;
  ctx.fillStyle = rgba(C.amber, 0.85);
  ctx.fillRect(cardX + 8, cardY + 8, cardW, cardH);
  ctx.fillStyle = 'rgba(10,14,26,0.97)';
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = rgba(C.cream, 0.85);
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2);
  ctx.strokeStyle = rgba(C.gold, 0.55);
  ctx.lineWidth = 1;
  ctx.strokeRect(cardX + 10, cardY + 10, cardW - 20, cardH - 20);

  text(ctx, 'THE MERIDIAN JOB', cardX + 44, cardY + 86, '800 34px Georgia, serif', C.cream, 'left', 1);
  text(ctx, 'PAID', cardX + 46, cardY + 112, '800 11px Georgia, serif', C.teal, 'left', 5);
  rule(ctx, cardX + 44, cardY + 128, cardW - 88, rgba(C.cream, 0.25));

  const unused = unusedCharges(g);
  const watchers = [...g.stats.watchers].filter((w) => w !== 'THE HOUSE');
  const peak = Math.round(g.stats.peak);
  const time = g.stats.escapeTime;
  const grade = gradeOf({ time, peak, unused });
  const rows = [
    ['TIME', fmtTime(time)],
    ['PEAK ALARM', String(peak)],
    ['TOOLS UNUSED', `${unused} / 5`],
    ['WATCHERS MET', watchers.length ? watchers.slice(0, 2).join(' · ') : 'NONE'],
  ];
  let ry = cardY + 176;
  for (const [label, value] of rows) {
    text(ctx, label, cardX + 44, ry, '700 8.5px Georgia, serif', rgba(C.cream, 0.5), 'left', 2.6);
    text(ctx, value, cardX + 300, ry + 1, '800 17px Georgia, serif', C.cream, 'right', 0.5);
    rule(ctx, cardX + 44, ry + 14, 256, rgba(C.cream, 0.1));
    ry += 62;
  }

  // grade stamp
  const gx = cardX + cardW - 158;
  const gy = cardY + 380;
  ctx.strokeStyle = rgba(C.gold, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(gx, gy, 66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rgba(C.gold, 0.25);
  ctx.beginPath();
  ctx.arc(gx, gy, 58, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, 'GRADE', gx, gy - 40, '700 8px Georgia, serif', rgba(C.cream, 0.55), 'center', 3);
  text(ctx, grade.letter, gx, gy + 30, '800 96px Georgia, serif', C.gold, 'center', 0);
  text(ctx, `${grade.points} / 9`, gx, gy + 56, '700 8px Georgia, serif', rgba(C.cream, 0.5), 'center', 1.5);

  text(ctx, 'R RUN IT AGAIN · CLICK AGAIN', 640, cardY + cardH - 36, '800 11px Georgia, serif', rgba(C.cream, 0.75), 'center', 2.4);
}

export function drawLose(ctx, g) {
  dim(ctx, 0.72);
  ctx.fillStyle = 'rgba(224,69,58,0.06)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const x = 268;
  const y = 138;
  const w = 744;
  const h = 404;
  ctx.fillStyle = rgba(C.alarm, 0.85);
  ctx.fillRect(x + 8, y + 8, w, h);
  ctx.fillStyle = 'rgba(10,14,26,0.97)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rgba(C.cream, 0.8);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

  text(ctx, 'BUSTED', 640, y + 118, '800 78px Georgia, serif', C.alarm, 'center', 6);
  text(ctx, 'BUSTED', 637, y + 114, '800 78px Georgia, serif', C.cream, 'center', 6);
  const who = (g.watcher || 'THE HOUSE').toUpperCase();
  text(ctx, `SPOTTED BY ${who}`, 640, y + 170, '800 18px Georgia, serif', C.cream, 'center', 2.4);
  text(
    ctx,
    'THE ALARM HIT 100 AND THE HOUSE CLOSED THE DOORS',
    640,
    y + 200,
    '700 9px Georgia, serif',
    rgba(C.cream, 0.55),
    'center',
    1.8,
  );

  const bx = 400;
  const by = y + 232;
  const bw = 480;
  const bh = 14;
  ctx.fillStyle = rgba(C.cream, 0.12);
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = C.alarm;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = rgba(C.cream, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  for (let i = 1; i < 10; i++) {
    ctx.fillStyle = rgba(C.ink, 0.55);
    ctx.fillRect(bx + (bw * i) / 10, by + 1, 2, bh - 2);
  }
  text(ctx, '100', bx + bw + 8, by + 12, '800 14px Georgia, serif', C.alarm, 'left', 0);

  text(ctx, 'R RESTART · CLICK RESTART', 640, y + h - 48, '800 12px Georgia, serif', rgba(C.cream, 0.8), 'center', 2.6);
  text(
    ctx,
    'THE NIGHT IS NOT OVER',
    640,
    y + h - 24,
    '700 8px Georgia, serif',
    rgba(C.cream, 0.4),
    'center',
    2.4,
  );
}

