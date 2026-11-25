import type { Loadout, Pick, Step } from './catalog'
import { applyMorphStats, canGoAshore, hornSharpness, partById } from './evolve'
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
  HIDES,
  HORNS,
  SKINS,
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

export const FISH_STAGES = ['guppy', 'steelhead', 'sturgeon'] as const

/** Next fish costs the EP still needed to reach that tier. Sturgeon is the last of the three. */
export function fishGoal(spent: number, ep: number): { stage: string; next: string | null; cost: number; line: string } {
  const tier = tierOf(spent)
  const stage = FISH_STAGES[Math.min(2, tier - 1)] ?? 'guppy'
  if (tier >= 3) {
    return { stage: 'sturgeon', next: null, cost: 0, line: 'You are a sturgeon. Next goal: reach the first shore.' }
  }
  const need = TIER_SPENT[tier] ?? spent
  const cost = Math.max(0, need - spent)
  const next = FISH_STAGES[tier] ?? 'sturgeon'
  return { stage, next, cost, line: `Defeat creatures to earn EP. ${cost} EP grows a ${next}. You have ${Math.floor(ep)}.` }
}

export function growFish(ep: number, spent: number): { ok: boolean; reason: string; ep: number; spent: number } {
  const goal = fishGoal(spent, ep)
  if (!goal.next) return { ok: false, reason: 'The sturgeon is grown. Next: reach the first shore.', ep, spent }
  if (ep < goal.cost) return { ok: false, reason: `Need ${goal.cost} EP to grow a ${goal.next}.`, ep, spent }
  const line = goal.next === 'steelhead' ? 'You are a steelhead. Next: eat and grow a sturgeon.' : 'You are a sturgeon. Next goal: reach the first shore.'
  return { ok: true, reason: line, ep: ep - goal.cost, spent: spent + goal.cost }
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
  if (load.morph && load.morph.v) {
    applyMorphStats(s, load.morph)
  } else {
    const hide = SKINS[(load.skin || 1) - 1]
    if (hide) {
      s.def += hide.def
      s.hp += hide.hp
      s.spd += hide.spd
    }
  }
  if (spent <= 0 && load.size <= 0.5 && load.lungs < 1 && load.legs === 0) s.bite = Math.min(s.bite, 2)
  s.bite = Math.max(1, s.bite)
  s.def = Math.max(0, s.def)
  s.hp = Math.max(16, Math.round(s.hp))
  s.spd = Math.max(2.2, s.spd)
  s.swim = Math.max(3, s.swim)
  s.fly = Math.max(0, s.fly)
  s.vision = Math.max(6, s.vision)
  return s
}


/** Combined bite + horn sharpness. A normal 15–20 minute build reaches 10 via a bite head, Spiny Fin, a horn, or Spiny Armor plus a small extra. */
export const BOSS_ATTACK = 10

export function attackPower(load: Loadout, spent: number): number {
  const s = compute(load, spent)
  const morph = load.morph
  if (!morph?.horn) return s.bite
  return s.bite + hornSharpness(partById(morph.horn), morph.hornLv)
}

export function bossReady(load: Loadout, spent: number): boolean {
  return attackPower(load, spent) >= BOSS_ATTACK - 1e-9
}

export function formatAttack(n: number): string {
  const v = Math.round(n * 10) / 10
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** Shown in the HUD and Evolve menu until the first boss is unlocked. */
export function bossMeterLine(load: Loadout, spent: number): string {
  const atk = attackPower(load, spent)
  if (atk >= BOSS_ATTACK - 1e-9) return `Attack ${formatAttack(atk)} / ${BOSS_ATTACK} — boss unlocked`
  return `Attack ${formatAttack(atk)} / ${BOSS_ATTACK} to face the boss`
}

export function canDig(load: Loadout, spent: number): boolean {
  if (tierOf(spent) < 3) return false
  const feet = load.feet
  const arms = load.arms >= 2 ? load.armType : ''
  return arms === 'spade' || arms === 'claw' || feet === 'claw' || feet === 'sickle' || feet === 'elephant'
}

export function landOk(load: Loadout, _spent?: number): boolean {
  return canGoAshore(load)
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

export function hideStock(bag: Record<string, number>): number {
  return HIDES.reduce((n, h) => n + (bag[h.id] ?? 0), 0)
}

function spendHides(bag: Record<string, number>, need: number): void {
  let left = need
  for (const h of HIDES) {
    if (left <= 0) break
    const have = bag[h.id] ?? 0
    const take = Math.min(have, left)
    if (take) bag[h.id] = have - take
    left -= take
  }
}

/** Next skin tier. DNA is EP and does not raise the evolution tier. */
export function buySkin(p: Progress, bag: Record<string, number>, gems: Record<string, number>): Buy {
  const cur = Math.max(1, p.load.skin || 1)
  if (cur >= SKINS.length) return { ok: false, reason: 'Skin line complete' }
  const step = SKINS[cur]
  if (!step) return { ok: false, reason: 'Skin line complete' }
  if (p.ep < step.dna) return { ok: false, reason: `Need ${step.dna} DNA` }
  if (hideStock(bag) < step.hides) return { ok: false, reason: `Need ${step.hides} hides` }
  if (step.mat && (bag[step.mat] ?? 0) < step.matN) return { ok: false, reason: `Need ${step.matN} ${step.mat}` }
  if (step.gem && (gems[step.gem] ?? 0) < step.gemN) return { ok: false, reason: `Need ${step.gemN} ${step.gem}` }
  p.ep -= step.dna
  spendHides(bag, step.hides)
  if (step.mat) bag[step.mat] = (bag[step.mat] ?? 0) - step.matN
  if (step.gem) gems[step.gem] = (gems[step.gem] ?? 0) - step.gemN
  p.load.skin = cur + 1
  return { ok: true, reason: step.name }
}

export function buySpec(p: Progress, gemId: string, have: number): Buy {
  if (p.load.spec) return { ok: false, reason: 'Already specialized' }
  if (tierOf(p.spent) < 10) return { ok: false, reason: 'Unlocks at tier 10' }
  const gem = GEMS.find((g) => g.id === gemId)
  if (!gem) return { ok: false, reason: 'Unknown gem' }
  if (have < gem.need) return { ok: false, reason: `Need ${gem.need} ${gem.name}` }
  if (p.ep < 1000) return { ok: false, reason: 'Need 1000 EP' }
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

const ROCK_JAW = new Set(['hook', 'under', 'pincer', 'hammer', 'tusk', 'plate'])
const ROCK_TEETH = new Set(['molar', 'tusk', 'row'])
const WOOD_JAW = new Set(['hook', 'pincer', 'saw', 'tusk', 'under'])
const WOOD_TEETH = new Set(['needle', 'row', 'peg', 'saber', 'radula', 'molar'])

/** Horns, crushing jaws, and spade arms vs a rock hardness class. 0 means no help. */
export function bodyBreakPower(load: Loadout, cls: 'soft' | 'med' | 'hard' | 'very'): number {
  let power = 0
  const horn = hornById(load.horn)
  if (horn && horn.feat && horn.feat !== 'none') {
    const mul = cls === 'soft' ? 0.85 : cls === 'med' ? 1.15 : cls === 'hard' ? 0.7 : 0.2
    power += (0.28 + (horn.bite ?? 0) * 0.08) * mul
  }
  const jaw = jawById(load.jaw)
  if (jaw && (ROCK_JAW.has(jaw.feat ?? '') || (jaw.bite ?? 0) >= 6)) {
    const mul = cls === 'soft' || cls === 'med' ? 1 : 0.3
    power += (0.16 + (jaw.bite ?? 0) * 0.05) * mul
  }
  const teeth = teethById(load.teeth)
  if (teeth && ROCK_TEETH.has(teeth.feat ?? '')) power += 0.12 * (cls === 'very' ? 0.2 : 1)
  if (load.arms >= 2 && load.armType === 'spade') power += cls === 'soft' ? 0.9 : cls === 'med' ? 0.4 : 0.12
  if (load.arms >= 2 && (load.armType === 'claw' || load.armType === 'blade')) power += cls === 'soft' ? 0.35 : 0.1
  const feet = feetById(load.feet)
  if (feet && (feet.dig ?? 0) > 0) power += (feet.dig ?? 0) * (cls === 'soft' ? 0.35 : 0.08)
  return power
}

/** Jaws, cutting teeth, and bladed arms vs a wood class. */
export function bodyChopPower(load: Loadout, cls: 'soft' | 'med' | 'hard' | 'very'): number {
  let power = 0
  const jaw = jawById(load.jaw)
  if (jaw && (WOOD_JAW.has(jaw.feat ?? '') || (jaw.bite ?? 0) >= 5)) {
    const mul = cls === 'soft' ? 1.1 : cls === 'med' ? 0.9 : cls === 'hard' ? 0.45 : 0.15
    power += (0.22 + (jaw.bite ?? 0) * 0.06) * mul
  }
  const teeth = teethById(load.teeth)
  if (teeth && WOOD_TEETH.has(teeth.feat ?? '')) {
    const mul = cls === 'soft' || cls === 'med' ? 1 : 0.35
    power += (0.14 + (teeth.bite ?? 0) * 0.04) * mul
  }
  if (load.arms >= 2 && (load.armType === 'blade' || load.armType === 'claw')) {
    power += load.armType === 'blade' ? (cls === 'very' ? 0.15 : 0.45) : 0.2
  }
  const horn = hornById(load.horn)
  if (horn && (horn.feat === 'crest' || horn.feat === 'spike')) power += cls === 'soft' ? 0.2 : 0.08
  return power
}

export function cellSeconds(load: Loadout, spent: number, rockId: string): number | null {
  const rock = rockById(rockId)
  if (!rock) return null
  const tier = tierOf(spent)
  const mk = toolMk(tier)
  const cls = rockClass(rock.tier)
  const body = bodyBreakPower(load, cls)
  if (rock.tier <= 2) {
    if (!canDig(load, spent) && body <= 0) return null
    const spade = load.arms >= 2 && load.armType === 'spade'
    if (spade) return 5
    if (canDig(load, spent)) return 9
    return Math.max(6, 12 / Math.max(0.35, body))
  }
  const tool = breakerById(load.breaker)
  if (tool && mk >= 1) {
    if (cls === 'very' && mk < 3) return null
    if (cls === 'hard' && mk < 2) return null
    const power = cls === 'soft' ? tool.soft : cls === 'med' ? tool.med : cls === 'hard' ? tool.hard : tool.very
    const mkMul = mk === 1 ? 1 : mk === 2 ? 1.45 : 2.1
    const factor = power * mkMul + body * 0.15
    if (factor <= 0) return null
    const base = cls === 'soft' ? 8 : cls === 'med' ? 40 : cls === 'hard' ? 50 : 70
    return base / factor
  }
  if (cls === 'very') return null
  if (cls === 'hard' && body < 0.85) return null
  if (body <= 0) return null
  const base = cls === 'med' ? 52 : 70
  return base / body
}

export function chopSeconds(load: Loadout, spent: number, treeId: string): number | null {
  const tree = treeById(treeId)
  if (!tree) return null
  const tier = tierOf(spent)
  const mk = toolMk(tier)
  const cls = woodClass(tree.cls)
  const body = bodyChopPower(load, cls)
  const bite = compute(load, spent).bite
  const canPart = body >= (cls === 'soft' ? 0.2 : cls === 'med' ? 0.35 : cls === 'hard' ? 0.7 : 1.2)
  if (tier < 4 && load.size < 1.5 && bite < 14 && !load.cutter && !canPart) return null
  if ((cls === 'very' || cls === 'hard') && mk < 2 && !load.cutter && body < 0.7) return null
  if (cls === 'very' && mk < 3) return null
  const tool = cutterById(load.cutter)
  const power = (tool ? (cls === 'soft' ? tool.soft : cls === 'med' ? tool.med : cls === 'hard' ? tool.hard : tool.very) : 0) + body * (tool ? 0.2 : 1)
  if (power <= 0) return null
  const mkMul = mk >= 3 ? 2 : mk === 2 ? 1.4 : 1
  const size = load.size > 1.45 && tool?.id === 'ram' ? 1.4 : 1
  const fallback = tool ? 0 : cls === 'soft' ? 0.55 : 0.4
  return Math.max(2, 8 / (Math.max(power, fallback) * mkMul * size))
}

export function gemChance(load: Loadout, spent: number, rockId: string): number {
  const rock = rockById(rockId)
  if (!rock) return 0
  const tool = breakerById(load.breaker)
  const mk = toolMk(tierOf(spent))
  return Math.min(0.2, rock.gemChance + (tool?.very ?? 0) * 0.01 * mk)
}
