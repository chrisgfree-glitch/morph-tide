# Morph Tide r8 — full-spec checklist

Status key: **done** · **partial** · **missing**

Audit of `coding-guy/evolve-redesign` at 75d6fd0, then updated as remaining items were finished. Nothing on this list is cut.

## Controls and Evolve shell

| Item | Status | Notes |
| --- | --- | --- |
| Phone on-screen controls are only Select, Pause, and swim up/down (joystick + camera drag stay; auto-bite on contact; dig is inside Evolve) | done | Top `#corner` row hidden. Xbox View opens Evolve; Start pauses. |
| Select opens a full E.V.O.-style Evolve menu: category, part, spend EP, live 3D preview (scales, plates, horns) | done | Compact top section; preview camera stays consistent across parts. |
| Skin tiers cost increasing EP; nothing unlocked by level | done | `tryBuy` has no tier/level gates. `landOk` also dropped the old tier-2 requirement. |
| Old saves convert to a guppy body with the matching skin, keeping EP | done | Save v4, `convertToGuppy`. |

## Parts catalog

| Item | Status | Notes |
| --- | --- | --- |
| Skins (10): Scales 10, Slime/Eel 20, Spiny Armor 35, Bony Plates 50, Bioluminescent Hide 70, Shark Leather 90, Blubber 115, Whale-tough 140, Orca 170, Magma Scale 200 | done | Stats and tags match the brief. Magma is the 10th skin. |
| Heads (10): fish Salmon, Pike, Angler (lure), Hammerhead, Swordfish Bill; amphibian Frog, Axolotl, Turtle, Horned Frog, Giant Salamander — each with a stat | done | Plus a free Guppy starter head. |
| Horns (5) with ranks I–III: Bone Nub (2), Coral Spike (4, bleed), Spiral Lance (6, ×2.5 at full speed, pierce), Hammer Crest (blunt, knockback, breaks rocks), Obsidian Trident (9, burn) | done | Purchase, I–III costs, sharpness, and preview were in. Combat now adds `hornDamage` on a horn/heavy hit and applies bleed, pierce, knock, burn, and rock-breaking. |
| Side fins (11) in the new cost order: (1) Fan, (2) Spiny Fin, (3) Dolphin Fin, (4) Lionfish Fin, (5) Shark Fin, (6) Manta Fin, plus unchanged Flying-fish Wings, Lobe, Mudskipper, Webbed Limbs, Salamander Legs | done | First six are the fish-branch pecs (Fan is the shared starter). Limbs live in the Limbs tab. Labels distinguish Spiny/Shark Fin from Spiny/Shark Dorsal. Manta is fastest; Dolphin is second. |
| Dorsals (5, back): Low Ridge, Spiny Dorsal, Sail, Shark Dorsal (fish), Newt Crest (octopus) | done | Placed on the back, not at the tail. |
| Rear Fins tab: Low Ridge Rear Fin, Spiny Rear Fin, Sail Rear Fin, Dorsal-style Rear Fin, plus stackable extra rear fins (up to 2, fish-only) for turn/acceleration, not the old +~4% speed | done | Placed low toward the tail. Webbed-limbs swap applies to extras. |
| Back armor: Plating and Bone Scales | done | New shared Evolve tab. Bone Scales and Plating sit on the back, distinct from the Bony Plates skin and from dorsals. |
| Tails (5) with attacks: Fan, Forked, Eel, Thresher (whip-stun), Barbed Salamander (slam) | done | All five now have a distinct tail attack in the sim, not only tags and a mesh. |

## Branches

| Item | Status | Notes |
| --- | --- | --- |
| Two branches that do not mix: FISH (fish-shaped, stackable extras) and OCTOPUS (soft body, arms, webbed limbs, land movement) | done | Menu Fish/Octopus buttons; 50% EP refund on branch-only parts when switching. |
| Taking webbed limbs requires swapping out the stackable extra rear fins, with a menu prompt | done | |

## World: sea

| Item | Status | Notes |
| --- | --- | --- |
| Varied, respawning prey even in level 1; area spawners, drifting counts, bloom swarms, generous respawns, instancing/pooling | done | World-wide sea spawners; instanced NPCs; far-NPC LOD. |
| Healing plants: green seafloor growth the player can eat to heal HP only (no EP), visible, world-spread, regrow on a timer | done | Instanced, emissive seagrass plus land berry bushes that also heal HP only. |
| Level 1 boss unlocks when Attack is strong enough (about a 15–20 minute build), not by EP or distance; “Attack X / Y to face the boss” meter in the HUD and Evolve; “Boss unlocked” + direction marker; boss in the shallows by the first shore so both branches can reach it | done | Attack = bite + horn sharpness, threshold 10. Coral Spike I, Spiny Fin + Bone Nub, a bite head + horn, Lance I, or Spiny Armor plus a little more all reach it. No landOk / x>128 gate for this fight. |

## World: land (required, last of this group; do not cut)

| Item | Status | Notes |
| --- | --- | --- |
| Land movement: octopus-branch creature with webbed limbs or salamander legs (and Mudskipper) crawls out and walks on shore | done | Lungs (10 EP, shared) also allow going ashore, with no level gate. Shore and Evolve say what is needed. |
| Land zone: plants, rocks, and twenty distinct procedural low-poly instanced trees (pine, fir, spruce, cedar, redwood, oak, maple, birch, aspen, willow, cottonwood, palm, cypress, mangrove, tree fern, cycad, ginkgo, baobab, dead snag, giant horsetail), plus varied rocks and ferns/grasses/shrubs/berry bushes | done | `LAND_TREES` length 20; unique geos and colors in `landflora.ts`. |
| Land prey and a predator | done | Shore crab, amber beetle, reed newt, dune lizard as land prey; Inland hunter and Plate brute as land predators (high bias, they chase). Distinct instanced shapes and tints. |

## Crafting (required, last item)

| Item | Status | Notes |
| --- | --- | --- |
| Light survival crafting: gather plants, wood from the 20 tree kinds, and rocks with bite or dig on land; materials go into inventory; Craft tab; 10–12 recipes; no hunger, durability, or base building | done | 12 recipes: Bark shield, Stone horn-tip, Leaf moisture wrap, Herb poultice, Twig nest, Thorn trap, Rock cairn, Moss lure, Stone charm, Log raft, Leaf camouflage, Freshwater gourd. |

## Out of scope (unchanged)

- No server, multiplayer, accounts, PvP, or subscription work.
- Never touch Vercel env vars, protection, or domains; never put secrets in files.
- Usage cap: stop at 80%; up to about 82% only to finish land movement.

## Playable-deploy gate

- [x] `npm run check` and `npm run build` green after the remaining-item pass.
- [ ] 3-path live test on desktop 1280 and phone landscape + portrait (play, Evolve, prey/heals, shallows boss).
- [ ] Merge to `main` and production deploy once that test passes.
- [ ] Re-test production.
