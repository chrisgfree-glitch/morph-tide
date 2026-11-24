# Morph Tide Phase 1 progress (3D base)

Branch: `coding-guy/phase1` on private `chrisgfree-glitch/evo-back-to-eden`.
`main` is left untouched.

## Base tree

Chris asked for commit `20b4663` on `wip/paused-2026-11-21`. That commit was not
found in this box's git objects, on GitHub `evo-back-to-eden` (only `main`), or
in listed Origin repos (`sincerus-sirhcsiyxes` has no Morph Tide repo). The
cloud-agent transcript for `bc-a404b6c1` is an earlier 2.5D tree ending at
`b414acb`, not the 3D graphics branch.

The starting snapshot is `/workspace/morph-tide-d5025b6`: the newest complete
3D source on this box (Vite + Three.js, `world3d.ts` + `chunks.ts`, pointer
lock, volume-style `density`/`carve`/`fill`). It matches the Nov 21 9:20 AM PT
backup notes and production textures. Documented `20b4663` graphics (second
caustic octave, sun glint, light shafts, exposure 1.14, rock anisotropy 8)
are **not** in this snapshot and were not reconstructed.

Imported as `0466e63`. Useful 2.5D Phase 1 work from `/workspace/evo-game`
(`1ce3634`, `d9f26a4`) was ported only where it still applied (feel/audio).
Water and terrain shaders already included `<tonemapping_fragment>` and
`<colorspace_fragment>`.

## Checklist vs Steve's agreed list

| Item | Status | Notes |
| --- | --- | --- |
| Color-space fix | Done on this base (already present) | Terrain + water ShaderMaterials already output through tone-mapping and colorspace chunks. Renderer is ACES + sRGB, exposure 1.12. No extra shader change needed. |
| Hit / eat / evolve feedback | Done | Replaced `sin(time * 40)` shake with a 0.22s decaying punch plus low-frequency residual shake. Two-tone eat/evolve blips, louder hit, vibrate on hit/eat/dig/chop/mine/evolve/hurt/warn. Evolve purchases call `feel('evolve')`. |
| Dig / cut / break with evolved parts matched to material tiers | Done | Horns, crushing jaws, spade/claw arms, and digging feet now contribute to rock break time. Cutting jaws, teeth, and bladed arms contribute to chop time. Soft rock/soil can use dig parts or a horn; medium rock can be broken slowly with a lance-class horn and no breaker; hard/very rock and petrified wood still need the existing tool mk gates. |
| Persistent dig-and-build | Done | `carve`/`fill` already deformed the density field and remeshed dirty chunks. Saves now also store the carve map, column progress, node amounts, and bases in `localStorage` (`evo2.eden.v2`). Autosave every 8s, on hide/pagehide, and after evolve/build. Visual carve also happens when a dig column cell finishes or a rock node breaks. Tunnels persist in-session and across reloads on the same browser. Not synced to a server. |
| 20 wood / rock / hide + gems where data exists | Done | Catalog already had 20 trees, 20 rocks, 20 hides, 10 gems. The world now places all 20 tree kinds and all 20 rock kinds (deep-stone also remains in volcano columns). Hide drops use the hide table by biome and threat band. Gem drops already use each rock's `gem` pool and chance. |
| HUD contrast 4.5:1 and touch targets ≥ 44 CSS px | Done | HUD, buttons, and muted title subtext were lightened. Corner, Grow, and general buttons are at least 44px tall. Touch orbs were already ≥ 44px (52 / 86). Short-height layout keeps the 44px floor. |

## Known gaps

- `20b4663` itself could not be fetched, so later graphics polish is missing.
- Chunk meshes are a deforming heightfield over a density field, not a full
  Minecraft-style visible cave interior mesh. You can dig a depression or
  tunnel in the density and walk the new floor; side walls of deep tubes are
  only partly expressed by `groundAt`.
- Persistence is local to one browser profile, capped at 8000 carve cells.
- Local and live-preview smoke tests are recorded below. Real-phone play is still outstanding.

## Preview deploy

A first preview attempt with the Vercel CLI (`npx vercel --yes`, no `--prod`)
failed with `User not found`. Production was not promoted.

A second attempt on 2026-11-24 at 11:36 AM PT (America/Los_Angeles) used the
Vercel connector (`create_deployment` from Git, target omitted so it stayed
preview). That deployment is READY and is not protection-gated (HTTP 200,
no share token needed). Production was not promoted.

- Preview URL: https://evo-back-to-eden-k50cqwgqh-chrisgfree-5870.vercel.app
- Branch alias: https://evo-back-to-eden-git-coding-guy-phase1-chrisgfree-5870.vercel.app
- Deployment id: `dpl_AVEjJsygJkT3dYCyHbXXLKVB7Rrh`
- Deployed commit: `6d0b002` (`6d0b0026ad01530bbef81d3f9f28f1a11087f251`)
  on `coding-guy/phase1` (banner overlap fix)

## Local smoke (2026-11-22, America/Los_Angeles, afternoon)

`npm run check` and `npm run build` passed. Playwright (system Chrome +
SwiftShader) ran against a local `vite preview` at http://127.0.0.1:43123/:

- Desktop 1280×800: title, Solo start, WebGL canvas, HUD, no page errors.
  Screenshot: `/workspace/morph-tide-3d/smoke/desktop.png`.
- Phone portrait 390×844: start works; the existing rotate-to-landscape
  prompt covers play, as designed. Screenshot: `smoke/phone.png`.
- Phone landscape 844×390: start works; stick, Attack, Rise, Dive, Dig, and
  other orbs are visible and at least 44 CSS px. Screenshot:
  `smoke/phone-land.png`.

Not verified on a physical phone, and not verified: actual dig/cut/break
feel in a long play session, save/reload of a dug tunnel, or contrast
measurement with a WCAG meter (sizes and colors were checked in CSS and
bounding boxes).

Known visual issue from that local pass (banner overlapping Grow and the HP
line in landscape) was fixed in `6d0b002` and rechecked on the live preview.

## Live preview smoke (2026-11-24, 11:37 AM PT, America/Los_Angeles)

Playwright (system Chrome + SwiftShader) hit the live preview
https://evo-back-to-eden-k50cqwgqh-chrisgfree-5870.vercel.app :

- Desktop 1280×800: page loads (HTTP 200), title screen, Solo start, WebGL
  canvas, 3D shallows, HUD. Banner ("Shallows. Eat, then spend EP…") sits
  below the first-run hint and does not overlap Grow or the HP line.
  Screenshots: `smoke/preview-desktop-title.png`, `smoke/preview-desktop.png`.
- Phone landscape 844×390: same path works; stick, Attack, Rise, Dive, and
  other orbs are visible. Grow sits under the goal line; the hint and banner
  sit under Grow with a gap. No overlap with Grow or HP.
  Screenshots: `smoke/preview-phone-land-title.png`,
  `smoke/preview-phone-land.png`.

A `readPixels` sample of the default framebuffer was all zero on both sizes
(likely `preserveDrawingBuffer` is off). The screenshots show the rendered
seabed, fish, and plants, so the canvas is treated as visually confirmed.

Not verified: play on a physical phone, save/reload of a dug tunnel, a long
dig/cut/break session, or contrast measurement with a WCAG meter.

Other notes from this pass: the landscape title screen clips the "MORPH"
word at the top and the controller help at the bottom at 844×390. That was
not part of the banner fix and was not changed.

## Playable loop pass (2026-11-24, 11:51 AM PT, America/Los_Angeles)

Preview of `e63f059` is READY (not promoted to production, not protection-gated):

- Preview URL: https://evo-back-to-eden-6vkp0thx8-chrisgfree-5870.vercel.app
- Branch alias: https://evo-back-to-eden-git-coding-guy-phase1-chrisgfree-5870.vercel.app
- Deployment id: `dpl_Evaf7hjSJViyUcHuKVZo3qG6goVG`
- Commits on `coding-guy/phase1`: `81f0342`, `54a03c2`, `768c3e7`, `0fba6bc`, `e63f059`

What changed:

- Camera follows faster, pulls in on bite and dash, and probes the terrain so it
  does not clip underground.
- Eating and evolving have stronger hit-stop, particle bursts, and a rising EP /
  Evolved pop. Predators flash orange and pause before they lunge.
- The HUD walks the first minutes: Eat 5 fish, then Grow lungs, then Dig a den
  (a new cheap Lean-to built from 2 kelp).
- Bites, horns, and claws use per-part volumes. `?debug=hit` (or H) draws them.
- The Strand Colossus is a region gate, not a win overlay. Defeating it opens
  the inland.
- Stronger fog and sky color per zone, instanced bubbles, distinct tints on
  wood/rock nodes, and a 1.35 pixel-ratio cap on phones. ACES + sRGB were
  already on.
- The 844×390 title keeps MORPH on screen and can scroll to the help.

`npm run check` and `npm run build` passed, including new volume and gate tests.

### Live preview smoke

Playwright (Chrome + SwiftShader) against the unique preview URL:

- Desktop 1280×800 and phone landscape 844×390: load, Solo start, canvas, HUD
  goal “Eat 5 fish (0/5)”, banner does not cover Grow or HP.
  Screenshots: `smoke/preview-desktop-title.png`, `smoke/preview-desktop.png`,
  `smoke/preview-phone-land-title.png`, `smoke/preview-phone-land.png`.
- Scripted path: start, lunge-bite a shallows fish (eats 1/5, +4 EP), buy
  Basic lungs from Evolve, spend 2 kelp on a Lean-to (“Lean-to raised”).
  Screenshot: `smoke/preview-play.png`.

Not verified: play on a physical phone, camera collision in a deep dug tunnel,
a long hunt against a telegraphing predator, WCAG contrast, or a 100-player
world. The scripted eat used a close-up position, not only the natural lunge.

Known issues / leftover for next round:

- At 844×390 the last controller-help line still peeks under the fold; the
  title can scroll.
- The scripted play shot can leave Build and Pause open on top of each other
  (Escape after Evolve). Not a live-play blocker.
- Volcano traps, full 10-tier presentation, vines as a gather type, and
  server persistence for 100-player worlds are still later work.
- `20b4663` lighting (second caustic, sun glint, light shafts) is still missing.
- Terrain dig still unlocks at tier 3; the early den is the Lean-to build.
- Persistence is still local to one browser.

## Round 2: pad, building, camera, combat (2026-11-24, 12:06 PM PT, America/Los_Angeles)

Chris approved this pass on a voice call. Work stayed on `coding-guy/phase1`.
`npm run check` and `npm run build` passed (including place/refund/persist tests).

Preview of `7dadfd8` is READY (target omitted, not promoted, not protection-gated,
HTTP 200, `x-robots-tag: noindex`):

- Preview URL: https://evo-back-to-eden-p8klnx6nc-chrisgfree-5870.vercel.app
- Branch alias: https://evo-back-to-eden-git-coding-guy-phase1-chrisgfree-5870.vercel.app
- Deployment id: `dpl_6Am74pFZKK1S9apFgsvEZPb1Ke4Z`
- Commits on `coding-guy/phase1`: `73a8709`, `b3ec012`, `7dadfd8` (`d65f44a..7dadfd8`)

What changed:

- Xbox controller support through the Gamepad API, with button prompts while a
  pad is connected and menus are closed, and hot-swap with keyboard and touch.
- Valheim-style free-place building in an in-world tray that does not pause the
  sim: gather, pick a piece, green/red ghost, rotate, snap, place, pick up or
  move with a refund. Pieces persist in `evo2.eden.v2`.
- Camera orbit and zoom from mouse drag / right-drag, scroll, the right stick,
  and two-finger drag. The terrain probe and tighter bite/dash camera remain.
- Soft lock-on / aim assist, attack buffering, a wider combo window, sprint,
  dash with i-frames, a surface breach, and strafe when locked on.
- The 844×390 title keeps the controller help line on screen (help bottom
  376.7px in a 390px-tall viewport).

### Controller button map

| Input | Action |
| --- | --- |
| Left stick | Move (camera-relative) |
| Right stick | Orbit camera |
| RT | Bite (place in build mode) |
| LT | Horn / charge |
| A | Jump / surface breach (place in build mode) |
| B | Dash with i-frames (cancel build mode) |
| X | Dig, interact, or pick up a piece (refund) |
| Y | Enter / leave build mode |
| LB / RB | Rise / dive in play; cycle pieces in build mode |
| D-pad L / R | Cycle build pieces |
| D-pad U / D | Rise / dive in play; rotate in build mode |
| L3 | Sprint |
| R3 | Soft lock-on |
| Start | Pause / settings |
| Back / Select | Map |

Keyboard: WASD move, mouse or right-drag orbits, scroll zooms, click bites,
Shift sprint, Space jump, C or Ctrl dive, Q dash (or rotate in build), E
evolve (or rotate in build), F dig / pick up, B build, Tab or middle-click
lock-on, `[` / `]` cycle pieces, Esc pause (or leave build).

### Live preview smoke

Playwright (Chrome + SwiftShader) against the unique preview URL, at 1280×800
and 844×390:

- (a) Start, eat, evolve: Solo start, close-up scripted bite of one shallows
  fish (eats 1/5, +4 EP), Basic lungs bought from the Evolve UI. Passed both
  sizes. Screenshots: `smoke/preview-desktop-path-a.png`,
  `smoke/preview-phone-land-path-a.png`. Title shots:
  `smoke/preview-desktop-title.png`, `smoke/preview-phone-land-title.png`.
- (b) Gather, build, place, move, refund: a kelp node was present but the
  scripted F-gather did not add kelp, so 2 kelp were granted. Build mode
  opened the tray, placed a Lean-to (cost paid, shelter base attached), packed
  it with a refund, and placed it again. Passed both sizes. Screenshots:
  `smoke/preview-desktop-path-b.png`, `smoke/preview-phone-land-path-b.png`.
- (c) Fight with lock-on, dodge, and orbit: lock-on to a Tide fry, Q dash,
  orbit/zoom. Passed both sizes. Screenshots: `smoke/preview-desktop-path-c.png`,
  `smoke/preview-phone-land-path-c.png`.
- Gamepad stub (`navigator.getGamepads`): connection, the “Controller
  connected” toast, and the bottom button-prompt strip were verified with
  menus closed. Direct `pollPad` on the stub orbited from the right stick and
  set RT as bite. Screenshots: `smoke/preview-desktop-pad.png` (Pause still
  open from Escape-after-Evolve), `smoke/preview-desktop-pad-closed.png`.
  A physical Xbox pad was not used.

Not verified: play on a physical phone or a physical Xbox controller;
hot-swap with a real pad in hand; unassisted early-game bites (eat tests
still place the player on the jaw volume); gathering kelp from a world node
without granting the bag; a mid-place green ghost screenshot (after placing,
the next ghost is red when blocked, which is correct); save/reload of pieces
in a second browser session (unit tests cover snapshot persist); WCAG contrast.

Known issues / leftover:

- Escape while Evolve is open still opens Pause, because Escape does not close
  the evolve panel first.
- Unassisted start-of-game bites can still miss.
- Volcano traps, full 10-tier presentation, vines as a gather type, and
  server persistence for 100-player worlds are still later work.
- `20b4663` lighting (second caustic, sun glint, light shafts) is still missing.
- Terrain dig still unlocks at tier 3; the early den is the Lean-to.
- Persistence is still local to one browser.

### Crosswalk review

A review request was posted to Claude on the shared `chrisgfree-agents`
crosswalk as Coding Guy (Grok Bot), post `d1988v`, with the preview URL,
branch, commit range, and a summary. No reply arrived after waiting about two
minutes. Claude's seat on that crosswalk only answers while Chris has Claude
open, and it has no check-in routine, so feedback may land later.

## Round 3: Select, Pause, Save/Load, Quit, and production (2026-11-24, 2:54 PM PT, America/Los_Angeles)

Chris approved this pass, including the production push, in chat at 2:36 PM PT.
`npm run check` and `npm run build` passed, including a save/load round-trip unit test.

### Preview (tested before promote)

- Preview URL: https://evo-back-to-eden-3wj0vskbt-chrisgfree-5870.vercel.app
- Branch alias: https://evo-back-to-eden-git-coding-guy-phase1-chrisgfree-5870.vercel.app
- Deployment id: `dpl_DC5qcMjaE1YWgnjVsyoEHcUghfEx`
- Commit: `97dd1ed` (`97dd1ed2f7b92ae8e056254be7cbb3428279e6a3`) on `coding-guy/phase1`

### Production

`request_promote` on the tested preview returned HTTP 422 (unprocessable_entity). A new production deployment was created with `target: "production"` of the main merge, which has the same tree as `97dd1ed`. Ready at 2:54 PM PT. Env vars, protection, domains, and secrets were not changed.

- Production URL: https://evo-back-to-eden.vercel.app/
- Also: https://evo-back-to-eden-chrisgfree-5870.vercel.app
- Deployment id: `dpl_6ZSau8wE1jThwL3znCLEZXd738h7`
- Commit on `main`: `cbc796c` (`cbc796cd03f49a7aa5c3df2e75c2c115ab52ab8e`), a merge of `coding-guy/phase1` (`97dd1ed`) into `main`. The histories had no common ancestor; the merge keeps the Phase 1 3D tree. Asset `index-fz8nm3WI.js` matches the tested preview.

### What changed

- Escape, Start/Menu, and the HUD menu button open a small Select screen with Pause, Select, and Quit.
- Select opens Evolve. Escape (and B on a pad) closes Evolve, Pause, or the Quit prompt first, so Escape over Evolve no longer opens Pause.
- Pause has Resume, Save, and Load. Save writes the full `evo2.eden.v2` slot (now including position, health, eats, and the inland gate) and shows a “Saved” toast. Load restores it. Resume returns to play.
- Quit asks “Save before quitting?” with Save & Quit, Quit, and Cancel, then returns to the title screen. A leftover toast is cleared.
- Menus navigate with D-pad/stick + A/B, keyboard arrows + Enter, and 44px buttons.

### Preview and production smoke

Playwright (Chrome + SwiftShader) at 1280×800 and 844×390, first against the preview, then against https://evo-back-to-eden.vercel.app/ :

- Esc opens Select; Select opens Evolve; Esc closes Evolve back to Select (not Pause). Passed both sizes.
- Pause, Save (toast “Saved”), move/change EP and eats, Load restores the saved pose and counts (toast “Loaded”). Passed both sizes.
- Reload the page, Begin, then Load restores a manual save at x=33.5, 14 EP, 3 eats. After Begin the body can drift a few centimeters before Load snaps it back. Passed both sizes.
- Quit returns to the title (`playing` false, title visible). Passed both sizes.
- Paths (a) eat/evolve, (b) build/place/refund, (c) lock-on/dash/orbit: passed both sizes.
- Visible menu buttons are 44px tall on both sizes.

Preview screenshots: `smoke/r3-desktop-*.png`, `smoke/r3-phone-land-*.png`.
Production screenshots: `smoke/r3-prod-desktop-*.png`, `smoke/r3-prod-phone-land-*.png`.

Not verified: play on a physical phone or Xbox pad; unassisted early-game bites; WCAG contrast; a second-browser-profile save (unit tests and in-page reload cover the slot).

Known issues / leftover:

- After Begin, auto-swim can move the body a little before the player opens Load; Load still restores the saved pose exactly.
- Unassisted start-of-game bites can still miss.
- Volcano traps, full 10-tier presentation, vines as a gather type, `20b4663` lighting, and server persistence for 100-player worlds are still later work.
- Terrain dig still unlocks at tier 3; the early den is the Lean-to.
- Persistence is still local to one browser.


## Guppy fresh start and Valheim look (Nov 24, 2026)

Chris approved this pass in chat at 3:00 PM PT: start a new game as a tiny
guppy, give the shallows a Valheim look (not gritty Rust), and push it live.
Worked on `coding-guy/guppy-valheim` from current `main` (`1f29345`).

`20b4663` underwater lighting is still not in this repo or on GitHub
`evo-back-to-eden` (only the earlier import note at `0466e63`), so it was
skipped again rather than reconstructed.

A separate docs-only commit, `7c99f9e`, adds `docs/GAME-CONCEPT-5-LEVELS.md`
as Chris wrote it (five-level master concept). The file was not edited.

Decay, raids, the Apocalypse Tracker, and any Cloudflare server deploy were
out of scope and were not touched.

### What changed

- A new game (and Restart) spawns a tiny guppy: base tier, size 0.42, no grown
  parts, empty bag, 0 EP, a weaker bite (capped at 2), and a smaller body than
  the old 0.92 starter. Ten nearby fry and the first goal “Eat 5 fish (0/5)”
  keep the opening minutes clear. Steve's 10-tier spend ladder is unchanged.
- Existing `evo2.eden.v2` saves still load their size, parts, materials, EP,
  pose, and progress. An old 0.92 / spent-12 save does not get the guppy bite
  cap or shrink.
- Shallows look: light turquoise tinted water, soft depth fog that stays aqua
  (underwater background no longer punches through to a pale sky), additive
  light shafts from the surface, clustered mossy rocks with shape/scale/color
  variation, and instanced kelp with crossed blades, sway, height and color
  variation. Counts drop on mid/low quality for small screens (low: 7 rocks,
  27 kelp, 2 shafts; mid: 15 / 75 / 5; high: 25 / 168 / 8).

### Preview

`npm run check` and `npm run build` passed, including a new guppy + save
compatibility unit test. Preview (target omitted) of `56a07a2`:

- Deployment id: `dpl_HDQs4nHdmjBDzguuYtaog5LW9riU`
- URL: https://evo-back-to-eden-225i6p7uo-chrisgfree-5870.vercel.app
- Commit: `56a07a28c600448aac6c1d7f913b5c221ba1a770`

Playwright (Chrome + SwiftShader) at 1280×800 and 844×390:

- New game starts as a guppy (size 0.42, 0 spent/EP, empty bag, 10 nearby fry,
  goal Eat 5 fish). Passed both sizes.
- An existing mid-game save (size 0.92, spent 12, lungs 1, 18 EP, 2 stone,
  pose 42.5) loads unchanged on a fresh boot. Phone passed in the first run;
  desktop needed a fresh-browser retry after a `#solo` timeout on a second
  context, then passed.
- Select / Pause / Save / Load still work (Saved and Loaded toasts). Passed
  both sizes.
- Paths (a) eat/evolve, (b) build/place/refund, (c) lock-on/dash/orbit: B and
  C passed both sizes on the first run; A (evolve) passed, eat needed a closer
  mouth placement retry on desktop, then passed. Phone path A passed first try.
- Screenshots show turquoise water, kelp, and rocks. HQ captures (quality
  forced high/mid so SwiftShader's auto-downscale did not hide them):
  `smoke/r4-desktop-look-hq.png`, `smoke/r4-phone-land-look-hq.png`.

### Production

`main` was fast-forwarded from `1f29345` to `2d61ebe` and pushed. A production
deployment was created with `target: "production"` of that commit. The game
tree matches the tested preview (`56a07a2`); later commits are docs only.
Ready at 3:27 PM PT. Env vars, protection, domains, and secrets were not
changed.

- Production URL: https://evo-back-to-eden.vercel.app/
- Also: https://evo-back-to-eden-chrisgfree-5870.vercel.app
- Deployment id: `dpl_4KmQbDFKTEssuTvMvqKaKY1gbpBg`
- Commit on `main`: `2d61ebe` (`2d61ebed0a95ec5693c6a9309fa0ddbe3572ccab`)
- Tested game commit: `56a07a2` (`56a07a28c600448aac6c1d7f913b5c221ba1a770`)
- Docs: `7c99f9e` adds `docs/GAME-CONCEPT-5-LEVELS.md`; `2d61ebe` records
  Chris's 3:10 PM PT confirmations (25 hides/wood/rocks/gems, plus kelp/grass).

The same Playwright suite was re-run against production at 1280×800 and
844×390. Results matched the preview: new game is a guppy, mid-game saves
load unchanged (desktop old-save again needed a fresh-browser retry after a
second-context `#solo` timeout, then passed; phone passed first try),
Select/Pause/Save/Load work, paths B and C passed first try, path A evolve
passed and eat passed on a closer-mouth retry on desktop (phone first try).
HQ production look shots show turquoise water, kelp, and rocks:
`smoke/r4-prod-desktop-look-hq.png`, `smoke/r4-prod-phone-land-look-hq.png`.

Not verified: play on a physical phone or Xbox pad; unassisted early-game
bites without scripted mouth placement; WCAG contrast; whether light shafts
read clearly on a real GPU (they are present but subtle in SwiftShader
shots); live kelp gathering.

Known issues / leftover:

- Some rock faces still read dark under SwiftShader even after the brighten
  pass; lit faces show moss and stone color.
- The first-run hint can still say “You are a tiny guppy” after loading a
  mid-game save in a clean profile, until it is dismissed. The HUD correctly
  shows the loaded stage (e.g. Steelhead).
- Unassisted start-of-game bites can still miss.
- `20b4663` lighting was skipped (not on GitHub or in this repo).
- Decay, raids, the Apocalypse Tracker, and Cloudflare server deploys were
  not in this pass.
