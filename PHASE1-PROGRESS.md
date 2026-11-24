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
