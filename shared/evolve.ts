/** E.V.O.-style morph catalog, purchases, refunds, and old-save conversion.
 * Pure module: no DOM, no THREE, safe for a later server to reuse.
 */

import { starterLoad, type Loadout } from './catalog'
import type { Progress, Stats } from './rules'

export type Branch = 'guppy' | 'fish' | 'octopus'
export type Category = 'skin' | 'head' | 'horn' | 'fin' | 'dorsal' | 'rear' | 'extraRear' | 'tail' | 'limb' | 'lungs' | 'armor'
export type Place = 'side' | 'belly' | 'back' | 'rear' | 'side+belly'

export interface Morph {
  /** Schema stamp so old saves can be converted once. */
  v: number
  branch: Branch
  skin: string
  head: string
  horn: string
  hornLv: number
  sideFin: string
  bellyFin: string
  dorsal: string
  /** One rear fin, placed low toward the tail — not on the back. */
  rear: string
  /** Fish-only stacked extra rear fins, 0–2, also low toward the tail. */
  extraRear: number
  tail: string
  limb: string
  /** Shared — lets any branch go ashore. */
  lungs: string
  /** Shared back armor, distinct from skins and dorsals. */
  armor: string
  /** Full EP actually paid, keyed like "skin:scales" or "horn:lance:2". */
  paid: Record<string, number>
}

export interface PartDef {
  id: string
  name: string
  category: Category
  /** Purchase cost, or level-I cost when `costs` is set. */
  cost: number
  /** Horn levels I–III. */
  costs?: [number, number, number]
  branch?: 'fish' | 'octopus'
  place?: Place
  sharpness?: number
  /** Combat / locomotion tags used by the sim. */
  tags: string[]
  desc: string
  bite?: number
  spd?: number
  def?: number
  swim?: number
  hp?: number
  vision?: number
  evasion?: number
  /** Hit-chance penalty for attackers, separate from evasion and stacks with it. */
  deter?: number
  thorns?: number
  dmgReduce?: number
  heat?: number
  air?: number
  /** Turn-rate bonus (maneuverability). */
  turn?: number
  /** Acceleration bonus (agility). */
  accel?: number
}

export interface MorphFx {
  evasion: number
  deter: number
  thorns: number
  glow: boolean
  stun: boolean
  darkSight: boolean
  bleedResist: number
  biteResist: number
  coldResist: boolean
  dmgReduce: number
  bleed: number
  pierce: boolean
  knock: boolean
  breakRock: boolean
  burn: number
  whipStun: boolean
  slam: boolean
  slap: boolean
  slash: boolean
  shock: boolean
  lure: boolean
  landMove: boolean
  hornSharp: number
  hornMulFull: number
  turn: number
  accel: number
}

export interface SwapPrompt {
  kind: 'branch-swap' | 'fin-swap'
  from: Branch
  to: Branch
  refund: number
  lose: string[]
  message: string
}

export type BuyOk = { ok: true; refund: number; swapped?: string; message?: string }
export type BuyFail = { ok: false; reason: string; prompt?: SwapPrompt }
export type BuyResult = BuyOk | BuyFail

export const MORPH_VERSION = 1

export const SKIN_IDS = [
  'scales',
  'slime',
  'spiny',
  'plates',
  'bio',
  'leather',
  'blubber',
  'whale',
  'orca',
  'magma',
] as const

export function emptyMorph(): Morph {
  return {
    v: MORPH_VERSION,
    branch: 'guppy',
    skin: '',
    head: 'guppy',
    horn: '',
    hornLv: 0,
    sideFin: 'fan',
    bellyFin: '',
    dorsal: 'ridge',
    rear: '',
    extraRear: 0,
    tail: 'fantail',
    limb: '',
    lungs: '',
    armor: '',
    paid: {},
  }
}

function part(
  id: string,
  name: string,
  category: Category,
  cost: number,
  extra: Partial<PartDef> & { desc: string; tags?: string[] },
): PartDef {
  const { tags, ...rest } = extra
  return { id, name, category, cost, tags: tags ?? [], ...rest }
}

export const SKINS: PartDef[] = [
  part('scales', 'Scales', 'skin', 250, { spd: 0.45, swim: 0.35, desc: 'Light overlapping scales. A little more speed.', tags: ['scales'] }),
  part('slime', 'Slime / Eel', 'skin', 500, { evasion: 0.18, spd: 0.2, desc: 'Slick mucus coat. Harder for jaws to hold.', tags: ['evasion'] }),
  part('spiny', 'Spiny Armor', 'skin', 875, { bite: 1.5, thorns: 2, def: 1, desc: 'Needle spines return damage to biters.', tags: ['thorns'] }),
  part('plates', 'Bony Plates', 'skin', 1250, { def: 4, hp: 8, spd: -0.15, desc: 'Heavy osteoderms. High defense.', tags: ['plates'] }),
  part('bio', 'Bioluminescent Hide', 'skin', 1750, { vision: 4, desc: 'Living glow. Stun-flash in the dark, and you can see in it.', tags: ['glow', 'stun', 'dark-sight'] }),
  part('leather', 'Shark Leather', 'skin', 2250, { hp: 18, spd: -0.3, swim: -0.25, desc: 'Dense denticle hide. Less bite and bleed damage, 5% slower.', tags: ['bite-resist', 'bleed-resist'] }),
  part('blubber', 'Blubber', 'skin', 2875, { hp: 14, bite: 2, spd: -0.55, swim: -0.4, desc: 'Thick fat. Stronger bites, cold resistance, slower swim.', tags: ['cold'] }),
  part('whale', 'Whale-tough', 'skin', 3500, { def: 3, hp: 22, dmgReduce: 0.28, spd: -0.2, desc: 'Very high damage reduction.', tags: ['reduce'] }),
  part('orca', 'Orca', 'skin', 4250, { bite: 5, hp: 16, spd: 0.55, swim: 0.5, def: 2, desc: 'Apex contrast hide. Power, pace, and presence.', tags: ['apex'] }),
  part('magma', 'Magma Scale', 'skin', 5000, { def: 3, hp: 12, heat: 2, bite: 2, desc: 'Tenth hide. Fire-tempered scales shrug heat and scorch on contact.', tags: ['heat', 'burn'] }),
]

export const HEADS: PartDef[] = [
  part('guppy', 'Guppy', 'head', 0, { desc: 'The starting nibbler.', tags: [] }),
  part('salmon', 'Salmon', 'head', 200, { branch: 'fish', swim: 0.6, spd: 0.35, desc: 'Streamlined cranum. Better current speed.', tags: [] }),
  part('pike', 'Pike', 'head', 300, { branch: 'fish', bite: 3, desc: 'Long predatory snout. A heavier bite.', tags: [] }),
  part('angler', 'Angler', 'head', 400, { branch: 'fish', bite: 2, vision: 2, desc: 'Lure on a stalk. Draws prey in the dark.', tags: ['lure', 'dark-sight'] }),
  part('hammerhead', 'Hammerhead', 'head', 450, { branch: 'fish', vision: 5, spd: 0.2, desc: 'Wide cephalofoil. Excellent tracking.', tags: [] }),
  part('swordfish', 'Swordfish Bill', 'head', 550, { branch: 'fish', bite: 2, spd: 0.4, desc: 'A piercing bill for high-speed charges.', tags: ['pierce'] }),
  part('frog', 'Frog', 'head', 250, { branch: 'octopus', bite: 1, spd: 0.25, desc: 'Wide mouth and a springy jump on land.', tags: ['jump'] }),
  part('axolotl', 'Axolotl', 'head', 350, { branch: 'octopus', hp: 12, desc: 'External gills. Slow, steady regeneration.', tags: ['regen'] }),
  part('turtle', 'Turtle', 'head', 400, { branch: 'octopus', def: 3, bite: 1, desc: 'Beaked and shielded. Extra defense.', tags: [] }),
  part('hornedfrog', 'Horned Frog', 'head', 450, { branch: 'octopus', bite: 3, desc: 'A cavernous bite and horned brow.', tags: [] }),
  part('salamander', 'Giant Salamander', 'head', 500, { branch: 'octopus', hp: 16, bite: 2, desc: 'Broad amphibian head. Heavy and hardy.', tags: ['slam'] }),
]

export const HORNS: PartDef[] = [
  part('nub', 'Bone Nub', 'horn', 200, { costs: [200, 350, 550], sharpness: 2, desc: 'A blunt starter horn. Damage scales with speed.', tags: [] }),
  part('coral', 'Coral Spike', 'horn', 300, { costs: [300, 500, 800], sharpness: 4, desc: 'Serrated coral. Applies bleed.', tags: ['bleed'] }),
  part('lance', 'Spiral Lance', 'horn', 400, { costs: [400, 700, 1100], sharpness: 6, desc: 'Rams 2.5× at full speed and pierces armor.', tags: ['pierce', 'full-rush'] }),
  part('crest', 'Hammer Crest', 'horn', 450, { costs: [450, 750, 1200], sharpness: 5, desc: 'Blunt hammer. Knockback, and it can break rocks.', tags: ['blunt', 'knock', 'break-rock'] }),
  part('trident', 'Obsidian Trident', 'horn', 600, { costs: [600, 1000, 1600], sharpness: 9, desc: 'Three volcanic tines. Burns on hit.', tags: ['burn'] }),
]

export const FINS: PartDef[] = [
  part('fan', 'Fan', 'fin', 150, { place: 'side', swim: 0.25, spd: 0.15, desc: 'Simple paired fans. Modest speed. Cheapest fish-branch fin.', tags: [] }),
  part('spinyfin-side', 'Spiny Fin', 'fin', 250, { branch: 'fish', place: 'side', bite: 3.5, swim: 0.15, desc: 'Basic fish-branch pecs. The biggest attack boost of the fin set.', tags: [] }),
  part('dolphin', 'Dolphin Fin', 'fin', 450, { branch: 'fish', place: 'side', swim: 1.15, spd: 0.7, evasion: 0.16, desc: 'Very high speed plus evasion: attacks against you are less likely to hit. Second-fastest fins, after Manta.', tags: ['evasion'] }),
  part('lionfish', 'Lionfish Fin', 'fin', 600, { branch: 'fish', place: 'side', deter: 0.14, def: 0.5, desc: 'Defensive deterrence only. Venomous spines and warning colors lower an attacker\'s chance to hit. Separate from evasion and stacks with it.', tags: ['deter'] }),
  part('sharkfin-side', 'Shark Fin', 'fin', 750, { branch: 'fish', place: 'side', bite: 1.75, swim: 0.55, spd: 0.35, desc: 'A smaller attack boost than Spiny Fin, but more speed than Fan.', tags: [] }),
  part('manta', 'Manta Fin', 'fin', 1000, { branch: 'fish', place: 'side', swim: 1.45, spd: 0.95, desc: 'The largest and fastest fins. Endgame tier. Faster overall than Dolphin Fin.', tags: [] }),
  part('flying', 'Flying-fish Wings', 'fin', 400, { place: 'side', swim: 0.7, spd: 0.55, desc: 'Long gliding pecs. Fast surface runs.', tags: ['glide'] }),
  part('lobe', 'Lobe', 'fin', 300, { place: 'belly', swim: 0.2, spd: 0.15, desc: 'Fleshy belly fins. A first step toward limbs.', tags: [] }),
]

export const LIMBS: PartDef[] = [
  part('mudskipper', 'Mudskipper', 'limb', 450, { branch: 'octopus', place: 'side+belly', spd: 0.2, desc: 'Stout amphibious limbs for wet sand and shallows.', tags: ['land'] }),
  part('webbed', 'Webbed Limbs', 'limb', 550, { branch: 'octopus', place: 'side+belly', swim: 0.4, spd: 0.25, desc: 'Webbed arms and belly limbs. Needs the octopus body; extra rear fins must come off.', tags: ['land'] }),
  part('sallegs', 'Salamander Legs', 'limb', 650, { branch: 'octopus', place: 'side+belly', spd: 0.3, hp: 6, desc: 'True walking legs on the sides and belly.', tags: ['land'] }),
]

export const LUNGS: PartDef[] = [
  part('lungs', 'Lungs', 'lungs', 250, {
    desc: 'Breathe on land. Buy this (or octopus land limbs) to go ashore.',
    tags: ['lungs'],
    air: 8,
  }),
]

export const ARMORS: PartDef[] = [
  part('bonescales', 'Bone Scales', 'armor', 350, {
    place: 'back',
    def: 2,
    hp: 4,
    desc: 'Overlapping bone scales along the back. Light back armor. Distinct from the Bony Plates skin and from dorsals.',
    tags: ['back-armor'],
  }),
  part('plating', 'Plating', 'armor', 700, {
    place: 'back',
    def: 4,
    hp: 6,
    spd: -0.12,
    desc: 'Heavy plates along the back. High defense, a little slower. Distinct from dorsals and from the Bony Plates skin.',
    tags: ['back-armor'],
  }),
]

export const DORSALS: PartDef[] = [
  part('ridge', 'Low Ridge', 'dorsal', 125, { place: 'back', swim: 0.1, desc: 'A low stabilizing ridge.', tags: [] }),
  part('spinyfin', 'Spiny Dorsal', 'dorsal', 250, { place: 'back', thorns: 1, def: 0.5, desc: 'A row of defensive spines along the back. Distinct from Spiny Fin.', tags: ['thorns'] }),
  part('sail', 'Sail', 'dorsal', 350, { place: 'back', swim: 0.4, spd: 0.2, desc: 'A tall sail for current and display.', tags: [] }),
  part('sharkfin', 'Shark Dorsal', 'dorsal', 400, { branch: 'fish', place: 'back', swim: 0.5, spd: 0.35, desc: 'The classic fish-branch cutter dorsal. Distinct from Shark Fin.', tags: [] }),
  part('newt', 'Newt Crest', 'dorsal', 350, { branch: 'octopus', place: 'back', swim: 0.25, desc: 'A soft amphibian crest.', tags: [] }),
]

export const TAILS: PartDef[] = [
  part('fantail', 'Fan', 'tail', 150, { swim: 0.25, desc: 'A rounded caudal fan. Close-range slap that staggers prey.', tags: ['slap'] }),
  part('forked', 'Forked', 'tail', 250, { swim: 0.5, spd: 0.25, bite: 1, desc: 'A forked tail built for pace. A cutting slash on the pass.', tags: ['slash'] }),
  part('eel', 'Eel', 'tail', 300, { swim: 0.35, evasion: 0.06, desc: 'A long ribbon tail. Slippery in weeds, and a shocking lash.', tags: ['shock'] }),
  part('thresher', 'Thresher', 'tail', 500, { swim: 0.3, bite: 1, desc: 'A whip-long upper lobe. Stun swipe.', tags: ['whip-stun'] }),
  part('barbed', 'Barbed Salamander', 'tail', 550, { branch: 'octopus', bite: 2, desc: 'A heavy, barbed tail. Slam attack.', tags: ['slam'] }),
]

export const REARS: PartDef[] = [
  part('lowrear', 'Low Ridge Rear Fin', 'rear', 150, { place: 'rear', turn: 0.12, accel: 0.08, desc: 'A low keel near the tail, not on the back. Modest turn and acceleration.', tags: ['agility'] }),
  part('spinyrear', 'Spiny Rear Fin', 'rear', 250, { place: 'rear', turn: 0.18, accel: 0.1, desc: 'A spiny keel low toward the tail. Distinct from Spiny Fin and Spiny Dorsal. Sharper turning.', tags: ['agility'] }),
  part('sailrear', 'Sail Rear Fin', 'rear', 350, { place: 'rear', turn: 0.16, accel: 0.22, desc: 'A small sail set low by the tail, not on the back. Strong acceleration.', tags: ['agility'] }),
  part('dorsalrear', 'Dorsal-style Rear Fin', 'rear', 450, { place: 'rear', turn: 0.24, accel: 0.2, desc: 'A dorsal-shaped fin placed low toward the tail, not on the back. High maneuverability.', tags: ['agility'] }),
]

export const EXTRA_REAR: PartDef = part('extraRear', 'Extra rear fin', 'extraRear', 250, {
  branch: 'fish',
  place: 'rear',
  turn: 0.1,
  accel: 0.1,
  desc: 'Stack up to two extra rear fins, low toward the tail. Each improves turn rate and acceleration. Fish branch only. Taking webbed limbs will swap these off.',
  tags: ['agility'],
})

const ALL_PARTS: PartDef[] = [...SKINS, ...HEADS, ...HORNS, ...FINS, ...LIMBS, ...LUNGS, ...ARMORS, ...DORSALS, ...REARS, ...TAILS, EXTRA_REAR]

export function allParts(): PartDef[] {
  return ALL_PARTS
}

export function partById(id: string): PartDef | undefined {
  return ALL_PARTS.find((p) => p.id === id)
}

export function partsIn(cat: Category): PartDef[] {
  if (cat === 'extraRear') return [EXTRA_REAR]
  return ALL_PARTS.filter((p) => p.category === cat && p.id !== 'guppy')
}

export function morphOf(load: Loadout): Morph {
  return load.morph ?? emptyMorph()
}

export function ensureMorph(load: Loadout): Morph {
  if (!load.morph || load.morph.v !== MORPH_VERSION) load.morph = emptyMorph()
  if (!load.morph.paid) load.morph.paid = {}
  return load.morph
}

/** Map a legacy 1–20 skin index onto the new named hide line. Skin 1 stays bare. */
export function mapLegacySkin(index: number): string {
  if (!index || index <= 1) return ''
  const i = Math.min(SKIN_IDS.length, index - 1) - 1
  return SKIN_IDS[Math.max(0, i)] ?? ''
}

export function isLegacyLoad(load: Loadout | undefined): boolean {
  if (!load) return false
  if (!load.morph || load.morph.v !== MORPH_VERSION) return true
  return false
}

/** Old saves become a guppy with the matching skin. EP is kept by the caller. */
export function convertToGuppy(load: Loadout | undefined, keptSkin?: string): Loadout {
  const next = starterLoad()
  const morph = emptyMorph()
  const skin = keptSkin ?? mapLegacySkin(load?.skin ?? 1)
  morph.skin = skin
  if (load) {
    next.color = load.color
    next.accent = load.accent
  }
  if (skin) {
    const def = partById(skin)
    if (def) morph.paid[`skin:${skin}`] = def.cost
  }
  next.skin = skin ? SKIN_IDS.indexOf(skin as (typeof SKIN_IDS)[number]) + 2 : 1
  next.morph = morph
  return next
}

export function hornSharpness(def: PartDef | undefined, level: number): number {
  if (!def) return 0
  const lv = Math.max(1, Math.min(3, level || 1))
  const base = def.sharpness ?? 0
  if (lv === 1) return base
  if (lv === 2) return base * 1.5
  return base * 2
}

/** damage = sharpness × (1 + speed / topSpeed). Spiral Lance is 2.5× at full speed. */
export function hornDamage(morph: Morph, speed: number, topSpeed: number): number {
  const def = partById(morph.horn)
  if (!def || !morph.hornLv) return 0
  const sharp = hornSharpness(def, morph.hornLv)
  const top = Math.max(0.01, topSpeed)
  const ratio = Math.max(0, Math.min(1, speed / top))
  const rush = def.tags.includes('full-rush') && ratio >= 0.98 ? 2.5 : 1
  return sharp * (1 + ratio) * rush
}

export function morphFx(morph: Morph): MorphFx {
  const fx: MorphFx = {
    evasion: 0,
    deter: 0,
    thorns: 0,
    glow: false,
    stun: false,
    darkSight: false,
    bleedResist: 0,
    biteResist: 0,
    coldResist: false,
    dmgReduce: 0,
    bleed: 0,
    pierce: false,
    knock: false,
    breakRock: false,
    burn: 0,
    whipStun: false,
    slam: false,
    slap: false,
    slash: false,
    shock: false,
    lure: false,
    landMove: false,
    hornSharp: 0,
    hornMulFull: 1,
    turn: 0,
    accel: 0,
  }
  const apply = (def: PartDef | undefined) => {
    if (!def) return
    fx.evasion += def.evasion ?? 0
    fx.deter += def.deter ?? 0
    fx.thorns += def.thorns ?? 0
    fx.dmgReduce += def.dmgReduce ?? 0
    fx.turn += def.turn ?? 0
    fx.accel += def.accel ?? 0
    if (def.tags.includes('glow')) fx.glow = true
    if (def.tags.includes('stun')) fx.stun = true
    if (def.tags.includes('dark-sight')) fx.darkSight = true
    if (def.tags.includes('bleed-resist')) fx.bleedResist = Math.max(fx.bleedResist, 0.45)
    if (def.tags.includes('bite-resist')) fx.biteResist = Math.max(fx.biteResist, 0.35)
    if (def.tags.includes('cold')) fx.coldResist = true
    if (def.tags.includes('bleed')) fx.bleed = Math.max(fx.bleed, 2)
    if (def.tags.includes('pierce')) fx.pierce = true
    if (def.tags.includes('knock')) fx.knock = true
    if (def.tags.includes('break-rock')) fx.breakRock = true
    if (def.tags.includes('burn')) fx.burn = Math.max(fx.burn, 2)
    if (def.tags.includes('whip-stun')) fx.whipStun = true
    if (def.tags.includes('slam')) fx.slam = true
    if (def.tags.includes('slap')) fx.slap = true
    if (def.tags.includes('slash')) fx.slash = true
    if (def.tags.includes('shock')) fx.shock = true
    if (def.tags.includes('lure')) fx.lure = true
    if (def.tags.includes('land')) fx.landMove = true
  }
  apply(partById(morph.skin))
  apply(partById(morph.head))
  apply(partById(morph.horn))
  apply(partById(morph.sideFin))
  apply(partById(morph.bellyFin))
  apply(partById(morph.dorsal))
  apply(partById(morph.rear))
  apply(partById(morph.tail))
  apply(partById(morph.limb))
  apply(partById(morph.lungs))
  apply(partById(morph.armor))
  if (morph.extraRear > 0) {
    const n = Math.min(2, morph.extraRear)
    const extra = partById('extraRear')
    fx.turn += (extra?.turn ?? 0.1) * n
    fx.accel += (extra?.accel ?? 0.1) * n
  }
  if (morph.horn) {
    const h = partById(morph.horn)
    fx.hornSharp = hornSharpness(h, morph.hornLv)
    fx.hornMulFull = h?.tags.includes('full-rush') ? 2.5 : 1
  }
  if (morph.skin === 'leather') {
    fx.biteResist = Math.max(fx.biteResist, 0.35)
    fx.bleedResist = Math.max(fx.bleedResist, 0.45)
  }
  if (morph.skin === 'whale') fx.dmgReduce = Math.max(fx.dmgReduce, 0.28)
  if (morph.branch === 'octopus' && morph.limb) fx.landMove = true
  return fx
}

export function applyMorphStats(s: Stats, morph: Morph): void {
  const add = (def: PartDef | undefined) => {
    if (!def) return
    s.bite += def.bite ?? 0
    s.spd += def.spd ?? 0
    s.def += def.def ?? 0
    s.swim += def.swim ?? 0
    s.hp += def.hp ?? 0
    s.vision += def.vision ?? 0
    s.heat += def.heat ?? 0
    s.air += def.air ?? 0
  }
  add(partById(morph.skin))
  add(partById(morph.head === 'guppy' ? '' : morph.head))
  add(partById(morph.sideFin === 'fan' && morph.branch === 'guppy' ? '' : morph.sideFin))
  add(partById(morph.bellyFin))
  add(partById(morph.dorsal === 'ridge' && morph.branch === 'guppy' ? '' : morph.dorsal))
  add(partById(morph.tail === 'fantail' || (morph.tail === 'fan' && morph.branch === 'guppy') ? '' : morph.tail))
  add(partById(morph.limb))
  add(partById(morph.lungs))
  add(partById(morph.armor))
  add(partById(morph.rear))
  if (morph.skin === 'leather') {
    s.spd *= 0.95
    s.swim *= 0.95
  }
}

export function equippedLabel(morph: Morph, cat: Category): string {
  if (cat === 'skin') return partById(morph.skin)?.name ?? 'Bare skin'
  if (cat === 'head') return partById(morph.head)?.name ?? 'Guppy'
  if (cat === 'horn') {
    if (!morph.horn) return 'None'
    const roman = ['', 'I', 'II', 'III'][morph.hornLv] ?? ''
    return `${partById(morph.horn)?.name ?? morph.horn} ${roman}`.trim()
  }
  if (cat === 'fin') {
    const side = partById(morph.sideFin)?.name ?? 'Fan'
    const belly = morph.bellyFin ? `, ${partById(morph.bellyFin)?.name}` : ''
    return side + belly
  }
  if (cat === 'dorsal') return partById(morph.dorsal)?.name ?? 'Low Ridge'
  if (cat === 'rear') return partById(morph.rear)?.name ?? 'None'
  if (cat === 'extraRear') return morph.extraRear ? `${morph.extraRear} / 2 extra rear fins` : 'None'
  if (cat === 'tail') return partById(morph.tail === 'fan' ? 'fantail' : morph.tail)?.name ?? 'Fan'
  if (cat === 'limb') return partById(morph.limb)?.name ?? 'None'
  if (cat === 'lungs') return partById(morph.lungs)?.name ?? 'None'
  if (cat === 'armor') return partById(morph.armor)?.name ?? 'None'
  return ''
}

export function branchOnlyKeys(branch: 'fish' | 'octopus'): string[] {
  return ALL_PARTS.filter((p) => p.branch === branch).map((p) => p.id)
}

export function paidForBranch(morph: Morph, branch: 'fish' | 'octopus'): { total: number; keys: string[] } {
  const ids = new Set(branchOnlyKeys(branch))
  if (branch === 'fish') ids.add('extraRear')
  const keys: string[] = []
  let total = 0
  for (const [key, amount] of Object.entries(morph.paid)) {
    const id = key.split(':')[1] ?? key
    if (ids.has(id) || (branch === 'fish' && key.startsWith('extraRear'))) {
      keys.push(key)
      total += amount
    }
  }
  return { total, keys }
}

export function branchRefund(morph: Morph, from: 'fish' | 'octopus'): number {
  return Math.floor(paidForBranch(morph, from).total * 0.5)
}

function stripBranchParts(morph: Morph, branch: 'fish' | 'octopus'): string[] {
  const { keys } = paidForBranch(morph, branch)
  const lost: string[] = []
  for (const key of keys) {
    delete morph.paid[key]
    const id = key.split(':')[1] ?? key
    const def = partById(id)
    lost.push(def?.name ?? id)
    if (def?.category === 'head' && morph.head === id) morph.head = 'guppy'
    if (def?.category === 'dorsal' && morph.dorsal === id) morph.dorsal = 'ridge'
    if (def?.category === 'rear' && morph.rear === id) morph.rear = ''
    if (def?.category === 'tail' && morph.tail === id) morph.tail = 'fantail'
    if (def?.category === 'limb' && morph.limb === id) morph.limb = ''
    if (def?.category === 'fin') {
      if (morph.sideFin === id) morph.sideFin = 'fan'
      if (morph.bellyFin === id) morph.bellyFin = ''
    }
  }
  if (branch === 'fish') {
    if (morph.extraRear > 0) lost.push(`${morph.extraRear} extra rear fin${morph.extraRear > 1 ? 's' : ''}`)
    morph.extraRear = 0
    for (const key of Object.keys(morph.paid)) if (key.startsWith('extraRear')) delete morph.paid[key]
  }
  return [...new Set(lost)]
}

export function switchBranch(you: Progress, to: 'fish' | 'octopus'): BuyOk {
  const morph = ensureMorph(you.load)
  const from = morph.branch === 'guppy' ? null : morph.branch
  let refund = 0
  let swapped: string | undefined
  if (from && from !== to) {
    refund = branchRefund(morph, from)
    const lost = stripBranchParts(morph, from)
    you.ep += refund
    swapped = lost.join(', ')
  }
  morph.branch = to
  if (to === 'octopus') {
    morph.extraRear = 0
    if (morph.dorsal === 'sharkfin') morph.dorsal = 'ridge'
  }
  if (to === 'fish') {
    morph.limb = ''
    if (morph.dorsal === 'newt') morph.dorsal = 'ridge'
  }
  return { ok: true, refund, swapped, message: refund ? `Branch swapped. Recovered ${refund} EP.` : `Now on the ${to} branch.` }
}

function needBranch(def: PartDef, morph: Morph): 'fish' | 'octopus' | null {
  if (def.branch && morph.branch !== def.branch) return def.branch
  return null
}

function swapPrompt(you: Progress, def: PartDef, to: 'fish' | 'octopus'): SwapPrompt {
  const morph = ensureMorph(you.load)
  const from: Branch = morph.branch
  const refund = from === 'fish' || from === 'octopus' ? branchRefund(morph, from) : 0
  const lose = from === 'fish' || from === 'octopus' ? paidForBranch(morph, from).keys.map((k) => partById(k.split(':')[1] ?? k)?.name ?? k) : []
  if (from === 'fish' && morph.extraRear > 0 && !lose.some((n) => /extra back/i.test(n))) {
    lose.push(`${morph.extraRear} extra rear fin${morph.extraRear > 1 ? 's' : ''}`)
  }
  const extra = from === 'fish' && morph.extraRear > 0 && to === 'octopus'
  const kind: SwapPrompt['kind'] = extra && def.id === 'webbed' ? 'fin-swap' : 'branch-swap'
  const loseTxt = lose.length ? lose.join(', ') : 'branch-only parts'
  const message = extra
    ? `${def.name} needs the octopus body. Extra rear fins will be removed, and you will recover 50% of EP spent on fish-only parts (${refund} EP). Swap?`
    : `${def.name} is ${to}-branch only. Switching from ${from === 'guppy' ? 'a guppy body' : from} refunds 50% of EP spent on ${from}-only parts (${refund} EP). You will lose: ${loseTxt}. Switch?`
  return { kind, from, to, refund, lose, message }
}

function spend(you: Progress, key: string, cost: number): void {
  you.ep -= cost
  you.spent += cost
  ensureMorph(you.load).paid[key] = (ensureMorph(you.load).paid[key] ?? 0) + cost
}

function alreadyHas(morph: Morph, def: PartDef, level?: number): boolean {
  if (def.category === 'skin') return morph.skin === def.id
  if (def.category === 'head') return morph.head === def.id
  if (def.category === 'horn') return morph.horn === def.id && morph.hornLv >= (level ?? 1)
  if (def.category === 'fin') {
    if (def.place === 'belly') return morph.bellyFin === def.id
    return morph.sideFin === def.id
  }
  if (def.category === 'dorsal') return morph.dorsal === def.id
  if (def.category === 'rear') return morph.rear === def.id
  if (def.category === 'tail') return morph.tail === def.id || (def.id === 'fantail' && morph.tail === 'fan')
  if (def.category === 'limb') return morph.limb === def.id
  if (def.category === 'lungs') return morph.lungs === def.id
  if (def.category === 'armor') return morph.armor === def.id
  if (def.category === 'extraRear') return morph.extraRear >= 2
  return false
}

/** Buy a part. Nothing is gated by evolution tier / level. Pass `confirm: true` after the player accepts a swap prompt. */
export function tryBuy(you: Progress, id: string, opts: { confirm?: boolean; level?: number } = {}): BuyResult {
  const def = partById(id)
  if (!def) return { ok: false, reason: 'Unknown part.' }
  const morph = ensureMorph(you.load)
  const level = def.costs ? Math.max(1, Math.min(3, opts.level ?? (morph.horn === def.id ? morph.hornLv + 1 : 1))) : 1

  if (def.category === 'extraRear') {
    if (morph.branch !== 'fish') {
      if (morph.branch === 'octopus') return { ok: false, reason: 'Extra rear fins belong to the fish branch.' }
      if (!opts.confirm) return { ok: false, reason: 'needs-swap', prompt: swapPrompt(you, def, 'fish') }
      switchBranch(you, 'fish')
    }
    if (morph.extraRear >= 2) return { ok: false, reason: 'Already have two extra rear fins.' }
    if (you.ep < def.cost) return { ok: false, reason: `Need ${def.cost} EP.` }
    spend(you, `extraRear:${morph.extraRear + 1}`, def.cost)
    morph.extraRear += 1
    return { ok: true, refund: 0, message: `Added extra rear fin (${morph.extraRear}/2).` }
  }

  const required = needBranch(def, morph)
  if (required) {
    if (!opts.confirm) return { ok: false, reason: 'needs-swap', prompt: swapPrompt(you, def, required) }
    switchBranch(you, required)
  }

  if (def.category === 'limb' && def.id === 'webbed' && morph.extraRear > 0 && !opts.confirm) {
    return { ok: false, reason: 'needs-swap', prompt: swapPrompt(you, def, 'octopus') }
  }

  if (def.category === 'horn') {
    if (morph.horn === def.id && morph.hornLv >= 3) return { ok: false, reason: 'Already at level III.' }
    if (morph.horn === def.id && level <= morph.hornLv) return { ok: false, reason: 'Already equipped.' }
    const cost = def.costs?.[level - 1] ?? def.cost
    if (you.ep < cost) return { ok: false, reason: `Need ${cost} EP.` }
    spend(you, `horn:${def.id}:${level}`, cost)
    morph.horn = def.id
    morph.hornLv = level
    return { ok: true, refund: 0, message: `Equipped ${def.name} ${['', 'I', 'II', 'III'][level]}.` }
  }

  if (alreadyHas(morph, def, level)) return { ok: false, reason: 'Already equipped.' }
  if (you.ep < def.cost) return { ok: false, reason: `Need ${def.cost} EP.` }

  if (def.category === 'skin') {
    spend(you, `skin:${def.id}`, def.cost)
    morph.skin = def.id
    you.load.skin = SKIN_IDS.indexOf(def.id as (typeof SKIN_IDS)[number]) + 2
    return { ok: true, refund: 0, message: `Grew ${def.name}.` }
  }
  if (def.category === 'head') {
    spend(you, `head:${def.id}`, def.cost)
    morph.head = def.id
    return { ok: true, refund: 0, message: `Grew a ${def.name} head.` }
  }
  if (def.category === 'fin') {
    spend(you, `fin:${def.id}`, def.cost)
    if (def.place === 'belly') morph.bellyFin = def.id
    else morph.sideFin = def.id
    return { ok: true, refund: 0, message: `Grew ${def.name} fins.` }
  }
  if (def.category === 'dorsal') {
    spend(you, `dorsal:${def.id}`, def.cost)
    morph.dorsal = def.id
    return { ok: true, refund: 0, message: `Grew a ${def.name}.` }
  }
  if (def.category === 'rear') {
    spend(you, `rear:${def.id}`, def.cost)
    morph.rear = def.id
    return { ok: true, refund: 0, message: `Grew a ${def.name}.` }
  }
  if (def.category === 'tail') {
    spend(you, `tail:${def.id}`, def.cost)
    morph.tail = def.id
    return { ok: true, refund: 0, message: `Grew a ${def.name} tail.` }
  }
  if (def.category === 'armor') {
    spend(you, `armor:${def.id}`, def.cost)
    morph.armor = def.id
    return { ok: true, refund: 0, message: `Grew ${def.name} along the back.` }
  }
  if (def.category === 'lungs') {
    spend(you, `lungs:${def.id}`, def.cost)
    morph.lungs = def.id
    you.load.lungs = Math.max(you.load.lungs, 1)
    return { ok: true, refund: 0, message: 'Lungs grown. You can go ashore.' }
  }
  if (def.category === 'limb') {
    if (morph.extraRear > 0) {
      morph.extraRear = 0
      for (const key of Object.keys(morph.paid)) if (key.startsWith('extraRear')) delete morph.paid[key]
    }
    spend(you, `limb:${def.id}`, def.cost)
    morph.limb = def.id
    morph.branch = 'octopus'
    return { ok: true, refund: 0, message: `Grew ${def.name}.` }
  }
  return { ok: false, reason: 'Cannot buy that.' }
}


/** Evasion and Lionfish deterrence are separate and stack. */
export function incomingMissChance(fx: MorphFx): number {
  return Math.min(0.75, Math.max(0, fx.evasion + fx.deter))
}

/** Turn-rate and acceleration multipliers (1 = baseline). */
export function agility(morph: Morph): { turn: number; accel: number } {
  const fx = morphFx(morph)
  return { turn: 1 + fx.turn, accel: 1 + fx.accel }
}


/** Lungs or octopus land limbs. Not gated by evolution tier. */
export function canGoAshore(load: { morph?: Morph; lungs?: number }): boolean {
  const morph = load.morph
  if (morph?.lungs) return true
  if (morph && morphFx(morph).landMove) return true
  if ((load.lungs ?? 0) >= 1) return true
  return false
}

export function ashoreNeed(): string {
  return 'Buy Lungs in Evolve, or take octopus land limbs (Webbed Limbs or Salamander Legs), to go ashore.'
}

export const CATALOG_COUNTS = {
  skins: SKINS.length,
  heads: HEADS.filter((h) => h.id !== 'guppy').length,
  horns: HORNS.length,
  fins: FINS.length + LIMBS.length,
  dorsals: DORSALS.length,
  rears: REARS.length,
  tails: TAILS.length,
  lungs: LUNGS.length,
  armor: ARMORS.length,
}
