# Morph Tide

A side-view evolution game with rounded bodies, natural hide colors, and warm daylight. You start in a tide pool, spend Evolution Points on body parts, and the creature mesh changes as you buy them. The same catalog drives NPC growth, digging, raids, and the shard server.

This is an original game. No assets or names are taken from other evolution games.

## Play locally

```bash
npm install
npm run dev
```

Open the printed URL. `npm run build` writes a static `dist/` for Vercel. `npm run check` proves a tier-7 digger can crack deep stone and that raid waves obey the tier rules.

## Controls

| Action | Key | Touch, landscape |
| --- | --- | --- |
| Move | WASD. Mouse looks (click the world to capture it) | Left stick: forward, back, strafe. Drag the right side to look |
| Rise / jump | Space | Look upward while swimming, or the stick while you hold forward |
| Dive | Shift or C | Look downward in the water |
| Hop | W, Space, Up | Stick up on land |
| Bite | Click, or J | Large corner button |
| Dash | | Arc button, short cooldown |
| Tail or horn lunge | | Arc button, bites as it lunges |
| Dig, or gather when a node is close | F dig, G gather | One arc button |
| Build | B | Arc button |
| Evolve | E | Small top button |
| Pause | Esc | Small top button |
| Fullscreen | | Full, then landscape lock where the browser allows it |

Play is wider than it is tall. A portrait phone shows a rotate prompt. The canvas fills the screen, and a landscape camera keeps the creature large while showing more shore to either side. Holding a control does not select text or open the long-press menu.

Tier 1 cannot leave the water. Buy the tier-1 jaws, teeth, fins, and tail, and the spent EP total crosses into tier 2. Basic lungs are the land ticket. The shore is mean on purpose: crabs and beetles are beatable, the inland hunters are not until you have spent more.

## Tiers

Spent EP sets the tier: 0, 12, 30, 55, 90, 130, 180, 240, 320, 420.

| Tier | What opens |
| --- | --- |
| 1 | Water only. First jaws, teeth, horns, fins, tail shapes, camo, lure, spines, ink, barbels, basic scales |
| 2 | Basic lungs and the first steps onto land |
| 3 | Digging, if you also have a spade, claw arms, or claw / sickle / elephant feet |
| 4 | All 10 rock breakers and all 10 wood cutters (mk I) |
| 5 | Arms, first wing pairs (up to 2), plates, wing styles |
| 6 | Breaker/cutter mk II, more wings (up to 4) |
| 7 | mk III, deep stone, more wings (up to 6) |
| 8 | Apex size, seventh wing pair |
| 9 | Abyss lungs, eight wing pairs |
| 10 | One gem specialization |

Skin is a separate 20-step hide, bought from Evolve → Skin. It spends DNA (the same pool as EP) plus hides, stone or sticks, and a gem from obsidian plates upward. It does not raise the evolution tier. Each step adds less armor than the one before.

## Rock tiers

| Tier | Rocks |
| --- | --- |
| 1 | Chalk, pumice |
| 2 | Sandstone |
| 3 | Shale, limestone, coral rock |
| 4 | Slate, flint |
| 5 | Granite, basalt |
| 6 | Marble, quartz, copper ore |
| 7 | Jade stone (the rock, not the gem), iron ore, gold-flecked rock |
| 8 | Lava rock, obsidian |
| 9 | Geode |
| 10 | Deep stone |

Deep stone is never on the surface. Under the volcano a column is soil, then granite, then obsidian, then one deep-stone cell. A lava tube skips the upper seven cells. A vent is already open onto the vein but still hot. Only a tier-7 mk III breaker breaks that last cell. `npm run check` times a dome-skull, spade-armed digger: about 135 seconds for the full column, 69 through the tube, 28 at the vent.

## Raids and defenses

NPC waves are the main raid. A base of tier 5 or higher is skipped entirely while its owner and clan are offline, so there is no offline wipe. Online, a horn sounds 40 seconds ahead, then biome raiders path along the ground toward the den. Every third wave adds a boss raider. Clearing the wave pays EP. Losing the den drops about 35% of stored materials and a chance of one gem, then a two-hour shield.

Player raids are a world flag (`pvp`, default on in the local world, toggle with the shard `/pvp` route). Attackers must be within two tiers of the defender. Tier 1–4 bases take no raid damage. Offline owners keep 75% resistance. Same-clan bites do not land.

Twelve defenses, each mk I–III, tier 5 or higher (lava trap is tier 7): spitter tower, thorn bramble wall, spike pit, sticky resin trap, stinger hive, boulder catapult, coral spike turret, electric eel coil, lava trap, glow lure decoy, healing moss totem, guard beast nest. They tick only while an attacker is within range. A base holds `min(8, tier - 2)` of them.

## Shard server (you deploy this)

The browser game is the static site. The Worker is separate and is **not** deployed from here.

```bash
cd server
npx wrangler login
npx wrangler deploy
```

Then rebuild the client with the worker origin set in the environment. If that URL is missing or the socket fails, the game stays solo.

One Durable Object is a world shard. The directory object opens a new shard at 100 players. A third object, `ClanBook`, stores clans, tags, invite codes, and rosters in SQLite. The world object stores bases, dug columns, the pvp flag, and raid scores. It uses the WebSocket hibernation API. The 10 Hz alarm is set only while a socket is open and deleted when the shard is empty.

Limits: the live client still simulates the sea locally after the handshake. The Worker runs the same sim and broadcasts a compact status snapshot; full interest-managed creature replication is not finished. Chat is clan-only, 80 characters, one message per 2 seconds, with a small profanity filter. Pings go to the shard.

### Cloudflare cost, one shard

Prices below are from the Cloudflare docs pages updated 13 Nov 2026 (Durable Objects) and 18 Nov 2026 (Workers):

- Workers Free: 100,000 requests/day, 10 ms CPU per invocation. Durable Objects on Free: 100,000 requests/day, 13,000 GB-s/day, 100,000 SQL rows written/day. `setAlarm` counts as one row write.
- Workers Paid is $5/month. Included: 10 million Worker requests, 30 million CPU-ms, 1 million DO requests, then $0.15 per extra million DO requests, 400,000 GB-s then $12.50 per million GB-s, 50 million SQL writes then $1 per million. Incoming WebSocket messages to a Durable Object are billed 20:1. Outgoing broadcasts are not billed.

This build's alarm is 10 Hz, so one occupied shard spends 36,000 alarm requests and 36,000 alarm writes per hour. The free caps of 100,000 requests and 100,000 writes therefore cover about **2.8 hours per UTC day** of a single live shard, before player input. Duration is not the free-tier wall: eight hours of wall-clock at the 128 MB billing size is about 3,700 GB-s, under the 13,000 GB-s/day free duration cap.

Assuming players send input at 5 Hz the whole time they are connected:

| Load | DO requests / day | vs Free (100k/day) | Paid bill, 30 such days, after the $5 plan |
| --- | --- | --- | --- |
| 10 players, 8 h | 288k alarms + 1.44M messages / 20 = **360k** | exceeds after ~2.2 h | about **$1.50** in requests. Duration and writes stay inside the included 400k GB-s and 50M writes |
| 100 players, 8 h | 288k alarms + 14.4M messages / 20 = **1.01M** | exceeds immediately | about **$4.40** in requests |
| 100 players, 24 h | 864k alarms + 64.8M billed message-equivalents over the month scale to ~90M requests | not viable | about **$13.50** in requests. Worst-case hot duration for 24 h is ~332k GB-s, still inside 400k |

Adding more players does not multiply the alarm. It multiplies inbound messages. Raids and towers do not add alarms; they run inside the tick, and towers only act while an attacker is in range. Empty shards delete the alarm and hibernate.

## What is solid vs thin

Solid: the sea-to-land loop, the evolve menu and the mesh it changes, tier gates, NPC hunting, the 12 defenses and NPC raid waves, PvP raid math, deep-stone timing, and a static build.

Thin: water does not flow across a sculpted heightmap; raise/lower brushes are a mud gather plus column digging rather than a smooth terrain editor. Trees, rocks, hides, and gems are real tables and some of them spawn, not a full forest of 20 unique models. The Worker persists bases and columns and ticks the sim, but remote creatures are not yet drawn from those snapshots. Clan create/join is on the Clan object; the title screen does not yet have the full roster UI.
