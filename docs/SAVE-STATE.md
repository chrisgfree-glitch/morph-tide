# Morph Tide: Save State

_Last updated: 2026-11-25_

## Where things stand

- **Repo:** `chrisgfree-glitch/morph-tide`
- **Patches 1–4** are on the preview branch `coding-guy/claude-preview-patches` and are **not merged to `main` yet**.

## Playtest fixes (to do)

- [ ] **EP gain is too fast.** Slow down how quickly evolution points build up.
- [ ] **Lunges should scale with tail upgrades.** Lunge distance and speed should grow as the tail is upgraded.
- [ ] **Better part models.** Replace the current body-part meshes with better-looking ones.

## Meshy 3D models (in progress)

Made with Meshy: low-poly smart topology (`meshy-t2.5`, about 10k triangles) plus a `meshy-7` 2K PBR texture pass, exported as GLB for Three.js. Each costs about 15 credits.

| Model | Status | File |
|---|---|---|
| Piranha tier 1: baby (cute, no teeth) | Done | `models/piranha-tier1.glb` (4.5 MB) |
| Piranha tier 2: teen (fangs, angry brows, 4 dorsal spikes, red gill slashes) | Done | `models/piranha-tier2.glb` (7.0 MB) |
| Piranha tier 3: adult final form (gaping jaw, jagged fangs, 7 dorsal spines, spiked fins, scars) | Done | `models/piranha-tier3.glb` (7.9 MB) |
| Piranha tier 4: armored brute (bone face plate, back armor plates, double fangs, spiked jaw, torn fins, spiked tail) | Done | `models/piranha-tier4.glb` (9.5 MB) |
| Piranha tier 5: legendary abyss monster (navy scales, glowing cyan stripes, skull face, rows of teeth, spine crown, blade fins) | Done | `models/piranha-tier5.glb` (9.1 MB) |
| 13 creatures: krill, shrimp, sardine, snail, darter, squid-baby, squid-big, puffer, eel-blue, eel-electric, jelly-moon, jelly-fire, crab | Done | `models/creatures/*.glb` |
| 3 sharks: shark-reef, shark-hammer, shark-great | Done | `models/creatures/*.glb` |

The local model files are in `C:\Users\chris\Documents\Morph-Tide\models`. They are not in the repo yet.

Notes for using them:
- The materials load with metalness 1.0 driven by a texture. If they look too shiny or dark, set `material.metalness = 0` after loading.
- Each tier is slimmer than the one before but all are about 0.95 units long (tier 1 is 0.79 × 0.68 across, tier 3 is 0.44 × 0.35). Scale them up in-game so later tiers look bigger.
- Tier 3's eyes are painted red but have no emissive map. Add the glow in code (an emissive colour or bloom).
- The 2K textures make up most of the file size. Compressing them would shrink the downloads a lot.

## Next chunk: world building

- [ ] Reefs
- [ ] Kelp
- [ ] Pillar tunnels
- [ ] Small-fish caves
- [ ] Shell hiding (hide inside shells)
