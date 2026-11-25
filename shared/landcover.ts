/** Land-zone cover: 20 tree kinds, rocks, and plants.
 * Pure module: no DOM, no THREE. Chunks and the sim both reuse these placements.
 */

import { WATER, terrainHeight } from './terrain'

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
    const h = terrainHeight(x, z)
    if (h < WATER - 0.35) continue
    const y = groundAt(x, z, 16)
    const id = LAND_TREES[(Math.floor(hash(seed + i * 5) * LAND_TREES.length) + (cx + cz + i) * 3) % LAND_TREES.length]!
    const shore = h < WATER + 1.8
    const prefer = shore ? (i % 3 === 0 ? 'mangrove' : i % 3 === 1 ? 'cypress' : 'palm') : id
    const kind = shore ? prefer : id
    const scale =
      kind === 'redwood' ? 2.8 + u * 0.8
      : kind === 'baobab' ? 2.4 + u * 0.55
      : kind === 'horsetail' || kind === 'cycad' || kind === 'ferntree' ? 1.85 + u * 0.5
      : 2.25 + u * 0.7
    trees.push({ kind, x, y, z, rot: hash(seed + i * 7) * Math.PI * 2, scale })
  }

  const rockKinds: RockStyle[] = ['boulder', 'outcrop', 'pebble']
  for (let i = 0; i < rockN; i++) {
    const u = hash(seed + 80 + i * 2)
    const v = hash(seed + 81 + i * 2)
    const x = ox + u * chunk
    const z = oz + v * chunk
    if (terrainHeight(x, z) < WATER - 0.4) continue
    const y = groundAt(x, z, 16)
    const kind = rockKinds[i % 3]!
    const scale = kind === 'boulder' ? 1.35 + u * 0.9 : kind === 'outcrop' ? 1.4 + u * 0.8 : 0.4 + u * 0.35
    rocks.push({ kind, x, y, z, rot: v * Math.PI * 2, scale })
    const debris = kind === 'pebble' ? 4 : density === 'low' ? 2 : 3
    for (let k = 0; k < debris; k++) {
      const px = x + (hash(seed + i * 11 + k) - 0.5) * (kind === 'boulder' ? 2.6 : 2.0)
      const pz = z + (hash(seed + i * 13 + k) - 0.5) * (kind === 'boulder' ? 2.6 : 2.0)
      if (terrainHeight(px, pz) < WATER - 0.4) continue
      rocks.push({ kind: 'pebble', x: px, y: groundAt(px, pz, 16), z: pz, rot: k * 1.7, scale: 0.22 + hash(seed + i * 17 + k) * 0.28 })
    }
  }

  const plantKinds: PlantStyle[] = ['fern', 'grass', 'shrub', 'grass', 'fern']
  for (let i = 0; i < plantN; i++) {
    const u = hash(seed + 200 + i * 2)
    const v = hash(seed + 201 + i * 2)
    const x = ox + u * chunk
    const z = oz + v * chunk
    if (terrainHeight(x, z) < WATER - 0.2) continue
    const y = groundAt(x, z, 16)
    const kind = plantKinds[i % plantKinds.length]!
    plants.push({ kind, x, y, z, rot: v * 6.2, scale: 0.85 + u * 0.7 })
    const extras = density === 'low' ? 1 : 2
    for (let k = 0; k < extras; k++) {
      const px = x + (hash(seed + i * 23 + k) - 0.5) * 1.6
      const pz = z + (hash(seed + i * 29 + k) - 0.5) * 1.6
      if (terrainHeight(px, pz) < WATER - 0.2) continue
      plants.push({
        kind: k % 2 ? 'grass' : kind,
        x: px,
        y: groundAt(px, pz, 16),
        z: pz,
        rot: hash(seed + i * 31 + k) * 6.2,
        scale: 0.45 + hash(seed + i * 37 + k) * 0.4,
      })
    }
  }
  for (let i = 0; i < berryN; i++) {
    const u = hash(seed + 400 + i * 2)
    const v = hash(seed + 401 + i * 2)
    const x = ox + u * chunk
    const z = oz + v * chunk
    if (terrainHeight(x, z) < WATER + 0.2) continue
    const y = groundAt(x, z, 16)
    berries.push({ kind: 'berry', x, y, z, rot: v * 4, scale: 1.05 + u * 0.35 })
  }
  return { trees, rocks, plants, berries }
}

/** Visual trunk or rock radius at the given instance scale, used for body collision.
 *  Tree geos are also scaled 2.05× in landflora; rock geos are not. Stay slightly under the mesh.
 *  Pebbles and other small debris have no collider. */
export function trunkRadius(kind: string, scale: number): number {
  if (kind === 'pebble') return 0
  const tree =
    kind === 'baobab' ? 0.36
    : kind === 'redwood' ? 0.24
    : kind === 'cedar' || kind === 'oak' || kind === 'cottonwood' ? 0.16
    : kind === 'cycad' ? 0.22
    : kind === 'boulder' || kind === 'outcrop' ? 0
    : 0.12
  if (kind === 'boulder') return Math.max(0.16, 0.62 * scale * 0.78)
  if (kind === 'outcrop') return Math.max(0.16, 0.7 * scale * 0.72)
  if (tree <= 0) return 0
  return Math.max(0.14, tree * scale * 2.05 * 0.72)
}
