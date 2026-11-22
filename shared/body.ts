import type { Loadout } from './catalog'
import { jawById } from './catalog'
import { tierOf } from './rules'

/** Visual scale. A tier-1 swimmer is about 55% of the old 1.27 body, then grows with tier and size. */
export function bodyScale(load: Loadout, spent: number, boss = false): number {
  const tier = tierOf(spent)
  const old = 0.9 + load.size * 0.4 + Math.min(0.35, spent / 500)
  const young = load.legs > 0 ? 1 : tier <= 1 ? 0.55 : tier === 2 ? 0.64 : Math.min(1, 0.64 + (tier - 2) * 0.07)
  return old * young + (boss ? 1.05 : 0)
}

export function massOf(load: Loadout, spent: number): number {
  return 0.72 + load.size * 0.42 + load.armor * 0.2 + Math.max(0, (load.skin || 1) - 1) * 0.03 + Math.max(0, tierOf(spent) - 1) * 0.035
}

export interface BodyBox {
  scale: number
  mass: number
  long: number
  tall: number
  len: number
  rad: number
  /** Forward offset of the mouth from the body center. */
  mouth: number
  biteR: number
}

const SPECIES: Record<string, { long: number; tall: number }> = {
  shrimp: { long: 0.78, tall: 0.82 },
  needle: { long: 1.28, tall: 0.62 },
  bell: { long: 0.72, tall: 1.22 },
  plate: { long: 0.95, tall: 0.9 },
}

export function bodyBox(load: Loadout, spent: number, boss = false, species = ''): BodyBox {
  const scale = bodyScale(load, spent, boss)
  const mass = massOf(load, spent)
  const shape = SPECIES[species] ?? { long: 1, tall: 1 }
  const land = load.legs > 0
  const jaw = jawById(load.jaw)
  const jlen = (0.16 + (jaw?.len ?? 0.3) * 0.22) * scale * shape.long
  const len = (land ? 2.05 : 2.35) * scale * shape.long
  const rad = (land ? 0.34 : 0.2) * scale * shape.tall
  const mouth = (land ? 1.15 : 0.78) * scale * shape.long + jlen * 0.4
  const biteR = (0.16 + (jaw?.wd ?? 0.16) * 0.22 + (jaw?.ht ?? 0.12) * 0.08) * scale
  return { scale, mass, long: shape.long, tall: shape.tall, len, rad, mouth, biteR }
}

export function mouthHit(ax: number, ay: number, az: number, yaw: number, a: BodyBox, bx: number, by: number, bz: number, b: BodyBox): boolean {
  const mx = ax + Math.cos(yaw) * a.mouth
  const mz = az + Math.sin(yaw) * a.mouth
  const my = ay + a.rad * 0.05
  const dx = bx - mx
  const dy = by - my
  const dz = bz - mz
  const reach = (a.biteR + b.rad) * 2.3 + 0.85
  const ahead = dx * Math.cos(yaw) + dz * Math.sin(yaw)
  return dx * dx + dy * dy + dz * dz <= reach * reach && ahead > -(a.mouth * 1.15 + b.rad + 0.6)
}
