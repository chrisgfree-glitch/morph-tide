/** Data tables for EVO 2.0. Stats and gates live in rules.ts. */

import type { Morph } from './evolve'

export interface Loadout {
  jaw: string
  teeth: string
  feet: string
  horn: string
  fin: number
  tail: number
  armor: number
  eyes: number
  lungs: number
  legs: number
  wings: number
  wingStyle: string
  arms: number
  armType: string
  breaker: string
  cutter: string
  color: number
  accent: number
  size: number
  spec: string
  camo: number
  lure: number
  spines: number
  ink: number
  barbels: number
  /** 1–20 hide line, separate from evolution tier. */
  skin: number
  morph?: Morph
}

export interface Pick {
  id: string
  name: string
  tier: number
  cost: number
  bite?: number
  spd?: number
  def?: number
  swim?: number
  kick?: number
  grip?: number
  dig?: number
  vision?: number
  fly?: number
  len?: number
  ht?: number
  wd?: number
  n?: number
  feat?: string
}

export interface Step {
  name: string
  tier: number
  cost: number
  bite?: number
  spd?: number
  def?: number
  swim?: number
  air?: number
  fly?: number
  vision?: number
  hp?: number
  kick?: number
  grip?: number
}

export const TIER_SPENT = [0, 12, 30, 55, 90, 130, 180, 240, 320, 420]

export const COLORS = [0x6e8e86, 0x66724c, 0xb7a488, 0x7a5346, 0x45525c, 0x6a5d6c, 0xc4b59a, 0x8a564c]
export const ACCENTS = [0xd4c4a4, 0xe4ece4, 0x8b9a78, 0x7e97a0, 0xc4a498, 0xa88862, 0xd5e0dc, 0x9a5e52]
export const COLOR_NAMES = ['Sea glass', 'Moss', 'Sand hide', 'Umber', 'Wet slate', 'Dusk', 'Bone', 'Clay']

export function starterLoad(): Loadout {
  return {
    jaw: 'nip',
    teeth: 'peg',
    feet: '',
    horn: 'smooth',
    fin: 1,
    tail: 0,
    armor: 0,
    eyes: 0,
    lungs: 0,
    legs: 0,
    wings: 0,
    wingStyle: 'avian',
    arms: 0,
    armType: 'claw',
    breaker: '',
    cutter: '',
    color: 0,
    accent: 0,
    size: 0.42,
    spec: '',
    camo: 0,
    lure: 0,
    spines: 0,
    ink: 0,
    barbels: 0,
    skin: 1,
  }
}

function p(id: string, name: string, tier: number, cost: number, extra: Partial<Pick> = {}): Pick {
  return { id, name, tier, cost, ...extra }
}

export const JAWS: Pick[] = [
  p('nip', 'Pebble nip', 1, 0, { bite: 0, len: 0.25, ht: 0.16, wd: 0.2, feat: 'none' }),
  p('needlejaw', 'Needle jaw', 1, 4, { bite: 3, spd: 0.2, len: 0.45, ht: 0.12, wd: 0.14, feat: 'none' }),
  p('crunchbeak', 'Crunch beak', 1, 5, { bite: 2, def: 1, len: 0.4, ht: 0.2, wd: 0.18, feat: 'hook' }),
  p('duck', 'Duckbill', 1, 4, { bite: 1, spd: 0.35, len: 0.55, ht: 0.1, wd: 0.32, feat: 'duck' }),
  p('hookbeak', 'Hooked beak', 2, 8, { bite: 4, len: 0.5, ht: 0.22, wd: 0.16, feat: 'hook' }),
  p('croc', 'Crocodile snout', 2, 10, { bite: 5, spd: -0.1, len: 0.7, ht: 0.16, wd: 0.22, feat: 'none' }),
  p('shark', 'Shark jaw', 3, 14, { bite: 6, len: 0.55, ht: 0.28, wd: 0.26, feat: 'under' }),
  p('angler', 'Angler underbite', 3, 12, { bite: 4, len: 0.4, ht: 0.3, wd: 0.28, feat: 'under' }),
  p('mandible', 'Insect mandibles', 3, 12, { bite: 5, len: 0.35, ht: 0.2, wd: 0.34, feat: 'pincer' }),
  p('pincer', 'Pincer mandibles', 4, 16, { bite: 4, def: 1, len: 0.4, ht: 0.18, wd: 0.4, feat: 'pincer' }),
  p('lamprey', 'Lamprey sucker', 4, 14, { bite: 3, len: 0.3, ht: 0.3, wd: 0.3, feat: 'sucker' }),
  p('baleen', 'Baleen mouth', 4, 12, { bite: 1, spd: 0.2, len: 0.5, ht: 0.34, wd: 0.36, feat: 'plate' }),
  p('hammer', 'Hammerhead', 5, 20, { bite: 6, spd: -0.15, len: 0.35, ht: 0.2, wd: 0.7, feat: 'hammer' }),
  p('saw', 'Sawfish rostrum', 5, 20, { bite: 5, len: 0.9, ht: 0.1, wd: 0.16, feat: 'saw' }),
  p('gharial', 'Gharial needle', 5, 18, { bite: 7, spd: -0.2, len: 0.85, ht: 0.1, wd: 0.12, feat: 'none' }),
  p('bulldog', 'Bulldog crush', 6, 26, { bite: 8, spd: -0.25, len: 0.35, ht: 0.32, wd: 0.4, feat: 'none' }),
  p('snake', 'Hinged snake jaw', 6, 24, { bite: 6, len: 0.5, ht: 0.2, wd: 0.22, feat: 'under' }),
  p('pelican', 'Pelican pouch', 6, 22, { bite: 3, len: 0.55, ht: 0.36, wd: 0.3, feat: 'pouch' }),
  p('boar', 'Tusked boar jaw', 7, 30, { bite: 7, len: 0.4, ht: 0.24, wd: 0.32, feat: 'tusk' }),
  p('saberjaw', 'Sabertooth jaw', 7, 32, { bite: 9, spd: -0.1, len: 0.45, ht: 0.26, wd: 0.28, feat: 'tusk' }),
  p('placoderm', 'Placoderm plate jaw', 8, 36, { bite: 6, def: 3, len: 0.5, ht: 0.3, wd: 0.4, feat: 'plate' }),
  p('trumpet', 'Trumpet proboscis', 8, 34, { bite: 4, spd: 0.15, len: 0.8, ht: 0.14, wd: 0.14, feat: 'tube' }),
]

export const TEETH: Pick[] = [
  p('peg', 'Peg teeth', 1, 0, { bite: 0, n: 4, len: 0.06, feat: 'peg' }),
  p('needle', 'Needle teeth', 1, 4, { bite: 2, spd: 0.1, n: 6, len: 0.14, feat: 'needle' }),
  p('conical', 'Conical teeth', 1, 4, { bite: 2, n: 5, len: 0.1, feat: 'needle' }),
  p('comb', 'Comb teeth', 1, 5, { bite: 1, spd: 0.15, n: 8, len: 0.08, feat: 'comb' }),
  p('serrated', 'Serrated teeth', 2, 8, { bite: 4, n: 7, len: 0.12, feat: 'row' }),
  p('buck', 'Buck teeth', 2, 8, { bite: 2, n: 2, len: 0.16, feat: 'peg' }),
  p('hookfang', 'Hooked fangs', 3, 12, { bite: 4, n: 4, len: 0.18, feat: 'fang' }),
  p('sharkrow', 'Shark rows', 3, 14, { bite: 5, n: 10, len: 0.1, feat: 'row' }),
  p('venom', 'Venom fangs', 4, 16, { bite: 5, n: 2, len: 0.2, feat: 'fang' }),
  p('saber', 'Saber teeth', 4, 18, { bite: 6, spd: -0.1, n: 2, len: 0.28, feat: 'saber' }),
  p('tusk', 'Tusks', 4, 16, { bite: 4, def: 1, n: 2, len: 0.24, feat: 'tusk' }),
  p('molar', 'Crushing molars', 5, 20, { bite: 5, spd: -0.15, n: 4, len: 0.08, feat: 'molar' }),
  p('interlock', 'Interlocking teeth', 5, 18, { bite: 4, def: 1, n: 8, len: 0.1, feat: 'row' }),
  p('fishtrap', 'Fish-trap teeth', 5, 18, { bite: 4, n: 9, len: 0.12, feat: 'comb' }),
  p('baleenplate', 'Baleen plates', 6, 22, { bite: 1, spd: 0.2, n: 6, len: 0.16, feat: 'plate' }),
  p('grind', 'Grinding plates', 6, 22, { bite: 4, spd: -0.1, n: 2, len: 0.06, feat: 'plate' }),
  p('radula', 'Rasp radula', 6, 20, { bite: 3, n: 5, len: 0.05, feat: 'radula' }),
  p('bonecrush', 'Bone-crusher', 7, 28, { bite: 7, spd: -0.2, n: 4, len: 0.1, feat: 'molar' }),
  p('carnassial', 'Carnassials', 7, 30, { bite: 8, n: 4, len: 0.14, feat: 'saber' }),
  p('glow', 'Glow-tipped lure teeth', 8, 26, { bite: 4, spd: 0.1, n: 5, len: 0.12, feat: 'glow' }),
  p('flint', 'Flint-tipped teeth', 5, 16, { bite: 5, n: 6, len: 0.11, feat: 'needle' }),
]

export const FEET: Pick[] = [
  p('nub', 'Soft nubs', 2, 4, { spd: 0.2, kick: 0, swim: 0, grip: 0.1, dig: 0, feat: 'nub' }),
  p('paw', 'Paws', 2, 6, { spd: 0.6, kick: 1, grip: 0.3, feat: 'paw' }),
  p('web', 'Webbed feet', 2, 6, { spd: 0.2, swim: 1.4, kick: 1, feat: 'web' }),
  p('flipper', 'Flippers', 2, 6, { spd: -0.2, swim: 2, kick: 1, feat: 'web' }),
  p('hoof', 'Hooves', 3, 10, { spd: 1.1, kick: 3, grip: 0.2, feat: 'hoof' }),
  p('padpaw', 'Padded paws', 3, 10, { spd: 0.7, kick: 1, grip: 0.6, feat: 'paw' }),
  p('talon', 'Talons', 3, 12, { spd: 0.4, kick: 4, grip: 0.5, feat: 'talon' }),
  p('claw', 'Claws', 3, 12, { spd: 0.3, kick: 3, dig: 1, grip: 0.4, feat: 'claw' }),
  p('frog', 'Frog feet', 3, 8, { spd: 0.5, swim: 0.8, kick: 2, feat: 'web' }),
  p('duck', 'Duck feet', 4, 12, { spd: 0.2, swim: 1.2, kick: 1, feat: 'web' }),
  p('suction', 'Suction cups', 4, 12, { spd: -0.2, grip: 1.2, kick: 1, feat: 'sucker' }),
  p('gecko', 'Gecko toes', 4, 14, { spd: 0.8, grip: 1.4, kick: 1, feat: 'paw' }),
  p('sickle', 'Raptor sickle', 4, 16, { spd: 0.5, kick: 6, dig: 1, feat: 'sickle' }),
  p('elephant', 'Elephant pads', 5, 18, { spd: 0.2, kick: 4, dig: 1, def: 1, feat: 'pad' }),
  p('crab', 'Crab tips', 5, 14, { spd: 0.1, kick: 3, grip: 0.8, feat: 'claw' }),
  p('spider', 'Spider tips', 5, 14, { spd: 0.7, grip: 1, kick: 2, feat: 'claw' }),
  p('spur', 'Hoof and spur', 5, 14, { spd: 0.9, kick: 4, feat: 'hoof' }),
  p('ostrich', 'Ostrich two-toe', 6, 18, { spd: 1.6, kick: 3, grip: 0.2, feat: 'stilt' }),
  p('snow', 'Snowshoe feet', 6, 16, { spd: 0.8, grip: 0.7, feat: 'pad' }),
  p('spikefoot', 'Spiked feet', 6, 18, { spd: 0.2, kick: 5, dig: 0.4, feat: 'spike' }),
  p('stilt', 'Stilt feet', 7, 20, { spd: 1.2, kick: 2, feat: 'stilt' }),
]

export const HORNS: Pick[] = [
  p('smooth', 'Smooth brow', 1, 0, { def: 0, feat: 'none' }),
  p('nub', 'Brow nub', 1, 4, { def: 1, bite: 1, feat: 'nub' }),
  p('spur', 'Nose spur', 1, 5, { bite: 2, feat: 'spike' }),
  p('spike', 'Nasal spike', 2, 8, { bite: 3, feat: 'spike' }),
  p('crest', 'Crest', 3, 12, { def: 2, feat: 'crest' }),
  p('lance', 'Lance horn', 4, 16, { bite: 5, spd: 0.2, feat: 'spike' }),
  p('antler', 'Stag antlers', 4, 18, { bite: 4, def: 1, feat: 'crest' }),
  p('crown', 'Crown horns', 5, 22, { bite: 4, def: 3, feat: 'crest' }),
]

export const FIN_LINE: Step[] = [
  { name: 'No fins', tier: 1, cost: 0 },
  { name: 'Pectoral fins', tier: 1, cost: 4, swim: 1.3, spd: 0.2 },
  { name: 'Dorsal fin', tier: 1, cost: 5, swim: 0.7, spd: 0.35 },
  { name: 'Extra back fins', tier: 1, cost: 6, swim: 0.9, spd: 0.25 },
  { name: 'Sail fin', tier: 5, cost: 18, swim: 1.6, spd: 0.4 },
]

export const TAIL_LINE: Step[] = [
  { name: 'Fan tail', tier: 1, cost: 0, swim: 0.4 },
  { name: 'Fork tail', tier: 1, cost: 4, swim: 1.1, spd: 0.3 },
  { name: 'Eel ribbon', tier: 1, cost: 5, swim: 1.3, spd: 0.15 },
  { name: 'Paddle tail', tier: 1, cost: 5, swim: 1, bite: 1 },
  { name: 'Long tail', tier: 3, cost: 12, swim: 0.6, spd: 0.4 },
  { name: 'Spiked tail', tier: 5, cost: 18, bite: 4, def: 1 },
  { name: 'Club tail', tier: 6, cost: 24, bite: 7, spd: -0.2 },
]

export interface SkinTier {
  name: string
  dna: number
  hides: number
  mat: string
  matN: number
  gem: string
  gemN: number
  def: number
  hp: number
  spd: number
}

const SKIN_NAMES = [
  'Bare skin',
  'Soft scales',
  'Pebble scales',
  'Overlapping scales',
  'Hardened scales',
  'Ridge scales',
  'Bony scutes',
  'Keel scutes',
  'Banded scutes',
  'Light plates',
  'Overlapping plates',
  'Riveted plates',
  'Lamellar armor',
  'Carapace',
  'Spiked plates',
  'Obsidian plates',
  'Gem-studded plates',
  'Inlaid armor',
  'Abyss mail',
  'Legendary inlay',
]
const SKIN_GEMS = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'topaz', 'onyx', 'sapphire', 'ruby', 'diamond', 'moonstone']

function skinTable(): SkinTier[] {
  let def = 0
  return SKIN_NAMES.map((name, i) => {
    const tier = i + 1
    const add = tier === 1 ? 0 : Math.round(16 * 0.9 ** (tier - 2)) / 10
    def = Math.round((def + add) * 10) / 10
    return {
      name,
      dna: tier === 1 ? 0 : 4 + tier * tier,
      hides: tier < 3 ? 0 : Math.ceil(tier * 0.65),
      mat: tier < 5 ? '' : tier < 10 ? 'stone' : tier < 14 ? 'sticks' : 'stone',
      matN: tier < 5 ? 0 : tier - 2,
      gem: SKIN_GEMS[i] ?? '',
      gemN: SKIN_GEMS[i] ? (tier >= 18 ? 2 : 1) : 0,
      def,
      hp: Math.round(def * 1.4),
      spd: tier > 12 ? -0.04 * (tier - 12) : 0,
    }
  })
}

export const SKINS: SkinTier[] = skinTable()

export const ARMOR_LINE: Step[] = [
  { name: 'Bare hide', tier: 1, cost: 0 },
  { name: 'Basic scales', tier: 1, cost: 5, def: 1, hp: 4 },
  { name: 'Armor plates', tier: 5, cost: 20, def: 4, hp: 14, spd: -0.3 },
  { name: 'Shell', tier: 6, cost: 26, def: 6, hp: 18, spd: -0.5 },
  { name: 'Spiked shell', tier: 7, cost: 32, def: 7, hp: 16, bite: 2, spd: -0.4 },
]

export const EYE_LINE: Step[] = [
  { name: 'Bead eyes', tier: 1, cost: 0, vision: 8 },
  { name: 'Wide eyes', tier: 3, cost: 10, vision: 12 },
  { name: 'Stalk eyes', tier: 5, cost: 16, vision: 16 },
  { name: 'Eye cluster', tier: 6, cost: 20, vision: 20, def: 1 },
]

export const LUNG_LINE: Step[] = [
  { name: 'Gills only', tier: 1, cost: 0, air: 0, swim: 0.4 },
  { name: 'Basic lungs', tier: 2, cost: 6, air: 16 },
  { name: 'Strong lungs', tier: 5, cost: 18, air: 36, hp: 6 },
  { name: 'Abyss lungs', tier: 9, cost: 36, air: 70, swim: 1, def: 2 },
]

export const LEG_LINE: Step[] = [
  { name: 'No legs', tier: 1, cost: 0 },
  { name: 'Two legs', tier: 2, cost: 8, spd: 1.2 },
  { name: 'Four legs', tier: 3, cost: 14, spd: 1.8, kick: 1 },
  { name: 'Six legs', tier: 5, cost: 22, spd: 1.5, def: 1 },
  { name: 'Eight legs', tier: 6, cost: 28, spd: 1.3, def: 2, grip: 0.4 },
]

/** Pair index 1..8. min tier encoded in rules.maxWings. */
export const WING_COST = [0, 16, 22, 28, 36, 44, 54, 66, 80]

export const WING_STYLES: Pick[] = [
  p('butterfly', 'Butterfly', 5, 8, { spd: -0.4, fly: 0.7, feat: 'wide' }),
  p('dragonfly', 'Dragonfly', 5, 10, { spd: 0.8, fly: 1.35, feat: 'narrow' }),
  p('avian', 'Avian feathers', 5, 8, { spd: 0.3, fly: 1, feat: 'feather' }),
  p('bat', 'Bat leather', 5, 8, { spd: 0.5, fly: 1.05, feat: 'membrane' }),
  p('moth', 'Moth', 5, 8, { spd: -0.2, fly: 0.8, feat: 'wide' }),
  p('beetle', 'Beetle elytra', 5, 12, { spd: -0.5, def: 3, fly: 0.65, feat: 'shell' }),
  p('pterosaur', 'Pterosaur membrane', 5, 12, { spd: 0.1, fly: 1.15, feat: 'soar' }),
  p('bee', 'Bee', 5, 8, { spd: 0.4, fly: 0.9, feat: 'narrow' }),
  p('flyingfish', 'Flying-fish fins', 5, 8, { swim: 0.8, fly: 0.75, feat: 'fin' }),
  p('dragon', 'Dragon membrane', 5, 14, { bite: 3, spd: -0.3, fly: 1.1, def: 1, feat: 'horn' }),
  p('pterodactyl', 'Pterodactyl', 5, 14, { fly: 1.25, spd: 0.15, feat: 'finger' }),
  p('raptor', 'Feathered raptor', 5, 14, { spd: 0.45, fly: 0.95, kick: 2, feat: 'limb' }),
]

export const ARM_COST = [0, 16, 24, 32]
export const ARM_TYPES: Pick[] = [
  p('claw', 'Clawed arms', 5, 6, { bite: 3, dig: 1, feat: 'claw' }),
  p('grasp', 'Grasping hands', 5, 8, { bite: 1, grip: 1.2, feat: 'hand' }),
  p('pincer', 'Crab pincers', 5, 10, { bite: 4, def: 1, feat: 'pincer' }),
  p('scythe', 'Mantis scythes', 5, 12, { bite: 6, feat: 'blade' }),
  p('tentacle', 'Tentacles', 5, 10, { grip: 1.4, swim: 0.5, feat: 'tentacle' }),
  p('hammer', 'Hammer fists', 5, 12, { bite: 5, dig: 0.3, feat: 'hammer' }),
  p('stinger', 'Stinger arms', 5, 12, { bite: 5, feat: 'sting' }),
  p('spade', 'Digging spades', 5, 10, { dig: 2, bite: 1, feat: 'spade' }),
  p('paddle', 'Webbed paddles', 5, 8, { swim: 1.3, feat: 'paddle' }),
  p('blade', 'Bladed forearms', 5, 12, { bite: 5, feat: 'blade' }),
]

export interface Tool {
  id: string
  name: string
  tier: number
  cost: number
  bite: number
  /** Relative power per hardness class. 0 means cannot until mk allows it. */
  soft: number
  med: number
  hard: number
  very: number
  feat: string
}

export const BREAKERS: Tool[] = [
  { id: 'tusks', name: 'Tusks', tier: 4, cost: 18, bite: 3, soft: 1.2, med: 0.95, hard: 0.9, very: 0.9, feat: 'tusk' },
  { id: 'rhino', name: 'Rhino horn', tier: 4, cost: 18, bite: 4, soft: 1.1, med: 1.05, hard: 0.95, very: 0.92, feat: 'horn' },
  { id: 'clubtail', name: 'Club tail', tier: 4, cost: 16, bite: 5, soft: 1.3, med: 1, hard: 0.85, very: 0.88, feat: 'club' },
  { id: 'shovel', name: 'Shovel forelimbs', tier: 4, cost: 16, bite: 1, soft: 1.5, med: 1.1, hard: 0.8, very: 0.85, feat: 'spade' },
  { id: 'drill', name: 'Drill snout', tier: 4, cost: 20, bite: 2, soft: 1.1, med: 1.2, hard: 1.15, very: 1.05, feat: 'drill' },
  { id: 'hammerhead', name: 'Hammerhead skull', tier: 4, cost: 20, bite: 4, soft: 1.2, med: 1.15, hard: 1.05, very: 1.1, feat: 'hammer' },
  { id: 'pickclaws', name: 'Pickaxe claws', tier: 4, cost: 18, bite: 3, soft: 1.1, med: 1.25, hard: 1.2, very: 1, feat: 'pick' },
  { id: 'spikearms', name: 'Spiked digging arms', tier: 4, cost: 18, bite: 3, soft: 1.3, med: 1.1, hard: 1, very: 0.95, feat: 'spike' },
  { id: 'crushbeak', name: 'Rock-crushing beak', tier: 4, cost: 20, bite: 5, soft: 1.1, med: 1.2, hard: 1.1, very: 1.12, feat: 'beak' },
  { id: 'dome', name: 'Dome skull', tier: 4, cost: 22, bite: 6, soft: 1.4, med: 1.25, hard: 1.15, very: 1.2, feat: 'dome' },
]

export const CUTTERS: Tool[] = [
  { id: 'beaver', name: 'Beaver chisel teeth', tier: 4, cost: 16, bite: 2, soft: 1.4, med: 1, hard: 0.85, very: 0.8, feat: 'chisel' },
  { id: 'sawjaw', name: 'Saw-tooth jaws', tier: 4, cost: 16, bite: 3, soft: 1.2, med: 1.15, hard: 1, very: 0.9, feat: 'saw' },
  { id: 'crushbite', name: 'Crushing bite', tier: 4, cost: 18, bite: 4, soft: 1.1, med: 1.1, hard: 1.05, very: 1, feat: 'crush' },
  { id: 'tailbash', name: 'Tail bash', tier: 4, cost: 14, bite: 4, soft: 1.3, med: 0.9, hard: 0.8, very: 0.75, feat: 'club' },
  { id: 'axeclaws', name: 'Axe-blade claws', tier: 4, cost: 18, bite: 4, soft: 1.2, med: 1.2, hard: 1.1, very: 0.95, feat: 'axe' },
  { id: 'sawnout', name: 'Serrated saw snout', tier: 4, cost: 18, bite: 3, soft: 1.15, med: 1.2, hard: 1.15, very: 1, feat: 'saw' },
  { id: 'scythe', name: 'Mantis scythe', tier: 4, cost: 18, bite: 5, soft: 1.25, med: 1.05, hard: 0.95, very: 0.85, feat: 'blade' },
  { id: 'gouge', name: 'Horn gouge', tier: 4, cost: 16, bite: 3, soft: 1.1, med: 1.15, hard: 1.05, very: 0.9, feat: 'horn' },
  { id: 'ram', name: 'Body ram', tier: 4, cost: 14, bite: 3, soft: 1.2, med: 1, hard: 0.9, very: 0.85, feat: 'ram' },
  { id: 'antler', name: 'Stag antler rake', tier: 4, cost: 16, bite: 3, soft: 1.3, med: 1.1, hard: 0.95, very: 0.88, feat: 'rake' },
]

export interface Rock {
  id: string
  name: string
  tier: number
  gem?: string[]
  gemChance: number
}

export const ROCKS: Rock[] = [
  { id: 'chalk', name: 'Chalk', tier: 1, gemChance: 0 },
  { id: 'pumice', name: 'Pumice', tier: 1, gemChance: 0 },
  { id: 'sandstone', name: 'Sandstone', tier: 2, gemChance: 0.005 },
  { id: 'shale', name: 'Shale', tier: 3, gemChance: 0.008 },
  { id: 'limestone', name: 'Limestone', tier: 3, gemChance: 0.008 },
  { id: 'coral-rock', name: 'Coral rock', tier: 3, gemChance: 0.01, gem: ['sapphire', 'topaz'] },
  { id: 'slate', name: 'Slate', tier: 4, gemChance: 0.01 },
  { id: 'flint', name: 'Flint', tier: 4, gemChance: 0.012, gem: ['onyx', 'topaz'] },
  { id: 'granite', name: 'Granite', tier: 5, gemChance: 0.015, gem: ['amethyst', 'topaz'] },
  { id: 'basalt', name: 'Basalt', tier: 5, gemChance: 0.015, gem: ['onyx', 'ruby'] },
  { id: 'marble', name: 'Marble', tier: 6, gemChance: 0.018, gem: ['opal', 'diamond'] },
  { id: 'quartz', name: 'Quartz', tier: 6, gemChance: 0.03, gem: ['amethyst', 'topaz', 'opal'] },
  { id: 'copper', name: 'Copper ore', tier: 6, gemChance: 0.02, gem: ['emerald', 'topaz'] },
  { id: 'jade-rock', name: 'Jade stone', tier: 7, gemChance: 0.025, gem: ['jade', 'emerald'] },
  { id: 'iron', name: 'Iron ore', tier: 7, gemChance: 0.02, gem: ['ruby', 'onyx'] },
  { id: 'goldrock', name: 'Gold-flecked rock', tier: 7, gemChance: 0.028, gem: ['topaz', 'diamond'] },
  { id: 'lavarock', name: 'Lava rock', tier: 8, gemChance: 0.035, gem: ['ruby', 'topaz', 'onyx'] },
  { id: 'obsidian', name: 'Obsidian', tier: 8, gemChance: 0.04, gem: ['onyx', 'diamond', 'moonstone'] },
  { id: 'geode', name: 'Geode', tier: 9, gemChance: 0.05, gem: ['amethyst', 'opal', 'sapphire', 'emerald', 'topaz'] },
  { id: 'deep-stone', name: 'Deep stone', tier: 10, gemChance: 0.08, gem: ['sapphire', 'ruby', 'emerald', 'diamond', 'amethyst', 'topaz', 'opal', 'onyx', 'jade', 'moonstone'] },
]

export interface Tree {
  id: string
  name: string
  cls: 'soft' | 'med' | 'hard' | 'very'
  biome: 'land' | 'sea' | 'volcano'
  burn: number
  float: number
}

export const TREES: Tree[] = [
  { id: 'oak', name: 'Oak', cls: 'med', biome: 'land', burn: 0.6, float: 0.4 },
  { id: 'pine', name: 'Pine', cls: 'med', biome: 'land', burn: 0.8, float: 0.5 },
  { id: 'fir', name: 'Fir', cls: 'med', biome: 'land', burn: 0.75, float: 0.5 },
  { id: 'spruce', name: 'Spruce', cls: 'med', biome: 'land', burn: 0.75, float: 0.48 },
  { id: 'maple', name: 'Maple', cls: 'med', biome: 'land', burn: 0.65, float: 0.4 },
  { id: 'aspen', name: 'Aspen', cls: 'soft', biome: 'land', burn: 0.75, float: 0.5 },
  { id: 'cottonwood', name: 'Cottonwood', cls: 'soft', biome: 'land', burn: 0.7, float: 0.55 },
  { id: 'snag', name: 'Dead snag', cls: 'hard', biome: 'land', burn: 0.2, float: 0.2 },
  { id: 'horsetail', name: 'Giant horsetail', cls: 'soft', biome: 'land', burn: 0.9, float: 0.35 },
  { id: 'birch', name: 'Birch', cls: 'soft', biome: 'land', burn: 0.7, float: 0.45 },
  { id: 'redwood', name: 'Redwood', cls: 'hard', biome: 'land', burn: 0.4, float: 0.35 },
  { id: 'palm', name: 'Palm', cls: 'soft', biome: 'land', burn: 0.75, float: 0.7 },
  { id: 'mangrove', name: 'Mangrove', cls: 'med', biome: 'sea', burn: 0.5, float: 0.55 },
  { id: 'bamboo', name: 'Bamboo', cls: 'soft', biome: 'land', burn: 0.85, float: 0.8 },
  { id: 'baobab', name: 'Baobab', cls: 'hard', biome: 'land', burn: 0.35, float: 0.3 },
  { id: 'ironwood', name: 'Ironwood', cls: 'hard', biome: 'land', burn: 0.2, float: 0.15 },
  { id: 'ebony', name: 'Ebony', cls: 'hard', biome: 'land', burn: 0.25, float: 0.1 },
  { id: 'cedar', name: 'Cedar', cls: 'med', biome: 'land', burn: 0.55, float: 0.4 },
  { id: 'willow', name: 'Willow', cls: 'soft', biome: 'land', burn: 0.7, float: 0.5 },
  { id: 'cypress', name: 'Cypress', cls: 'med', biome: 'sea', burn: 0.5, float: 0.45 },
  { id: 'kapok', name: 'Jungle kapok', cls: 'med', biome: 'land', burn: 0.65, float: 0.6 },
  { id: 'ferntree', name: 'Fern tree', cls: 'soft', biome: 'land', burn: 0.9, float: 0.4 },
  { id: 'cycad', name: 'Cycad', cls: 'soft', biome: 'land', burn: 0.6, float: 0.35 },
  { id: 'ginkgo', name: 'Ginkgo', cls: 'soft', biome: 'land', burn: 0.7, float: 0.4 },
  { id: 'bloodwood', name: 'Bloodwood', cls: 'hard', biome: 'volcano', burn: 0.3, float: 0.2 },
  { id: 'petrified', name: 'Petrified wood', cls: 'very', biome: 'volcano', burn: 0, float: 0 },
  { id: 'driftwood', name: 'Driftwood', cls: 'soft', biome: 'sea', burn: 0.8, float: 0.9 },
]

export interface Gem {
  id: string
  name: string
  need: number
  bite: number
  def: number
  spd: number
  hp: number
  swim: number
  fly: number
  note: string
}

export const GEMS: Gem[] = [
  { id: 'sapphire', name: 'Sapphire abyss', need: 3, bite: 1, def: 2, spd: 0.4, hp: 8, swim: 2.2, fly: 0, note: 'Deep swimmer' },
  { id: 'ruby', name: 'Ruby berserk', need: 3, bite: 8, def: 0, spd: 0.6, hp: 6, swim: 0, fly: 0, note: 'Fire attack' },
  { id: 'emerald', name: 'Emerald regen', need: 3, bite: 1, def: 2, spd: 0, hp: 20, swim: 0, fly: 0, note: 'Regrowth' },
  { id: 'diamond', name: 'Diamond tank', need: 3, bite: 0, def: 8, spd: -0.4, hp: 28, swim: 0, fly: 0, note: 'Armor' },
  { id: 'amethyst', name: 'Amethyst veil', need: 3, bite: 3, def: 1, spd: 0.5, hp: 4, swim: 0, fly: 0, note: 'Stealth' },
  { id: 'topaz', name: 'Topaz spark', need: 3, bite: 3, def: 0, spd: 1.8, hp: 0, swim: 0.4, fly: 0.6, note: 'Speed' },
  { id: 'opal', name: 'Opal shift', need: 3, bite: 2, def: 2, spd: 0.4, hp: 8, swim: 0.4, fly: 0.4, note: 'Adaptive colors' },
  { id: 'onyx', name: 'Onyx venom', need: 3, bite: 6, def: 2, spd: 0.2, hp: 6, swim: 0, fly: 0, note: 'Night venom' },
  { id: 'jade', name: 'Jade titan', need: 3, bite: 4, def: 4, spd: -0.2, hp: 16, swim: 0, fly: 0, note: 'Tremor and burrow' },
  { id: 'moonstone', name: 'Moonstone storm', need: 3, bite: 4, def: 1, spd: 0.4, hp: 6, swim: 0, fly: 1.4, note: 'Sky lord' },
]

export const HIDES: { id: string; name: string; band: number; biome: 'sea' | 'land'; tough: number; warm: number; wet: number }[] = [
  { id: 'skin', name: 'Thin skin', band: 0, biome: 'sea', tough: 1, warm: 0, wet: 0.2 },
  { id: 'fuzzy', name: 'Fuzzy pelt', band: 0, biome: 'land', tough: 1, warm: 0.4, wet: 0 },
  { id: 'scale', name: 'Scaly hide', band: 1, biome: 'land', tough: 2, warm: 0.2, wet: 0.3 },
  { id: 'eel', name: 'Slick eel skin', band: 1, biome: 'sea', tough: 1, warm: 0, wet: 0.8 },
  { id: 'leather', name: 'Leathery hide', band: 2, biome: 'land', tough: 3, warm: 0.3, wet: 0.3 },
  { id: 'fur', name: 'Thick fur', band: 2, biome: 'land', tough: 2, warm: 0.8, wet: 0 },
  { id: 'platehide', name: 'Armored plate hide', band: 3, biome: 'land', tough: 5, warm: 0.2, wet: 0.2 },
  { id: 'shark', name: 'Shark skin', band: 3, biome: 'sea', tough: 4, warm: 0, wet: 0.7 },
  { id: 'blubber', name: 'Blubber hide', band: 3, biome: 'sea', tough: 3, warm: 0.9, wet: 0.9 },
  { id: 'dragonscale', name: 'Dragon-scale hide', band: 4, biome: 'land', tough: 7, warm: 0.5, wet: 0.3 },
  { id: 'titan', name: 'Titan hide', band: 5, biome: 'land', tough: 9, warm: 0.4, wet: 0.3 },
  { id: 'chitinous', name: 'Chitinous shell-hide', band: 2, biome: 'land', tough: 4, warm: 0.1, wet: 0.4 },
  { id: 'bark', name: 'Bark-like hide', band: 2, biome: 'land', tough: 3, warm: 0.3, wet: 0.2 },
  { id: 'mucus', name: 'Mucus coat', band: 1, biome: 'sea', tough: 1, warm: 0, wet: 1 },
  { id: 'quillhide', name: 'Quill-backed hide', band: 2, biome: 'land', tough: 3, warm: 0.2, wet: 0.1 },
  { id: 'iridescent', name: 'Iridescent skin', band: 1, biome: 'sea', tough: 2, warm: 0, wet: 0.5 },
  { id: 'ashhide', name: 'Ash-crusted hide', band: 4, biome: 'land', tough: 6, warm: 0.7, wet: 0 },
  { id: 'coralhide', name: 'Coral-crusted hide', band: 3, biome: 'sea', tough: 5, warm: 0.1, wet: 0.6 },
  { id: 'velvet', name: 'Velvet pelt', band: 1, biome: 'land', tough: 2, warm: 0.5, wet: 0 },
  { id: 'colossal', name: 'Colossal slab hide', band: 5, biome: 'sea', tough: 10, warm: 0.6, wet: 0.8 },
]

export const MATS = [
  'sticks', 'stone', 'mud', 'kelp', 'coral', 'bones', 'resin', 'vines', 'feathers', 'scales', 'shells',
  'amber', 'obsidian', 'crystals', 'sand', 'clay', 'sponge', 'pearl', 'chitin', 'hide',
] as const

export interface DefenseDef {
  id: string
  name: string
  tier: number
  range: number
  dmg: number
  rate: number
  hp: number
  slow: number
  stun: number
  heal: number
  sea: boolean
  volcano: boolean
  decoy: boolean
  summon: boolean
  cost: Record<string, number>
}

export const DEFENSES: DefenseDef[] = [
  { id: 'spitter', name: 'Spitter tower', tier: 5, range: 9, dmg: 4, rate: 0.8, hp: 30, slow: 0, stun: 0, heal: 0, sea: false, volcano: false, decoy: false, summon: false, cost: { mud: 2, bones: 1 } },
  { id: 'thorn', name: 'Thorn bramble wall', tier: 5, range: 2.2, dmg: 3, rate: 0.5, hp: 40, slow: 0.55, stun: 0, heal: 0, sea: false, volcano: false, decoy: false, summon: false, cost: { vines: 3, sticks: 2 } },
  { id: 'pit', name: 'Spike pit', tier: 5, range: 2, dmg: 7, rate: 1.2, hp: 22, slow: 0.3, stun: 0, heal: 0, sea: false, volcano: false, decoy: false, summon: false, cost: { stone: 2, sticks: 1 } },
  { id: 'resin', name: 'Sticky resin trap', tier: 5, range: 2.4, dmg: 1, rate: 0.4, hp: 18, slow: 0.75, stun: 0, heal: 0, sea: false, volcano: false, decoy: false, summon: false, cost: { resin: 2 } },
  { id: 'hive', name: 'Stinger hive', tier: 5, range: 8, dmg: 2, rate: 0.35, hp: 24, slow: 0, stun: 0, heal: 0, sea: false, volcano: false, decoy: false, summon: false, cost: { chitin: 2, resin: 1 } },
  { id: 'catapult', name: 'Boulder catapult', tier: 6, range: 12, dmg: 9, rate: 1.6, hp: 36, slow: 0, stun: 0, heal: 0, sea: false, volcano: false, decoy: false, summon: false, cost: { stone: 3, sticks: 2 } },
  { id: 'coral', name: 'Coral spike turret', tier: 5, range: 8, dmg: 4, rate: 0.9, hp: 34, slow: 0, stun: 0, heal: 0, sea: true, volcano: false, decoy: false, summon: false, cost: { coral: 3 } },
  { id: 'eel', name: 'Electric eel coil', tier: 5, range: 7, dmg: 3, rate: 1.1, hp: 26, slow: 0, stun: 0.8, heal: 0, sea: true, volcano: false, decoy: false, summon: false, cost: { kelp: 2, bones: 1 } },
  { id: 'lavatrap', name: 'Lava trap', tier: 7, range: 3, dmg: 12, rate: 1.4, hp: 28, slow: 0, stun: 0, heal: 0, sea: false, volcano: true, decoy: false, summon: false, cost: { obsidian: 1, stone: 2 } },
  { id: 'lure', name: 'Glow lure decoy', tier: 5, range: 11, dmg: 0, rate: 0.5, hp: 14, slow: 0.4, stun: 0, heal: 0, sea: false, volcano: false, decoy: true, summon: false, cost: { kelp: 1, scales: 1 } },
  { id: 'moss', name: 'Healing moss totem', tier: 5, range: 6, dmg: 0, rate: 1, hp: 20, slow: 0, stun: 0, heal: 3, sea: false, volcano: false, decoy: false, summon: false, cost: { vines: 2, mud: 1 } },
  { id: 'nest', name: 'Guard beast nest', tier: 6, range: 8, dmg: 0, rate: 4, hp: 30, slow: 0, stun: 0, heal: 0, sea: false, volcano: false, decoy: false, summon: true, cost: { bones: 3, hide: 1 } },
]

export interface BuildDef {
  id: string
  name: string
  tier: number
  hp: number
  heal: number
  storage: boolean
  under: boolean
  sea: boolean
  cost: Record<string, number>
}

export const BUILDINGS: BuildDef[] = [
  { id: 'lean', name: 'Lean-to', tier: 1, hp: 22, heal: 1, storage: false, under: false, sea: true, cost: { kelp: 2 } },
  { id: 'nest', name: 'Nest', tier: 5, hp: 40, heal: 1, storage: false, under: false, sea: false, cost: { sticks: 4, mud: 2 } },
  { id: 'burrow', name: 'Burrow', tier: 3, hp: 30, heal: 0, storage: false, under: true, sea: false, cost: { mud: 3 } },
  { id: 'den', name: 'Den', tier: 5, hp: 70, heal: 2, storage: true, under: false, sea: false, cost: { sticks: 4, stone: 3, hide: 1 } },
  { id: 'wall', name: 'Wall', tier: 5, hp: 50, heal: 0, storage: false, under: false, sea: false, cost: { stone: 3, mud: 1 } },
  { id: 'shelter', name: 'Shelter', tier: 5, hp: 45, heal: 1, storage: false, under: false, sea: false, cost: { sticks: 5, vines: 2 } },
  { id: 'reef', name: 'Reef shelter', tier: 5, hp: 40, heal: 1, storage: false, under: false, sea: true, cost: { coral: 3, kelp: 2 } },
  { id: 'room', name: 'Underground room', tier: 5, hp: 60, heal: 2, storage: true, under: true, sea: false, cost: { stone: 4, clay: 2 } },
  { id: 'reinforce', name: 'Reinforced tunnel', tier: 4, hp: 55, heal: 0, storage: false, under: true, sea: false, cost: { stone: 3, resin: 1 } },
  { id: 'buried', name: 'Buried den', tier: 5, hp: 65, heal: 2, storage: true, under: true, sea: false, cost: { mud: 3, bones: 2, hide: 1 } },
  { id: 'hidden', name: 'Hidden entrance', tier: 5, hp: 25, heal: 0, storage: false, under: true, sea: false, cost: { vines: 2, mud: 1 } },
]

export const TRAPS = [
  { id: 'lava-vein', name: 'Lava vein', dmg: 8, warn: 'Cracks glow with heat' },
  { id: 'gas', name: 'Gas pocket', dmg: 4, warn: 'Bubbles smell sharp' },
  { id: 'cavein', name: 'Cave-in', dmg: 7, warn: 'The ceiling ticks' },
  { id: 'pressure', name: 'Pressure pocket', dmg: 3, warn: 'Water knocks at the wall' },
  { id: 'nest', name: 'Monster nest', dmg: 0, warn: 'Something scratches behind the stone' },
] as const

export const RAID_MIN_TIER = 5
export const RAID_WINDOW = 2
export const LOOT_MAT = 0.34
export const LOOT_GEM = 0.14
export const FAIL_MAT = 0.35
export const OFFLINE_MULT = 0.25
export const SHIELD_SEC = 7200
export const WARN_SEC = 40
export const RAID_GAP = 110
export const RAIDER_CAP = 8
export const GUARD_CAP = 4
export const NPC_CAP = 16
export const SHARD_CAP = 100
export const TICK_MS = 100

export const ROCK_TINT: Record<string, number> = {
  chalk: 0xece6d8,
  pumice: 0xc9b8a4,
  sandstone: 0xc9a06a,
  shale: 0x6a6560,
  limestone: 0xd4cdb8,
  'coral-rock': 0xd48980,
  slate: 0x4a5560,
  flint: 0x3a3a3c,
  granite: 0x8a8680,
  basalt: 0x3c3a40,
  marble: 0xf2eee8,
  quartz: 0xe8dff0,
  copper: 0xb87333,
  'jade-rock': 0x3d7a5a,
  iron: 0x6a5a52,
  goldrock: 0xd4b24a,
  lavarock: 0x8a3a28,
  obsidian: 0x1a1a22,
  geode: 0x7a68a0,
  'deep-stone': 0x2a3048,
}

export const TREE_TINT: Record<string, number> = {
  oak: 0x6a4a28,
  pine: 0x3d5c3a,
  fir: 0x2a4a30,
  spruce: 0x245038,
  maple: 0xb24a22,
  aspen: 0xc8d45a,
  cottonwood: 0xc8d8a0,
  snag: 0x6a6860,
  horsetail: 0x4a7a48,
  birch: 0xe8dcc0,
  redwood: 0x8a3a28,
  palm: 0x8a7a3a,
  mangrove: 0x4a5a38,
  bamboo: 0x7a9a40,
  baobab: 0xa08058,
  ironwood: 0x4a4848,
  ebony: 0x2a2018,
  cedar: 0x8a5a32,
  willow: 0x7a8a48,
  cypress: 0x4a5c4a,
  kapok: 0x8a6a40,
  ferntree: 0x4a7a38,
  cycad: 0x5a6a30,
  ginkgo: 0xd4c44a,
  bloodwood: 0x8a2020,
  petrified: 0x6a6868,
  driftwood: 0x8a7a68,
}

export function rockById(id: string): Rock | undefined {

  return ROCKS.find((r) => r.id === id)
}

export function treeById(id: string): Tree | undefined {
  return TREES.find((t) => t.id === id)
}

export function jawById(id: string): Pick | undefined {
  return JAWS.find((j) => j.id === id)
}
export function teethById(id: string): Pick | undefined {
  return TEETH.find((j) => j.id === id)
}
export function feetById(id: string): Pick | undefined {
  return FEET.find((j) => j.id === id)
}
export function hornById(id: string): Pick | undefined {
  return HORNS.find((j) => j.id === id)
}
export function styleById(id: string): Pick | undefined {
  return WING_STYLES.find((j) => j.id === id)
}
export function armById(id: string): Pick | undefined {
  return ARM_TYPES.find((j) => j.id === id)
}
export function breakerById(id: string): Tool | undefined {
  return BREAKERS.find((j) => j.id === id)
}
export function cutterById(id: string): Tool | undefined {
  return CUTTERS.find((j) => j.id === id)
}
export function defenseById(id: string): DefenseDef | undefined {
  return DEFENSES.find((d) => d.id === id)
}
export function buildById(id: string): BuildDef | undefined {
  return BUILDINGS.find((b) => b.id === id)
}
