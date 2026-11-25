/** Seafloor healing plants.
 * Pure module: no DOM, no THREE. Eating restores HP only — never EP.
 */

import { BEACH_END, WATER, groundAt } from './terrain'

export interface HealPlant {
  id: number
  x: number
  y: number
  z: number
  /** HP restored when eaten. Never grants EP. */
  heal: number
  ready: boolean
  /** Seconds remaining until this tuft regrows. */
  regen: number
  period: number
  /** 'sea' seagrass or 'berry' land berry bush. */
  kind?: 'sea' | 'berry'
}

export function createHealPlants(): HealPlant[] {
  const out: HealPlant[] = []
  let id = 1
  // Spread a visible lattice across the whole seafloor, with jitter so it doesn't look gridded.
  for (let x = 3; x <= 70; x += 7) {
    for (let z = -78; z <= 78; z += 8) {
      const jx = ((id * 13) % 7) - 3
      const jz = ((id * 19) % 7) - 3
      const px = x + jx * 0.7
      const pz = z + jz * 0.7
      const gy = groundAt(px, pz, 16)
      if (gy >= WATER - 0.35) continue
      const period = 9 + (id % 6)
      out.push({
        id: id++,
        x: px,
        y: gy + 0.18,
        z: pz,
        heal: 8 + (id % 5),
        ready: true,
        regen: 0,
        period,
        kind: 'sea',
      })
    }
  }
  for (let x = BEACH_END; x <= 160; x += 9) {
    for (let z = -76; z <= 76; z += 11) {
      const jx = ((id * 11) % 7) - 3
      const jz = ((id * 17) % 7) - 3
      const px = x + jx * 0.8
      const pz = z + jz * 0.8
      const gy = groundAt(px, pz, 16)
      const period = 10 + (id % 7)
      out.push({
        id: id++,
        x: px,
        y: gy + 0.2,
        z: pz,
        heal: 9 + (id % 6),
        ready: true,
        regen: 0,
        period,
        kind: 'berry',
      })
    }
  }
  return out
}

export function stepHealPlants(plants: HealPlant[], dt: number): void {
  for (const p of plants) {
    if (p.ready) continue
    p.regen = Math.max(0, p.regen - dt)
    if (p.regen <= 0) {
      p.ready = true
      p.regen = 0
    }
  }
}

/** If a ready plant is within reach, eat it (HP only) and start its regen timer. */
export function tryEatPlant(plants: HealPlant[], x: number, y: number, z: number, reach: number): HealPlant | null {
  let best: HealPlant | null = null
  let bestD = reach * reach
  for (const p of plants) {
    if (!p.ready) continue
    const dx = p.x - x
    const dy = p.y - y
    const dz = p.z - z
    const d = dx * dx + dy * dy + dz * dz
    if (d <= bestD) {
      bestD = d
      best = p
    }
  }
  if (!best) return null
  best.ready = false
  best.regen = best.period
  return best
}
