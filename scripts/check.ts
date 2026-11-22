import { starterLoad } from '../shared/catalog'
import { columnSeconds } from '../shared/dig'
import { createWorld, playerOf, step } from '../shared/sim'
import { bodyBreakPower, cellSeconds, chopSeconds, tierOf } from '../shared/rules'

function t7() {
  const load = starterLoad()
  load.jaw = 'croc'
  load.teeth = 'serrated'
  load.feet = 'claw'
  load.lungs = 2
  load.armor = 2
  load.legs = 4
  load.arms = 2
  load.armType = 'spade'
  load.breaker = 'dome'
  load.size = 1.3
  return load
}

const full = columnSeconds(t7(), 180, 'full')
const tube = columnSeconds(t7(), 180, 'tube')
const vent = columnSeconds(t7(), 180, 'vent')
const early = columnSeconds(t7(), 55, 'full')
if (full === null || full > 180 || full < 20) throw new Error(`full column ${full}`)
if (tube === null || tube > full) throw new Error(`tube ${tube}`)
if (vent === null || vent > tube) throw new Error(`vent ${vent}`)
if (early !== null) throw new Error('tier 4 must not break deep stone')
if (tierOf(180) !== 7 || tierOf(12) !== 2 || tierOf(0) !== 1) throw new Error('tiers')

const world = createWorld()
const you = playerOf(world)
you.load = t7()
you.spent = 180
you.air = 400
you.hp = 400
you.maxHp = 400
you.x = 198
you.y = 1.2
let deep = false
for (let i = 0; i < 800 && !deep; i++) {
  const ev = step(world, 0.25, { ax: 0, ay: 0, jump: false, bite: false, dig: true, use: false, ink: false })
  if (ev.some((e) => e.text.includes('Deep') || e.t === 'gem')) deep = true
}
if (!deep) throw new Error('T7 dig did not reach deep stone at the vent')

const raid = createWorld()
raid.time = 100
const base = raid.bases[0]
if (!base) throw new Error('missing base')
base.warn = 0.2
base.nextAt = 0
step(raid, 0.3, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false })
if (raid.raiders.length < 1) throw new Error('wave did not spawn')
const before = raid.raiders[0]!.hp
for (let i = 0; i < 30; i++) step(raid, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false })
if (raid.raiders.length && raid.raiders.every((r) => r.hp >= before)) throw new Error('defenses did not fire')

const young = createWorld()
young.bases[0]!.tier = 2
young.bases[0]!.nextAt = 0
young.bases[0]!.warn = 0.05
step(young, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false })
if (young.raiders.length) throw new Error('tier 2 base was raided')

const horned = starterLoad()
horned.horn = 'lance'
if (bodyBreakPower(horned, 'med') <= 0) throw new Error('lance horn should help break medium rock')
if (cellSeconds(horned, 30, 'granite') === null) throw new Error('lance horn should slowly break granite without a breaker')
if (cellSeconds(horned, 30, 'deep-stone') !== null) throw new Error('a horn must not break deep stone')

const saw = starterLoad()
saw.jaw = 'saw'
if (chopSeconds(saw, 12, 'birch') === null) throw new Error('saw jaw should cut soft birch')
if (chopSeconds(starterLoad(), 0, 'birch') !== null) throw new Error('pebble nip should not cut birch')
if (chopSeconds(saw, 12, 'petrified') !== null) throw new Error('a saw jaw must not cut petrified wood early')

const spade = starterLoad()
spade.arms = 2
spade.armType = 'spade'
spade.feet = 'claw'
if (cellSeconds(spade, 55, 'sandstone') === null) throw new Error('spade arms should dig sandstone')

const placed = createWorld()
const trees = new Set(placed.nodes.filter((n) => n.kind === 'tree').map((n) => n.mat))
const rocks = new Set(placed.nodes.filter((n) => n.kind === 'rock').map((n) => n.mat))
if (trees.size < 20) throw new Error(`expected 20 tree kinds, got ${trees.size}`)
if (rocks.size < 20) throw new Error(`expected 20 rock kinds, got ${rocks.size}`)

console.log(`deep stone full ${full.toFixed(1)}s tube ${tube.toFixed(1)}s vent ${vent.toFixed(1)}s; raids ok; parts and nodes ok`)

