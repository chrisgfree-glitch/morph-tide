/** Varied, respawning prey populations.
 * Pure module: no DOM, no THREE. A later server can step the same spawners.
 */

export type PreyRegion = 'sea' | 'land' | 'volcano'

export interface PreyKind {
  id: string
  name: string
  species: string
  region: PreyRegion
  bias: number
  hp: number
  spent: number
  size: number
}

export interface Spawner {
  id: string
  kind: string
  region: PreyRegion
  cx: number
  cy: number
  cz: number
  radius: number
  min: number
  max: number
  /** Live target count; slowly drifts between min and max. */
  target: number
  drift: number
  /** Seconds between ordinary refill spawns. */
  respawn: number
  cool: number
  /** Seconds until a possible bloom swarm. */
  bloomEvery: number
  bloomIn: number
  bloomN: number
  blooming: number
}

export interface SpawnRequest {
  spawnerId: string
  kind: string
  x: number
  y: number
  z: number
  bloom: boolean
}

export const PREY_KINDS: PreyKind[] = [
  { id: 'speck', name: 'Speck fry', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.32 },
  { id: 'pebble', name: 'Pebble fry', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.34 },
  { id: 'shimmer', name: 'Shimmer fry', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.33 },
  { id: 'dab', name: 'Dab shrimp', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.36 },
  { id: 'minnow', name: 'Glass minnow', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.38 },
  { id: 'riffle', name: 'Riffle fry', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.34 },
  { id: 'tide', name: 'Tide fry', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.35 },
  { id: 'silk', name: 'Silk fry', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.32 },
  { id: 'brine', name: 'Brine shrimp', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.36 },
  { id: 'silt', name: 'Silt shrimp', species: 'shrimp', region: 'sea', bias: 0, hp: 3, spent: 0, size: 0.35 },
  { id: 'dart', name: 'Kelp dart', species: 'needle', region: 'sea', bias: 2, hp: 8, spent: 8, size: 0.55 },
  { id: 'bell', name: 'Ghost bell', species: 'bell', region: 'sea', bias: 6, hp: 12, spent: 16, size: 0.7 },
  { id: 'platebug', name: 'Plate bug', species: 'plate', region: 'sea', bias: 10, hp: 18, spent: 24, size: 0.8 },
  { id: 'crab', name: 'Shore crab', species: 'crab', region: 'land', bias: 0, hp: 8, spent: 8, size: 0.55 },
  { id: 'beetle', name: 'Amber beetle', species: 'beetle', region: 'land', bias: 2, hp: 10, spent: 10, size: 0.58 },
  { id: 'newt', name: 'Reed newt', species: 'newt', region: 'land', bias: 1, hp: 9, spent: 8, size: 0.56 },
  { id: 'lizard', name: 'Dune lizard', species: 'lizard', region: 'land', bias: 6, hp: 16, spent: 20, size: 0.7 },
  { id: 'hunter', name: 'Inland hunter', species: 'hunter', region: 'land', bias: 26, hp: 36, spent: 100, size: 0.95 },
  { id: 'brute', name: 'Plate brute', species: 'brute', region: 'land', bias: 34, hp: 44, spent: 100, size: 1.05 },
  { id: 'magma', name: 'Magma beetle', species: 'magma', region: 'volcano', bias: 20, hp: 28, spent: 40, size: 0.85 },
]

export function kindById(id: string): PreyKind | undefined {
  return PREY_KINDS.find((k) => k.id === id)
}

function spawner(
  id: string,
  kind: string,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  min: number,
  max: number,
  respawn: number,
  bloomEvery: number,
  bloomN: number,
  region: PreyRegion = 'sea',
): Spawner {
  return {
    id,
    kind,
    region,
    cx,
    cy,
    cz,
    radius,
    min,
    max,
    target: Math.round((min + max) / 2),
    drift: 0,
    respawn,
    cool: 0,
    bloomEvery,
    bloomIn: bloomEvery * 0.6,
    bloomN,
    blooming: 0,
  }
}

/** Area spawners covering the whole world. Counts are high and respawns are quick. */
export function createSpawners(): Spawner[] {
  const out: Spawner[] = []
  const seaKinds: { id: string; y: number; r: number; min: number; max: number; respawn: number; bloomEvery: number; bloomN: number }[] = [
    { id: 'speck', y: 2.2, r: 11, min: 10, max: 16, respawn: 1.4, bloomEvery: 36, bloomN: 8 },
    { id: 'pebble', y: 2.5, r: 11, min: 9, max: 15, respawn: 1.5, bloomEvery: 40, bloomN: 7 },
    { id: 'shimmer', y: 3.0, r: 10, min: 8, max: 14, respawn: 1.6, bloomEvery: 42, bloomN: 7 },
    { id: 'dab', y: 2.0, r: 10, min: 8, max: 13, respawn: 1.6, bloomEvery: 44, bloomN: 6 },
    { id: 'minnow', y: 2.8, r: 11, min: 8, max: 14, respawn: 1.7, bloomEvery: 40, bloomN: 7 },
    { id: 'riffle', y: 2.4, r: 10, min: 8, max: 13, respawn: 1.6, bloomEvery: 42, bloomN: 6 },
    { id: 'tide', y: 2.6, r: 11, min: 7, max: 13, respawn: 1.8, bloomEvery: 48, bloomN: 7 },
    { id: 'silk', y: 3.0, r: 10, min: 7, max: 12, respawn: 1.7, bloomEvery: 34, bloomN: 8 },
    { id: 'brine', y: 3.2, r: 11, min: 7, max: 12, respawn: 1.8, bloomEvery: 50, bloomN: 6 },
    { id: 'silt', y: 2.4, r: 10, min: 7, max: 12, respawn: 1.8, bloomEvery: 52, bloomN: 6 },
    { id: 'dart', y: 4.2, r: 12, min: 5, max: 9, respawn: 2.4, bloomEvery: 60, bloomN: 5 },
    { id: 'bell', y: 4.0, r: 12, min: 3, max: 6, respawn: 3.2, bloomEvery: 70, bloomN: 3 },
    { id: 'platebug', y: 2.4, r: 11, min: 3, max: 6, respawn: 3.6, bloomEvery: 80, bloomN: 3 },
  ]
  // Tile the sea (x 2–64, z −80..80) so every stretch has a dense, mixed population.
  const seaXs = [6, 18, 30, 42, 54, 63]
  const seaZs = [-72, -48, -24, 0, 24, 48, 72]
  let i = 0
  for (const x of seaXs) {
    for (const z of seaZs) {
      const kind = seaKinds[i % seaKinds.length]!
      const jitterX = ((i * 17) % 7) - 3
      const jitterZ = ((i * 29) % 9) - 4
      out.push(spawner(`${kind.id}-${x}-${z}`, kind.id, x + jitterX, kind.y, z + jitterZ, kind.r, kind.min, kind.max, kind.respawn, kind.bloomEvery, kind.bloomN, 'sea'))
      i++
    }
  }
  // Mid-sea bands keep fry mixed with larger prey so food never empties out.
  for (const x of [10, 26, 46]) {
    for (const z of [-60, -20, 20, 60]) {
      out.push(spawner(`mix-speck-${x}-${z}`, 'speck', x, 2.3, z, 12, 8, 14, 1.5, 38, 7, 'sea'))
    }
  }
  const landKinds: { id: string; min: number; max: number; respawn: number; bloomEvery: number; bloomN: number }[] = [
    { id: 'crab', min: 6, max: 10, respawn: 2.6, bloomEvery: 55, bloomN: 4 },
    { id: 'beetle', min: 5, max: 9, respawn: 2.8, bloomEvery: 58, bloomN: 4 },
    { id: 'newt', min: 5, max: 9, respawn: 2.8, bloomEvery: 58, bloomN: 4 },
    { id: 'lizard', min: 4, max: 7, respawn: 3.4, bloomEvery: 70, bloomN: 3 },
    { id: 'hunter', min: 2, max: 4, respawn: 5.5, bloomEvery: 90, bloomN: 2 },
    { id: 'brute', min: 2, max: 4, respawn: 6, bloomEvery: 100, bloomN: 2 },
  ]
  const landXs = [92, 108, 124, 140, 156, 164]
  const landZs = [-64, -32, 0, 32, 64]
  let j = 0
  for (const x of landXs) {
    for (const z of landZs) {
      const kind = landKinds[j % landKinds.length]!
      out.push(spawner(`${kind.id}-${x}-${z}`, kind.id, x, 1.15, z, 14, kind.min, kind.max, kind.respawn, kind.bloomEvery, kind.bloomN, 'land'))
      j++
    }
  }
  const volXs = [172, 186]
  const volZs = [-48, -16, 16, 48]
  for (const x of volXs) {
    for (const z of volZs) {
      out.push(spawner(`magma-${x}-${z}`, 'magma', x, 1.3, z, 14, 4, 7, 3.8, 80, 3, 'volcano'))
    }
  }
  return out
}

export function pointInSpawner(s: Spawner, x: number, z: number): boolean {
  const dx = x - s.cx
  const dz = z - s.cz
  return dx * dx + dz * dz <= s.radius * s.radius
}

export function placeInSpawner(s: Spawner, rng: () => number): { x: number; y: number; z: number } {
  const ang = rng() * Math.PI * 2
  const rad = Math.sqrt(rng()) * s.radius * 0.92
  return {
    x: s.cx + Math.cos(ang) * rad,
    y: Math.max(0.6, s.cy + (rng() - 0.45) * 1.4),
    z: s.cz + Math.sin(ang) * rad,
  }
}

/** Mulberry32. Deterministic given a seed; no Math.random in the sim path unless the caller passes it. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface PreyCount {
  /** Number of living prey currently credited to this spawner. */
  of(id: string): number
}

/**
 * Step spawners forward. Target counts drift, blooms occasionally spike the
 * population, and ordinary respawn timers refill up to the current target.
 */
export function stepSpawners(
  spawners: Spawner[],
  counts: PreyCount,
  dt: number,
  rng: () => number,
): SpawnRequest[] {
  const out: SpawnRequest[] = []
  for (const s of spawners) {
    s.cool = Math.max(0, s.cool - dt)
    s.bloomIn = Math.max(0, s.bloomIn - dt)
    if (s.blooming > 0) s.blooming = Math.max(0, s.blooming - dt)

    s.drift += (rng() - 0.5) * dt * 0.35
    s.drift = Math.max(-1, Math.min(1, s.drift))
    const mid = (s.min + s.max) / 2
    const span = (s.max - s.min) / 2
    s.target = Math.max(s.min, Math.min(s.max, mid + span * s.drift))

    let want = s.target
    if (s.bloomIn <= 0) {
      s.bloomIn = s.bloomEvery * (0.75 + rng() * 0.5)
      s.blooming = 8 + rng() * 6
    }
    const blooming = s.blooming > 0
    if (blooming) want = s.target + s.bloomN

    const have = counts.of(s.id)
    const missing = Math.floor(want) - have
    if (missing <= 0 || s.cool > 0) continue

    const burst = blooming ? Math.min(missing, 2 + Math.floor(rng() * s.bloomN)) : 1
    for (let i = 0; i < burst; i++) {
      const at = placeInSpawner(s, rng)
      out.push({ spawnerId: s.id, kind: s.kind, x: at.x, y: at.y, z: at.z, bloom: blooming })
    }
    s.cool = blooming ? s.respawn * 0.25 : s.respawn
  }
  return out
}

/** Seed each spawner up to its starting target. Used when a world is first created. */
export function seedSpawners(spawners: Spawner[], rng: () => number): SpawnRequest[] {
  const out: SpawnRequest[] = []
  for (const s of spawners) {
    const n = Math.max(s.min, Math.round(s.target))
    for (let i = 0; i < n; i++) {
      const at = placeInSpawner(s, rng)
      out.push({ spawnerId: s.id, kind: s.kind, x: at.x, y: at.y, z: at.z, bloom: false })
    }
    s.cool = s.respawn * 0.5
  }
  return out
}
