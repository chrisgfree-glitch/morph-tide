import type { Loadout } from './catalog'
import { GEMS, GUARD_CAP, RAID_GAP, RAID_MIN_TIER, RAIDER_CAP, SHIELD_SEC, WARN_SEC, buildById, defenseById, rockById, starterLoad, treeById } from './catalog'
import { digTick, fullColumn, tubeColumn, ventColumn, type Column } from './dig'
import { buySpec, canDig, cellSeconds, chopSeconds, compute, defenseCap, gemChance, landOk, purchase, pvpFactor, tierOf, type Buy, type Progress } from './rules'

export interface Ent {
  id: number
  kind: 'player' | 'npc' | 'boss' | 'meat' | 'guard'
  name: string
  species: string
  x: number
  y: number
  vx: number
  vy: number
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
  kind: 'mat' | 'tree' | 'rock'
  mat: string
  x: number
  amount: number
  hp: number
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
  score: { raids: Record<string, number>; defenses: Record<string, number> }
  caveIn: { t: number; x: number; dmg: number } | null
  nestMobs: number
}

export interface Frame {
  ax: number
  ay: number
  jump: boolean
  bite: boolean
  dig: boolean
  use: boolean
  ink: boolean
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
    vx: 0,
    vy: 0,
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
    air: compute(load, spent).air,
    salt: partial.id,
    respawn: 0,
    bias: partial.bias ?? 0,
    stun: 0,
    slow: 0,
    online: partial.online ?? true,
  }
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
    banner: 'Shallows. Eat, then spend EP. Lungs open the shore.',
    bannerT: 5,
    shake: 0,
    score: { raids: {}, defenses: {} },
    caveIn: null,
    nestMobs: 0,
  }
  w.ents.push(make({ id: w.nextId++, kind: 'player', name: 'Tidewisp', species: 'you', x: 8, y: 4 }))
  const seeds: [string, string, number, number, Ent['region'], number][] = [
    ['Brine shrimp', 'shrimp', 18, 3.4, 'sea', 0],
    ['Kelp dart', 'needle', 28, 5, 'sea', 2],
    ['Ghost bell', 'bell', 40, 4, 'sea', 6],
    ['Plate bug', 'plate', 52, 2.4, 'sea', 10],
    ['Shore crab', 'crab', 76, 1.1, 'land', 0],
    ['Amber beetle', 'beetle', 84, 1.1, 'land', 2],
    ['Reed newt', 'newt', 92, 1.1, 'land', 1],
    ['Dune lizard', 'lizard', 100, 1.1, 'land', 6],
    ['Inland hunter', 'hunter', 118, 1.2, 'land', 26],
    ['Plate brute', 'brute', 132, 1.2, 'land', 34],
    ['Magma beetle', 'magma', 178, 1.3, 'volcano', 20],
  ]
  for (const [name, species, x, y, region, bias] of seeds) {
    const spent = bias > 20 ? 100 : bias > 8 ? 40 : 8
    const load = starterLoad()
    if (region !== 'sea') {
      load.lungs = 1
      load.legs = 4
      load.feet = 'claw'
    }
    if (bias > 20) {
      load.jaw = 'shark'
      load.armor = 2
    }
    w.ents.push(make({ id: w.nextId++, kind: 'npc', name, species, x, y, region, bias, spent, load }))
  }
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
    ['mat', 'sticks', 78],
    ['mat', 'mud', 88],
    ['mat', 'vines', 96],
    ['mat', 'resin', 108],
    ['tree', 'palm', 94],
    ['tree', 'oak', 110],
    ['rock', 'granite', 104],
    ['rock', 'flint', 122],
    ['tree', 'bloodwood', 174],
    ['rock', 'lavarock', 180],
    ['rock', 'obsidian', 188],
    ['rock', 'geode', 170],
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
  const result = kind === 'spec' ? buySpec(p, id, e.gems[id] ?? 0) : purchase(p, kind, id)
  if (result.ok && kind === 'spec') {
    const need = GEMS.find((g) => g.id === id)?.need ?? 0
    e.gems[id] = Math.max(0, (e.gems[id] ?? 0) - need)
  }
  if (result.ok) saveProg(e, p)
  return result
}

function regionAt(x: number): Ent['region'] {
  if (x < 66) return 'sea'
  if (x > 168) return 'volcano'
  return 'land'
}

function hurt(e: Ent, amount: number): void {
  e.hp -= amount
  if (e.hp <= 0) {
    e.hp = 0
    e.alive = false
    if (e.kind === 'npc') e.respawn = 8
  }
}

function clanOnline(w: World, clan: string): boolean {
  if (!clan) return false
  return w.ents.some((e) => e.alive && e.online && e.clan === clan)
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1
}

export function step(w: World, dt: number, input: Frame): Evt[] {
  const ev: Evt[] = []
  w.time += dt
  w.bannerT = Math.max(0, w.bannerT - dt)
  w.shake = Math.max(0, w.shake - dt)
  const you = playerOf(w)
  if (!you.alive) return ev
  const stats = compute(you.load, you.spent)
  const swimming = you.x < 68
  if (!landOk(you.load, you.spent)) you.x = Math.min(you.x, 62)
  if (input.ax < -0.15) you.facing = -1
  if (input.ax > 0.15) you.facing = 1
  const drag = you.slow > 0 ? 0.5 : 1
  if (swimming) {
    you.vx += (input.ax * stats.swim * drag - you.vx) * Math.min(1, dt * 4)
    const rise = input.ay !== 0 ? input.ay : input.jump ? 1 : 0
    you.vy += (rise * stats.swim - you.vy) * Math.min(1, dt * 4)
    you.air = stats.air
  } else {
    you.vx += (input.ax * stats.spd * drag - you.vx) * Math.min(1, dt * 6)
    you.vy -= 22 * dt
    if (you.y <= 1.12 && you.vy < 0) {
      you.y = 1.1
      you.vy = 0
    }
    if (input.jump && you.y <= 1.2) you.vy = 8.5 + Math.min(4, you.load.legs) * 0.35
    if (you.load.wings > 0 && input.jump && you.y > 1.3) you.vy = Math.max(you.vy, Math.min(6, stats.fly))
    const heat = you.region === 'volcano' && stats.heat <= 0
    you.air -= dt * (heat ? 1.6 : 1)
    if (you.x < 72) you.air = Math.min(stats.air, you.air + dt * 6)
    if (you.load.lungs > 0 && you.air <= 0) {
      you.air = 0
      hurt(you, 4 * dt * 3)
    }
  }
  you.stun = Math.max(0, you.stun - dt)
  you.slow = Math.max(0, you.slow - dt)
  if (you.stun <= 0) {
    you.x += you.vx * dt
    you.y += you.vy * dt
  }
  you.y = Math.max(0.5, Math.min(8.2, you.y))
  you.x = Math.max(2, Math.min(212, you.x))
  you.region = regionAt(you.x)
  you.biteCd = Math.max(0, you.biteCd - dt)
  you.biteT = Math.max(0, you.biteT - dt)
  if (input.bite && you.biteCd <= 0) {
    you.biteCd = 0.42
    you.biteT = 0.12
    you.swing = true
    ev.push({ t: 'bite', x: you.x, y: you.y, text: '' })
  }
  if (you.swing) {
    you.swing = false
    for (const foe of w.ents) {
      if (!foe.alive || foe.id === you.id || foe.kind === 'meat') continue
      if (foe.clan && foe.clan === you.clan) continue
      if (Math.abs(foe.x - you.x) < 1.9 && Math.abs(foe.y - you.y) < 1.5 && (foe.x - you.x) * you.facing > -0.35) {
        const dmg = Math.max(1, Math.round(stats.bite))
        hurt(foe, dmg)
        ev.push({ t: 'hit', x: foe.x, y: foe.y, text: `${dmg}` })
        if (!foe.alive) rewardKill(w, you, foe, ev)
      }
    }
    for (const base of w.bases) {
      if (!w.pvp || base.owner === you.id || Math.abs(base.x - you.x) > 2.4) continue
      const owner = w.ents.find((e) => e.id === base.owner)
      const offline = !(owner?.online || clanOnline(w, base.clan))
      const factor = pvpFactor(tierOf(you.spent), base.tier, offline, base.shield > w.time, w.pvp)
      if (factor <= 0) ev.push({ t: 'note', x: base.x, y: 2, text: base.tier < RAID_MIN_TIER ? 'Young bases are protected' : 'Raid blocked by tier, shield, or flag' })
      else {
        base.hp -= Math.max(1, Math.round(stats.bite * factor))
        alert(w, base, ev, 'Player raid')
        if (base.hp <= 0) sack(w, base, you.name, ev, true)
      }
    }
  }
  if (input.dig) digAt(w, you, dt, ev)
  if (input.use) useNode(w, you, ev)
  npcThink(w, dt, ev)
  meats(w, you, ev)
  hazards(w, you, dt, ev)
  caveIns(w, dt, ev)
  raids(w, dt, ev)
  for (const e of w.ents) {
    if (!e.alive && e.kind === 'npc' && (e.respawn -= dt) <= 0) {
      e.alive = true
      e.hp = e.maxHp
      e.x = e.home
    }
  }
  if (you.hp <= 0) {
    you.alive = false
    w.over = true
    ev.push({ t: 'down', x: you.x, y: you.y, text: 'The body fails' })
  }
  if (!w.ents.some((e) => e.kind === 'boss' && e.alive) && you.x > 128 && !w.won && !w.ents.some((e) => e.kind === 'boss')) {
    const load = starterLoad()
    load.jaw = 'croc'
    load.armor = 3
    load.size = 1.8
    load.legs = 6
    load.feet = 'claw'
    load.lungs = 1
    w.ents.push(make({ id: w.nextId++, kind: 'boss', name: 'Strand Colossus', species: 'boss', x: 142, y: 1.4, region: 'land', spent: 140, load, bias: 80, maxHp: 170 }))
    w.banner = 'Strand Colossus'
    w.bannerT = 3
  }
  const boss = w.ents.find((e) => e.kind === 'boss')
  if (boss && !boss.alive && !w.won) {
    w.won = true
    w.banner = 'The shore goes quiet.'
    w.bannerT = 6
    ev.push({ t: 'win', x: boss.x, y: boss.y, text: 'Eden is further on' })
  }
  return ev
}

function digAt(w: World, you: Ent, dt: number, ev: Evt[]): void {
  const col = w.columns.find((c) => Math.abs(c.x - you.x) < 3.2)
  if (!col) {
    if (!canDig(you.load, you.spent)) ev.push({ t: 'note', x: you.x, y: you.y, text: tierOf(you.spent) < 3 ? 'Digging unlocks at tier 3' : 'Need spade, claw arms, or strong feet' })
    else you.bag.mud = (you.bag.mud ?? 0) + dt
    return
  }
  const tick = digTick(col, you.load, you.spent, dt, compute(you.load, you.spent).heat > 0)
  if (tick.blocked) ev.push({ t: 'note', x: you.x, y: you.y, text: tick.blocked })
  if (tick.cell) ev.push({ t: 'dig', x: col.x, y: you.y, text: tick.deep ? 'Deep stone splits' : 'A layer falls' })
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
      ev.push({ t: 'note', x: you.x, y: you.y, text: 'Wood cutting unlocks at tier 4' })
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
    ev.push({ t: 'note', x: you.x, y: you.y, text: 'Rock breaking unlocks at tier 4' })
    return
  }
  node.hp -= 8 / secs
  if (node.hp <= 0) {
    you.bag.stone = (you.bag.stone ?? 0) + 2
    node.amount = 0
    dropGem(you, node.mat, ev, w)
    ev.push({ t: 'mine', x: node.x, y: 1, text: rockById(node.mat)?.name ?? node.mat })
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
  const you = playerOf(w)
  if (Math.abs(you.x - w.caveIn.x) < 2.5) {
    hurt(you, w.caveIn.dmg)
    ev.push({ t: 'hurt', x: you.x, y: you.y, text: 'Rocks' })
  }
  w.caveIn = null
}

function rewardKill(w: World, you: Ent, foe: Ent, ev: Evt[]): void {
  const gain = 4 + Math.round(foe.bias / 4) + (foe.kind === 'boss' ? 40 : 0)
  you.ep += gain
  you.load.size = Math.min(2.2, you.load.size + 0.03)
  const hide = HIDEfor(foe)
  you.bag[hide] = (you.bag[hide] ?? 0) + 1
  you.bag.bones = (you.bag.bones ?? 0) + 1
  ev.push({ t: 'eat', x: foe.x, y: foe.y, text: `+${gain} EP` })
  autoEvolve(foe)
  if (foe.kind === 'boss') w.won = true
}

function HIDEfor(foe: Ent): string {
  return foe.region === 'sea' ? 'shark' : foe.bias > 20 ? 'platehide' : 'leather'
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
  const living = w.ents.filter((e) => e.alive && e.kind !== 'meat')
  for (const e of w.ents) {
    if (!e.alive || e.kind === 'player' || e.kind === 'meat') continue
    e.stun = Math.max(0, e.stun - dt)
    e.slow = Math.max(0, e.slow - dt)
    e.biteCd = Math.max(0, e.biteCd - dt)
    let mode: 'wander' | 'chase' | 'flee' = 'wander'
    let target: Ent | undefined
    let best = 99
    for (const o of living) {
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
    }
    if (e.stun > 0) continue
    const rate = e.slow > 0 ? 0.45 : 1
    if (mode === 'wander' || !target) {
      e.wander -= dt
      if (e.wander <= 0) {
        e.wander = 1.4
        e.wdir *= -1
      }
      e.vx = e.wdir * 1.4 * rate
    } else if (mode === 'flee') {
      e.vx = Math.sign(e.x - target.x) * 2.4 * rate || e.wdir
    } else {
      e.vx = Math.sign(target.x - e.x) * (e.kind === 'boss' ? 2.2 : 2.6) * rate || 1
      e.facing = e.vx < 0 ? -1 : 1
      if (best < 1.8 && e.biteCd <= 0) {
        e.biteCd = 0.8
        const dmg = Math.max(1, 4 + Math.round(e.bias / 8))
        hurt(target, dmg)
        ev.push({ t: 'hit', x: target.x, y: target.y, text: `${dmg}` })
        if (!target.alive && target.kind !== 'player') {
          e.ep += 3 + e.bias / 10
          autoEvolve(e)
        }
      }
    }
    e.x += e.vx * dt
    if (e.region === 'sea') e.x = Math.max(4, Math.min(60, e.x))
    if (e.region === 'land') e.x = Math.max(70, Math.min(160, e.x))
    if (e.region === 'volcano') e.x = Math.max(170, Math.min(208, e.x))
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
        w.ents.push(make({ id: w.nextId++, kind: 'guard', name: 'Guard', species: 'guard', x: base.x, y: 1.2, region: 'land', bias: 4 }))
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
