# VELVET HOUR — build brief (this file is the project context)

You are the maker of a small, original browser game for make.fun's "Make the best heist
game" bounty ($50, closes 2026-11-22T17:59Z). This repository is the entry. Build the whole
game here, in this session, and commit + push it. Never ask questions, never pay, never
print an API key, never run `makefun submit` — the parent session bundles and submits after
you finish.

Read this whole file before writing anything. It is the design and the acceptance test.

## How to work (read this twice)

- ACT, DO NOT PLAN. Every reply must contain at least one tool call that writes or checks a
  file. No long design notes, no character counting, no restating this brief: it is already
  the design. If you catch yourself reasoning past two short paragraphs, stop and write the
  next file.
- Write whole files with one `write_file` each, in the order of "Work order" below, and run
  the syntax gate after each stage. Play the game in the browser before moving on.
- The floor map below is verified: every one of its 19 rows is EXACTLY 40 characters. Do
  not recount it, do not "fix" it, do not edit a row. Feed it to your level builder as data
  and assert each row's length is 40.

## Hard rules (a violation loses the bounty)

- Every game file is written by you, in this session. Do not copy code from any other
  directory, repository, site or entry. Do not read `C:/Users/Kaz/makefun-bounties/tmp/` or
  any other entry under `C:/Users/Kaz/makefun-bounties/entries/`. The only files you may
  reuse verbatim are the kit copies already in this repository (LICENSE, serve.ts,
  vendor/makefun-game.ts).
- Zero network at runtime: every script, image, sound and font is a file under `game/` or a
  `data:` URI. No CDNs, no external fonts, no analytics, no source maps, no bundler, no npm.
- No build step. `game/index.html` must open and play from any static HTTP server, offline,
  in desktop Chrome.
- Do not run `makefun submit` yourself, and do not create the GitHub repository before the
  competition opens (it is open by the time this session runs, so creating it now is
  expected and required).

## What is already in the repository (leave as is)

- `LICENSE` — MIT, `SPDX-License-Identifier: MIT` first line, the kit's file.
- `serve.ts` — the kit's tiny static server: `node serve.ts --port 8099` serves `game/`.
- `vendor/makefun-game.ts` — the kit's dossier library, byte for byte. Do not edit it.
- `.makefun/owner.json` — the claim file with the payout wallet. Do not edit it.
- `.gitignore` — `out*/`, `__pycache__/`, `node_modules/`.

Everything else — `main.ts`, `game/`, `screenshots/`, `shots.json`, `README.md` — is yours
to write. At the very end, replace `AGENTS.md` with a short maker's note (what the game is,
the file map, how to run and shoot it). This file may stay as the design record.

## The game: VELVET HOUR

A screen-print noir museum heist, top-down 2D canvas, exactly 1280x720. One museum floor,
three connected rooms plus a service corridor and a crawlspace, ALL of it inside the single
frame: a 40x19 tile grid at 32 px (1280x608) under a 96 px HUD strip. No scrolling camera,
no zoom. The judge's first criterion is one frame that shows, at the same time, a room the
thief is crossing, guards with vision cones, security cameras, the loot target and the alarm
meter — so that frame is the game's normal play state, not a special mode.

The thief enters and leaves through the GALLERY's fire escape (bottom-left). The loot is the
MERIDIAN STAR, a jewel in a lit vitrine in the VAULT room (top-right). Take it, then get back
to the fire escape. Three routes:

1. MAIN HALL: gallery -> arch -> atrium -> vault door -> vault. Short, but two guards and two
   sweeping ceiling cameras own the atrium.
2. SERVICE CORRIDOR: gallery -> the left-edge corridor door (hold E 1.2 s; the door groans and
   pulls the nearest guard to it) -> the corridor -> the long top passage -> the vault's west
   door. Bypasses the atrium, costs time and noise.
3. VENT CRAWL: a one-tile crawlspace from the gallery ceiling, up the wall between gallery and
   atrium, east above the atrium, down into the vault's west side. Half speed, and no tool can
   be used inside it. Slow but blind to cameras.

### The floor (40 columns x 19 rows, tile 32 px). Legend for this map only:
`#` wall, `.` gallery floor, `,` atrium floor, `v` vault floor, `c` corridor, `~` vent duct,
`D` service door (shut until opened), `V` vitrine (solid), `P` atrium plinth (solid), `=` low
cover (walkable, hides a crouched thief), `X` fire-escape tile.

```
########################################
#cccccccccccccccccccccccccccccvvvvvvvvv#
#ccccccccccccccccccccccccccccDvvvvvvvvv#
#cc##########~~~~~~~~~~~~~~~~~vvvvvvvvv#
#cc##########~################vvvVVvvvv#
#cc##########~#,,,,,,,,,,,,,,#vvvVVvvvv#
#cc##########~#,,,,,,,,,,,,,,cvvvvvvvvv#
#cc##########~#,,==,,,,,,,,,,cvvvvvvvvv#
#cc##########~#,,,,,,,,,,,,,,###########
#cc##########~#,,,,,PPP,,,,,,###########
##D##########~#,,,,,PPP,,,,,,###########
#.............#,,,,,,,,,,,,,,###########
#.............c,,,,,,,,,,,==,###########
#...==....==..c,,,,,,,,,,,,,,###########
#.............#,,,,,,,,,,,,,,###########
#.............#,,,,,,,,,,,,,,###########
#.............##########################
######XX################################
########################################
```

- GALLERY x1..13 y11..16. Fire escape `X` at (6,17) and (7,17) on the outer wall; the thief
  spawns at (3.2,16.0); guard 1 patrols the long wall at y=15.
- ATRIUM x15..28 y5..15, the widest crossing; the plinth (20..22, 9..10); low cover at
  (17,7),(18,7),(26,12),(27,12) and in the gallery at (4,13),(5,13),(10,13),(11,13).
- VAULT x30..38 y1..7, vitrine at (33..34, 4..5); the jewel's point is the centre of that 2x2
  block, world (1088, 160). The fire-escape anchor is world (224, 560).
- SERVICE CORRIDOR x1..2 y1..10; service door at (2,10); TOP PASSAGE x3..28 y1..2; the vault's
  west arch at (29,1) and (29,2). Plain openings are two tiles tall.
- VENT x13 y3..10 plus y3 x13..29; its mouths are the gallery ceiling at (13,10) and the vault
  at (29,3)/(30,3). Half speed inside, tools refused there.
- Plain archways: (14,12) and (14,13) gallery->atrium; (29,6) and (29,7) atrium->vault.

### Vision, patrols, cameras

- Guard lantern cone: half-angle 0.42 rad, range 232 px, eye 5 px above the guard's feet. The
  cone is a raycast polygon against walls, so walls cut it hard. A guard sees the thief when
  the thief is inside the cone, inside range, and the straight segment is not blocked by a
  wall, the vitrine, the plinth, a shut door, a smoke disc, or (guards only) low cover while
  the thief is crouched. Cameras look over low cover.
- Guards (3), deterministic waypoint loops with dwell pauses:
  - GUARD 1: (3,15) <-> (12,15), speed 50 px/s, dwell 1.5 s, starts at (12,15).
  - GUARD 2: (17,6) -> (26,6) -> (26,13) -> (17,13) loop, speed 57, dwell 0.7 s, starts (17,6).
  - GUARD 3: (31,7) -> (37,7) -> (37,2) -> (31,2) loop, speed 47, dwell 0.9 s, starts (37,7).
- Cameras (3) on wall mounts, oscillating sweep, hard stop when a wall is within ~44 px:
  - CAM-1 at (15.2,5.2), base 0.92 rad, sweep ±0.55, period 7.4 s, range 268.
  - CAM-2 at (27.8,14.8), base -2.28, sweep ±0.55, period 8.6 s, range 262.
  - CAM-3 at (37.8,1.2), base 2.55, sweep ±0.55, period 7.9 s, range 252.
  Camera cone: half-angle 0.235 rad, drawn alarm red with a dashed edge and a blinking lens. A
  camera that sees the thief locks its heading onto him and its gain is 1.55x.
- Detection gain into the alarm: distance under 92 px -> 45/s, under 176 -> 22/s, else 10/s;
  halved while the thief crouches; zero with no line of sight.
- Guard reactions: after 0.9 s of continuous sight the guard STOPS and STARES for 1.1 s with a
  1.3x wider cone, then walks to the last-seen spot and searches for 3 s, then resumes. A coin
  lure pulls the nearest guard to the coin for 3 s instead.
- The caught moment must be fair: a guard's hand busts only after 0.35 s of continuous contact,
  so there is always a beat to break away. Being touched also spikes the alarm.
- ALARM 0..100, always visible. Stages: CALM (<40), WATCH (>=40: lantern cones 12% wider,
  patrol speed 1.15x), LOCKDOWN (>=75: cameras sweep faster, a searchlight starts sweeping the
  gallery from the fire escape at 20/s gain, and a klaxon sounds). At 100: BUSTED, lose. With
  nothing seeing the thief, the alarm decays 6/s after a 0.45 s grace.
- Tools, one key each, each use adds +6 alarm heat, disabled inside the vent:
  - `1` SMOKE (2 charges): a flat disc r=58 for 4 s at the thief (or just ahead of him) that
    cuts every sight line and every cone polygon through it.
  - `2` COIN (2 charges): thrown toward the mouse up to ~210 px; the nearest guard within 340
    px walks to it for 3 s.
  - `3` LOOP TAP (1 charge): freezes all cameras for 5 s (their cones go teal/dashed, no sight).

### The thief and the controls

- Circle body radius ~7, walk 152 px/s, crouch 74 px/s, vent 78 px/s (always visually crouched
  there). Collision against walls, vitrine and plinth, axis-separated so corners slide. Facing
  follows the last movement direction.
- WASD / arrows move, Shift crouches, E interacts, 1/2/3 use tools, mouse aims the coin, R
  restarts, Space/Enter starts. A 3 px cream rim on the body and a faint cream floor ring make
  the thief findable at a glance.
- E holds: the vitrine needs 1.5 s (within 58 px of world (1088,160)) and gives the jewel; the
  service door needs 1.2 s (within 50 px of world (80,336)) and opens with noise that pulls the
  nearest guard within 470 px; the fire escape wins instantly when carrying the jewel and
  within 52 px of world (224,560). Releasing E loses the progress.

### The look (original, obvious at a glance, cheap to PNG-encode)

Screen-print noir: flat fills, hard edges, per-tile hatching and halftone dots, no large radial
or diagonal gradients (they blow the 256 KiB image cap).
Palette: ink `#0a0e1a`, deep floor `#141a2e`, gallery `#1a2038`, atrium `#161d34`, vault
`#121a30`, corridor `#111727`, vent `#0b111e`, cream `#f4e8d0`, amber `#f0a25c`, teal
`#3fb6a8`, alarm red `#e0453a`, gold `#d9b26a`, gold light `#f7e2a8`, smoke `#8f97a8`.
- Walls are ink with cream lines on every face that meets a floor: that outline is what makes
  the plan legible at thumbnail size.
- Low cover is teal-hatched (it hides a crouched thief). The fire escape is teal. Danger is
  alarm red. The loot is warm gold.
- Draw vision cones as a halftone dot screen in the PURE palette colour (amber for lanterns,
  alarm red for cameras) over a very light wash, with a 3 px hard edge in the same colour and a
  dashed edge for cameras. The dot screen reads as a lit fan at a glance and keeps the colour
  crisp when the frame is shrunk. Camera hardware: a cream bracket, a dark housing, a blinking
  red lens, a teal LOOP tag while frozen.
- The vitrine: a 2x2 glass case with a cream frame, a gold inner line, an amber floor pool,
  "THE MERIDIAN STAR" in gold under it, and a faceted gold jewel with a four-point cream
  sparkle that pulses. Once taken, the case stands open and dark.
- The HUD strip: masthead "VELVET HOUR", "A SCREEN-PRINT MUSEUM HEIST", the objective line
  ("OBJECTIVE — TAKE THE MERIDIAN STAR" / "OBJECTIVE — REACH THE FIRE ESCAPE" in teal when
  carrying), the ALARM bar with the numeric value (0-100), three stage lamps CALM / WATCH 40 /
  LOCKDOWN 75 (the active lamp lit in its colour), the tool belt (three cells with key number,
  name, charges and pips), the clock (mm:ss) plus "FLOOR 3 · 01:12 AM".
- Title screen: the floor plan dimmed behind a masthead "VELVET HOUR" in a 92 px serif with an
  amber offset, "A SCREEN-PRINT MUSEUM HEIST", one line of controls, a START box, and "THREE
  WAYS IN. ONE WAY OUT." Start on Space/Enter/click.
- Win card over the getaway van (a flat cream van with amber headlight triangles slides in from
  the left): "THE MERIDIAN JOB" / "PAID", rows for TIME, PEAK ALARM, TOOLS UNUSED, WATCHERS MET,
  a big gold grade letter, and "R RUN IT AGAIN · CLICK AGAIN". Grade: time <=105/150/210 s ->
  3/2/1 points, peak <45/70/90 -> 3/2/1, unused charges (of 5) >=5/3/1 -> 3/2/1; S >=8, A >=6,
  B >=3, C otherwise.
- Lose card: "BUSTED", "SPOTTED BY GUARD 2" (or CAM-2, or EXIT SEARCHLIGHT — the watcher that
  filled the meter), "THE ALARM HIT 100 AND THE HOUSE CLOSED THE DOORS", a full red meter,
  "R RESTART · CLICK RESTART". Both cards restart on R or a click.

### Sound (WebAudio only, no files)

A low pulse whose tempo follows the alarm, footstep ticks while walking (none while crouched),
a servo whirr near a lens, tool pops, a klaxon at LOCKDOWN (and every ~2 s while it lasts), a
three-note jewel chime, a bust thud, and a getaway whoosh on the win card. Start the
AudioContext on the first real key press. Guard every call so a browser that refuses audio
never breaks the frame.

## Files — one job each, named for what they do (the judge reads this outline)

```
game/index.html        canvas, one thin page frame, the module script, an error catcher
game/styles.css        page frame, letterbox, cursor; no other UI in the DOM
game/js/main.js        boot, fixed 60 Hz loop, input, shot dispatch, window.__velvet handle
game/js/level.js       the floor plan: tiles, props, doors, routes, camera mounts, geometry
game/js/player.js      movement, crouch, collision, vent crawl, hold-to-act, carrying
game/js/guards.js      patrols, dwell, stare, search, lure, cone raycast, sight test, catch
game/js/cameras.js     sweep, wall stop, lock-on, sight test, loop freeze
game/js/alarm.js       meter, stages, gain/decay, LOCKDOWN searchlight, busted
game/js/tools.js       smoke, coin, loop tap: charges, effects, heat
game/js/render.js      every drawing call for the world (floor, walls, props, cones, actors)
game/js/hud.js         alarm meter, tool belt, objective, clock, title/win/lose cards
game/js/audio.js       WebAudio synth voices
game/js/shots.js       deterministic screenshot staging (the four shots below)
game/js/rng.js         seeded PRNG for grain/halftone, so a seed always paints the same frame
```

Plain ES modules with relative imports (`./level.js`). No bare specifiers, no imports from
outside `game/`. Nothing calls `Math.random`; all texture uses a seeded PRNG.

### Work order (do it in this order, so a cut-short build is still a game)

1. `game/index.html`, `game/styles.css`, `js/rng.js`, `js/level.js`, `js/player.js`, `js/main.js`:
   get the floor plan on screen and the thief walking with collision. Check it in the browser.
2. `js/guards.js`, `js/cameras.js`, `js/alarm.js`, `js/hud.js`: cones raycast, sight, meter, HUD.
   That is the frame the judge must see; check it.
3. `js/tools.js`, interactions (door, vitrine, fire escape), the win and lose cards, the title.
4. `js/audio.js` and art polish (props, sparkle, notices).
5. `js/shots.js` and the four screenshots, audited.
6. `README.md`, `main.ts`, commit, push, topics, the `AGENTS.md` maker's note.
After every stage: `for f in game/js/*.js; do node --input-type=module --check < "$f" || echo "BAD $f"; done`
is a fast syntax gate (it needs no package.json), then play in the browser.

## Screenshots (4 real renders, 1280x720 PNG)

Add `?shot=<name>&seed=7` staging in `shots.js` that puts the real game state where the frame
needs it (thief, guard phase, camera heading, alarm value), then steps the REAL update loop at
a fixed 60 Hz to an exact frame and freezes it. Reproducible from the seed. Write `shots.json`:

```
[{"name":"1-cover.png","query":"?shot=cover&seed=7"},
 {"name":"2-smoke.png","query":"?shot=smoke&seed=7"},
 {"name":"3-loot.png","query":"?shot=loot&seed=7"},
 {"name":"4-win.png","query":"?shot=win&seed=7"}]
```

Staging (tile coordinates are multiplied by 32 to world px; the canvas draws the world under a
96 px offset):

1. `cover` — the money shot. Thief at (18.4, 12.875) facing up-left, standing; GUARD 2 at
   (21.875, 13.4) facing -2.35 rad in the STARE state with stareT 0.2 and lastSeen null (so it
   does not move its head); CAM-1 heading 0.76 with sweep t -0.3; CAM-2 heading -2.42, t 0.4;
   GUARD 1 at (3.6,15.4) heading 0.1; GUARD 3 at (36.5,2.2) heading 3.0; alarm value 34; tools
   all full; simulate 6 frames with no input. The lantern cone must pass within a tile of the
   thief without seeing him, the red lens cone must cut the same atrium, and the lit vitrine with
   the jewel must sit in the top-right vault. All five elements in one frame.
2. `smoke` — thief at (17.5,13.4) facing the guard; GUARD 2 at (24.5,13.2) in STARE, heading at
   the thief; a live smoke disc at world (672, 425.6) r 58 life 4; alarm 56; tools smoke 1, coin
   2, loop 1; 6 frames. The cone must be visibly cut by the smoke, the tool belt showing the
   spent charge.
3. `loot` — vitrine already open and dark; thief at (34, 6.3) carrying the jewel, facing up,
   standing at the case; alarm 62; CAM-3 locked with its heading on the thief; GUARD 3 at
   (30.6,6.9) heading 3.0 in STARE; tools smoke 1, coin 2, loop 1; 6 frames. The camera cone
   closes on the thief and the alarm is past 60.
4. `win` — the real win card: scene win, winT 1.5, vitrine open, thief at the fire escape
   carrying, alarm 86, stats escapeTime 112, peak 52, watchers ["CAM-3","GUARD 3"], tools smoke 1
   coin 1 loop 1 (4 unused -> grade A). 0 simulated frames; draw once.

Take them with a static server and Edge headless (Chrome's own headless screenshot is the same
idea; this machine has Edge and no Chrome):

```
cd game            # or: node serve.ts --port 8099 from the repo root
"C:/Users/Kaz/AppData/Local/hermes/tools/youtube-venv/Scripts/python.exe" -m http.server 8099 --bind 127.0.0.1 &
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
  --hide-scrollbars --window-size=1280,720 --screenshot=C:/.../screenshots/1-cover.png \
  "http://127.0.0.1:8099/?shot=cover&seed=7"
```

Read each PNG back with pixels, never by eye (this model has no image input). Audit tool:
`C:/Users/Kaz/makefun-bounties/tools/shot_audit.py`, run with the venv python above:
`shot_audit.py screenshots/1-cover.png --grid 16x9 --tol 24 --expect amber=900,alarm=700,gold=120,cream=400`
It prints each palette class's share and a letter grid (a amber, r alarm red, g gold, c cream,
t teal). The cover's grid must show an amber cell at or touching the thief's cell, alarm-red
cells in the same rows, gold in the vault, and cream in the top HUD rows. If a letter is
missing, restage and retake — never paint an element just for the shot. Then check every file
with Pillow: <=262144 bytes, long side <=1280, short side >=480. If a PNG is too big, flatten
gradients in the renderer (never re-encode or edit the screenshot).

## Acceptance test — do this, for real, and fix what fails

1. `node --version` is 22.18+. `python -m http.server 8099` in `game/`. Open the game in the
   browser tool (bring the page to front first, or requestAnimationFrame stays throttled) and
   play with real key events: move, crouch, open the service door (hold E, watch the alarm and
   the nearest guard walk to it), step into a guard cone and watch the alarm climb, pop smoke,
   throw a coin and watch a guard follow it, tap the cameras, take the jewel (hold E at the
   vitrine), reach the fire escape and see the win card; restart and stand in a cone until 100
   to see the bust card with the watcher named. A win and a loss must both be reachable. Also
   verify the vent: half speed, tools refused, and that the duct connects gallery to vault.
2. Confirm the four PNGs and their checks; audit each one.
3. `rm -rf out; mkdir -p out; MAKEFUN_OUTPUT_DIR=out node main.ts`; confirm `out/game/`,
   `out/screenshots/`, `out/dossier.json`; run it twice and diff the two dossiers byte for byte
   (`cmp`). `out/` stays out of git.
4. Grep `game/` for `http://`, `https://`, `//cdn` and bare import specifiers: nothing may load
   remotely; every import is `./...` or `../...` inside `game/`.
5. Write `README.md` with the three live make.fun badges as images (no placeholder braces), each
   linking to `https://make.fun/bounty/best-heist-game-20261122-0559`:
   - `https://make.fun/badge/best-heist-game-20261122-0559.svg`
   - `https://make.fun/badge/best-heist-game-20261122-0559/djkaz97-cmd/best-heist-game-20261122-0559/rank.svg`
   - `https://make.fun/badge/best-heist-game-20261122-0559/djkaz97-cmd/best-heist-game-20261122-0559/reward.svg`
   plus a paragraph on the game and its art, the controls, the tools, the alarm, the three
   routes, and how to run it (`python -m http.server` in `game/`).
6. `git init -b main` if needed, `git add -A`, commit "Velvet Hour: a screen-print noir museum
   heist". Create the public repository `djkaz97-cmd/best-heist-game-20261122-0559` with the gh
   CLI (`C:/Users/Kaz/AppData/Local/Programs/gh/bin/gh.exe`), push, and set topics:
   `gh repo edit djkaz97-cmd/best-heist-game-20261122-0559 --add-topic makefun,ai-agents,bounties,growth`.
   Set the homepage to the make.fun bounty page.
7. Rewrite `AGENTS.md` at the end as a short maker's note. This file may stay as the design
   record.

## Hand-in order (important — a watcher may submit as soon as the entrypoint exists)

Build and test the game first. Take the four screenshots and audit them. Write `README.md`
and `main.ts` LAST, then commit and push immediately, then set the topics. A submit-watcher
script on this machine bundles and submits the entry when `main.ts` first appears, and it
picks the newest top-level agent session in this repository, so do not write `main.ts`
until the game and its screenshots are finished.

## Definition of done

- `game/` opens offline, plays start to finish, and the one frame of normal play shows the five
  elements.
- 4 screenshots, each < 256 KiB, real renders, the cover showing all five elements.
- `main.ts` writes `out/game/`, `out/screenshots/` and a byte-identical `out/dossier.json` on two
  runs.
- The repository is public, has the license, the claim file, the README badges, the topics, and
  one commit pushed to main.
- No network reference anywhere in `game/`; no build step; no borrowed code.
