import type { Loadout } from './catalog'
import { GEMS, GUARD_CAP, HIDES, RAID_GAP, RAID_MIN_TIER, RAIDER_CAP, SHIELD_SEC, WARN_SEC, buildById, defenseById, rockById, starterLoad, treeById } from './catalog'
import { digTick, fullColumn, tubeColumn, ventColumn, type Column } from './dig'
import type { Piece } from './build'
import { attackVolumes, bodyBox, mouthHit, volumeHits, youngBite } from './body'
import { CHUNK, VOLCANO_X, WATER, WORLD_Z, carve, fill, groundAt, isDryLand, shoreX } from './terrain'
import { bossReady, buySkin, buySpec, canDig, cellSeconds, chopSeconds, compute, defenseCap, gemChance, landOk, purchase, pvpFactor, tierOf, type Buy, type Progress } from './rules'
import { agility, ashoreNeed, hornDamage, incomingMissChance, morphFx, morphOf, tryBuy, type BuyResult } from './evolve'
import { createSpawners, kindById, mulberry32, seedSpawners, stepSpawners, type SpawnRequest, type Spawner } from './prey'
import { createHealPlants, stepHealPlants, tryEatPlant, type HealPlant } from './plants'
import { addDrops, forageDrop, gearFx, spendCraft } from './craft'
import { scatterChunk, trunkRadius } from './landcover'

export interface Ent {
  id: number
  kind: 'player' | 'npc' | 'boss' | 'meat' | 'guard'
  name: string
  species: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  yaw: number
  pitch: number
  facing: 1 | -1
  hp: number
  maxHp: number
  ep: number
  spent: number
  load: Loadout
  unlocked: string[]
  bag: Record<string, number>
  gems: Record<string, number>
  alive: boolean
  clan: string
  home: number
  region: 'sea' | 'land' | 'volcano'
  wander: number
  wdir: number
  biteCd: number
  biteT: number
  swing: boolean
  air: number
  salt: number
  respawn: number
  bias: number
  stun: number
  slow: number
  online: boolean
  iframes: number
  windup: number
  recover: number
  combo: number
  comboT: number
  biteBuf: number
  tele: number
  heavy: boolean
  peak: number
  bleed: number
  burn: number
  /** Spawner id for pooled, respawning prey. */
  pack?: string
}

export interface DefenseInst {
  uid: number
  kind: string
  mk: 1 | 2 | 3
  hp: number
  maxHp: number
  cd: number
  x: number
}

export interface Base {
  id: number
  owner: number
  name: string
  tier: number
  clan: string
  x: number
  biome: 'sea' | 'land' | 'volcano'
  hp: number
  maxHp: number
  mats: Record<string, number>
  gems: Record<string, number>
  shield: number
  warn: number
  raidUntil: number
  wave: number
  nextAt: number
  defs: DefenseInst[]
  online: boolean
}

export interface Raider {
  id: number
  name: string
  x: number
  y: number
  hp: number
  maxHp: number
  dmg: number
  spd: number
  boss: boolean
  biome: Base['biome']
  baseId: number
  stun: number
  slow: number
}

export interface Node {
  id: number
  kind: 'mat' | 'tree' | 'rock' | 'plant' | 'berry'
  mat: string
  x: number
  z?: number
  amount: number
  hp: number
  /** Trunk or rock radius used to keep the body out of scenery. */
  rad?: number
}

export interface Placeable {
  x: number
  y: number
  z: number
  life?: number
}

export interface World {
  ents: Ent[]
  bases: Base[]
  raiders: Raider[]
  columns: Column[]
  nodes: Node[]
  nextId: number
  time: number
  pvp: boolean
  won: boolean
  over: boolean
  banner: string
  bannerT: number
  shake: number
  hitStop: number
  score: { raids: Record<string, number>; defenses: Record<string, number> }
  caveIn: { t: number; x: number; dmg: number } | null
  nestMobs: number
  debris: { x: number; y: number; vy: number; life: number; dmg: number }[]
  eats: number
  gateOpen: boolean
  pieces: Piece[]
  noteCool: number
  spawners: Spawner[]
  plants: HealPlant[]
  preySeed: number
  traps: Placeable[]
  cairns: Placeable[]
  lures: Placeable[]
  nest: Placeable | null
  bossUnlocked: boolean
  shoreWarned: boolean
}

export interface Frame {
  ax: number
  ay: number
  jump: boolean
  bite: boolean
  dig: boolean
  use: boolean
  ink: boolean
  dash?: boolean
  horn?: boolean
  /** World-forward wish, -1..1. Strafe stays on ax. */
  forward?: number
  dive?: boolean
  sprint?: boolean
}

export interface Evt {
  t: string
  x: number
  y: number
  text: string
}

function bag(): Record<string, number> {
  return {}
}

function make(partial: Partial<Ent> & Pick<Ent, 'id' | 'kind' | 'name' | 'x' | 'species'>): Ent {
  const load = partial.load ?? starterLoad()
  const spent = partial.spent ?? 0
  const maxHp = partial.maxHp ?? compute(load, spent).hp + (partial.bias ?? 0)
  return {
    id: partial.id,
    kind: partial.kind,
    name: partial.name,
    species: partial.species,
    x: partial.x,
    y: partial.y ?? 4,
    z: partial.z ?? (partial.kind === 'npc' ? ((partial.id % 7) - 3) * 4 : 0),
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: partial.yaw ?? 0,
    pitch: 0,
    facing: 1,
    hp: partial.hp ?? maxHp,
    maxHp,
    ep: partial.ep ?? 0,
    spent,
    load,
    unlocked: partial.unlocked ?? ['nip', 'peg', 'smooth'],
    bag: partial.bag ?? bag(),
    gems: partial.gems ?? bag(),
    alive: partial.alive ?? true,
    clan: partial.clan ?? '',
    home: partial.home ?? partial.x,
    region: partial.region ?? 'sea',
    wander: 1,
    wdir: 1,
    biteCd: 0,
    biteT: 0,
    swing: false,
    iframes: 0,
    windup: 0,
    recover: 0,
    combo: 0,
    comboT: 0,
    biteBuf: 0,
    tele: 0,
    heavy: false,
    peak: partial.y ?? 4,
    bleed: 0,
    burn: 0,
    air: compute(load, spent).air,
    salt: partial.id,
    respawn: 0,
    bias: partial.bias ?? 0,
    stun: 0,
    slow: 0,
    online: partial.online ?? true,
    pack: partial.pack,
  }
}


function preyCounts(w: World) {
  const map = new Map<string, number>()
  for (const e of w.ents) {
    if (!e.alive || !e.pack) continue
    map.set(e.pack, (map.get(e.pack) ?? 0) + 1)
  }
  return { of: (id: string) => map.get(id) ?? 0 }
}

function applySpawn(w: World, req: SpawnRequest): void {
  const kind = kindById(req.kind)
  if (!kind) return
  const pooled = w.ents.find((e) => !e.alive && e.kind === 'npc' && e.species === kind.species)
  if (pooled) {
    pooled.alive = true
    pooled.x = req.x
    pooled.y = kind.region === 'sea' ? req.y : groundAt(req.x, req.z, 16) + 0.16
    pooled.z = req.z
    pooled.vx = 0
    pooled.vy = 0
    pooled.vz = 0
    pooled.hp = kind.hp
    pooled.maxHp = kind.hp
    pooled.bleed = 0
    pooled.burn = 0
    pooled.bias = kind.bias
    pooled.spent = kind.spent
    pooled.pack = req.spawnerId
    pooled.home = req.x
    pooled.stun = 0
    pooled.biteCd = 0
    return
  }
  const load = starterLoad()
  load.size = kind.size
  if (kind.region !== 'sea') {
    load.lungs = 1
    load.legs = 4
    load.feet = 'claw'
  }
  if (kind.bias > 20) {
    load.jaw = 'shark'
    load.armor = 2
  }
  const fragile = kind.region === 'sea' && kind.bias <= 0
  w.ents.push(
    make({
      id: w.nextId++,
      kind: 'npc',
      name: kind.name,
      species: kind.species,
      x: req.x,
      y: kind.region === 'sea' ? req.y : groundAt(req.x, req.z, 16) + 0.16,
      z: req.z,
      region: kind.region,
      bias: kind.bias,
      spent: kind.spent,
      load,
      pack: req.spawnerId,
      maxHp: fragile ? kind.hp : undefined,
      hp: fragile ? kind.hp : undefined,
    }),
  )
}

function seedPrey(w: World): void {
  w.spawners = createSpawners()
  const rng = mulberry32(w.preySeed)
  for (const req of seedSpawners(w.spawners, rng)) applySpawn(w, req)
}

function refillPrey(w: World, dt: number): void {
  if (!w.spawners?.length) seedPrey(w)
  const rng = mulberry32((w.preySeed + Math.floor(w.time * 8)) >>> 0)
  for (const req of stepSpawners(w.spawners, preyCounts(w), dt, rng)) applySpawn(w, req)
}

export function applyMorphBuy(e: Ent, id: string, opts?: { confirm?: boolean; level?: number }): BuyResult {
  const p = prog(e)
  const result = tryBuy(p, id, opts)
  if (result.ok) saveProg(e, p)
  return result
}


function seedForage(w: World): void {
  for (let cx = 2; cx <= 6; cx++) {
    for (let cz = -3; cz <= 3; cz++) {
      const scatter = scatterChunk(cx, cz, CHUNK, groundAt, 'mid')
      for (const s of scatter.trees) {
        w.nodes.push({ id: w.nextId++, kind: 'tree', mat: s.kind, x: s.x, z: s.z, amount: 3, hp: 8, rad: trunkRadius(s.kind, s.scale) })
      }
      for (const s of scatter.rocks) {
        if (s.kind === 'pebble' && (s.x * 10) % 3 > 1) continue
        w.nodes.push({ id: w.nextId++, kind: 'rock', mat: s.x < 80 ? 'coral-rock' : 'stone', x: s.x, z: s.z, amount: 2, hp: 6, rad: trunkRadius(s.kind, s.scale) })
      }
      for (const s of scatter.plants) {
        w.nodes.push({ id: w.nextId++, kind: 'plant', mat: s.kind, x: s.x, z: s.z, amount: 2, hp: 3 })
      }
      for (const s of scatter.berries) {
        w.nodes.push({ id: w.nextId++, kind: 'berry', mat: 'berry', x: s.x, z: s.z, amount: 2, hp: 3 })
      }
    }
  }
}

function forageNear(w: World, you: Ent, ev: Evt[], reach = 2.4): boolean {
  let best: Node | undefined
  let bestD = reach * reach
  for (const n of w.nodes) {
    if (n.amount <= 0) continue
    if (n.kind !== 'tree' && n.kind !== 'rock' && n.kind !== 'plant' && n.kind !== 'berry') continue
    const dz = (n.z ?? 0) - you.z
    const d = (n.x - you.x) * (n.x - you.x) + dz * dz
    if (d < bestD) {
      bestD = d
      best = n
    }
  }
  if (!best) return false
  const kind = best.kind === 'tree' ? 'tree' : best.kind === 'rock' ? 'rock' : best.kind === 'berry' ? 'berry' : 'plant'
  const drops = forageDrop(kind, best.mat)
  const text = addDrops(you.bag, drops)
  best.amount -= 1
  best.hp = 0
  if (best.amount <= 0) best.amount = 0
  ev.push({ t: 'gather', x: best.x, y: you.y, text })
  w.banner = `Gathered ${text}`
  w.bannerT = 1.4
  return true
}

export function applyCraft(e: Ent, w: World, id: string): { ok: boolean; reason: string } {
  const result = spendCraft(e.bag, id)
  if (!result.ok || !result.recipe) return result
  const rec = result.recipe
  if (rec.heal) {
    const before = e.hp
    e.hp = Math.min(e.maxHp, e.hp + rec.heal)
    return { ok: true, reason: `Poultice heals ${Math.round(e.hp - before)} HP.` }
  }
  if (rec.use === 'gear' && rec.id === 'gourd') e.air = Math.max(e.air, 6)
  if (rec.place === 'nest') {
    w.nest = { x: e.x, y: e.y, z: e.z }
    e.home = e.x
    return { ok: true, reason: 'Twig nest set. You will wake here if you fall.' }
  }
  if (rec.place === 'trap') {
    w.traps.push({ x: e.x + Math.cos(e.yaw) * 1.4, y: e.y, z: e.z + Math.sin(e.yaw) * 1.4, life: 90 })
    return { ok: true, reason: 'Thorn trap set.' }
  }
  if (rec.place === 'cairn') {
    w.cairns.push({ x: e.x, y: e.y, z: e.z })
    return { ok: true, reason: 'Cairn raised.' }
  }
  if (rec.place === 'lure') {
    w.lures.push({ x: e.x, y: e.y, z: e.z, life: 45 })
    return { ok: true, reason: 'Moss lure laid out.' }
  }
  return result
}


function stepCraftables(w: World, dt: number, ev: Evt[], you: Ent): void {
  const gear = gearFx(you.bag)
  for (const trap of w.traps) {
    if (trap.life != null) trap.life -= dt
    for (const e of w.ents) {
      if (!e.alive) continue
      const d = Math.hypot(e.x - trap.x, e.z - (trap.z ?? 0))
      if (d < 1.3 && e.stun < 0.4) {
        e.stun = Math.max(e.stun, 1.4)
        ev.push({ t: 'note', x: e.x, y: e.y, text: e.id === you.id ? 'Thorn trap!' : `${e.name} is stunned` })
      }
    }
  }
  w.traps = w.traps.filter((t) => t.life == null || t.life > 0)
  for (const lure of w.lures) {
    if (lure.life != null) lure.life -= dt
    for (const e of w.ents) {
      if (!e.alive || e.kind === 'player' || e.bias > 10) continue
      const dx = lure.x - e.x
      const dz = (lure.z ?? 0) - e.z
      const d = Math.hypot(dx, dz)
      if (d < 16 && d > 0.4) {
        e.x += (dx / d) * 1.8 * dt
        e.z += (dz / d) * 1.8 * dt
      }
    }
  }
  w.lures = w.lures.filter((t) => t.life == null || t.life > 0)
  void gear
}


export const BOSS_X = 58
export const BOSS_Z = 0

function spawnColossus(w: World, ev: Evt[], announce: boolean): void {
  if (w.ents.some((e) => e.kind === 'boss') || w.won) return
  const load = starterLoad()
  load.jaw = 'croc'
  load.armor = 3
  load.size = 1.8
  load.legs = 6
  load.feet = 'claw'
  load.lungs = 1
  w.ents.push(make({ id: w.nextId++, kind: 'boss', name: 'Strand Colossus', species: 'boss', x: BOSS_X, y: 2.4, z: BOSS_Z, region: 'sea', spent: 140, load, bias: 80, maxHp: 170 }))
  if (announce) {
    w.banner = 'The Strand Colossus waits in the shallows by the first shore.'
    w.bannerT = 4
    ev.push({ t: 'note', x: BOSS_X, y: 2, text: 'The Strand Colossus waits in the shallows' })
  }
}

function unlockBoss(w: World, ev: Evt[], you: Ent): void {
  if (w.bossUnlocked) return
  w.bossUnlocked = true
  spawnColossus(w, ev, false)
  w.banner = 'Boss unlocked — the Strand Colossus waits in the shallows by the first shore. Follow the marker.'
  w.bannerT = 7
  ev.push({ t: 'boss-unlock', x: you.x, y: you.y, text: 'Boss unlocked' })
}

export function createWorld(): World {
  const w: World = {
    ents: [],
    bases: [],
    raiders: [],
    columns: [fullColumn(184), tubeColumn(192), ventColumn(198)],
    nodes: [],
    nextId: 1,
    time: 0,
    pvp: true,
    won: false,
    over: false,
    banner: 'A tiny guppy in the shallows. Eat the fry around you, then grow.',
    bannerT: 5,
    shake: 0,
    hitStop: 0,
    score: { raids: {}, defenses: {} },
    caveIn: null,
    nestMobs: 0,
    debris: [],
    eats: 0,
    gateOpen: false,
    pieces: [],
    noteCool: 0,
    spawners: [],
    plants: [],
    preySeed: 0x51ed2e3,
    traps: [],
    cairns: [],
    lures: [],
    nest: null,
    bossUnlocked: false,
    shoreWarned: false,
  }
  w.ents.push(make({ id: w.nextId++, kind: 'player', name: 'Tidewisp', species: 'you', x: 8, y: 2.4 }))
  seedPrey(w)
  w.plants = createHealPlants()
  seedForage(w)
  const hunter = w.ents.find((e) => e.species === 'hunter')
  w.bases.push({
    id: w.nextId++,
    owner: hunter?.id ?? 2,
    name: 'Hunter lodge',
    tier: 6,
    clan: 'HUNT',
    x: 116,
    biome: 'land',
    hp: 90,
    maxHp: 90,
    mats: { stone: 6, sticks: 4, hide: 2 },
    gems: { topaz: 1 },
    shield: 0,
    warn: 0,
    raidUntil: 0,
    wave: 0,
    nextAt: 20,
    online: true,
    defs: [
      { uid: w.nextId++, kind: 'spitter', mk: 1, hp: 30, maxHp: 30, cd: 0, x: 113 },
      { uid: w.nextId++, kind: 'thorn', mk: 1, hp: 40, maxHp: 40, cd: 0, x: 116 },
    ],
  })
  const nodes: [Node['kind'], string, number][] = [
    ['mat', 'kelp', 14],
    ['mat', 'kelp', 26],
    ['tree', 'driftwood', 22],
    ['tree', 'mangrove', 32],
    ['rock', 'chalk', 36],
    ['rock', 'coral-rock', 44],
    ['tree', 'cypress', 48],
    ['rock', 'pumice', 62],
    ['rock', 'sandstone', 70],
    ['rock', 'limestone', 74],
    ['mat', 'sticks', 78],
    ['tree', 'birch', 82],
    ['tree', 'willow', 86],
    ['mat', 'mud', 88],
    ['tree', 'bamboo', 90],
    ['tree', 'palm', 94],
    ['mat', 'vines', 96],
    ['tree', 'ferntree', 98],
    ['rock', 'shale', 100],
    ['tree', 'cycad', 102],
    ['rock', 'granite', 104],
    ['tree', 'ginkgo', 106],
    ['mat', 'resin', 108],
    ['tree', 'oak', 110],
    ['tree', 'pine', 114],
    ['rock', 'slate', 118],
    ['rock', 'flint', 122],
    ['tree', 'cedar', 126],
    ['rock', 'marble', 128],
    ['tree', 'kapok', 134],
    ['rock', 'quartz', 136],
    ['tree', 'baobab', 140],
    ['rock', 'copper', 144],
    ['tree', 'redwood', 148],
    ['tree', 'ironwood', 154],
    ['tree', 'ebony', 160],
    ['rock', 'basalt', 166],
    ['rock', 'geode', 170],
    ['rock', 'jade-rock', 172],
    ['tree', 'bloodwood', 174],
    ['rock', 'iron', 176],
    ['rock', 'lavarock', 180],
    ['tree', 'petrified', 182],
    ['rock', 'goldrock', 186],
    ['rock', 'obsidian', 188],
    ['rock', 'deep-stone', 196],
  ]
  for (const [kind, mat, x] of nodes) w.nodes.push({ id: w.nextId++, kind, mat, x, amount: 3, hp: kind === 'mat' ? 1 : 10 })
  return w
}

export function playerOf(w: World): Ent {
  return w.ents[0]!
}

function prog(e: Ent): Progress {
  return { ep: e.ep, spent: e.spent, load: e.load, unlocked: e.unlocked }
}

function saveProg(e: Ent, p: Progress): void {
  e.ep = p.ep
  e.spent = p.spent
  e.load = p.load
  e.unlocked = p.unlocked
  const stats = compute(e.load, e.spent)
  const gain = stats.hp - (e.maxHp - e.bias)
  e.maxHp = stats.hp + e.bias
  if (gain > 0) e.hp = Math.min(e.maxHp, e.hp + gain)
  e.air = Math.max(e.air, stats.air)
}

export function tryPurchase(e: Ent, kind: string, id: string): Buy {
  const p = prog(e)
  const result = kind === 'spec' ? buySpec(p, id, e.gems[id] ?? 0) : kind === 'skin' ? buySkin(p, e.bag, e.gems) : purchase(p, kind, id)
  if (result.ok && kind === 'spec') {
    const need = GEMS.find((g) => g.id === id)?.need ?? 0
    e.gems[id] = Math.max(0, (e.gems[id] ?? 0) - need)
  }
  if (result.ok) saveProg(e, p)
  return result
}

function pushSolids(w: World, you: Ent): void {
  // Land trees and rocks only — never in open water. The shoreline stop is the only swim barrier.
  if (!isDryLand(you.x, you.z)) return
  for (const n of w.nodes) {
    if (n.amount <= 0 || !n.rad || n.rad < 0.14) continue
    if (n.kind !== 'tree' && n.kind !== 'rock') continue
    if (!isDryLand(n.x, n.z ?? 0)) continue
    const dx = you.x - n.x
    const dz = you.z - (n.z ?? 0)
    const d = Math.hypot(dx, dz)
    if (d >= n.rad || d < 1e-4) continue
    const nx = dx / d
    const nz = dz / d
    you.x = n.x + nx * n.rad
    you.z = (n.z ?? 0) + nz * n.rad
    const inward = you.vx * nx + you.vz * nz
    if (inward < 0) {
      you.vx -= inward * nx
      you.vz -= inward * nz
    }
  }
}

function regionAt(x: number, z = 0): Ent['region'] {
  if (x >= VOLCANO_X) return 'volcano'
  if (isDryLand(x, z)) return 'land'
  return 'sea'
}

function hurt(e: Ent, amount: number): void {
  if (e.iframes > 0) return
  const def = compute(e.load, e.spent).def
  const fx = e.load.morph ? morphFx(e.load.morph) : null
  let dmg = amount / (1 + def * 0.12)
  if (fx) dmg *= Math.max(0.15, 1 - fx.dmgReduce - fx.biteResist * 0.5)
  e.hp -= dmg
  if (e.hp <= 0) {
    e.hp = 0
    e.alive = false
    if (e.kind === 'npc') e.respawn = 8
  }
}

function approach(v: number, target: number, accel: number, dt: number): number {
  const d = target - v
  const step = Math.sign(d) * Math.abs(accel) * dt
  if (Math.abs(step) >= Math.abs(d)) return target
  return v + step
}

function clanOnline(w: World, clan: string): boolean {
  if (!clan) return false
  return w.ents.some((e) => e.alive && e.online && e.clan === clan)
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1
}


function smashRocks(w: World, you: Ent, ev: Evt[]): void {
  for (const n of w.nodes) {
    if (n.kind !== 'rock' || n.amount <= 0) continue
    const dz = (n.z ?? 0) - you.z
    if ((n.x - you.x) * (n.x - you.x) + dz * dz > 6.25) continue
    n.hp = 0
    n.amount = 0
    ev.push({ t: 'note', x: n.x, y: you.y, text: 'The horn breaks the rock' })
    w.banner = 'The horn breaks the rock'
    w.bannerT = Math.max(w.bannerT, 1.2)
  }
}

function tickDots(e: Ent, dt: number, ev: Evt[]): void {
  if (e.bleed > 0) {
    e.bleed = Math.max(0, e.bleed - dt)
    hurt(e, 3.5 * dt)
    if (e.bleed <= 0) ev.push({ t: 'note', x: e.x, y: e.y, text: 'Bleed fades' })
  }
  if (e.burn > 0) {
    e.burn = Math.max(0, e.burn - dt)
    hurt(e, 4 * dt)
    if (e.burn <= 0) ev.push({ t: 'note', x: e.x, y: e.y, text: 'Burn fades' })
  }
}

export function step(w: World, dt: number, input: Frame): Evt[] {
  const ev: Evt[] = []
  w.time += dt
  w.bannerT = Math.max(0, w.bannerT - dt)
  w.noteCool = Math.max(0, w.noteCool - dt)
  w.shake = Math.max(0, w.shake - dt)
  const you = playerOf(w)
  if (!you.alive) return ev
  const stats = compute(you.load, you.spent)
  const gear = gearFx(you.bag)
  stats.def += gear.def
  stats.bite += gear.bite
  stats.swim += gear.swim
  const box = bodyBox(you.load, you.spent, false, you.species)
  const ground = groundAt(you.x, you.z, you.y)
  const slow = you.slow > 0 ? 0.55 : 1
  const dryUnder = isDryLand(you.x, you.z)
  // Stay in the water a little past the surface so gravity and buoyancy do not fight every frame.
  const submerged = !dryUnder && you.y < WATER + (you.y < WATER ? 0.16 : -0.08)
  if (!landOk(you.load, you.spent) && you.x >= shoreX(you.z) - 4 && !w.shoreWarned) {
    w.shoreWarned = true
    w.banner = ashoreNeed()
    w.bannerT = 6
    ev.push({ t: 'note', x: you.x, y: you.y, text: 'The shore is closed until you can breathe on land.' })
  }
  const drag = (0.85 + box.mass * 0.5 + you.load.fin * 0.14) / (you.slow > 0 ? 0.7 : 1)
  const fwd = you.stun > 0 ? 0 : Math.max(-1, Math.min(1, input.forward ?? 0))
  const strafe = you.stun > 0 ? 0 : Math.max(-1, Math.min(1, input.ax))
  const rise = input.dive ? -1 : input.ay !== 0 ? input.ay : input.jump ? 1 : 0
  const pitch = submerged ? you.pitch : 0
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const yaw = you.yaw
  const wishX = Math.cos(yaw) * fwd * cp - Math.sin(yaw) * strafe
  const wishZ = Math.sin(yaw) * fwd * cp + Math.cos(yaw) * strafe
  you.facing = Math.cos(yaw) >= 0 ? 1 : -1
  if (submerged) {
    const sprint = input.sprint ? 1.32 : 1
    const maxV = ((3.3 + stats.swim * 0.08) * slow * sprint) / (1 + Math.max(0, drag - 1) * 0.28)
    const accel = (32 / Math.sqrt(box.mass)) * agility(morphOf(you.load)).accel
    const brake = Math.max(accel * 1.8, 28)
    const idle = Math.abs(fwd) < 0.08 && Math.abs(strafe) < 0.08 && Math.abs(rise) < 0.08
    const climb = fwd * sp + rise * 0.85
    const ty = idle ? -0.16 / box.mass : climb * maxV * 0.7
    you.vx = approach(you.vx, wishX * maxV, idle ? brake : accel, dt)
    you.vz = approach(you.vz, wishZ * maxV, idle ? brake : accel, dt)
    you.vy = approach(you.vy, ty, idle ? brake * 0.65 : accel, dt)
    you.air = stats.air
    you.peak = you.y
  } else {
    const grav = 26 * box.mass
    you.vy -= grav * dt
    const sprint = input.sprint ? 1.35 : 1
    const maxRun = ((4.4 + stats.spd * 0.1) * slow * sprint) / Math.sqrt(box.mass)
    const runA = (36 / box.mass) * (you.stun > 0 ? 0.2 : 1) * agility(morphOf(you.load)).accel
    const brake = Math.max(runA * 1.8, 32)
    const flop = dryUnder && !landOk(you.load, you.spent)
    const idleLand = Math.hypot(wishX, wishZ) < 0.08
    you.vx = approach(you.vx, flop ? -1.1 : wishX * maxRun, flop ? 10 : idleLand ? brake : runA, dt)
    you.vz = approach(you.vz, flop ? 0 : wishZ * maxRun, flop ? 10 : idleLand ? brake : runA, dt)
    if (you.y > ground + 0.35) you.peak = Math.max(you.peak, you.y)
    const jumpV = 8.6 / Math.sqrt(box.mass) + Math.min(1.6, you.load.legs) * 0.2
    if (!flop && input.jump && you.y <= ground + 0.24 && you.vy <= 0.45) you.vy = jumpV
    if (!flop && you.load.wings > 0 && input.jump && you.y > ground + 0.25) you.vy = Math.max(you.vy, Math.min(4.5, stats.fly) / box.mass)
    if (flop && you.y <= ground + 0.08) you.vy = Math.max(you.vy, Math.sin(w.time * 9) * 1.1)
    const heat = you.region === 'volcano' && stats.heat <= 0
    you.air -= dt * (heat ? 1.6 : 1) * gear.dry
    if (you.y < WATER + 0.35 || !dryUnder) you.air = Math.min(stats.air, you.air + dt * 6)
    if (you.load.lungs > 0 && you.air <= 0) {
      you.air = 0
      hurt(you, 4 * dt * 3)
    }
  }
  if (input.dash && you.recover <= 0) {
    you.iframes = Math.max(you.iframes, 0.42)
    const burst = (submerged ? 6.8 : 8.1) / Math.sqrt(box.mass)
    const dashYaw = Math.hypot(input.ax, input.forward ?? 0) > 0.2
      ? Math.atan2(Math.sin(you.yaw) * (input.forward ?? 0) + Math.cos(you.yaw) * input.ax, Math.cos(you.yaw) * (input.forward ?? 0) - Math.sin(you.yaw) * input.ax)
      : you.yaw
    you.vx = Math.cos(dashYaw) * burst
    you.vz = Math.sin(dashYaw) * burst
    if (!submerged) you.vy = Math.max(you.vy, 2.1 / Math.sqrt(box.mass))
    you.biteCd = Math.max(you.biteCd, 0.12)
  }
  if (submerged && input.jump && you.y > WATER - 1.15) {
    you.vy = Math.max(you.vy, 6.4 / Math.sqrt(box.mass))
  }
  if (input.horn && you.windup <= 0 && you.recover <= 0) {
    you.heavy = true
    you.windup = 0.08
    const lunge = 4.5 / Math.sqrt(box.mass)
    you.vx += Math.cos(you.yaw) * lunge
    you.vz += Math.sin(you.yaw) * lunge
    you.biteT = 0.2
  }
  you.stun = Math.max(0, you.stun - dt)
  you.slow = Math.max(0, you.slow - dt)
  you.iframes = Math.max(0, you.iframes - dt)
  you.x += you.vx * dt
  you.y += you.vy * dt
  you.z += you.vz * dt
  if (!w.plants?.length) w.plants = createHealPlants()
  stepHealPlants(w.plants, dt)
  const mouth = bodyBox(you.load, you.spent, false, you.species)
  const reach = Math.max(0.7, mouth.mouth + mouth.biteR + 0.45)
  const tuft = tryEatPlant(w.plants, you.x + Math.cos(you.yaw) * mouth.mouth * 0.6, you.y, you.z + Math.sin(you.yaw) * mouth.mouth * 0.6, reach)
  if (tuft) {
    const before = you.hp
    you.hp = Math.min(you.maxHp, you.hp + tuft.heal)
    const gained = you.hp - before
    ev.push({ t: 'heal', x: tuft.x, y: tuft.y, text: gained > 0 ? `+${Math.round(gained)} HP` : 'Full' })
    if (gained > 0) {
      w.banner = gained > 0 ? 'Healing plants. +HP, no EP.' : w.banner
      w.bannerT = Math.max(w.bannerT, 1.2)
    }
  }

  if (!submerged && landOk(you.load, you.spent)) {
    const floor = groundAt(you.x, you.z, you.y)
    if (you.y < floor + 0.16) you.y = floor + 0.16
  }

  const floorY = groundAt(you.x, you.z, you.y) + (submerged ? 0.35 : 0.16)
  if (!submerged && you.y <= floorY && you.vy <= 0) {
    const drop = you.peak - floorY
    you.y = floorY
    you.vy = 0
    you.peak = floorY
    if (drop > 3.4) {
      const dmg = (drop - 3.4) * box.mass * 2.2
      hurt(you, dmg)
      w.shake = Math.min(0.45, drop * 0.04)
      ev.push({ t: 'hurt', x: you.x, y: you.y, text: `${Math.ceil(dmg)}` })
    } else if (drop > 1.4) w.shake = Math.max(w.shake, 0.08)
  }
  if (submerged) {
    const bed = groundAt(you.x, you.z, you.y) + 0.35
    if (you.y <= bed) {
      you.y = bed
      if (you.vy < 0) you.vy = 0
    }
  }
  you.y = Math.max(0.35, Math.min(18, you.y))
  you.x = Math.max(2, Math.min(480, you.x))
  you.z = Math.max(-WORLD_Z + 1, Math.min(WORLD_Z - 1, you.z))
  pushSolids(w, you)
  if (!landOk(you.load, you.spent) && isDryLand(you.x, you.z)) {
    const edge = shoreX(you.z) - 0.2
    if (you.x > edge) {
      if (!w.shoreWarned) {
        w.shoreWarned = true
        w.banner = ashoreNeed()
        w.bannerT = 6
        ev.push({ t: 'note', x: you.x, y: you.y, text: 'The shore is closed until you can breathe on land.' })
      }
      you.x = edge
      you.y = Math.min(you.y, WATER - 0.2)
      if (you.vx > 0) you.vx = 0
    }
  }
  you.region = regionAt(you.x, you.z)
  tickDots(you, dt, ev)
  you.biteCd = Math.max(0, you.biteCd - dt)
  you.biteT = Math.max(0, you.biteT - dt)
  you.windup = Math.max(0, you.windup - dt)
  you.recover = Math.max(0, you.recover - dt)
  you.comboT = Math.max(0, you.comboT - dt)
  you.biteBuf = Math.max(0, you.biteBuf - dt)
  if (you.comboT <= 0) you.combo = 0
  if (you.windup <= 0 && you.biteT > 0.08 && !you.swing && you.biteCd < 0.08) you.swing = true
  if (you.swing) {
    you.swing = false
    you.combo = you.comboT > 0 ? you.combo + 1 : 1
    you.comboT = 0.95
    const heavy = you.heavy || you.combo >= 3
    if (you.combo >= 3) you.combo = 0
    you.heavy = false
    you.biteCd = heavy ? 0.4 : 0.2
    you.recover = heavy ? 0.16 : 0.08
    const mine = bodyBox(you.load, you.spent, false, you.species)
    const vols = attackVolumes(you.load, you.spent, false, you.species, you.x, you.y, you.z, you.yaw)
    for (const foe of w.ents) {
      if (!foe.alive || foe.id === you.id || foe.kind === 'meat') continue
      if (foe.clan && foe.clan === you.clan) continue
      const theirs = bodyBox(foe.load, foe.spent, foe.kind === 'boss', foe.species)
      const pad = theirs.rad + theirs.len * 0.15
      const close = volumeHits(vols, foe.x, foe.y, foe.z, pad)
        || (you.kind === 'player' && youngBite(you.load, you.spent) && mouthHit(you.x, you.y, you.z, you.yaw, mine, foe.x, foe.y, foe.z, theirs))
      if (!close) continue
      const hitVol = volumeHits(vols, foe.x, foe.y, foe.z, pad)
      const morph = morphOf(you.load)
      const fx = morphFx(morph)
      const speed = Math.hypot(you.vx, you.vz)
      const top = Math.max(0.01, stats.spd, stats.swim)
      let dmg = stats.bite * (heavy ? 1.65 : 1) * (1 + box.mass * 0.08)
      if ((heavy || hitVol?.kind === 'horn') && morph.horn) dmg += hornDamage(morph, speed, top)
      if (hitVol?.kind === 'tail' || fx.whipStun || fx.slam || fx.slap || fx.slash || fx.shock) {
        if (fx.slash) dmg += 2
        if (fx.slam) dmg += 3
        if (fx.slap) dmg += 1
        if (fx.whipStun) dmg += 2
        if (fx.shock) dmg += 1.5
      }
      if (fx.pierce) dmg *= 1.25
      dmg = Math.max(1, Math.round(dmg))
      hurt(foe, dmg)
      const knock = (heavy ? 5.4 : 3.4) * box.mass * (fx.knock || fx.slam || fx.slap ? 1.55 : 1)
      foe.vx = Math.cos(you.yaw) * knock
      foe.vz = Math.sin(you.yaw) * knock
      foe.vy += 1.2 + (fx.slam ? 1.4 : 0)
      foe.stun = Math.max(foe.stun, heavy ? 0.16 : 0.08)
      if (fx.whipStun) foe.stun = Math.max(foe.stun, 0.55)
      if (fx.shock) foe.stun = Math.max(foe.stun, 0.4)
      if (fx.slap) foe.stun = Math.max(foe.stun, 0.22)
      if (fx.bleed > 0) foe.bleed = Math.max(foe.bleed, 2.4)
      if (fx.burn > 0) foe.burn = Math.max(foe.burn, 2.2)
      if (fx.breakRock && (heavy || hitVol?.kind === 'horn')) smashRocks(w, you, ev)
      w.shake = Math.max(w.shake, heavy ? 0.22 : 0.12)
      w.hitStop = heavy ? 0.1 : 0.065
      ev.push({ t: 'hit', x: foe.x, y: foe.y, text: `${dmg}` })
      if (!foe.alive) rewardKill(w, you, foe, ev)
      else {
        const bonus = 1 + (gearFx(you.bag).epBonus > 0 ? 1 : 0)
        you.ep += bonus
        ev.push({ t: 'eat', x: foe.x, y: foe.y, text: `+${bonus} EP` })
      }
    }
    for (const base of w.bases) {
      const reach = mine.mouth + 0.6
      if (!w.pvp || base.owner === you.id || Math.abs(base.x - (you.x + you.facing * mine.mouth)) > reach) continue
      const owner = w.ents.find((e) => e.id === base.owner)
      const offline = !(owner?.online || clanOnline(w, base.clan))
      const factor = pvpFactor(tierOf(you.spent), base.tier, offline, base.shield > w.time, w.pvp)
      if (factor <= 0) ev.push({ t: 'note', x: base.x, y: 2, text: base.tier < RAID_MIN_TIER ? 'Young bases are protected' : 'Raid blocked by tier, shield, or flag' })
      else {
        base.hp -= Math.max(1, Math.round(stats.bite * factor * (heavy ? 1.4 : 1)))
        alert(w, base, ev, 'Player raid')
        if (base.hp <= 0) sack(w, base, you.name, ev, true)
      }
    }
  }
  if (input.bite && (you.biteCd > 0 || you.windup > 0 || you.recover > 0 || you.stun > 0)) you.biteBuf = 0.32
  let autoContact = false
  if (you.kind === 'player' && you.biteCd <= 0 && you.windup <= 0 && you.recover <= 0 && you.stun <= 0) {
    const mine = bodyBox(you.load, you.spent, false, you.species)
    const vols = attackVolumes(you.load, you.spent, false, you.species, you.x, you.y, you.z, you.yaw)
    for (const foe of w.ents) {
      if (!foe.alive || foe.id === you.id || foe.kind === 'meat') continue
      if (foe.clan && foe.clan === you.clan) continue
      const theirs = bodyBox(foe.load, foe.spent, foe.kind === 'boss', foe.species)
      const pad = theirs.rad + theirs.len * 0.15
      if (
        volumeHits(vols, foe.x, foe.y, foe.z, pad) ||
        mouthHit(you.x, you.y, you.z, you.yaw, mine, foe.x, foe.y, foe.z, theirs)
      ) {
        autoContact = true
        break
      }
    }
  }
  const wantBite = (input.bite || you.biteBuf > 0 || autoContact) && you.biteCd <= 0 && you.windup <= 0 && you.recover <= 0 && you.stun <= 0
  if (wantBite) {
    you.biteBuf = 0
    you.windup = you.combo >= 2 ? 0.07 : 0.03
    you.biteT = you.windup + 0.18
    you.biteCd = 0.04
    const aim = nearestInCone(w, you)
    const bossUp = w.ents.find((e) => e.kind === 'boss' && e.alive)
    const nearBoss = !!(bossUp && Math.hypot((bossUp.x - you.x), (bossUp.z ?? 0) - you.z) < 48)
    const huntAssist = !!(aim && !(nearBoss && aim.kind !== 'boss' && !input.bite))
    if (aim && huntAssist) {
      const young = you.kind === 'player' && youngBite(you.load, you.spent)
      const pressed = !!(input.bite || you.biteBuf > 0)
      const dx = aim.x - you.x
      const dz = aim.z - you.z
      const dist = Math.hypot(dx, dz, aim.y - you.y)
      const want = Math.atan2(dz, dx)
      let turn = want - you.yaw
      while (turn > Math.PI) turn -= Math.PI * 2
      while (turn < -Math.PI) turn += Math.PI * 2
      const limit = young ? 1.2 : 0.9
      if (Math.abs(turn) < limit) you.yaw += turn * (young ? (pressed ? 0.88 : 0.35) : 0.45)
      if (pressed && young && dist < 2.8 && Math.abs(turn) < 1.2) {
        const pull = Math.min(0.55, 0.2 + (2.8 - dist) * 0.18)
        you.x += Math.cos(you.yaw) * pull * 0.45 + (aim.x - you.x) * 0.16
        you.z += Math.sin(you.yaw) * pull * 0.45 + (aim.z - you.z) * 0.16
        you.y += (aim.y - you.y) * 0.22
      }
      const lunge = pressed ? (young ? 7.4 : 6.2) : (young ? 1.6 : 1.2)
      you.vx += Math.cos(you.yaw) * lunge
      you.vz += Math.sin(you.yaw) * lunge
      if (pressed) you.vy += Math.max(-2.4, Math.min(2.4, (aim.y - you.y) * 2.2))
    }
    if (input.bite || you.biteBuf > 0) ev.push({ t: 'bite', x: you.x, y: you.y, text: '' })
  }
  if (input.dig) {
    if (isDryLand(you.x, you.z) && forageNear(w, you, ev)) {
      /* land gather with dig */
    } else digAt(w, you, dt, ev)
  }
  if (input.bite && isDryLand(you.x, you.z)) forageNear(w, you, ev, 1.8)
  if (input.use) {
    const near = w.nodes.some((n) => n.amount > 0 && Math.abs(n.x - you.x) < 2.2 && Math.abs(you.z) < 2.2)
    if (near) useNode(w, you, ev)
    else fill(you.x + Math.cos(you.yaw) * 1.2, you.y + Math.sin(you.pitch) * 0.5, you.z + Math.sin(you.yaw) * 1.2, 1.2, dt * 1.6)
  }
  npcThink(w, dt, ev)
  for (const e of w.ents) if (e.alive && e.kind !== 'player') tickDots(e, dt, ev)
  meats(w, you, ev)
  hazards(w, you, dt, ev)
  caveIns(w, dt, ev)
  fallDebris(w, dt, ev)
  raids(w, dt, ev)
  refillPrey(w, dt)
  stepCraftables(w, dt, ev, you)
  for (const e of w.ents) {
    if (!e.alive && e.kind === 'npc' && !e.pack && (e.respawn -= dt) <= 0) {
      e.alive = true
      e.hp = e.maxHp
      e.x = e.home
    }
  }
  if (you.hp <= 0) {
    if (w.nest) {
      you.hp = Math.max(8, Math.round(you.maxHp * 0.6))
      you.alive = true
      you.x = w.nest.x
      you.y = w.nest.y
      you.z = w.nest.z
      you.vx = 0
      you.vy = 0
      you.vz = 0
      you.iframes = 1.6
      w.banner = 'You wake in the twig nest.'
      w.bannerT = 3
      ev.push({ t: 'note', x: you.x, y: you.y, text: 'You wake in the twig nest' })
    } else {
      you.alive = false
      w.over = true
      ev.push({ t: 'down', x: you.x, y: you.y, text: 'The body fails' })
    }
  }
  if (bossReady(you.load, you.spent) && !w.bossUnlocked) unlockBoss(w, ev, you)
  const boss = w.ents.find((e) => e.kind === 'boss')
  if (boss && !boss.alive && !w.gateOpen) {
    w.gateOpen = true
    w.banner = 'The Strand Colossus falls. The inland is open.'
    w.bannerT = 6
    ev.push({ t: 'gate', x: boss.x, y: boss.y, text: 'The inland opens' })
  }
  return ev
}

function tell(w: World, ev: Evt[], you: Ent, text: string): void {
  if (w.noteCool > 0) return
  w.noteCool = 1.8
  ev.push({ t: 'note', x: you.x, y: you.y, text })
}

function digAt(w: World, you: Ent, dt: number, ev: Evt[]): void {
  const col = w.columns.find((c) => Math.abs(c.x - you.x) < 3.2)
  if (!col) {
    if (!canDig(you.load, you.spent)) tell(w, ev, you, tierOf(you.spent) < 3 ? 'Digging unlocks at tier 3' : 'Need spade, claw arms, or strong feet')
    else {
      you.bag.mud = (you.bag.mud ?? 0) + dt
      const ax = you.x + Math.cos(you.yaw) * 1.3
      const az = you.z + Math.sin(you.yaw) * 1.3
      const ay = you.y + Math.sin(you.pitch) * 0.8
      carve(ax, ay, az, 1.7, dt * 2.2)
    }
    return
  }
  const tick = digTick(col, you.load, you.spent, dt, compute(you.load, you.spent).heat > 0)
  if (tick.blocked) tell(w, ev, you, tick.blocked)
  if (tick.cell) {
    ev.push({ t: 'dig', x: col.x, y: you.y, text: tick.deep ? 'Deep stone splits' : 'A layer falls' })
    w.debris.push({ x: col.x + (you.id % 3) * 0.2, y: you.y + 1.4, vy: 0.4, life: 1.6, dmg: 0 })
    carve(col.x, you.y - 0.4, you.z, 2.1, 1.15)
  }
  if (tick.deep) dropGem(you, 'deep-stone', ev, w)
  if (tick.trap) armTrap(w, you, tick.trap, col.x, ev)
}

function useNode(w: World, you: Ent, ev: Evt[]): void {
  const node = w.nodes.find((n) => n.amount > 0 && Math.abs(n.x - you.x) < 2.2)
  if (!node) return
  if (node.kind === 'mat') {
    you.bag[node.mat] = (you.bag[node.mat] ?? 0) + node.amount
    node.amount = 0
    ev.push({ t: 'gather', x: node.x, y: 1, text: node.mat })
    return
  }
  if (node.kind === 'tree') {
    const secs = chopSeconds(you.load, you.spent, node.mat)
    if (secs === null) {
      tell(w, ev, you, 'Need a cutting jaw, teeth, or a cutter for this wood')
      return
    }
    node.hp -= 12 / secs
    if (node.hp <= 0) {
      you.bag[node.mat] = (you.bag[node.mat] ?? 0) + node.amount
      node.amount = 0
      ev.push({ t: 'chop', x: node.x, y: 1, text: treeById(node.mat)?.name ?? node.mat })
    }
    return
  }
  const secs = cellSeconds(you.load, you.spent, node.mat)
  if (secs === null) {
    tell(w, ev, you, 'Need a horn, crushing jaw, spade, or breaker for this rock')
    return
  }
  node.hp -= 8 / secs
  if (node.hp <= 0) {
    you.bag.stone = (you.bag.stone ?? 0) + 2
    node.amount = 0
    dropGem(you, node.mat, ev, w)
    ev.push({ t: 'mine', x: node.x, y: 1, text: rockById(node.mat)?.name ?? node.mat })
    carve(node.x, you.y - 0.2, you.z, 1.6, 1)
  }
}

function dropGem(you: Ent, rock: string, ev: Evt[], w: World): void {
  const chance = gemChance(you.load, you.spent, rock)
  const info = rockById(rock)
  if (!info || Math.random() > chance) return
  const pool = info.gem ?? ['topaz']
  const id = pool[Math.floor(Math.random() * pool.length)] ?? 'topaz'
  you.gems[id] = (you.gems[id] ?? 0) + 1
  ev.push({ t: 'gem', x: you.x, y: you.y, text: id })
  w.banner = `A ${id} flashes in the break.`
  w.bannerT = 2.5
}

function armTrap(w: World, you: Ent, trap: string, x: number, ev: Evt[]): void {
  const sense = you.load.barbels ? 1 : 0
  if (trap === 'cavein') {
    w.caveIn = { t: 2.6, x, dmg: 7 }
    w.shake = 0.4
    ev.push({ t: 'warn', x, y: you.y, text: 'The ceiling is about to go' })
    return
  }
  if (trap === 'nest') {
    const n = Math.min(4, RAIDER_CAP - w.raiders.length)
    for (let i = 0; i < n; i++) spawnRaider(w, { id: 0, x, biome: you.region === 'sea' ? 'sea' : 'volcano', tier: 6, name: '', clan: '', owner: 0, hp: 1, maxHp: 1, mats: {}, gems: {}, shield: 0, warn: 0, raidUntil: 0, wave: 1, nextAt: 0, defs: [], online: true }, false)
    w.nestMobs = Math.min(GUARD_CAP + 4, w.nestMobs + n)
    ev.push({ t: 'nest', x, y: you.y, text: sense ? 'You smelled them early' : 'A nest wakes' })
    return
  }
  const dmg = trap === 'lava-vein' ? 8 : trap === 'gas' ? 4 : 3
  hurt(you, Math.max(2, dmg - (sense ? 2 : 0)))
  ev.push({ t: 'trap', x, y: you.y, text: trap })
}

function caveIns(w: World, dt: number, ev: Evt[]): void {
  if (!w.caveIn) return
  w.caveIn.t -= dt
  w.shake = Math.max(w.shake, 0.15)
  if (w.caveIn.t > 0) return
  for (let i = 0; i < 4; i++) {
    w.debris.push({ x: w.caveIn.x + (i - 1.5) * 0.45, y: 6.2, vy: -0.2, life: 2.4, dmg: w.caveIn.dmg * 0.35 })
  }
  ev.push({ t: 'warn', x: w.caveIn.x, y: 4, text: 'Rocks fall' })
  w.caveIn = null
}

function fallDebris(w: World, dt: number, ev: Evt[]): void {
  const you = playerOf(w)
  for (const d of w.debris) {
    d.vy -= 32 * dt
    d.y += d.vy * dt
    d.life -= dt
    if (d.y <= 1.15) {
      d.y = 1.15
      if (d.dmg > 0 && Math.abs(you.x - d.x) < 0.85 && you.y < 2.2) {
        hurt(you, d.dmg)
        ev.push({ t: 'hurt', x: you.x, y: you.y, text: `${Math.ceil(d.dmg)}` })
        w.shake = Math.max(w.shake, 0.2)
        d.dmg = 0
      }
      d.vy = 0
    }
  }
  w.debris = w.debris.filter((d) => d.life > 0)
}

export function nearestInCone(w: World, you: Ent): Ent | undefined {
  let best: Ent | undefined
  let score = 10
  for (const foe of w.ents) {
    if (!foe.alive || foe.id === you.id || foe.kind === 'meat') continue
    if (foe.clan && foe.clan === you.clan) continue
    const dx = foe.x - you.x
    const dz = foe.z - you.z
    const ahead = dx * Math.cos(you.yaw) + dz * Math.sin(you.yaw)
    const side = -dx * Math.sin(you.yaw) + dz * Math.cos(you.yaw)
    if (ahead < -0.8 || ahead > 12) continue
    if (Math.abs(side) > 3.2 + ahead * 0.7) continue
    if (Math.abs(foe.y - you.y) > 3.6) continue
    const dist = Math.hypot(ahead, side, foe.y - you.y)
    if (dist < score) {
      score = dist
      best = foe
    }
  }
  return best
}

function rewardKill(w: World, you: Ent, foe: Ent, ev: Evt[]): void {
  const gain = 4 + Math.round(foe.bias / 4) + (foe.kind === 'boss' ? 40 : 0)
  you.ep += gain
  you.load.size = Math.min(2.2, you.load.size + 0.03)
  const hide = HIDEfor(foe)
  you.bag[hide] = (you.bag[hide] ?? 0) + 1
  you.bag.bones = (you.bag.bones ?? 0) + 1
  ev.push({ t: 'eat', x: foe.x, y: foe.y, text: `+${gain} EP` })
  if (you.kind === 'player' && foe.kind !== 'boss') w.eats += 1
  autoEvolve(foe)
}

function HIDEfor(foe: Ent): string {
  const biome = foe.region === 'sea' ? 'sea' : 'land'
  const band =
    foe.kind === 'boss' ? 5 : foe.region === 'volcano' ? 4 : foe.bias > 30 ? 3 : foe.bias > 10 ? 2 : foe.bias > 2 ? 1 : 0
  const matches = HIDES.filter((h) => h.biome === biome && h.band === band)
  const pool = matches.length ? matches : HIDES.filter((h) => h.biome === biome)
  return pool[foe.id % Math.max(1, pool.length)]?.id ?? (biome === 'sea' ? 'shark' : 'leather')
}

function autoEvolve(e: Ent): void {
  if (e.kind === 'player' || e.ep < 6) return
  const options = ['fin', 'tail', 'jaw', 'teeth']
  const kind = options[e.id % options.length] ?? 'fin'
  const id = kind === 'jaw' ? 'needlejaw' : kind === 'teeth' ? 'needle' : 'next'
  const before = e.spent
  tryPurchase(e, kind, id)
  if (e.spent === before) e.ep += 0
}

function npcThink(w: World, dt: number, ev: Evt[]): void {
  const you = playerOf(w)
  const near = w.ents.filter((e) => e.alive && e.kind !== 'meat' && Math.abs(e.x - you.x) + Math.abs(e.z - you.z) < 40)
  for (const e of w.ents) {
    if (!e.alive || e.kind === 'player' || e.kind === 'meat') continue
    const far = Math.abs(e.x - you.x) + Math.abs(e.z - you.z) > 36
    if (far) {
      e.wander -= dt
      if (e.wander <= 0) {
        e.wander = 2.4
        e.wdir *= -1
      }
      e.yaw += e.wdir * dt * 0.45
      e.x += Math.cos(e.yaw) * 1.1 * dt
      e.z += Math.sin(e.yaw) * 1.1 * dt
      const edge = shoreX(e.z)
      if (e.region === 'sea') e.x = Math.max(4, Math.min(edge - 0.6, e.x))
      if (e.region === 'land') e.x = Math.max(edge + 0.8, Math.min(VOLCANO_X - 2, e.x))
      if (e.region === 'volcano') e.x = Math.max(VOLCANO_X + 2, Math.min(208, e.x))
      e.z = Math.max(-WORLD_Z + 2, Math.min(WORLD_Z - 2, e.z))
      continue
    }
    e.stun = Math.max(0, e.stun - dt)
    e.slow = Math.max(0, e.slow - dt)
    e.biteCd = Math.max(0, e.biteCd - dt)
    let mode: 'wander' | 'chase' | 'flee' = 'wander'
    let target: Ent | undefined
    let best = 99
    for (const o of near) {
      if (o.id === e.id || (o.clan && o.clan === e.clan)) continue
      const d = Math.abs(o.x - e.x) + Math.abs(o.y - e.y)
      if (d > 16) continue
      const rel = power(e) - power(o)
      if (rel > 4 && d < best) {
        best = d
        target = o
        mode = 'chase'
      } else if (rel < -6 && d < 7) {
        mode = 'flee'
        target = o
        break
      } else if (Math.abs(rel) <= 6 && d < 3.5) {
        mode = 'chase'
        target = o
        best = d
      }
      if (e.bias >= 2 && o.kind === 'player' && d < 14) {
        mode = 'chase'
        target = o
        best = d
      }
    }
    if (target && e.hp < e.maxHp * 0.38) mode = 'flee'
    if (e.bias <= 0 && target?.kind === 'player' && e.kind !== 'boss') mode = e.hp < e.maxHp ? 'flee' : 'wander'
    if (e.bias >= 2 && target?.kind === 'player' && best < 14) mode = 'chase'
    const box = bodyBox(e.load, e.spent, e.kind === 'boss', e.species)
    const stats = compute(e.load, e.spent)
    const maxV = (e.region === 'sea' ? 3.2 + stats.swim * 0.08 : 4.2 + stats.spd * 0.08) / Math.sqrt(box.mass)
    const accel = 12 / Math.sqrt(box.mass)
    const teleWas = e.tele
    e.tele = Math.max(0, e.tele - dt)
    e.biteT = Math.max(0, e.biteT - dt)
    let wish = 0
    if (e.stun <= 0 && (mode === 'wander' || !target)) {
      e.wander -= dt
      if (e.wander <= 0) {
        e.wander = 1.6
        e.wdir *= -1
      }
      e.yaw += e.wdir * dt * 0.6
      wish = maxV * 0.45
    } else if (e.stun <= 0 && target && mode === 'flee') {
      e.yaw = Math.atan2(e.z - target.z, e.x - target.x)
      wish = maxV
    } else if (e.stun <= 0 && target) {
      const dx = target.x - e.x
      const dz = target.z - e.z
      e.yaw = Math.atan2(dz, dx)
      const toward = Math.hypot(dx, dz) > 0.2 ? 1 : 0
      const close = best < box.mouth + box.biteR + 1.2
      wish = (close ? Math.sin(w.time * 2.2 + e.id) : toward) * maxV * (e.kind === 'boss' ? 0.85 : 0.95)
      e.facing = Math.cos(e.yaw) >= 0 ? 1 : -1
      const theirs = bodyBox(target.load, target.spent, target.kind === 'boss', target.species)
      const vols = attackVolumes(e.load, e.spent, e.kind === 'boss', e.species, e.x, e.y, e.z, e.yaw)
      const inMouth = !!volumeHits(vols, target.x, target.y, target.z, theirs.rad + theirs.len * 0.15)
      if (inMouth && e.biteCd <= 0 && e.tele <= 0 && teleWas <= 0) {
        e.tele = e.kind === 'boss' ? 0.55 : 0.48
        e.biteT = e.tele
        if (target.kind === 'player' || e.kind === 'boss') ev.push({ t: 'warn', x: e.x, y: e.y, text: `${e.name} lunges!` })
      }
      if (e.tele > 0) wish *= 0.08
      if (teleWas > 0 && e.tele === 0 && inMouth) {
        e.biteCd = 0.7
        let dmg = Math.max(1, Math.round((3 + e.bias / 10) * (0.8 + box.mass * 0.15)))
        if (target.kind === 'player' && target.load.morph) {
          const fx = morphFx(target.load.morph)
          const miss = Math.min(0.75, incomingMissChance(fx) + gearFx(target.bag).evasion)
          const roll = mulberry32((Math.floor(w.time * 1000) ^ e.id ^ target.id) >>> 0)()
          if (roll < miss) {
            ev.push({ t: 'note', x: target.x, y: target.y, text: 'Missed' })
            dmg = 0
          } else if (fx.thorns > 0) {
            hurt(e, fx.thorns)
            ev.push({ t: 'hit', x: e.x, y: e.y, text: `${fx.thorns}` })
          }
        }
        if (dmg > 0) {
          hurt(target, dmg)
          target.vx += Math.cos(e.yaw) * 2.2
          target.vz += Math.sin(e.yaw) * 2.2
          target.stun = Math.max(target.stun, 0.07)
          w.shake = Math.max(w.shake, 0.1)
          // Only announce hits that involve the player or boss — crowded fry nibble each other silently.
          if (target.kind === 'player' || e.kind === 'boss') {
            ev.push({ t: 'hit', x: target.x, y: target.y, text: `${dmg}` })
          }
          if (!target.alive && target.kind !== 'player') {
            e.ep += 3 + e.bias / 10
            autoEvolve(e)
          }
        }
      }
    }
    if (e.slow > 0) wish *= 0.5
    e.vx = approach(e.vx, Math.cos(e.yaw) * wish, e.stun > 0 ? 8 : accel, dt)
    e.vz = approach(e.vz, Math.sin(e.yaw) * wish, e.stun > 0 ? 8 : accel, dt)
    e.x += e.vx * dt
    e.z += e.vz * dt
    const floor = groundAt(e.x, e.z, e.y)
    e.y = e.region === 'sea' ? Math.min(WATER - 0.6, Math.max(floor + 0.8, e.y)) : floor + 0.15
    e.z = Math.max(-WORLD_Z + 2, Math.min(WORLD_Z - 2, e.z))
    const edge = shoreX(e.z)
    if (e.region === 'sea') e.x = Math.max(4, Math.min(edge - 0.6, e.x))
    if (e.region === 'land') e.x = Math.max(edge + 0.8, Math.min(VOLCANO_X - 2, e.x))
    if (e.region === 'volcano') e.x = Math.max(VOLCANO_X + 2, Math.min(208, e.x))
  }
}

function power(e: Ent): number {
  const s = compute(e.load, e.spent)
  return s.bite + s.def + e.maxHp / 12 + e.bias / 4
}

function meats(w: World, you: Ent, ev: Evt[]): void {
  for (const m of w.ents) {
    if (!m.alive || m.kind !== 'meat') continue
    if (Math.abs(m.x - you.x) < 5) m.x += Math.sign(you.x - m.x) * 3 * 0.016
    if (Math.abs(m.x - you.x) < 1.2) {
      m.alive = false
      you.ep += 2
      w.eats += 1
      ev.push({ t: 'eat', x: m.x, y: m.y, text: '+2 EP' })
    }
  }
}

function hazards(w: World, you: Ent, dt: number, ev: Evt[]): void {
  if (you.region !== 'volcano') return
  const g = Math.floor(w.time % 8)
  if (g === 0) w.bannerT = Math.max(w.bannerT, 0.4)
  if (g === 1 && [176, 188, 200].some((x) => Math.abs(you.x - x) < 3)) {
    hurt(you, 10 * dt * 8)
    w.shake = 0.2
    ev.push({ t: 'geyser', x: you.x, y: you.y, text: 'Fire' })
  }
}

function raids(w: World, dt: number, ev: Evt[]): void {
  for (const base of w.bases) {
    base.shield = Math.max(base.shield, 0)
    const owner = w.ents.find((e) => e.id === base.owner)
    base.online = !!(owner?.online || clanOnline(w, base.clan) || (owner?.kind === 'npc' && owner.alive))
    if (base.tier < RAID_MIN_TIER || !base.online || base.shield > w.time) continue
    if (base.warn <= 0 && base.raidUntil <= w.time && w.time >= base.nextAt) {
      base.warn = WARN_SEC
      base.nextAt = w.time + RAID_GAP + WARN_SEC
      w.banner = `${base.name} will be hit in ${WARN_SEC}s`
      w.bannerT = 4
      ev.push({ t: 'alert', x: base.x, y: 3, text: `${base.clan || base.name} raid warning` })
    }
    if (base.warn > 0) {
      base.warn -= dt
      if (base.warn <= 0) startWave(w, base, ev)
    }
  }
  if (w.raiders.length === 0) return
  for (const r of w.raiders) {
    r.stun = Math.max(0, r.stun - dt)
    r.slow = Math.max(0, r.slow - dt)
    const base = w.bases.find((b) => b.id === r.baseId)
    if (!base) continue
    if (r.stun <= 0) r.x += Math.sign(base.x - r.x) * r.spd * (r.slow > 0 ? 0.4 : 1) * dt
    defenses(w, base, r, dt, ev)
    if (Math.abs(r.x - base.x) < 1.3) {
      base.hp -= r.dmg * dt
      if (base.hp <= 0) sack(w, base, r.boss ? 'boss raider' : 'raiders', ev, false)
    }
  }
  for (const g of w.ents) {
    if (g.kind !== 'guard' || !g.alive) continue
    const prey = w.raiders.find((r) => Math.abs(r.x - g.x) < 10)
    if (!prey) continue
    g.x += Math.sign(prey.x - g.x) * 2.2 * dt
    if (Math.abs(g.x - prey.x) < 1.4) prey.hp -= 6 * dt
  }
  w.raiders = w.raiders.filter((r) => r.hp > 0)
  for (const base of w.bases) {
    if (base.raidUntil > w.time && !w.raiders.some((r) => r.baseId === base.id) && base.hp > 0) {
      base.raidUntil = 0
      base.shield = w.time + SHIELD_SEC
      const owner = w.ents.find((e) => e.id === base.owner)
      if (owner) owner.ep += 8 + base.wave * 2
      bump(w.score.defenses, base.clan || owner?.name || 'den')
      ev.push({ t: 'held', x: base.x, y: 2, text: 'Defense held' })
    }
  }
}

function startWave(w: World, base: Base, ev: Evt[]): void {
  base.wave += 1
  base.raidUntil = w.time + 40
  const count = Math.min(RAIDER_CAP - w.raiders.length, 2 + Math.floor(base.tier / 2))
  for (let i = 0; i < count; i++) spawnRaider(w, base, false)
  if (base.wave % 3 === 0 && w.raiders.length < RAIDER_CAP) spawnRaider(w, base, true)
  ev.push({ t: 'wave', x: base.x, y: 3, text: `${base.biome} raiders` })
}

function spawnRaider(w: World, base: Base, boss: boolean): void {
  if (w.raiders.length >= RAIDER_CAP) return
  const name = boss ? 'Boss raider' : base.biome === 'sea' ? 'Sea raider' : base.biome === 'volcano' ? 'Fire raider' : 'Land raider'
  w.raiders.push({
    id: w.nextId++,
    name,
    x: base.x - 14 - Math.random() * 4,
    y: base.biome === 'sea' ? 3 : 1.2,
    hp: boss ? 50 : 16 + base.tier,
    maxHp: boss ? 50 : 16 + base.tier,
    dmg: boss ? 8 : 3,
    spd: boss ? 1.6 : 2.4,
    boss,
    biome: base.biome,
    baseId: base.id,
    stun: 0,
    slow: 0,
  })
}

function defenses(w: World, base: Base, r: Raider, dt: number, ev: Evt[]): void {
  const near = Math.abs(r.x - base.x) < 14
  if (!near) return
  for (const def of base.defs) {
    if (def.hp <= 0) continue
    const spec = defenseById(def.kind)
    if (!spec) continue
    def.cd -= dt
    const dist = Math.abs(r.x - def.x)
    if (dist > spec.range || def.cd > 0) continue
    def.cd = spec.rate / def.mk
    const dmg = spec.dmg * (0.7 + def.mk * 0.35)
    if (spec.heal > 0) {
      const owner = w.ents.find((e) => e.id === base.owner && e.alive)
      if (owner && Math.abs(owner.x - base.x) < spec.range) owner.hp = Math.min(owner.maxHp, owner.hp + spec.heal)
      continue
    }
    if (spec.summon) {
      const guards = w.ents.filter((e) => e.kind === 'guard' && e.alive).length
      if (guards < GUARD_CAP) {
        w.ents.push(make({ id: w.nextId++, kind: 'guard', name: 'Guard', species: 'guard', x: base.x, y: groundAt(base.x, 0, 16) + 0.16, region: 'land', bias: 4 }))
      }
      continue
    }
    r.hp -= dmg
    if (spec.slow) r.slow = Math.max(r.slow, spec.slow)
    if (spec.stun) r.stun = Math.max(r.stun, spec.stun)
    if (spec.decoy) r.slow = Math.max(r.slow, 0.5)
    ev.push({ t: 'tower', x: def.x, y: 2, text: spec.name })
    if (r.hp <= 0 && r.boss) dropGem(playerOf(w), 'geode', ev, w)
  }
}

function sack(w: World, base: Base, by: string, ev: Evt[], attackSuccess: boolean): void {
  const loss = attackSuccess ? 0.32 : 0.35
  for (const key of Object.keys(base.mats)) base.mats[key] = Math.floor((base.mats[key] ?? 0) * (1 - loss))
  for (const key of Object.keys(base.gems)) if (Math.random() < 0.14) base.gems[key] = Math.max(0, (base.gems[key] ?? 0) - 1)
  base.hp = base.maxHp * 0.4
  base.shield = w.time + SHIELD_SEC
  base.raidUntil = 0
  base.warn = 0
  w.raiders = w.raiders.filter((r) => r.baseId !== base.id)
  bump(w.score.raids, by)
  ev.push({ t: 'sacked', x: base.x, y: 2, text: 'Stores looted' })
}

function alert(w: World, base: Base, ev: Evt[], text: string): void {
  ev.push({ t: 'alert', x: base.x, y: 3, text: `${base.clan || 'den'}: ${text}` })
  w.banner = text
  w.bannerT = 2
}

export function buildAt(w: World, kind: string): Buy {
  const you = playerOf(w)
  if (defenseById(kind)) return placeDefense(w, kind)
  const def = buildById(kind)
  if (!def) return placeDefense(w, kind)
  if (tierOf(you.spent) < def.tier) return { ok: false, reason: `Unlocks at tier ${def.tier}` }
  if (def.tier >= 5 && you.load.arms < 2 && kind !== 'burrow' && kind !== 'reinforce') return { ok: false, reason: 'Needs arms' }
  if ((w.bases.filter((b) => b.owner === you.id).length) >= 6) return { ok: false, reason: 'Too many dens' }
  for (const [mat, n] of Object.entries(def.cost)) {
    if ((you.bag[mat] ?? 0) < n) return { ok: false, reason: `Need ${n} ${mat}` }
  }
  for (const [mat, n] of Object.entries(def.cost)) you.bag[mat] = (you.bag[mat] ?? 0) - n
  w.bases.push({
    id: w.nextId++,
    owner: you.id,
    name: def.name,
    tier: Math.max(def.tier, tierOf(you.spent)),
    clan: you.clan,
    x: you.x,
    biome: you.region,
    hp: def.hp,
    maxHp: def.hp,
    mats: {},
    gems: {},
    shield: 0,
    warn: 0,
    raidUntil: 0,
    wave: 0,
    nextAt: w.time + 25,
    defs: [],
    online: true,
  })
  return { ok: true, reason: `${def.name} raised` }
}

export function placeDefense(w: World, kind: string): Buy {
  const you = playerOf(w)
  const base = [...w.bases].reverse().find((b) => b.owner === you.id && Math.abs(b.x - you.x) < 8)
  const spec = defenseById(kind)
  if (!base) return { ok: false, reason: 'Stand by your base' }
  if (!spec) return { ok: false, reason: 'Unknown defense' }
  if (tierOf(you.spent) < spec.tier) return { ok: false, reason: `Unlocks at tier ${spec.tier}` }
  if (base.defs.length >= defenseCap(base.tier)) return { ok: false, reason: 'Defense cap reached' }
  for (const [mat, n] of Object.entries(spec.cost)) if ((you.bag[mat] ?? 0) < n) return { ok: false, reason: `Need ${n} ${mat}` }
  for (const [mat, n] of Object.entries(spec.cost)) you.bag[mat] = (you.bag[mat] ?? 0) - n
  base.defs.push({ uid: w.nextId++, kind, mk: 1, hp: spec.hp, maxHp: spec.hp, cd: 0, x: you.x })
  return { ok: true, reason: `${spec.name} set` }
}

export function upgradeDefense(w: World, uid: number): Buy {
  const you = playerOf(w)
  for (const base of w.bases) {
    const def = base.defs.find((d) => d.uid === uid && base.owner === you.id)
    if (!def) continue
    if (def.mk >= 3) return { ok: false, reason: 'Mk III already' }
    const cost = 4 + def.mk * 3
    if (you.ep < cost) return { ok: false, reason: `Need ${cost} EP` }
    you.ep -= cost
    you.spent += cost
    def.mk = (def.mk + 1) as 1 | 2 | 3
    def.maxHp = Math.round(def.maxHp * 1.35)
    def.hp = def.maxHp
    return { ok: true, reason: `Mk ${def.mk}` }
  }
  return { ok: false, reason: 'No such tower' }
}

export function snapshotWorld(w: World): { columns: { x: number; dug: number; prog: number }[]; nodes: { id: number; mat: string; amount: number; hp: number }[]; bases: Base[]; pieces: Piece[] } {
  return {
    columns: w.columns.map((c) => ({ x: c.x, dug: c.dug, prog: c.prog })),
    nodes: w.nodes.map((n) => ({ id: n.id, mat: n.mat, amount: n.amount, hp: n.hp })),
    bases: w.bases.map((b) => ({ ...b, defs: b.defs.map((d) => ({ ...d })) })),
    pieces: w.pieces.map((p) => ({ ...p })),
  }
}

export function applyWorldSnapshot(w: World, data: { columns?: { x: number; dug: number; prog: number }[]; nodes?: { id: number; mat: string; amount: number; hp: number }[]; bases?: Base[]; pieces?: Piece[] }): void {
  if (data.columns) {
    for (const saved of data.columns) {
      const col = w.columns.find((c) => c.x === saved.x)
      if (!col || !Number.isFinite(saved.dug)) continue
      col.dug = Math.max(0, Math.min(24, saved.dug))
      col.prog = Math.max(0, Math.min(1, saved.prog || 0))
    }
  }
  if (data.nodes) {
    for (const saved of data.nodes) {
      const node = w.nodes.find((n) => n.mat === saved.mat && n.id === saved.id) ?? w.nodes.find((n) => n.mat === saved.mat)
      if (!node || !Number.isFinite(saved.amount)) continue
      node.amount = Math.max(0, saved.amount)
      if (Number.isFinite(saved.hp)) node.hp = Math.max(0, saved.hp)
    }
  }
  if (data.bases) {
    for (const saved of data.bases) {
      if (!saved || typeof saved.id !== 'number') continue
      const existing = w.bases.find((b) => b.id === saved.id)
      if (existing) {
        if (Number.isFinite(saved.hp)) existing.hp = saved.hp
        if (Number.isFinite(saved.maxHp)) existing.maxHp = saved.maxHp
        if (saved.mats) existing.mats = saved.mats
        if (saved.gems) existing.gems = saved.gems
        if (Array.isArray(saved.defs)) existing.defs = saved.defs
        if (Number.isFinite(saved.tier)) existing.tier = saved.tier
        if (Number.isFinite(saved.x)) existing.x = saved.x
      } else if (typeof saved.name === 'string' && Number.isFinite(saved.x)) {
        w.bases.push(saved)
        w.nextId = Math.max(w.nextId, saved.id + 1)
      }
    }
  }
  if (data.pieces) {
    w.pieces = data.pieces.filter((p) => p && typeof p.id === 'number' && typeof p.kind === 'string' && Number.isFinite(p.x))
    for (const pce of w.pieces) w.nextId = Math.max(w.nextId, pce.id + 1)
  }
}
