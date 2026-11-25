import { starterLoad } from '../shared/catalog'
import { FINS, HORNS, SKINS, HEADS, DORSALS, REARS, TAILS, LIMBS, EXTRA_REAR, ARMORS, tryBuy, convertToGuppy, hornDamage, emptyMorph, mapLegacySkin, ensureMorph, agility, incomingMissChance, morphFx } from '../shared/evolve'
import { createSpawners, seedSpawners, stepSpawners, mulberry32 } from '../shared/prey'
import { createHealPlants, tryEatPlant, stepHealPlants } from '../shared/plants'
import { LAND_TREES, LAND_TREE_NAMES } from '../shared/landcover'
import { RECIPES, canCraft, spendCraft, gearFx, forageDrop } from '../shared/craft'
import { landOk, attackPower, bossReady, bossMeterLine, BOSS_ATTACK } from '../shared/rules'
import { columnSeconds } from '../shared/dig'
import { attackVolumes, bodyScale, volumeHits, youngBite } from '../shared/body'
import { applyMorphBuy, applyWorldSnapshot, createWorld, playerOf, snapshotWorld, step } from '../shared/sim'
import { applyGameSave, encodeGameSave, parseGameSave, serializeGameSave } from '../shared/save'
import { BTN, deadzone, readPad, type PadLike } from '../shared/pad'
import { canPlace, placePiece, refundPiece } from '../shared/build'
import { bodyBreakPower, cellSeconds, chopSeconds, compute, tierOf } from '../shared/rules'
import { BEACH_END, LAND_HEIGHT, SEA_END, WATER, isDryLand, shoreX, terrainHeight, groundAt } from '../shared/terrain'
import { trunkRadius } from '../shared/landcover'

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
you.y = groundAt(198, 0, 16) + 0.2
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
hero.ep = 20
hero.hp = 400
hero.maxHp = 400
hero.air = 400
hero.x = 40
hero.y = 2.4
if (bossReady(hero.load, hero.spent)) throw new Error('a starter guppy should not yet face the boss')
const horn = applyMorphBuy(hero, 'coral')
if (!horn.ok) throw new Error(`coral spike should buy: ${horn.reason}`)
if (!bossReady(hero.load, hero.spent)) throw new Error(`coral spike should reach Attack ${BOSS_ATTACK}, got ${attackPower(hero.load, hero.spent)}`)
step(gate, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
const boss = gate.ents.find((e) => e.kind === 'boss')
if (!boss) throw new Error('colossus should spawn in the shallows once Attack is high enough')
if (Math.abs(boss.x - 58) > 2) throw new Error(`colossus should wait near the first shore, got x=${boss.x}`)
if (boss.region !== 'sea') throw new Error('level 1 boss should be in the shallows, not inland')
boss.alive = false
boss.hp = 0
step(gate, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false })
if (gate.won) throw new Error('defeating the colossus should open a gate, not win')
if (!gate.gateOpen) throw new Error('colossus death should set gateOpen')


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
if (pupBite > 3) throw new Error(`guppy bite should stay capped, got ${pupBite}`)
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
if (loaded.ep !== 18 || loaded.spent !== 12 || (loaded.bag.stone ?? 0) !== 2) {
  throw new Error('converted save should keep EP, spent, and bag')
}
if (loaded.load.size > 0.55 || loaded.load.lungs !== 0 || loaded.load.legs !== 0 || loaded.load.morph?.branch !== 'guppy') {
  throw new Error('old saves should convert to a guppy body with the matching skin')
}
if (compute(loaded.load, loaded.spent).bite <= 2) throw new Error('loaded mid-game bite should not stay guppy-weak')
if (loaded.load.size > 0.55) throw new Error('converted body size field should stay a guppy')
console.log('guppy start and save compatibility')

const refundWorld = createWorld()
const mason = playerOf(refundWorld)
mason.bag.kelp = 2
const first = placePiece(refundWorld, mason, 'lean', mason.x + 2, mason.y, 0, 0)
if (!first.ok || !first.piece) throw new Error(`place for refund test failed: ${first.reason}`)
if ((mason.bag.kelp ?? 0) !== 0) throw new Error('place should spend kelp')
const packedAgain = refundPiece(refundWorld, mason, first.piece.id)
if (!packedAgain.ok) throw new Error(`pickup refund failed: ${packedAgain.reason}`)
if (refundWorld.pieces.length) throw new Error('pickup should remove the piece')
if ((mason.bag.kelp ?? 0) !== 2) throw new Error(`pickup should return kelp, got ${mason.bag.kelp}`)
const unpaid = placePiece(refundWorld, mason, 'lean', mason.x + 2, mason.y, 0, 0, true)
if (!unpaid.ok) throw new Error('free flag should still work when asked')
refundPiece(refundWorld, mason, unpaid.piece!.id)
mason.bag.kelp = 0
const charged = placePiece(refundWorld, mason, 'lean', mason.x + 2, mason.y, 0, 0)
if (charged.ok) throw new Error('after a refund, placing again must cost materials (no free duplicate)')
mason.bag.kelp = 2
const paid = placePiece(refundWorld, mason, 'lean', mason.x + 2, mason.y, 0, 0)
if (!paid.ok || (mason.bag.kelp ?? 0) !== 0) throw new Error('second place should spend the refunded kelp')
const midSave = serializeGameSave(encodeGameSave(refundWorld))
const loadedSite = createWorld()
applyGameSave(loadedSite, parseGameSave(midSave)!)
const loadedMason = playerOf(loadedSite)
if (loadedSite.pieces.length !== 1 || loadedSite.pieces[0]?.kind !== 'lean') throw new Error('placed piece should survive save/load')
if ((loadedMason.bag.kelp ?? 0) !== 0) throw new Error('spent kelp should stay spent after load')
const afterLoad = refundPiece(loadedSite, loadedMason, loadedSite.pieces[0]!.id)
if (!afterLoad.ok || loadedSite.pieces.length || (loadedMason.bag.kelp ?? 0) !== 2) throw new Error('pickup after load should refund kelp')
const afterPickup = serializeGameSave(encodeGameSave(loadedSite))
const reloaded = createWorld()
applyGameSave(reloaded, parseGameSave(afterPickup)!)
if (reloaded.pieces.length) throw new Error('refunded piece should stay gone after save/load')
if ((playerOf(reloaded).bag.kelp ?? 0) !== 2) throw new Error('refunded kelp should survive save/load')
console.log('pickup refunds without a free replacement; refunds persist')

{
  const hunter = createWorld()
  const gup = playerOf(hunter)
  const snack = hunter.ents.find((e) => e.kind === 'npc' && e.region === 'sea' && e.bias <= 0 && e.alive)
  if (!snack) throw new Error('expected nearby fry')
  if (!youngBite(gup.load, gup.spent)) throw new Error('new game should use the generous guppy bite')
  const yaw = Math.atan2(snack.z - gup.z, snack.x - gup.x)
  gup.yaw = yaw
  gup.x = snack.x - Math.cos(yaw) * 1.65
  gup.z = snack.z - Math.sin(yaw) * 1.65
  gup.y = snack.y
  gup.vx = gup.vy = gup.vz = 0
  let landed = false
  const startHp = snack.hp
  for (let i = 0; i < 24 && !landed; i++) {
    const ev = step(hunter, 0.05, { ax: 0, ay: 0, jump: false, bite: true, dig: false, use: false, ink: false, forward: 1 })
    if (ev.some((e) => e.t === 'hit' || e.t === 'eat') || snack.hp < startHp || !snack.alive) landed = true
  }
  if (!landed) throw new Error('a reasonably aimed guppy bite should land on nearby fry without placing the mouth on them')
  const grown = starterLoad()
  grown.size = 0.92
  grown.lungs = 1
  if (youngBite(grown, 12)) throw new Error('a mid-game save should not use the guppy bite cone')
  console.log('unassisted guppy bite lands')
}

{
  const mid = createWorld()
  const you = playerOf(mid)
  you.spent = 12
  you.ep = 18
  you.load.size = 0.92
  you.load.lungs = 1
  you.bag = { stone: 2 }
  you.x = 42.5
  mid.eats = 2
  mid.gateOpen = true
  const raw = serializeGameSave(encodeGameSave(mid))
  const fresh = createWorld()
  const data = parseGameSave(raw)
  if (!data) throw new Error('mid-game banner parse failed')
  applyGameSave(fresh, data)
  if (/tiny guppy/i.test(fresh.banner)) throw new Error('mid-game load should not keep the tiny-guppy banner')
  const pup = playerOf(createWorld())
  if (!/tiny guppy/i.test(createWorld().banner) && pup.spent === 0) {
    /* new worlds still get the starter banner */
  }
  const nw = createWorld()
  if (!/tiny guppy/i.test(nw.banner)) throw new Error('new games should still greet a guppy')
  console.log('mid-game load hides the guppy banner')
}


function fakePad(pressed: number[] = [], axes = [0, 0, 0, 0], values: Record<number, number> = {}): PadLike {
  const buttons = Array.from({ length: 16 }, (_, i) => {
    const v = values[i] ?? (pressed.includes(i) ? 1 : 0)
    return { pressed: v > 0.45 || pressed.includes(i), value: v }
  })
  return { connected: true, axes, buttons }
}

{
  const z = deadzone(0.1, 0.05, 0.2)
  if (z.x !== 0 || z.y !== 0) throw new Error('sticks inside the deadzone should be zero')
  const s = deadzone(1, 0, 0.2)
  if (Math.abs(s.x - 1) > 0.001 || s.y !== 0) throw new Error('a full left-stick deflection should rescale to 1')
  const idle = readPad(fakePad(), [], 'play', false)
  if (idle.frame.bite || idle.frame.dash || idle.frame.sprint) throw new Error('an idle pad should issue no play actions')
  const play = readPad(fakePad([BTN.RT, BTN.LT, BTN.A], [0.95, 0, 0.9, 0]), [], 'play', false)
  if (!play.frame.bite || !play.frame.horn || !play.frame.rise) throw new Error('RT attacks, LT second attack, A jumps')
  const sw = readPad(fakePad([BTN.RB]), [], 'play', false), sk = readPad(fakePad([BTN.LB]), [], 'play', false)
  if (!sw.frame.rise || !sk.frame.dive) throw new Error('RB rises, LB dives')
  if (play.frame.lx <= 0 || play.frame.rx <= 0) throw new Error('movement and camera sticks should pass a sensible deadzone')
  const up = readPad(fakePad([BTN.UP]), [], 'play', false)
  if (!up.frame.build || up.frame.rise) throw new Error('D-pad Up opens the build menu')
  const start = readPad(fakePad([BTN.START]), [], 'play', false)
  if (!start.frame.start) throw new Error('Start should be pause')
  const view = readPad(fakePad([BTN.VIEW]), [], 'play', false)
  if (!view.frame.view) throw new Error('View should be Select')
  const dash = readPad(fakePad([BTN.B]), [], 'play', false)
  if (!dash.frame.dash || dash.frame.leaveBuild) throw new Error('B dashes only outside build')
  const buildB = readPad(fakePad([BTN.B, BTN.RB, BTN.LB, BTN.RT]), [], 'build', false)
  if (!buildB.frame.leaveBuild || buildB.frame.dash) throw new Error('B leaves build without dashing')
  if (!buildB.frame.rotateUp || !buildB.frame.rotateDown || !buildB.frame.place) throw new Error('D-pad U/D rotate and RT places in build')
  const menu = readPad(fakePad([BTN.A, BTN.DOWN], [0, 0.9, 0, 0]), [], 'menu', false)
  if (!menu.frame.confirm || !menu.frame.navDown) throw new Error('menus should navigate with the D-pad or stick and confirm with A')
  const gone = readPad(null, [true, true, true], 'play', true)
  if (gone.frame.connected || gone.prev.length || gone.navLatch) throw new Error('a disconnect should clear pad state')
  // Analog trigger below the press threshold still counts as a bite when value is high
  const soft = readPad(fakePad([], [0, 0, 0, 0], { [BTN.RT]: 0.8, [BTN.LT]: 0.8 }), [], 'play', false)
  if (!soft.frame.bite || !soft.frame.horn) throw new Error('analog triggers should bite and boost past the threshold')
  console.log('standard pad mapping')
}

{
  const w = createWorld()
  const gup = playerOf(w)
  const snack = w.ents.find((e) => e.kind === 'npc' && e.region === 'sea' && e.bias <= 0 && e.alive)
  if (!snack) throw new Error('expected nearby fry')
  const dmg = compute(gup.load, gup.spent).bite
  const nips = Math.ceil(snack.hp / dmg)
  if (nips < 1 || nips > 2) throw new Error(`first meal should take 1-2 bites, got ${nips} (hp ${snack.hp} bite ${dmg})`)
  const later = w.ents.find((e) => e.kind === 'npc' && e.region === 'sea' && e.bias > 0)
  if (later && later.maxHp <= 3) throw new Error('later sea prey should keep mid-game health')
  console.log('first meal takes 1-2 bites')
}


{
  if (SKINS.length !== 10) throw new Error(`expected 10 skins, got ${SKINS.length}`)
  if (HEADS.filter((h) => h.id !== 'guppy').length !== 10) throw new Error('expected 10 heads')
  if (HORNS.length !== 5) throw new Error('expected 5 horns')
  if (FINS.length !== 8) throw new Error(`expected 8 fins (side+belly, no trout/bass), got ${FINS.length}`)
  if (LIMBS.length !== 3) throw new Error('expected 3 limbs')
  if (DORSALS.length !== 5) throw new Error('expected 5 dorsals')
  if (REARS.length !== 4) throw new Error(`expected 4 rear fins, got ${REARS.length}`)
  if (TAILS.length !== 5) throw new Error('expected 5 tails')
  for (const id of ['fantail', 'forked', 'eel', 'thresher', 'barbed']) {
    const tail = TAILS.find((x) => x.id === id)
    if (!tail?.tags.some((tag) => ['slap', 'slash', 'shock', 'whip-stun', 'slam'].includes(tag))) {
      throw new Error(`${id} tail needs an attack tag`)
    }
  }
  if (ARMORS.length !== 2 || !ARMORS.some((a) => a.id === 'plating') || !ARMORS.some((a) => a.id === 'bonescales')) {
    throw new Error('back armor must include Plating and Bone Scales')
  }
  if (!ARMORS.every((a) => a.place === 'back')) throw new Error('back armor must sit on the back')
  if (FINS.some((f) => f.id === 'trout' || f.id === 'bass')) throw new Error('trout/bass must be removed')
  const fishFins = ['fan', 'spinyfin-side', 'dolphin', 'lionfish', 'sharkfin-side', 'manta'].map((id) => FINS.find((f) => f.id === id)!)
  for (let i = 1; i < fishFins.length; i++) {
    if (fishFins[i]!.cost <= fishFins[i - 1]!.cost) throw new Error(`fin cost order broke at ${fishFins[i]!.name}`)
  }
  const manta = FINS.find((f) => f.id === 'manta')!
  const dolphin = FINS.find((f) => f.id === 'dolphin')!
  const shark = FINS.find((f) => f.id === 'sharkfin-side')!
  const spiny = FINS.find((f) => f.id === 'spinyfin-side')!
  const fan = FINS.find((f) => f.id === 'fan')!
  if ((manta.swim ?? 0) + (manta.spd ?? 0) <= (dolphin.swim ?? 0) + (dolphin.spd ?? 0)) throw new Error('Manta must be faster than Dolphin')
  if ((dolphin.swim ?? 0) + (dolphin.spd ?? 0) <= (shark.swim ?? 0) + (shark.spd ?? 0)) throw new Error('Dolphin should be second-fastest')
  if ((spiny.bite ?? 0) <= (shark.bite ?? 0)) throw new Error('Spiny Fin should have the biggest attack boost')
  if ((shark.swim ?? 0) + (shark.spd ?? 0) <= (fan.swim ?? 0) + (fan.spd ?? 0)) throw new Error('Shark Fin should be faster than Fan')
  if ((FINS.find((f) => f.id === 'lionfish')!.deter ?? 0) <= 0) throw new Error('Lionfish Fin needs deterrence')
  if (DORSALS.find((d) => d.id === 'spinyfin')?.name !== 'Spiny Dorsal') throw new Error('Spiny Dorsal label')
  if (DORSALS.find((d) => d.id === 'sharkfin')?.name !== 'Shark Dorsal') throw new Error('Shark Dorsal label')
  if (!REARS.every((r) => r.place === 'rear')) throw new Error('rear fins must be placed at the rear')
  if (EXTRA_REAR.place !== 'rear' || EXTRA_REAR.branch !== 'fish') throw new Error('extra rear fins are fish-only and low toward the tail')

  const you = { ep: 400, spent: 0, load: convertToGuppy(undefined), unlocked: [] as string[] }
  const mid = convertToGuppy({ ...starterLoad(), skin: 5, jaw: 'shark', legs: 4, size: 1 })
  if (mid.morph?.branch !== 'guppy') throw new Error('old save should become a guppy')
  if (mid.jaw !== 'nip' || mid.legs !== 0) throw new Error('converted body should be a guppy')
  if (mapLegacySkin(5) !== mid.morph?.skin) throw new Error('converted skin should match')
  if (mid.size > 0.55) throw new Error('converted guppy should stay small')

  const r1 = tryBuy(you, 'scales')
  if (!r1.ok) throw new Error(r1.ok ? '' : r1.reason)
  const r2 = tryBuy(you, 'orca')
  if (!r2.ok) throw new Error('skins must not be level-gated')
  ensureMorph(you.load)
  const entered = tryBuy(you, 'sharkfin-side', { confirm: true })
  if (!entered.ok) throw new Error(`enter fish: ${'reason' in entered ? entered.reason : ''}`)
  const extra1 = tryBuy(you, 'extraRear')
  if (!extra1.ok) throw new Error(`extra rear 1: ${'reason' in extra1 ? extra1.reason : ''}`)
  const extra2 = tryBuy(you, 'extraRear')
  if (!extra2.ok) throw new Error('extra rear 2 should stack')
  if ((you.load.morph?.extraRear ?? 0) !== 2) throw new Error('should have 2 extra rear fins')
  const morph = ensureMorph(you.load)
  if (agility(morph).turn <= 1) throw new Error('extra rear fins should boost turn')
  const swap = tryBuy(you, 'webbed')
  if (swap.ok || !('prompt' in swap) || !swap.prompt) throw new Error('webbed limbs should prompt to swap extra rear fins')
  if (!/extra rear fin/i.test(swap.prompt.message)) throw new Error('swap prompt should mention extra rear fins')
  const confirm = tryBuy(you, 'webbed', { confirm: true })
  if (!confirm.ok) throw new Error(`webbed confirm: ${'reason' in confirm ? confirm.reason : ''}`)
  if ((you.load.morph?.extraRear ?? 1) !== 0) throw new Error('webbed limbs must remove extra rear fins')
  if (you.load.morph?.branch !== 'octopus') throw new Error('should be on the octopus branch')
  if (!landOk(you.load, you.spent)) throw new Error('webbed limbs should allow land movement')

  const horned = { ep: 200, spent: 0, load: starterLoad(), unlocked: [] as string[] }
  ensureMorph(horned.load)
  tryBuy(horned, 'nub')
  const dmgIdle = hornDamage(ensureMorph(horned.load), 0, 10)
  const dmgFull = hornDamage(ensureMorph(horned.load), 10, 10)
  if (dmgFull <= dmgIdle) throw new Error('horn damage should scale with speed')
  const plated = { ep: 80, spent: 0, load: starterLoad(), unlocked: [] as string[] }
  ensureMorph(plated.load)
  const beforeDef = compute(plated.load, plated.spent).def
  const plateBuy = tryBuy(plated, 'plating')
  if (!plateBuy.ok) throw new Error(`plating should buy: ${plateBuy.reason}`)
  if (compute(plated.load, plated.spent).def <= beforeDef) throw new Error('Plating should raise defense')
  if (ensureMorph(plated.load).armor !== 'plating') throw new Error('plating should equip as back armor')

  const lion = emptyMorph()
  lion.sideFin = 'lionfish'
  lion.skin = 'slime'
  const miss = incomingMissChance(morphFx(lion))
  if (miss <= (morphFx({ ...emptyMorph(), skin: 'slime' }).evasion)) throw new Error('deterrence should stack with evasion')

  if (LAND_TREES.length !== 20) throw new Error(`expected 20 land trees, got ${LAND_TREES.length}`)
  const names = LAND_TREES.map((id) => LAND_TREE_NAMES[id])
  if (new Set(names).size !== 20) throw new Error('tree names should be unique')

  if (RECIPES.length < 10 || RECIPES.length > 12) throw new Error(`expected 10-12 recipes, got ${RECIPES.length}`)
  const bag: Record<string, number> = { bark: 5, sticks: 8, stone: 8, bones: 2, reed: 6, leaf: 8, herb: 6, moss: 8, thorn: 5, log: 5, vine: 4, coral: 2 }
  const shield = spendCraft(bag, 'barkshield')
  if (!shield.ok) throw new Error(shield.reason)
  if (gearFx(bag).def < 3) throw new Error('bark shield should add defense')
  const poultice = canCraft({ herb: 2, moss: 1 }, 'poultice')
  if (!poultice.ok) throw new Error('poultice recipe should be craftable')
  const drops = forageDrop('tree', 'oak')
  if (!drops.log || !drops.bark) throw new Error('trees should drop log and bark')

  const plants = createHealPlants()
  if (plants.length < 80) throw new Error('healing plants should be spread widely')
  if (!plants.some((p) => p.kind === 'berry')) throw new Error('land berry bushes should heal')
  const tuft = plants[0]!
  const eaten = tryEatPlant(plants, tuft.x, tuft.y, tuft.z, 2)
  if (!eaten || eaten.heal <= 0) throw new Error('eating a plant should heal HP')
  if (tryEatPlant(plants, tuft.x, tuft.y, tuft.z, 2)) throw new Error('eaten plants should not be immediately reusable')
  stepHealPlants(plants, eaten.period + 0.1)
  const again = tryEatPlant(plants, tuft.x, tuft.y, tuft.z, 2)
  if (!again) throw new Error('plants should regrow after the timer')

  const spawners = createSpawners()
  if (spawners.length < 40) throw new Error('prey should be spread across the world')
  if (!spawners.some((s) => s.cx > 100) || !spawners.some((s) => s.cx < 15)) throw new Error('prey must exist near spawn and far inland')
  if (spawners.some((s) => s.respawn > 8 && s.region === 'sea' && s.kind === 'speck')) throw new Error('level-1 prey should respawn quickly')
  const rng = mulberry32(1)
  const seeded = seedSpawners(spawners, rng)
  if (seeded.length < 200) throw new Error(`expected a dense seed, got ${seeded.length}`)
  const counts = new Map<string, number>()
  for (const r of seeded) counts.set(r.spawnerId, (counts.get(r.spawnerId) ?? 0) + 1)
  const later = stepSpawners(spawners, { of: (id) => (counts.get(id) ?? 0) > 0 ? 0 : 0 }, 3, rng)
  // drain one and confirm refill exists as a function
  if (typeof later.length !== 'number') throw new Error('stepSpawners should return requests')

  const w = createWorld()
  const prey = w.ents.filter((e) => e.kind === 'npc')
  if (prey.length < 100) throw new Error(`world should start with plenty of prey, got ${prey.length}`)
  if (!w.ents.some((e) => e.region === 'land' && e.kind === 'npc' && e.bias <= 6 && e.alive)) throw new Error('land should have prey')
  if (!w.ents.some((e) => (e.species === 'hunter' || e.species === 'brute') && e.alive)) throw new Error('land should have a predator')
  if (!w.plants?.some((p) => p.kind === 'berry')) throw new Error('world should include land berry bushes')
  if (!w.nodes.some((n) => n.kind === 'tree' && LAND_TREES.includes(n.mat as (typeof LAND_TREES)[number]))) throw new Error('forage trees should be placed')
  const walker = playerOf(w)
  walker.load = starterLoad()
  ensureMorph(walker.load)
  walker.ep = 80
  // apply land limbs directly
  walker.load.morph = ensureMorph(walker.load)
  walker.load.morph.branch = 'octopus'
  walker.load.morph.limb = 'sallegs'
  if (!landOk(walker.load, walker.spent)) throw new Error('salamander legs should allow land movement')
  walker.load.morph.limb = 'webbed'
  if (!landOk(walker.load, walker.spent)) throw new Error('webbed limbs should allow land movement')
  console.log('evolve redesign, prey, plants, trees, craft, land movement')
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.spent = 200
  you.x = 80
  you.y = 8.6
  if (landOk(you.load, you.spent)) throw new Error('high spent without lungs or limbs must not go ashore')
  step(w, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
  if (you.x > shoreX(you.z) + 0.4) throw new Error(`shore must stop a water-only creature at the waterline, got ${you.x} shore=${shoreX(you.z)}`)
  if (!w.shoreWarned || !/lungs|land limbs/i.test(w.banner)) throw new Error(`shore should say lungs or land limbs, got "${w.banner}"`)
  if (w.bossUnlocked || w.ents.some((e) => e.kind === 'boss')) throw new Error('lungs/land must not be the level 1 boss gate')
  you.ep = 20
  const buy = applyMorphBuy(you, 'lungs')
  if (!buy.ok) throw new Error(`lungs should be buyable: ${buy.reason}`)
  if (!landOk(you.load, 0)) throw new Error('lungs must allow land without a tier gate')
  step(w, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
  if (w.bossUnlocked) throw new Error('buying lungs must not unlock the first boss')
  you.x = 70
  step(w, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
  if (you.x < 70) throw new Error('player with lungs must be able to leave the water')
  console.log('lungs still unlock land, without gating the first boss')
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.x = 20
  you.y = 3
  if (bossReady(you.load, you.spent)) throw new Error('starter attack should be below the boss threshold')
  if (!/Attack .+ \/ 10 to face the boss/.test(bossMeterLine(you.load, you.spent))) {
    throw new Error(`meter should say Attack X / 10 to face the boss, got "${bossMeterLine(you.load, you.spent)}"`)
  }
  you.ep = 20
  const fin = applyMorphBuy(you, 'spinyfin-side', { confirm: true })
  if (!fin.ok) throw new Error(`spiny fin should buy: ${fin.reason}`)
  // 6 + 3.5 = 9.5, just short of 10
  if (bossReady(you.load, you.spent)) throw new Error(`Spiny Fin alone should sit just under the threshold, got ${attackPower(you.load, you.spent)}`)
  you.ep = Math.max(you.ep, 12)
  const horn = applyMorphBuy(you, 'nub')
  if (!horn.ok) throw new Error(`bone nub should buy: ${horn.reason}`)
  if (attackPower(you.load, you.spent) < BOSS_ATTACK) throw new Error(`Spiny Fin + Bone Nub should reach Attack ${BOSS_ATTACK}, got ${attackPower(you.load, you.spent)}`)
  step(w, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
  if (!w.bossUnlocked) throw new Error('reaching the attack threshold should unlock the first boss')
  if (!/Boss unlocked/i.test(w.banner)) throw new Error(`should announce Boss unlocked, got "${w.banner}"`)
  const boss = w.ents.find((e) => e.kind === 'boss' && e.alive)
  if (!boss) throw new Error('Colossus should spawn as soon as Attack is high enough')
  if (boss.region !== 'sea' || boss.x > 64) throw new Error(`boss should stand in the shallows near the first shore, got x=${boss.x} region=${boss.region}`)
  // both branches can reach it without landOk
  if (landOk(you.load, you.spent)) throw new Error('fish-branch attack build should reach the boss without going ashore')
  you.x = boss.x - 4
  you.y = boss.y
  you.z = boss.z
  step(w, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
  if (isDryLand(you.x, you.z)) throw new Error('reaching the shallows boss must not require leaving the water')
  const hp0 = boss.hp
  you.x = boss.x - 1.6
  you.y = boss.y
  you.z = boss.z
  you.yaw = 0
  for (let i = 0; i < 8; i++) {
    you.biteCd = 0
    you.windup = 0
    you.recover = 0
    you.stun = 0
    step(w, 0.12, { ax: 0, ay: 0, jump: false, bite: true, dig: false, use: false, ink: false, forward: 0 })
  }
  if (boss.hp >= hp0) throw new Error(`should be able to bite the Colossus in the shallows, hp ${hp0} -> ${boss.hp}`)
  console.log('attack threshold unlocks the shallows Colossus for a normal fish build')
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.ep = 40
  you.x = 30
  you.y = 3
  const head = applyMorphBuy(you, 'hornedfrog', { confirm: true })
  if (!head.ok) throw new Error(`horned frog should buy: ${head.reason}`)
  you.ep = Math.max(you.ep, 12)
  const horn = applyMorphBuy(you, 'nub')
  if (!horn.ok) throw new Error(`nub after horned frog: ${horn.reason}`)
  if (!bossReady(you.load, you.spent)) throw new Error(`octopus bite head + horn should reach Attack ${BOSS_ATTACK}, got ${attackPower(you.load, you.spent)}`)
  step(w, 0.2, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
  const boss = w.ents.find((e) => e.kind === 'boss' && e.alive)
  if (!boss || boss.region !== 'sea') throw new Error('octopus branch should also fight the Colossus in the shallows')
  if (landOk(you.load, you.spent)) throw new Error('octopus head/horn should reach the boss before taking land limbs')
  console.log('octopus branch also unlocks the shallows Colossus by attack')
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.ep = 40
  you.x = 20
  you.y = 3
  const horn = applyMorphBuy(you, 'coral')
  if (!horn.ok) throw new Error(`coral for combat: ${horn.reason}`)
  const foe = w.ents.find((e) => e.kind === 'npc' && e.alive && e.region === 'sea' && e.bias <= 0)
  if (!foe) throw new Error('need a sea snack to test horn combat')
  you.x = foe.x - 0.8
  you.y = foe.y
  you.z = foe.z
  you.yaw = 0
  const hp0 = foe.hp
  for (let i = 0; i < 6; i++) {
    you.biteCd = 0
    you.windup = 0
    you.recover = 0
    you.stun = 0
    you.heavy = true
    step(w, 0.12, { ax: 0, ay: 0, jump: false, bite: true, dig: false, use: false, ink: false, horn: true, forward: 0 })
  }
  if (foe.hp >= hp0) throw new Error('coral horn should damage prey')
  if (foe.bleed <= 0 && foe.hp > 0) throw new Error('Coral Spike should apply bleed')
  console.log('horn I–III combat applies damage and bleed')
}



console.log('all checks ok')

{
  if (terrainHeight(20, 0) >= WATER - 0.5) throw new Error(`ocean floor should sit well under the water, got ${terrainHeight(20, 0)}`)
  if (terrainHeight(58, 0) >= WATER - 0.8) throw new Error(`boss shallows must stay underwater, got ${terrainHeight(58, 0)}`)
  if (terrainHeight(120, 0) <= WATER + 1.2) throw new Error(`land plateau should rise above the water, got ${terrainHeight(120, 0)} vs WATER ${WATER}`)
  const sx = shoreX(0)
  if (sx < SEA_END + 4 || sx > BEACH_END - 2) throw new Error(`shoreline should fall on the beach ramp, got ${sx}`)
  if (LAND_HEIGHT <= WATER) throw new Error('land plateau constant must be above the water line')
  console.log('raised land plateau and beach shoreline')
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.x = 50
  you.y = 2.6
  you.z = 0
  you.vx = 0
  for (let i = 0; i < 80; i++) step(w, 0.16, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
  if (you.x < 68) throw new Error(`swimmer should cross the old x=66 wall while still in the water, got x=${you.x}`)
  if (isDryLand(you.x, you.z)) throw new Error(`water-only swimmer should not walk onto dry land, got x=${you.x}`)
  if (you.x > 478) throw new Error('swimmer escaped the world edge')
  console.log('free swim past the old mid-ocean wall')
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.ep = 20
  const buy = applyMorphBuy(you, 'lungs')
  if (!buy.ok) throw new Error(`lungs for land walk: ${buy.reason}`)
  you.x = 70
  you.y = 3.2
  you.z = 0
  for (let i = 0; i < 100; i++) step(w, 0.16, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
  if (you.x < BEACH_END - 2) throw new Error(`evolved creature should walk up the beach onto the plateau, got x=${you.x}`)
  if (you.y <= WATER) throw new Error(`walker should stand above the water on the plateau, got y=${you.y}`)
  if (!isDryLand(you.x, you.z)) throw new Error('walker should be on dry land')
  console.log('landOk walker climbs the beach onto the raised plateau')
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.ep = 20
  applyMorphBuy(you, 'lungs')
  you.x = 110
  you.z = 0
  you.y = groundAt(110, 0, 16) + 0.2
  you.vx = 0
  you.vy = 0
  you.vz = 0
  const samples: number[] = []
  for (let i = 0; i < 90; i++) {
    step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
    if (i > 20) samples.push(you.y)
  }
  const span = Math.max(...samples) - Math.min(...samples)
  if (span > 0.06) throw new Error(`idle avatar should not bounce on land, y span ${span.toFixed(3)}`)
  you.x = 24
  you.y = groundAt(24, 0, 16) + 0.45
  you.z = 0
  you.vx = 0
  you.vy = 0
  you.vz = 0
  for (let i = 0; i < 45; i++) step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
  const swim: number[] = []
  for (let i = 0; i < 90; i++) {
    step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
    swim.push(you.y)
  }
  const swimSpan = Math.max(...swim) - Math.min(...swim)
  if (swimSpan > 0.12) throw new Error(`idle swimmer should settle, not bounce, y span ${swimSpan.toFixed(3)}`)
  console.log('idle avatar stays settled on land and in the water')
}

{
  const big = ['redwood', 'oak', 'pine', 'baobab', 'palm']
  for (const kind of big) {
    const r = trunkRadius(kind, 2.4)
    if (r < 0.28 || r > 1.4) throw new Error(`${kind} collider should sit under the larger visible trunk, got ${r}`)
  }
  if (trunkRadius('pebble', 1) !== 0) throw new Error('pebbles must not have colliders')
  console.log('tree colliders fit the visible trunks')
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.x = 12
  you.y = 2.6
  you.z = 0
  you.yaw = 0
  const counts: Record<string, number> = {}
  let total = 0
  for (let i = 0; i < 240; i++) {
    const ev = step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
    for (const e of ev) {
      if (e.t === 'note') continue
      counts[e.t] = (counts[e.t] || 0) + 1
      total++
    }
  }
  const bump = (counts.warn || 0) + (counts.hit || 0)
  if (bump > 6) throw new Error(`idle starter sea should not spam bump/warn/hit events, got ${bump} ${JSON.stringify(counts)}`)
  console.log('idle sea no longer spams bump events', total, counts)
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.x = 12
  you.y = 2.6
  you.z = 0
  you.yaw = 0
  const counts: Record<string, number> = {}
  for (let i = 0; i < 240; i++) {
    const ev = step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
    for (const e of ev) {
      if (e.t === 'note' || e.t === 'eat' || e.t === 'heal') continue
      counts[e.t] = (counts[e.t] || 0) + 1
    }
  }
  const bump = (counts.warn || 0) + (counts.hit || 0) + (counts.bite || 0)
  if (bump > 12) throw new Error(`swimming through fry should not spam bite/warn/hit, got ${bump} ${JSON.stringify(counts)}`)
  console.log('forward swim bump-like events stayed low', counts)
}


{
  const w = createWorld()
  const you = playerOf(w)
  you.x = 20
  you.y = 2.8
  you.z = 0
  you.yaw = 0
  you.vx = 0
  you.vy = 0
  you.vz = 0
  for (let i = 0; i < 10; i++) step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
  const speed = Math.hypot(you.vx, you.vz)
  if (speed < 2.1) throw new Error(`swim should reach a crisp speed quickly, got ${speed.toFixed(2)}`)
  for (let i = 0; i < 8; i++) step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
  const rest = Math.hypot(you.vx, you.vz)
  if (rest > 0.35) throw new Error(`swim should brake with little drift, leftover ${rest.toFixed(2)}`)
  console.log('crisp swim accel and brake', speed.toFixed(2), 'then', rest.toFixed(2))
}

{
  const w = createWorld()
  const you = playerOf(w)
  you.ep = 20
  const buy = applyMorphBuy(you, 'lungs')
  if (!buy.ok) throw new Error(`lungs for jump test: ${buy.reason}`)
  you.x = 110
  you.z = 0
  you.y = groundAt(110, 0, 16) + 0.16
  you.vx = 0
  you.vy = 0
  you.vz = 0
  for (let i = 0; i < 8; i++) step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 0 })
  step(w, 1 / 30, { ax: 0, ay: 0, jump: true, bite: false, dig: false, use: false, ink: false, forward: 0 })
  if (you.vy < 4) throw new Error(`land jump should leave the raised plateau, vy=${you.vy.toFixed(2)} y=${you.y.toFixed(2)}`)
  console.log('land jump works on the raised plateau', you.vy.toFixed(2))
}

{
  const w = createWorld()
  const you = playerOf(w)
  const tree = w.nodes.find((n) => n.kind === 'tree' && (n.rad ?? 0) > 0.14 && isDryLand(n.x, n.z ?? 0) && n.x > 90)
  if (!tree) throw new Error('expected a land tree to test slide-along')
  you.ep = 20
  applyMorphBuy(you, 'lungs')
  // Glance in from a slight offset so a hard stop would pin us, but a slide should carry us past.
  you.x = tree.x - (tree.rad! + 1.2)
  you.z = (tree.z ?? 0) + tree.rad! * 0.55
  you.y = groundAt(you.x, you.z, 16) + 0.16
  you.vx = 0
  you.vy = 0
  you.vz = 0
  you.yaw = 0
  for (let i = 0; i < 40; i++) {
    you.yaw = 0
    step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
  }
  if (you.x < tree.x + 0.2) throw new Error(`glancing land collision should slide past the trunk, end x=${you.x.toFixed(2)} tree=${tree.x.toFixed(2)} rad=${tree.rad}`)
  console.log('slide along tree trunks')
}

{
  const w = createWorld()
  const you = playerOf(w)
  const nearShore = w.nodes.find((n) => (n.kind === 'tree' || n.kind === 'rock') && (n.rad ?? 0) > 0.14 && n.x > 68 && n.x < 80)
  if (nearShore) {
    you.x = nearShore.x
    you.z = nearShore.z ?? 0
    you.y = Math.min(3.2, WATER - 0.8)
    you.vx = 0
    you.vy = 0
    you.vz = 0
    you.yaw = Math.PI / 2
    const z0 = you.z
    for (let i = 0; i < 24; i++) {
      you.yaw = Math.PI / 2
      step(w, 1 / 30, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
    }
    if (you.z < z0 + 1.2) throw new Error(`swimming along the shore should not be pinned by a land collider at (${nearShore.x.toFixed(1)}, ${nearShore.z}) end z=${you.z.toFixed(2)}`)
  }
  console.log('shoreline trees and rocks do not block swimming')
}

{
  const dirs: [string, number][] = [['+x', 0], ['-x', Math.PI], ['+z', Math.PI / 2], ['-z', -Math.PI / 2]]
  const blocked: string[] = []
  let tests = 0
  let shoreGates = 0
  const run = (land: boolean, xs: number[], zs: number[]) => {
    const w = createWorld()
    const you = playerOf(w)
    if (land) {
      you.ep = 20
      applyMorphBuy(you, 'lungs')
    }
    const dt = 1 / 30
    const frames = 24
    const expected = 3.0 * dt * frames * 0.45
    for (const x0 of xs) {
      for (const z0 of zs) {
        for (const [name, yaw] of dirs) {
          tests++
          you.alive = true
          you.hp = you.maxHp
          you.stun = 0
          you.slow = 0
          you.iframes = 8
          you.air = 20
          you.x = x0
          you.z = z0
          you.y = land || isDryLand(x0, z0) ? groundAt(x0, z0, 16) + 0.2 : Math.min(3.2, WATER - 0.8)
          you.vx = 0
          you.vy = 0
          you.vz = 0
          you.yaw = yaw
          for (let i = 0; i < frames; i++) {
            you.yaw = yaw
            step(w, dt, { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false, forward: 1 })
          }
          const dx = you.x - x0
          const dz = you.z - z0
          const along = dx * Math.cos(yaw) + dz * Math.sin(yaw)
          const moved = Math.hypot(dx, dz)
          if (along >= expected * 0.35 || moved >= expected) continue
          const edge = you.x <= 3 || you.x >= 478 || Math.abs(you.z) >= 178
          const shoreStop = !land && (isDryLand(you.x, you.z) || (you.x >= shoreX(you.z) - 0.6 && Math.cos(yaw) > 0.4))
          const hitSolid = w.nodes.some((n) => (n.kind === 'tree' || n.kind === 'rock') && (n.rad ?? 0) >= 0.14 && n.amount > 0 && (
            Math.hypot(n.x - x0, (n.z ?? 0) - z0) < (n.rad! + 1.3)
            || Math.hypot(n.x - you.x, (n.z ?? 0) - you.z) < (n.rad! + 0.8)
          ))
          if (edge) continue
          if (shoreStop) {
            shoreGates++
            continue
          }
          if (hitSolid) continue
          blocked.push(`${land ? 'land' : 'water'} ${name} from ${x0},${z0} -> ${you.x.toFixed(1)},${you.z.toFixed(1)} moved ${moved.toFixed(2)}`)
        }
      }
    }
  }
  run(false, [8, 20, 36, 50, 58, 66, 72], [-72, -48, -24, 0, 24, 48, 72])
  run(true, [80, 92, 108, 124, 140], [-72, -48, -24, 0, 24, 48, 72])
  if (blocked.length) throw new Error(`unexplained movement blocks (${blocked.length}/${tests}): ${blocked.slice(0, 8).join(' | ')}`)
  console.log('traversal grid has no unexplained blocks', tests, 'cells, shore gates', shoreGates)
}
