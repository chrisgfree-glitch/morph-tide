import type { Loadout, Pick, Step } from './catalog'
import {
  ARM_COST,
  ARM_TYPES,
  ARMOR_LINE,
  BREAKERS,
  CUTTERS,
  EYE_LINE,
  FEET,
  FIN_LINE,
  GEMS,
  HORNS,
  JAWS,
  LEG_LINE,
  LUNG_LINE,
  TAIL_LINE,
  TEETH,
  TIER_SPENT,
  WING_COST,
  WING_STYLES,
  armById,
  breakerById,
  cutterById,
  feetById,
  hornById,
  jawById,
  rockById,
  styleById,
  teethById,
  treeById,
} from './catalog'

export interface Stats {
  bite: number
  kick: number
  def: number
  hp: number
  spd: number
  swim: number
  fly: number
  vision: number
  dig: number
  air: number
  grip: number
  heat: number
  scale: number
}

export interface Progress {
  ep: number
  spent: number
  load: Loadout
  unlocked: string[]
}

export function tierOf(spent: number): number {
  let tier = 1
  for (let i = 0; i < TIER_SPENT.length; i++) if (spent >= TIER_SPENT[i]!) tier = i + 1
  return tier
}

export function maxWings(tier: number): number {
  if (tier < 5) return 0
  if (tier === 5) return 2
  if (tier === 6) return 4
  if (tier === 7) return 6
  if (tier === 8) return 7
  return 8
}

export function toolMk(tier: number): 0 | 1 | 2 | 3 {
  if (tier >= 7) return 3
  if (tier >= 6) return 2
  if (tier >= 4) return 1
  return 0
}

export function rockClass(rockTier: number): 'soft' | 'med' | 'hard' | 'very' {
  if (rockTier <= 2) return 'soft'
  if (rockTier <= 5) return 'med'
  if (rockTier <= 8) return 'hard'
  return 'very'
}

export function woodClass(cls: string): 'soft' | 'med' | 'hard' | 'very' {
  if (cls === 'soft') return 'soft'
  if (cls === 'hard') return 'hard'
  if (cls === 'very') return 'very'
  return 'med'
}

function addPick(s: Stats, item: Pick | undefined): void {
  if (!item) return
  s.bite += item.bite ?? 0
  s.spd += item.spd ?? 0
  s.def += item.def ?? 0
  s.swim += item.swim ?? 0
  s.kick += item.kick ?? 0
  s.grip += item.grip ?? 0
  s.dig += item.dig ?? 0
  s.vision += item.vision ?? 0
  s.fly += item.fly ?? 0
}

function addStep(s: Stats, line: Step[], index: number): void {
  const step = line[Math.max(0, Math.min(line.length - 1, index))]
  if (!step) return
  s.bite += step.bite ?? 0
  s.spd += step.spd ?? 0
  s.def += step.def ?? 0
  s.swim += step.swim ?? 0
  s.air += step.air ?? 0
  s.fly += step.fly ?? 0
  s.vision = Math.max(s.vision, step.vision ?? 0)
  s.hp += step.hp ?? 0
  s.kick += step.kick ?? 0
  s.grip += step.grip ?? 0
}

export function compute(load: Loadout, spent: number): Stats {
  const tier = tierOf(spent)
  const s: Stats = {
    bite: 6,
    kick: 1,
    def: 0,
    hp: 28,
    spd: 6.2,
    swim: 7.4,
    fly: 0,
    vision: 8,
    dig: 0,
    air: 0,
    grip: 0,
    heat: 0,
    scale: load.size,
  }
  addPick(s, jawById(load.jaw))
  addPick(s, teethById(load.teeth))
  if (load.legs > 0) addPick(s, feetById(load.feet))
  addPick(s, hornById(load.horn))
  addStep(s, FIN_LINE, load.fin)
  addStep(s, TAIL_LINE, load.tail)
  addStep(s, ARMOR_LINE, load.armor)
  addStep(s, EYE_LINE, load.eyes)
  addStep(s, LUNG_LINE, load.lungs)
  const legIndex = load.legs === 0 ? 0 : load.legs === 2 ? 1 : load.legs === 4 ? 2 : load.legs === 6 ? 3 : 4
  addStep(s, LEG_LINE, legIndex)
  if (load.arms >= 2) addPick(s, armById(load.armType))
  addPick(s, breakerById(load.breaker))
  addPick(s, cutterById(load.cutter))
  if (load.camo) s.vision -= 0
  const pairs = Math.min(load.wings, maxWings(tier))
  const style = styleById(load.wingStyle)
  let fly = 0
  for (let i = 1; i <= pairs; i++) fly += 2.2 * 0.82 ** (i - 1)
  s.fly += fly * (style?.fly ?? 1)
  s.spd += (style?.spd ?? 0) * (pairs > 0 ? 1 : 0)
  s.bite += (style?.bite ?? 0) * (pairs > 0 ? 1 : 0)
  s.def += (style?.def ?? 0) * (pairs > 0 ? 1 : 0)
  s.swim += (style?.swim ?? 0) * (pairs > 0 ? 1 : 0)
  s.kick += (style?.kick ?? 0) * (pairs > 0 ? 1 : 0)
  s.def -= pairs * 0.35
  s.spd -= pairs * 0.12
  if (load.camo) s.spd += 0
  if (load.lure) s.bite += 0
  if (load.spines) s.def += 1
  if (load.ink) s.spd += 0.1
  if (load.barbels) s.vision += 3
  if (tier >= 5) s.scale += 0.12
  if (tier >= 8) s.scale += 0.28
  const gem = GEMS.find((g) => g.id === load.spec)
  if (gem && tier >= 10) {
    s.bite += gem.bite
    s.def += gem.def
    s.spd += gem.spd
    s.hp += gem.hp
    s.swim += gem.swim
    s.fly += gem.fly
  }
  s.heat = (load.armor >= 2 ? 1 : 0) + (load.lungs >= 2 ? 1 : 0) + (load.spec === 'ruby' || load.spec === 'jade' ? 1 : 0)
  s.bite = Math.max(1, s.bite)
  s.def = Math.max(0, s.def)
  s.hp = Math.max(16, Math.round(s.hp))
  s.spd = Math.max(2.2, s.spd)
  s.swim = Math.max(3, s.swim)
  s.fly = Math.max(0, s.fly)
  s.vision = Math.max(6, s.vision)
  return s
}

export function canDig(load: Loadout, spent: number): boolean {
  if (tierOf(spent) < 3) return false
  const feet = load.feet
  const arms = load.arms >= 2 ? load.armType : ''
  return arms === 'spade' || arms === 'claw' || feet === 'claw' || feet === 'sickle' || feet === 'elephant'
}

export function landOk(load: Loadout, spent: number): boolean {
  return tierOf(spent) >= 2 && load.lungs >= 1
}

export interface Buy {
  ok: boolean
  reason: string
}

function pay(p: Progress, cost: number, reason: string): Buy {
  if (p.ep < cost) return { ok: false, reason: `Need ${cost - p.ep} more EP` }
  p.ep -= cost
  p.spent += cost
  return { ok: true, reason }
}

function grantPick(p: Progress, list: Pick[], id: string, equip: (id: string) => void): Buy {
  const item = list.find((x) => x.id === id)
  if (!item) return { ok: false, reason: 'Unknown part' }
  const tier = tierOf(p.spent)
  if (p.unlocked.includes(id)) {
    equip(id)
    return { ok: true, reason: 'Equipped' }
  }
  if (tier < item.tier) return { ok: false, reason: `Unlocks at tier ${item.tier}` }
  const bought = pay(p, item.cost, item.name)
  if (!bought.ok) return bought
  p.unlocked.push(id)
  equip(id)
  return bought
}

function grantStep(p: Progress, line: Step[], index: number, set: (n: number) => void): Buy {
  const next = index + 1
  const step = line[next]
  if (!step) return { ok: false, reason: 'Line complete' }
  if (tierOf(p.spent) < step.tier) return { ok: false, reason: `Unlocks at tier ${step.tier}` }
  const bought = pay(p, step.cost, step.name)
  if (!bought.ok) return bought
  set(next)
  return bought
}

export function purchase(p: Progress, kind: string, id: string): Buy {
  const L = p.load
  if (kind === 'jaw') return grantPick(p, JAWS, id, (x) => (L.jaw = x))
  if (kind === 'teeth') return grantPick(p, TEETH, id, (x) => (L.teeth = x))
  if (kind === 'feet') return grantPick(p, FEET, id, (x) => (L.feet = x))
  if (kind === 'horn') return grantPick(p, HORNS, id, (x) => (L.horn = x))
  if (kind === 'wingStyle') {
    if (tierOf(p.spent) < 5) return { ok: false, reason: 'Unlocks at tier 5' }
    return grantPick(p, WING_STYLES, id, (x) => (L.wingStyle = x))
  }
  if (kind === 'armType') {
    if (tierOf(p.spent) < 5) return { ok: false, reason: 'Unlocks at tier 5' }
    return grantPick(p, ARM_TYPES, id, (x) => (L.armType = x))
  }
  if (kind === 'breaker') {
    if (tierOf(p.spent) < 4) return { ok: false, reason: 'Unlocks at tier 4' }
    return grantPick(p, BREAKERS, id, (x) => (L.breaker = x))
  }
  if (kind === 'cutter') {
    if (tierOf(p.spent) < 4) return { ok: false, reason: 'Unlocks at tier 4' }
    return grantPick(p, CUTTERS, id, (x) => (L.cutter = x))
  }
  if (kind === 'fin') return grantStep(p, FIN_LINE, L.fin, (n) => (L.fin = n))
  if (kind === 'tail') return grantStep(p, TAIL_LINE, L.tail, (n) => (L.tail = n))
  if (kind === 'armor') return grantStep(p, ARMOR_LINE, L.armor, (n) => (L.armor = n))
  if (kind === 'eyes') return grantStep(p, EYE_LINE, L.eyes, (n) => (L.eyes = n))
  if (kind === 'lungs') return grantStep(p, LUNG_LINE, L.lungs, (n) => (L.lungs = n))
  if (kind === 'legs') {
    const idx = L.legs === 0 ? 0 : L.legs === 2 ? 1 : L.legs === 4 ? 2 : L.legs === 6 ? 3 : 4
    return grantStep(p, LEG_LINE, idx, (n) => (L.legs = [0, 2, 4, 6, 8][n] ?? 0))
  }
  if (kind === 'wings') {
    const tier = tierOf(p.spent)
    if (L.wings >= maxWings(tier)) return { ok: false, reason: L.wings >= 8 ? 'Eight pairs already' : `Unlocks at a higher tier` }
    const cost = WING_COST[L.wings + 1] ?? 0
    const bought = pay(p, cost, `${L.wings + 1} wing pairs`)
    if (!bought.ok) return bought
    L.wings += 1
    return bought
  }
  if (kind === 'arms') {
    const idx = L.arms === 0 ? 0 : L.arms === 2 ? 1 : L.arms === 4 ? 2 : 3
    const next = idx + 1
    if (next > 3) return { ok: false, reason: 'Arm line complete' }
    if (tierOf(p.spent) < 5) return { ok: false, reason: 'Unlocks at tier 5' }
    const cost = ARM_COST[next] ?? 0
    const bought = pay(p, cost, `${[0, 2, 4, 6][next]} arms`)
    if (!bought.ok) return bought
    L.arms = [0, 2, 4, 6][next] ?? 0
    return bought
  }
  if (kind === 'camo' || kind === 'lure' || kind === 'spines' || kind === 'ink' || kind === 'barbels') {
    if (tierOf(p.spent) < 1) return { ok: false, reason: 'Locked' }
    const key = kind as 'camo' | 'lure' | 'spines' | 'ink' | 'barbels'
    if (L[key]) return { ok: true, reason: 'Already grown' }
    const bought = pay(p, 5, kind)
    if (!bought.ok) return bought
    L[key] = 1
    return bought
  }
  if (kind === 'color' || kind === 'accent') {
    const n = Number(id)
    if (kind === 'color') L.color = n
    else L.accent = n
    return { ok: true, reason: 'Color set' }
  }
  if (kind === 'spec') {
    if (L.spec) return { ok: false, reason: 'Already specialized' }
    if (tierOf(p.spent) < 10) return { ok: false, reason: 'Unlocks at tier 10' }
    const gem = GEMS.find((g) => g.id === id)
    if (!gem) return { ok: false, reason: 'Unknown gem' }
    return { ok: false, reason: `Needs ${gem.need} ${gem.id} and 40 EP` }
  }
  return { ok: false, reason: 'No such upgrade' }
}

export function buySpec(p: Progress, gemId: string, have: number): Buy {
  if (p.load.spec) return { ok: false, reason: 'Already specialized' }
  if (tierOf(p.spent) < 10) return { ok: false, reason: 'Unlocks at tier 10' }
  const gem = GEMS.find((g) => g.id === gemId)
  if (!gem) return { ok: false, reason: 'Unknown gem' }
  if (have < gem.need) return { ok: false, reason: `Need ${gem.need} ${gem.name}` }
  if (p.ep < 40) return { ok: false, reason: 'Need 40 EP' }
  p.ep -= 40
  p.spent += 40
  p.load.spec = gemId
  return { ok: true, reason: gem.note }
}

export function pvpFactor(attacker: number, defenderTier: number, offline: boolean, shielded: boolean, pvpOn: boolean): number {
  if (!pvpOn) return 0
  if (defenderTier < 5) return 0
  if (Math.abs(attacker - defenderTier) > 2) return 0
  if (shielded) return 0
  if (offline) return 0.25
  return 1
}

export function defenseCap(tier: number): number {
  return Math.min(8, Math.max(2, tier - 2))
}

export function cellSeconds(load: Loadout, spent: number, rockId: string): number | null {
  const rock = rockById(rockId)
  if (!rock) return null
  const tier = tierOf(spent)
  const mk = toolMk(tier)
  const cls = rock.tier <= 2 ? 'soft' : rock.tier <= 5 ? 'med' : rock.tier <= 8 ? 'hard' : 'very'
  if (rock.tier <= 2) {
    if (!canDig(load, spent)) return null
    const spade = load.arms >= 2 && load.armType === 'spade'
    return spade ? 5 : 9
  }
  const tool = breakerById(load.breaker)
  if (!tool || mk < 1) return null
  if (cls === 'very' && mk < 3) return null
  if (cls === 'hard' && mk < 2) return null
  const power = cls === 'soft' ? tool.soft : cls === 'med' ? tool.med : cls === 'hard' ? tool.hard : tool.very
  const mkMul = mk === 1 ? 1 : mk === 2 ? 1.45 : 2.1
  const factor = power * mkMul
  if (factor <= 0) return null
  const base = cls === 'soft' ? 8 : cls === 'med' ? 40 : cls === 'hard' ? 50 : 70
  return base / factor
}

export function chopSeconds(load: Loadout, spent: number, treeId: string): number | null {
  const tree = treeById(treeId)
  if (!tree) return null
  const tier = tierOf(spent)
  const mk = toolMk(tier)
  if (tier < 4 && load.size < 1.5 && compute(load, spent).bite < 14) return null
  const cls = woodClass(tree.cls)
  if ((cls === 'very' || cls === 'hard') && mk < 2 && !load.cutter) return null
  if (cls === 'very' && mk < 3) return null
  const tool = cutterById(load.cutter)
  const power = tool ? (cls === 'soft' ? tool.soft : cls === 'med' ? tool.med : cls === 'hard' ? tool.hard : tool.very) : 0.45
  const mkMul = mk >= 3 ? 2 : mk === 2 ? 1.4 : 1
  const size = load.size > 1.45 && tool?.id === 'ram' ? 1.4 : 1
  return Math.max(2, 8 / (power * mkMul * size))
}

export function gemChance(load: Loadout, spent: number, rockId: string): number {
  const rock = rockById(rockId)
  if (!rock) return 0
  const tool = breakerById(load.breaker)
  const mk = toolMk(tierOf(spent))
  return Math.min(0.2, rock.gemChance + (tool?.very ?? 0) * 0.01 * mk)
}
