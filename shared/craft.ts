/** Light land-zone survival crafting. Pure: no DOM, no THREE.
 * No hunger, durability, or base building — just gather, a small inventory, and a handful of recipes.
 */

export interface Recipe {
  id: string
  name: string
  desc: string
  cost: Record<string, number>
  /** Instant HP granted when crafted (poultice). Never grants EP. */
  heal?: number
  def?: number
  bite?: number
  dry?: number
  epBonus?: number
  evasion?: number
  swim?: number
  place?: 'nest' | 'trap' | 'cairn' | 'lure'
  use?: 'raft' | 'gear'
}

export const RECIPES: Recipe[] = [
  { id: 'barkshield', name: 'Bark shield', desc: 'A shell of bark bound with sticks. Adds defense.', cost: { bark: 3, sticks: 2 }, def: 3, use: 'gear' },
  { id: 'horntip', name: 'Stone horn-tip', desc: 'A knapped stone point lashed to a horn or snout. Adds attack.', cost: { stone: 2, bones: 1 }, bite: 3, use: 'gear' },
  { id: 'wrap', name: 'Leaf moisture wrap', desc: 'Reed and leaf wrappings that slow drying out on land.', cost: { reed: 2, leaf: 3 }, dry: 0.45, use: 'gear' },
  { id: 'poultice', name: 'Herb poultice', desc: 'A mashed herb pack. Restores HP only, no EP.', cost: { herb: 2, moss: 1 }, heal: 18 },
  { id: 'nest', name: 'Twig nest', desc: 'A hidden nest. You respawn here if you fall.', cost: { sticks: 4, moss: 2 }, place: 'nest' },
  { id: 'trap', name: 'Thorn trap', desc: 'Stuns prey or a predator that blunders in.', cost: { thorn: 3, sticks: 2 }, place: 'trap' },
  { id: 'cairn', name: 'Rock cairn', desc: 'A stacked-stone marker you can find again.', cost: { stone: 4 }, place: 'cairn' },
  { id: 'lure', name: 'Moss lure', desc: 'A scented moss bundle that draws prey in.', cost: { moss: 3, herb: 1 }, place: 'lure' },
  { id: 'charm', name: 'Stone charm', desc: 'A coral-and-stone charm. Bonus EP from meals.', cost: { stone: 2, coral: 1 }, epBonus: 0.25, use: 'gear' },
  { id: 'raft', name: 'Log raft', desc: 'A lashed log raft. Fast travel along the stream and shore.', cost: { log: 3, vine: 2 }, swim: 2.2, use: 'raft' },
  { id: 'camo', name: 'Leaf camouflage', desc: 'Leaf-and-moss cover. Attacks against you miss more often.', cost: { leaf: 3, moss: 1 }, evasion: 0.12, use: 'gear' },
  { id: 'gourd', name: 'Freshwater gourd', desc: 'A sip of stored water. Slows drying and tops up air.', cost: { reed: 2, bark: 1 }, dry: 0.2, use: 'gear' },
]

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id)
}

export function canCraft(bag: Record<string, number>, id: string): { ok: boolean; reason: string } {
  const rec = recipeById(id)
  if (!rec) return { ok: false, reason: 'Unknown recipe.' }
  for (const [mat, n] of Object.entries(rec.cost)) {
    if ((bag[mat] ?? 0) < n) return { ok: false, reason: `Need ${n} ${mat} (have ${bag[mat] ?? 0}).` }
  }
  return { ok: true, reason: '' }
}

export function spendCraft(bag: Record<string, number>, id: string): { ok: boolean; reason: string; recipe?: Recipe } {
  const rec = recipeById(id)
  const check = canCraft(bag, id)
  if (!rec || !check.ok) return { ok: false, reason: check.reason }
  for (const [mat, n] of Object.entries(rec.cost)) bag[mat] = (bag[mat] ?? 0) - n
  if (rec.use === 'gear' || rec.use === 'raft') bag[rec.id] = (bag[rec.id] ?? 0) + 1
  return { ok: true, reason: `Crafted ${rec.name}.`, recipe: rec }
}

/** What a land forage node drops when bitten or dug. */
export function forageDrop(kind: 'tree' | 'rock' | 'plant' | 'berry', id: string): Record<string, number> {
  if (kind === 'tree') return { log: 2, bark: 1, sticks: 2, [id]: 1 }
  if (kind === 'rock') return id === 'coral-rock' || id === 'coral' ? { stone: 2, coral: 2, shell: 1 } : { stone: 3, shell: 1 }
  if (kind === 'berry') return { herb: 2, berry: 2, leaf: 1 }
  if (id === 'fern') return { leaf: 2, reed: 1 }
  if (id === 'shrub') return { leaf: 2, sticks: 1, vine: 1 }
  if (id === 'grass') return { reed: 2, leaf: 1 }
  return { leaf: 1, moss: 1, thorn: 1 }
}

export function addDrops(bag: Record<string, number>, drops: Record<string, number>): string {
  const bits: string[] = []
  for (const [mat, n] of Object.entries(drops)) {
    bag[mat] = (bag[mat] ?? 0) + n
    bits.push(`${n} ${mat}`)
  }
  return bits.join(', ')
}

export interface GearFx {
  def: number
  bite: number
  dry: number
  epBonus: number
  evasion: number
  swim: number
}

export function gearFx(bag: Record<string, number>): GearFx {
  const fx: GearFx = { def: 0, bite: 0, dry: 1, epBonus: 0, evasion: 0, swim: 0 }
  for (const rec of RECIPES) {
    if ((bag[rec.id] ?? 0) <= 0) continue
    fx.def += rec.def ?? 0
    fx.bite += rec.bite ?? 0
    if (rec.dry) fx.dry *= Math.max(0.2, 1 - rec.dry)
    fx.epBonus += rec.epBonus ?? 0
    fx.evasion += rec.evasion ?? 0
    fx.swim += rec.swim ?? 0
  }
  return fx
}
