# Morph Tide — Game Concept (Chris, voice call, Nov 24, 2026, 3:08 PM PT)

Status: master concept. Chris wants everything here built and functional over time.
Evolution is the core of the game. Build in phases; each phase needs Chris's OK and fits the weekly usage stop (hard stop 50%).

## Five levels (replaces / must reconcile with the current 10-tier ladder)
1. **Primordial soup — fish.** Water only. To reach land you need lungs AND a starter weapon: beak, horns, tusks, antlers, or mallet tail. Aquatic boss gates the level.
2. **Amphibian.** Mine, dig, build, and permanently change the environment (Minecraft-style). Up to 8 legs and 4 arms. Body shapes cost Evolution Points: small, large, giant, ginormous. Amphibian boss.
3. **Reptilian.** Gems are found ONLY by digging at the lowest depths. Gems are character upgrades socketed into skin, tusks, teeth, legs and arms (strength, carrying capacity, final evolution). Gems are NOT building materials. Gem socketing locked until this level or later.
4. **Bird.**
5. **Mammal — open-ended.** Anything, including aliens. Example forms: one Super Saiyan-style form, crystal-skinned, shadow form, insect swarm, stone golem, plasma being. Human form is an option.

## Five-by-five unlocks
- 25 jaws, released slowly: 5 per level across the 5 levels.
- Same 5-per-level pattern for fins and other fish/body parts (dorsal fins, horns, tusks, teeth, etc.).
- 25 body types.
- 25 hides (hair adds warmth). Note: Chris also said "20 hides" in the materials list — confirm 25 vs 20.

## Kills and crafting
- Kills yield hide and crafting materials, not just food/evolution points.

## Survival (Valheim-style)
- Cold and hot biomes; you need a matching body type (fur/hide for cold, etc.) to survive there.

## Materials and bases
- 25 rocks, 25 gems, 20 wood, 20 hides (see hides note above).
- Up to 25 base types.

## Raids and multiplayer
- Raids are PvP only (no NPC raid waves).
- Multiplayer is a separate, bigger pass: the Cloudflare shard server exists in the repo but is undeployed; saves are local only. Needs Workers Paid ($5/mo, Chris buys after Finance Guy OK), netcode, server-side bases, offline-raid protection, two-device testing.
- Keep existing rules: PvP is a world switch, attackers within two tiers (levels) of the defender, same-clan bites don't land.

## Aesthetic
- Valheim look: soft fog, light shafts, LIGHT turquoise water that clearly reads blue, varied unique rocks (not one copy-pasted shape), richly textured kelp forests.
- No decay mechanic. No gritty/Rust grade.

## Reconcile with what exists today
- shared/catalog.ts already has 20 trees, 20 rocks, 20 hides, 10 gems, jaws/teeth/horns/fins/tails/scales (incl. tusked boar jaw, sabertooth jaw), 12 defenses mk I–III, clans.
- Current progression is a 10-tier EP ladder (0,12,30,55,90,130,180,240,320,420) with a separate 20-step skin line; must map to 5 levels.
- Gems today are partly material-gated; move them to socketed upgrades.
- NPC raid waves exist today; per this concept raids become PvP only.
