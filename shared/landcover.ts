/** Land-zone cover: 20 tree kinds, rocks, and plants.
 * Pure module: no DOM, no THREE. Chunks and the sim both reuse these placements.
 */

export const LAND_TREES = [
  'pine',
  'fir',
  'spruce',
  'cedar',
  'redwood',
  'oak',
  'maple',
  'birch',
  'aspen',
  'willow',
  'cottonwood',
  'palm',
  'cypress',
  'mangrove',
  'ferntree',
  'cycad',
  'ginkgo',
  'baobab',
  'snag',
  'horsetail',
] as const

export type LandTreeId = (typeof LAND_TREES)[number]

export const LAND_TREE_NAMES: Record<LandTreeId, string> = {
  pine: 'Pine',
  fir: 'Fir',
  spruce: 'Spruce',
  cedar: 'Cedar',
  redwood: 'Redwood',
  oak: 'Oak',
  maple: 'Maple',
  birch: 'Birch',
  aspen: 'Aspen',
  willow: 'Willow',
  cottonwood: 'Cottonwood',
  palm: 'Palm',
  cypress: 'Cypress',
  mangrove: 'Mangrove',
  ferntree: 'Tree fern',
  cycad: 'Cycad',
  ginkgo: 'Ginkgo',
  baobab: 'Baobab',
  snag: 'Dead snag',
  horsetail: 'Giant horsetail',
}

export type RockStyle = 'boulder' | 'outcrop' | 'pebble'
export type PlantStyle = 'fern' | 'grass' | 'shrub' | 'berry'

export interface Spot {
  kind: string
  x: number
  y: number
  z: number
  rot: number
  scale: number
}

export interface LandScatter {
  trees: Spot[]
  rocks: Spot[]
  plants: Spot[]
  berries: Spot[]
}

function hash(i: number): number {
  let a = (i + 0x6d2b79f5) >>> 0
  a = Math.imul(a ^ (a >>> 15), a | 1)
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61)
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296
}

/** Scatter a mixed forest, rocks and plants across one land chunk. */
export function scatterChunk(
  cx: number,
  cz: number,
  chunk: number,
  groundAt: (x: number, z: number, fromY: number) => number,
  density: 'high' | 'mid' | 'low',
): LandScatter {
  const trees: Spot[] = []
  const rocks: Spot[] = []
  const plants: Spot[] = []
  const berries: Spot[] = []
  const ox = cx * chunk
  const oz = cz * chunk
  const treeN = density === 'high' ? 14 : density === 'mid' ? 10 : 7
  const rockN = density === 'high' ? 10 : density === 'mid' ? 7 : 5
  const plantN = density === 'high' ? 28 : density === 'mid' ? 18 : 12
  const berryN = density === 'high' ? 5 : density === 'mid' ? 4 : 3
  const seed = (cx * 131 + cz * 197) | 0

  for (let i = 0; i < treeN; i++) {
    const u = hash(seed + i * 3)
    const v = hash(seed + i * 3 + 1)
    const x = ox + u * chunk
    const z = oz + v * chunk
    if (x < 64 && x < 70 && z * z > 0 && x < 62) continue
    if (x < 60) continue
    const y = groundAt(x, z, 8)
    const id = LAND_TREES[(Math.floor(hash(seed + i * 5) * LAND_TREES.length) + (cx + cz + i) * 3) % LAND_TREES.length]!
    const shore = x < 76
    const prefer = shore ? (i % 3 === 0 ? 'mangrove' : i % 3 === 1 ? 'cypress' : 'palm') : id
    const kind = x < 72 ? prefer : id
    const scale = kind === 'redwood' ? 1.6 + u * 0.5 : kind === 'baobab' ? 1.2 + u * 0.3 : kind === 'horsetail' || kind === 'cycad' || kind === 'ferntree' ? 0.8 + u * 0.3 : 0.85 + u * 0.5
    trees.push({ kind, x, y, z, rot: hash(seed + i * 7) * Math.PI * 2, scale })
  }

  const rockKinds: RockStyle[] = ['boulder', 'outcrop', 'pebble']
  for (let i = 0; i < rockN; i++) {
    const u = hash(seed + 80 + i * 2)
    const v = hash(seed + 81 + i * 2)
    const x = ox + u * chunk
    const z = oz + v * chunk
    if (x < 58) continue
    const y = groundAt(x, z, 8)
    const kind = rockKinds[i % 3]!
    const scale = kind === 'boulder' ? 1.1 + u * 0.8 : kind === 'outcrop' ? 1.2 + u * 0.7 : 0.35 + u * 0.3
    rocks.push({ kind, x, y, z, rot: v * Math.PI * 2, scale })
    if (kind === 'pebble') {
      for (let k = 0; k < 3; k++) {
        const px = x + (hash(seed + i * 11 + k) - 0.5) * 1.8
        const pz = z + (hash(seed + i * 13 + k) - 0.5) * 1.8
        rocks.push({ kind: 'pebble', x: px, y: groundAt(px, pz, 8), z: pz, rot: k, scale: 0.25 + hash(seed + k) * 0.25 })
      }
    }
  }

  const plantKinds: PlantStyle[] = ['fern', 'grass', 'shrub', 'grass', 'fern']
  for (let i = 0; i < plantN; i++) {
    const u = hash(seed + 200 + i * 2)
    const v = hash(seed + 201 + i * 2)
    const x = ox + u * chunk
    const z = oz + v * chunk
    if (x < 62) continue
    const y = groundAt(x, z, 8)
    plants.push({ kind: plantKinds[i % plantKinds.length]!, x, y, z, rot: v * 6.2, scale: 0.7 + u * 0.6 })
  }
  for (let i = 0; i < berryN; i++) {
    const u = hash(seed + 400 + i * 2)
    const v = hash(seed + 401 + i * 2)
    const x = ox + u * chunk
    const z = oz + v * chunk
    if (x < 64) continue
    const y = groundAt(x, z, 8)
    berries.push({ kind: 'berry', x, y, z, rot: v * 4, scale: 0.85 + u * 0.3 })
  }
  return { trees, rocks, plants, berries }
}
