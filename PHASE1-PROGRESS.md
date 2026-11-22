# Morph Tide Phase 1 progress

Working tree: `/workspace/evo-game`. Remote: `chrisgfree-glitch/evo-back-to-eden`. No env vars or secrets were changed.

## Done

- **1. Water / caustics color space** — `1ce3634`. Custom `waterMat` / `causticMat` shaders run `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` after `gl_FragColor`.
- **2. Hit / eat / evolve feedback** — Replaced `sin(time * 40) * 0.12` (high-frequency X wobble) with a short decaying one-cycle camera punch (~0.22 s, low frequency). Hazard `world.shake` is now a slow ~1.3 Hz offset. `feel()` plays a stronger blip (two-tone eat / evolve) and calls `navigator.vibrate` on phone for hit, eat, dig/chop/mine, evolve, hurt, and warn. Live look is **not verified**.

## Next

- 3. Instance bubble meshes
- 4. Cheap early shallows shelter, plus making dig/cut/break feel like first-session verbs (see comparison)
- 5. Strand Colossus as a region gate (not `w.won`)
- 6. Light food buff (health / stamina, no starvation)
- 7. Tighter follow camera in bite / dash + simple collision probe
- 8. HUD contrast 4.5:1 and touch targets >= 44 CSS px
- Interactive terrain: persist dug columns and buildings in the save, and deform the 2.5D mesh when you dig (see below). Not a voxel volume in Phase 1.

Then: preview deploy, Playwright smoke at 1280x800 and 390x844, promote to production if the preview looks clean.

## Known issues

- Color-space and camera-feel changes are compile-time only so far; desktop and phone play are **not verified**.
- Digging, chopping, and building exist in sim data but are late-gated, barely visible, and not saved (details below).
- Do not add deferred rendering, SSAO, DoF, or a CubeCamera.

## Feature comparison: dig, cut, break, terrain, build

Chris wants digging, cutting (trees, etc.), and breaking objects with evolved body parts (different parts better against different materials and tiers) to be **core verbs**, and the environment to be **interactive**: terrain deforms, tunnels and caves stay, structures persist. Sourced notes only; gaps are marked.

### Core verbs (tool vs material)

| Source | Dig / cut / break | Specialized tools | Fit for Morph Tide |
|---|---|---|---|
| **Minecraft** | Official [about](https://www.minecraft.net/en-us/about-minecraft) / [How to Minecraft](https://www.minecraft.net/en-us/article/how-minecraft): punch a tree for wood, mine ores, craft tools, break and place blocks. Wiki [Gameplay](https://minecraft.wiki/w/Gameplay): most blocks can be mined by hand or with tools; some Survival blocks cannot be broken (bedrock, etc.). | Official how-to: some blocks need stronger tools than fists. A full hardness table was not fetched. | Strong template. This is the loop to borrow. |
| **Valheim** | Official [FAQ](https://valheim.com/faq/): gather resources; craft tools, weapons, armour; refine at workbenches, kilns, smelters, windmills. | A first-party per-material tool table was **not fetched**. | Supports gather-and-tool-craft at a high level; exact axe-vs-wood / pick-vs-ore numbers are unsourced here. |
| **E.V.O.: Search for Eden** | GameFAQs (MrTuvai): bite, tackle, horns, eat meat for EP; spend EP on jaws, horns, body, etc. Side-scrolling combat stages, not resource harvesting. | Body parts change combat stats (bite, defense, speed), not harvest multipliers. | Weak for dig/cut/break. Strong for eat-and-evolve, which Morph Tide already uses as the spine. |
| **Morph Tide (current code)** | The verbs exist: `digAt` + `digTick` on columns, `chopSeconds` on `tree` nodes, `cellSeconds` / breakers on `rock` nodes, gather on `mat` nodes. `BREAKERS` and `CUTTERS` each have `soft` / `med` / `hard` / `very` power. `TREES` have a `cls`. `ROCKS` have a `tier` that maps to those classes. | Matrix is real, but **late and thin**: digging needs tier 3 plus spade/claw/sickle/elephant parts; wood and hard rock mostly need tier 4 tools (`toolMk`); hard/very need higher mk. Shallows only spawn kelp gather nodes — mangrove, driftwood, and coral-rock exist in the catalog but are **not placed**. Only three dig columns, all in the volcano (`x` 184 / 192 / 198). | Partial. Good rules, not yet a first-session core verb. Soft sea/shore materials should show up early (item 4 and follow-ups). |

### Morph Tide trees vs cutters (how well each class is supported)

From `shared/catalog.ts` + `chopSeconds` in `shared/rules.ts`. Bare jaws can slowly cut only if `tier >= 4` or `size >= 1.5` or `bite >= 14` (power 0.45 with no cutter). Hard/very wood also needs a cutter and a high enough `toolMk`.

| Class | Trees in catalog | Placed in the current world? | Best-fitting cutters (highest class multiplier) | Can you cut it today? |
|---|---|---|---|---|
| soft | birch, palm, bamboo, willow, ferntree, cycad, ginkgo, driftwood | **palm** at x=94 only | beaver chisel 1.4, scythe 1.25, saw-tooth / tail bash / body ram 1.2–1.3 | Yes, once tier/size/bite gate is met; palm is on the shore, not in the shallows. Driftwood (sea, soft) is unused. |
| med | oak, pine, mangrove, cedar, cypress, kapok | **oak** at x=110 | sawnout / axe claws / gouge ~1.15–1.2; beaver drops to 1.0 | Oak is on the shore. Mangrove and cypress (sea) are unused. |
| hard | redwood, baobab, ironwood, ebony, bloodwood | **bloodwood** at x=174 (volcano) | axe claws 1.1, sawnout 1.15; needs `mk >= 2` or a cutter | Late-game only. |
| very | petrified wood (volcano) | not placed | sawnout 1.0; `mk >= 3` required | Catalog only; not in the live strip. |

Breakers follow the same pattern: shovel forelimbs are best on soft rock (1.5); pickaxe claws / drill / dome are better on med–very. Soft rocks (chalk, pumice, sandstone) are in the catalog but no soft rock node is spawned in the shallows.

### Terrain deformation and building (heightfield vs volume, persistence)

| Source | Terrain model | Building | Persistence | What a real dig-and-build world would take on phones |
|---|---|---|---|---|
| **Minecraft** | **Volume**: a 3D grid of cubes ([Gameplay](https://minecraft.wiki/w/Gameplay) wiki). Not a heightfield. | Official: the “ultimate building game” — craft and place blocks, shelters, redstone. | The player’s world is kept (official “your world”). Chunk size / load rules were **not fetched** in the study. | A full voxel volume (meshing, lighting, chunk streaming) is the expensive path in a browser on a phone. **Do not start this in Phase 1.** |
| **Valheim** | Official FAQ does **not** say whether terrain is a heightfield or a volume. Do not invent it. | Official FAQ: floors, walls, roofs, furniture; players build from fishing villages to castles. | Buildings are treated as lasting: world updates skip explored areas (~500 m) “to avoid ruining player-built structures.” | Unsourced terrain-sculpt details; borrow the *idea* of persistent bases, not an unsourced engine. |
| **E.V.O.** | Authored side-scrolling stages (GameFAQs). No sourced terrain deformation. | None sourced. | N/A | Not a model for dig-and-build. |
| **Morph Tide (current)** | **Hybrid, incomplete.** The visible ground is a static `ribbon()` mesh, a height strip `y = f(x)` built once in `paintWorld` and **never deformed**. Dig state is a 1D stack of layers per column (`Column.dug`) — closer to a 2D slice / layered heightfield than a voxel volume. Dug cells persist in `World.columns` **for the session only**. Tunnels are numbers, not a walkable or visible cave. | `buildAt` / `placeDefense` push into `w.bases` and `base.defs` at the player’s `x`. They last for the session in memory. | `save()` writes only the creature (`name`, `ep`, `spent`, `load`, `unlocked`, `bag`, `gems`, `clan`) to `localStorage`. **Columns, bases, and nodes are not saved.** A refresh wipes dens and digs. | **Phone-feasible path:** keep the 2.5D column/layer model along the authored strip (not Minecraft chunks). (1) Deform or swap column meshes when `dug` changes so tunnels are visible and stay. (2) Let the player walk/swim into dug space. (3) Place structures in that space. (4) Persist `columns` + `bases` in the save. Soft shallows columns (sand, mud, coral-rock) so digging starts in the first minutes. That is much cheaper than a 3D voxel world and stays off deferred / SSAO / DoF / CubeCamera. |

### Implication for the rest of Phase 1

Item 4 (early shallows shelter) should also put a soft, early gather/dig/cut target in the water (kelp is already there; driftwood or coral-rock and a shallow sand column are not). A later checkpoint should persist bases and columns and visually deform dug terrain. Full voxel chunks stay out of Phase 1.
