import { starterLoad } from '../shared/catalog'
import { columnSeconds } from '../shared/dig'
import { attackVolumes, bodyScale, volumeHits } from '../shared/body'
import { applyWorldSnapshot, createWorld, playerOf, snapshotWorld, step } from '../shared/sim'
import { applyGameSave, encodeGameSave, parseGameSave, serializeGameSave } from '../shared/save'
import { canPlace, placePiece, refundPiece } from '../shared/build'
import { bodyBreakPower, cellSeconds, chopSeconds, compute, tierOf } from '../shared/rules'

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


const vols = attackVolumes(starterLoad(), 0, false, 'you', 0, 0, 0, 0)
if (!vols.some((v) => v.kind === 'jaw')) throw new Error('missing jaw volume')
if (volumeHits(vols, 8, 0, 0, 0.2)) throw new Error('jaw should not reach 8m away')
if (!volumeHits(vols, vols[0]!.x, vols[0]!.y, vols[0]!.z, 0.05)) throw new Error('jaw should hit at its own center')

const gate = createWorld()
const hero = playerOf(gate)
hero.x = 130
hero.y = 1.2
hero.hp = 400
hero.maxHp = 400
hero.air = 400
hero.spent = 200
hero.load.lungs = 1
hero.load.legs = 4
hero.load.feet = 'claw'
for (let i = 0; i < 20; i++) step(gate, 0.25, { ax: 1, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
const boss = gate.ents.find((e) => e.kind === 'boss')
if (!boss) throw new Error('colossus did not spawn past 128')
boss.alive = false
boss.hp = 0
step(gate, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false })
if (gate.won) throw new Error('defeating the colossus should open a gate, not win')
if (!gate.gateOpen) throw new Error('colossus death should open the inland gate')


const site = createWorld()
const builder = playerOf(site)
builder.bag.kelp = 2
builder.x = 8
builder.y = 1
const ghost = canPlace(site, builder, 'lean', builder.x + 2, builder.y, 0, 0)
if (!ghost.ok) throw new Error(`lean should be placeable: ${ghost.reason}`)
const put = placePiece(site, builder, 'lean', builder.x + 2, builder.y, 0, 0)
if (!put.ok || !put.piece) throw new Error(`lean-to place failed: ${put.reason}`)
if ((builder.bag.kelp ?? 0) !== 0) throw new Error('lean-to should spend 2 kelp')
if (site.pieces.length !== 1) throw new Error('piece not stored')
const snap = snapshotWorld(site)
const reload = createWorld()
applyWorldSnapshot(reload, snap)
if (reload.pieces.length !== 1 || reload.pieces[0]?.kind !== 'lean') throw new Error('pieces should persist in the world snapshot')
const packed = refundPiece(reload, playerOf(reload), reload.pieces[0]!.id)
if (!packed.ok) throw new Error(`refund failed: ${packed.reason}`)
const left = reload.pieces.length
if (left) throw new Error('refund should remove the piece')
if ((playerOf(reload).bag.kelp ?? 0) < 2) throw new Error('refund should return kelp')
const blockedBag = playerOf(createWorld())
blockedBag.bag.kelp = 0
const poor = canPlace(createWorld(), blockedBag, 'lean', 10, 1, 0, 0)
if (poor.ok) throw new Error('lean-to must be red without kelp')
console.log('lean-to places and refunds; pieces persist')

const kept = createWorld()
const savedYou = playerOf(kept)
savedYou.x = 42.5
savedYou.y = 2.25
savedYou.z = -3.5
savedYou.yaw = 1.2
savedYou.pitch = 0.15
savedYou.ep = 18
savedYou.spent = 12
savedYou.hp = 21
savedYou.maxHp = 28
savedYou.air = 9
savedYou.bag.kelp = 3
kept.eats = 4
kept.gateOpen = true
savedYou.bag.kelp = 2
const built = placePiece(kept, savedYou, 'lean', savedYou.x + 2, savedYou.y, savedYou.z, 0)
if (!built.ok) throw new Error(`save fixture lean failed: ${built.reason}`)
const raw = serializeGameSave(encodeGameSave(kept))
if (!raw.includes('"x":42.5')) throw new Error('save should include player position')
const parsed = parseGameSave(raw)
if (!parsed) throw new Error('parseGameSave failed')
const restored = createWorld()
applyGameSave(restored, parsed)
const back = playerOf(restored)
if (Math.abs(back.x - 42.5) > 0.001 || Math.abs(back.z - -3.5) > 0.001) throw new Error(`pose not restored: ${back.x},${back.z}`)
if (back.ep !== 18 || back.spent !== 12 || restored.eats !== 4) throw new Error('progress not restored')
if (!restored.gateOpen) throw new Error('gateOpen should restore')
if (restored.pieces.length !== 1 || restored.pieces[0]?.kind !== 'lean') throw new Error('pieces should restore')
if ((back.bag.kelp ?? 0) !== 0) throw new Error('bag after lean cost should restore')
back.x = 99
back.ep = 0
restored.eats = 0
applyGameSave(restored, parseGameSave(raw)!)
if (Math.abs(playerOf(restored).x - 42.5) > 0.001 || playerOf(restored).ep !== 18 || restored.eats !== 4) throw new Error('second load should overwrite later changes')
console.log('save/load round-trip')

const fresh = createWorld()
const pup = playerOf(fresh)
if (pup.load.size > 0.5) throw new Error('new game should start as a small guppy')
if (pup.spent !== 0 || pup.ep !== 0) throw new Error('new guppy should have no EP or spent')
if ((pup.bag.kelp ?? 0) !== 0 || (pup.bag.sticks ?? 0) !== 0 || (pup.bag.stone ?? 0) !== 0 || (pup.bag.hide ?? 0) !== 0) {
  throw new Error('new guppy should have an empty bag')
}
if (pup.load.lungs !== 0 || pup.load.legs !== 0 || pup.load.armor !== 0) throw new Error('new guppy should have no grown parts')
const pupBite = compute(pup.load, pup.spent).bite
if (pupBite > 2) throw new Error(`guppy bite should be weak, got ${pupBite}`)
const pupScale = bodyScale(pup.load, pup.spent)
const oldStarter = starterLoad()
oldStarter.size = 0.92
const oldScale = bodyScale(oldStarter, 0)
if (oldScale <= pupScale * 1.4) throw new Error(`guppy should be visibly smaller than the old starter (${pupScale} vs ${oldScale})`)
if (oldScale < 0.65 || oldScale > 0.75) throw new Error(`old starter scale should stay ~0.70, got ${oldScale}`)
const fry = fresh.ents.filter((e) => e.kind === 'npc' && e.region === 'sea' && e.bias <= 0 && Math.abs(e.x - pup.x) <= 12)
if (fry.length < 8) throw new Error(`need plenty of nearby fry, got ${fry.length}`)
if (!fresh.banner.toLowerCase().includes('guppy')) throw new Error('banner should name the guppy start')

const mid = createWorld()
const midYou = playerOf(mid)
midYou.load.size = 0.92
midYou.load.lungs = 1
midYou.spent = 12
midYou.ep = 18
midYou.bag.stone = 2
const midRaw = serializeGameSave(encodeGameSave(mid))
const intoGuppy = createWorld()
if (playerOf(intoGuppy).load.size > 0.5) {
  /* start from a guppy world, then load the mid save */
}
applyGameSave(intoGuppy, parseGameSave(midRaw)!)
const loaded = playerOf(intoGuppy)
if (loaded.load.size !== 0.92 || loaded.spent !== 12 || loaded.ep !== 18 || loaded.load.lungs !== 1 || (loaded.bag.stone ?? 0) !== 2) {
  throw new Error('existing save must load unchanged')
}
if (compute(loaded.load, loaded.spent).bite <= 2) throw new Error('loaded mid-game bite should not stay guppy-weak')
if (Math.abs(bodyScale(loaded.load, loaded.spent) - bodyScale(oldStarter, 12)) > 0.001) {
  throw new Error('loaded body scale should match the pre-guppy size')
}
console.log('guppy start and save compatibility')
