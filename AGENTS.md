# Task: VELVET HOUR — best-heist-game-20261122-0559 entry (make.fun, $50, closes 2026-11-22T17:59Z)
# make.fun BUNDLE mode. Build the whole entry, git commit + push here. Never ask questions, never pay,
# never print API keys. Do NOT run makefun submit: the parent session bundles and submits after you finish.

You are the maker of a small original browser game. Work in C:/Users/Kaz/makefun-bounties/entries/best-heist-game-20261122-0559 (this repository, empty except
.git and AGENTS.md). The kit is at C:/Users/Kaz/makefun-bounties/best-heist-game-20261122-0559-kit/best-heist-game-20261122-0559-kit: read C:/Users/Kaz/makefun-bounties/best-heist-game-20261122-0559-kit/best-heist-game-20261122-0559-kit/RULES.txt FULLY first, then C:/Users/Kaz/makefun-bounties/best-heist-game-20261122-0559-kit/best-heist-game-20261122-0559-kit/starter/
(main.ts, shots.json, vendor/makefun-game.ts).

GitHub repo to push to: djkaz97-cmd/best-heist-game-20261122-0559 (public). gh CLI: C:/Users/Kaz/AppData/Local/Programs/gh/bin/gh.exe

HARD RULES (a violation loses the bounty)
- Never read files from another entry's directory under C:/Users/Kaz/makefun-bounties/entries/ other
  than this one, and never copy code from the internet. All game code is yours, written here, now.
- Only C:/Users/Kaz/makefun-bounties/best-heist-game-20261122-0559-kit/best-heist-game-20261122-0559-kit/vendor/makefun-game.ts is copied verbatim (the rules require that exact file). Every
  other file of the entry you write yourself in this session.
- Zero network at runtime: every script, image, sound and font is a file under game/ or a data: URI.
- No build step. game/index.html must open and play from any static server, offline, desktop Chrome.
- Do not add analytics, external fonts, CDNs, source maps or a bundler.

THE GAME: "Velvet Hour" — a screen-print noir museum heist, top-down 2D canvas, 1280x720.
Design target: the judge's first criterion is ONE frame of a real game that shows, at the same time,
a room the thief is crossing, guards with vision cones, security cameras, the loot target and the
alarm meter. Make that frame the game's normal play state, not a special mode.

Layout: one museum floor, three connected rooms plus a service corridor, ALL of it inside the single
1280x720 frame — no scrolling camera, no zoom. Use a 40x19 tile grid at 32 px (1280x608) under a 96 px
HUD strip, so every room, every guard cone, every camera and the alarm meter are on screen at once;
that is what the first criterion asks for.
- GALLERY (entry, bottom-left): the fire-escape exit door is here; a guard patrols the long wall.
- ATRIUM (centre): two sweeping ceiling cameras, the widest crossing, marble floor with a central
  display plinth. Two guards pass through on different rhythms.
- VAULT ROOM (top-right): the loot target — the "Meridian Star", a jewel in a lit vitrine — and the
  third camera. A guard walks the vault corridor.
- SERVICE CORRIDOR (left edge, narrow): a shortcut that bypasses the atrium, but the door takes 1.2 s
  to open and makes noise that pulls the nearest guard. The vent crawl (crawlspace between gallery
  and vault) is slow (half speed) and tools cannot be used inside it. Three routes is the depth goal:
  main hall, corridor, vent.

Thief: WASD/arrows to move, Shift to crouch (slower, halves detection gain, kills footstep noise),
E to interact (hold 1.5 s at the vitrine to take the jewel; E at the fire escape to leave once you
have it). The thief is a small figure with a cream rim-light so it reads on a dark floor.

Guards (3): deterministic waypoint patrols with dwell pauses; each carries a lantern that casts a real
vision cone (polygon raycast so walls cut it). A guard sees the thief when the thief is inside the cone,
within range, and the segment is not blocked. Detection fills the alarm; when it does, the guard stops
and stares, widening its cone, then walks to the last-seen spot and searches (3 s) before resuming.
A guard touching the thief is an instant bust, but only after a 0.35 s grace on entering the cone so
the caught moment is always fair (you always get a beat to break line of sight).

Cameras (3): wall mounts with sweeping cones (oscillating heading, hard stop at walls) drawn in alarm
red with a dashed edge and a small blinking lens. They sweep faster as the alarm rises; a camera that
sees you locks its cone on you and the alarm climbs fast.

Alarm meter (0-100), always visible in the HUD with three stage lamps: CALM, WATCH (40), LOCKDOWN (75),
and a BUSTED state at 100 (lose). Gain per second scales with distance (close 45, mid 22, far 10),
halved while crouched, zero when no line of sight. When nothing sees you it decays slowly (6/s) so a
clean player recovers. Stage effects: WATCH widens cones and speeds patrols 15%; LOCKDOWN speeds
cameras and adds a searchlight sweep from the exit door. Loss = alarm 100 or a guard's hand.

Tools at a cost (bottom-left tool belt, one key each, each use adds +6 alarm heat):
- 1: smoke pellet (2 charges) — a flat smoke disc for 4 s that blocks all sight lines through it.
- 2: coin (2 charges) — lure: the nearest guard walks to the coin for 3 s.
- 3: loop tap (1 charge) — freezes all cameras for 5 s.
Win: take the jewel, then reach the fire escape. Win card grades the run (time, peak alarm, tools
unused, grade S/A/B/C) and pays it off: the getaway van slides in with headlights and the card reads
"THE MERIDIAN JOB PAID" with the stats. Lose card names the watcher that caught you ("BUSTED —
spotted by CAM-2" / "GUARD 1"), shows the alarm at 100 and offers R to restart. Both cards restart on R
or a click. Title screen: the floor plan behind a masthead, "VELVET HOUR", one line of instructions,
START. Every screen is the same canvas: no DOM overlays except a thin page frame.

LOOK (original, obvious at a glance, and cheap to PNG-encode — this matters):
- Screen-print noir: deep indigo floor #141a2e, ink walls #0a0e1a with cream #f4e8d0 outlines, warm
  amber #f0a25c for guard lanterns and safe pools of light, teal #3fb6a8 for safe cover and the exit,
  alarm red #e0453a for camera cones and the meter. Loot: a faceted jewel in cream/gold with a
  four-point sparkle, halftone dot pattern and fine diagonal hatching only.
- Do NOT paint large radial or diagonal gradients across the frame (they blow the 256 KiB PNG cap).
  Flat fills, hard edges, small highlights, per-tile hatching. Aim for under ~210 KiB per screenshot.
- Readability first: walls cream-lined, cover teal-hatched, danger red, loot warm gold. The floor plan
  must be legible at a glance when shrunk to a thumbnail. Draw every vision cone with a 2 px edge in its
  pure palette colour (amber #f0a25c for lanterns, alarm red #e0453a for cameras) over the soft fill:
  the crisp edge reads at thumbnail size and gives the pixel audit a clean signal. The thief carries a
  3 px cream rim, the jewel is pure gold with a cream sparkle, and the alarm meter's filled bar is
  amber turning alarm red at the top stage.

SOUND: all WebAudio oscillators, no files. A low pulse whose tempo follows the alarm, footstep ticks,
camera servo whirr near the lens, tool pops, a klaxon at LOCKDOWN, a jewel chime, and a getaway
whoosh on the win card. Audio starts on the first key press (browser autoplay rules).

FILES — one job each, named for what they do (the judge reads the outline; this is criterion 5):
  game/index.html        canvas, HUD frame, module script, nothing else
  game/styles.css        page frame, letterbox, HUD type, cursor
  game/js/main.js        boot, fixed-timestep loop, input dispatch, shot staging via ?shot=
  game/js/level.js       the floor plan: tiles, props, routes, patrol routes, camera mounts, spawn
  game/js/player.js      movement, crouch, collision, interaction, carrying the jewel
  game/js/guards.js      patrols, cone raycast, sight test, search behaviour
  game/js/cameras.js     sweep, lock-on, sight test
  game/js/alarm.js       meter, stages, gain/decay, stage side effects, busted
  game/js/tools.js       smoke, coin, loop tap: effects, charges, heat
  game/js/render.js      every drawing call: floor, walls, props, cones, smoke, entities, HUD
  game/js/hud.js         alarm meter, tool belt, objective line, title/win/lose cards
  game/js/audio.js       WebAudio synth voices
  game/js/shots.js       deterministic screenshot staging (see below)
  game/js/rng.js         seeded PRNG for grain/halftone so a seed always paints the same frame
Keep modules plain ES modules with relative imports ("./level.js"). No bare specifiers, no imports
outside game/.

SCREENSHOTS (4, 1280x720 PNG, the maker's own renders, never edited):
Add ?shot=<name> staging in shots.js that steps the REAL update loop at a fixed 60 Hz from a fixed
seed to an exact game time and then freezes the frame, so a shot is reproducible. Write shots.json:
  [{"name":"1-cover.png","query":"?shot=cover&seed=7"},
   {"name":"2-smoke.png","query":"?shot=smoke&seed=7"},
   {"name":"3-loot.png","query":"?shot=loot&seed=7"},
   {"name":"4-win.png","query":"?shot=win&seed=7"}]
- 1-cover.png is the money shot: thief mid-step in the ATRIUM, one guard's amber cone sweeping within
  a tile of him, a red camera cone cutting across the same frame, the open vitrine with the jewel
  glowing at the top-right of the frame, and the alarm meter at ~35 with its lamps lit. All five in
  one frame, all readable at thumbnail size.
- 2-smoke.png: a smoke pellet popped between the thief and a staring guard, the guard's cone cut by
  the smoke, tool belt showing remaining charges.
- 3-loot.png: the thief at the vitrine, jewel in hand, alarm climbing past 60, a camera cone closing.
- 4-win.png: the getaway card with stats and grade over the van's headlights.
Take them with browser_exec against a static server (python -m http.server 8099 in game/, or a
throwaway node server), viewport 1280x720, deviceScaleFactor 1. If browser_exec cannot be used, fall
back to Chrome's own headless screenshot: chrome --headless=new --disable-gpu --window-size=1280,720
--screenshot=C:/.../screenshots/1-cover.png "http://localhost:8099/?shot=cover&seed=7".

You cannot look at images: vision_analyze fails on this model (HTTP 400 unsupported modalities), so
read each frame through its pixels instead, with the audit tool already in the workspace:
  C:/Users/Kaz/AppData/Local/hermes/tools/youtube-venv/Scripts/python.exe C:/Users/Kaz/makefun-bounties/tools/shot_audit.py screenshots/1-cover.png --grid 16x9 --tol 24 --expect amber=900,alarm=700,gold=120,cream=400
It prints each palette class's pixel share and bounding box plus a coarse grid where letters mark what
dominates a cell (a amber, r alarm red, g gold, c cream, t teal). For the cover the grid must show an
'a' cell touching the thief's cell (the guard's lantern cone in frame), an 'r' run in the same rows
(a camera cone crossing the frame), a 'g' cluster in the vault-room cell (the jewel), and 'c' in the
top rows (the alarm meter's cream type and lamps). If a letter is missing, change the shot staging —
camera centre, thief position, guard phase, alarm value — and retake; do not paint elements for the
screenshot alone, the shot must be the real play state. Verify each
file with Pillow:
size <= 262144 bytes, long side <= 1280, short side >= 480. If a PNG is too big, flatten a gradient
in render.js and retake it — never re-encode or edit the screenshot.

HAND-IN (exactly as the rules require)
- main.ts at the repository root: Node 22, standard library only, copies game/ and screenshots/ into
  MAKEFUN_OUTPUT_DIR (default /output) and writes dossier.json with buildDossier from
  vendor/makefun-game.ts using the gate's caps (text_max_bytes 163840, screenshots max 4 /
  262144 bytes, game_max_files 993, game_max_bytes 50331648, game_path_max_bytes 1000). Model it on
  C:/Users/Kaz/makefun-bounties/best-heist-game-20261122-0559-kit/best-heist-game-20261122-0559-kit/starter/main.ts but write it in your own words.
- Copy C:/Users/Kaz/makefun-bounties/best-heist-game-20261122-0559-kit/best-heist-game-20261122-0559-kit/vendor/makefun-game.ts to vendor/makefun-game.ts unchanged, and
  C:/Users/Kaz/makefun-bounties/best-heist-game-20261122-0559-kit/best-heist-game-20261122-0559-kit/starter/serve.ts to serve.ts unchanged for local `node serve.ts` (a kit file, so byte for byte).
- LICENSE: MIT text with the line `SPDX-License-Identifier: MIT` at the top.
- .makefun/owner.json: {"wallet": "5bUR9FL3rTeevwqZC97oH7agHyQqJD9H6C2jW4DGcLUk"}
- .gitignore: out*/, __pycache__/, node_modules/
- README.md: title, the three live make.fun badges for this competition with owner djkaz97-cmd and
  the repo name from djkaz97-cmd/best-heist-game-20261122-0559, a paragraph on the game and its art, controls, tools, alarm, routes,
  and how to run it (python -m http.server in game/). No placeholder braces in the badge URLs.

VERIFY BEFORE YOU FINISH (real runs, not assumptions)
1. node --version; serve game/; open it with browser_exec; play with real key events: move, crouch,
   open the corridor door, trigger a guard cone and watch the alarm climb, pop smoke, throw a coin,
   tap the cameras, take the jewel, reach the exit. Confirm a WIN is reachable and a LOSS is
   reachable (stand in a cone until 100). Fix what is broken and retest.
2. Screenshots: 4 files, the checks above, and look at each one — the cover must show all five
   elements. Retake if not.
3. Hand-in: rm -rf out; mkdir -p out; MAKEFUN_OUTPUT_DIR=out node main.ts; confirm out/game/,
   out/screenshots/ and out/dossier.json exist; run it twice and diff the two dossiers byte for byte.
4. Grep game/ for http://, https://, //cdn and bare import specifiers: nothing may load remotely.
5. git init -b main if needed, git add -A, commit "Velvet Hour: a screen-print noir museum heist",
   then push to djkaz97-cmd/best-heist-game-20261122-0559 (create it public with gh repo create --source . --push if it does not
   exist), and set topics: gh repo edit djkaz97-cmd/best-heist-game-20261122-0559 --add-topic makefun,ai-agents,bounties,growth.
   Keep out/ and any test output out of the commit.
6. Rewrite AGENTS.md at the repo root in your own words as a short maker's note (what the game is,
   the file map, how to run and shoot it). Do not keep this task brief verbatim.

Work steadily and revise files as you test: at least two rounds of edits on the game after you first
play it. Finish with a short report: commit sha, repo URL, file list, what you played, screenshot
sizes, and anything you could not finish.
