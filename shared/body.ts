import type { Loadout } from './catalog'
import { hornById, jawById } from './catalog'
import { tierOf } from './rules'

/** Visual scale. A tier-1 swimmer is about 55% of the old 1.27 body, then grows with tier and size. */
export function bodyScale(load: Loadout, spent: number, boss = false): number {
  const tier = tierOf(spent)
  const old = 0.9 + load.size * 0.4 + Math.min(0.35, spent / 500)
  const young = load.legs > 0 ? 1 : tier <= 1 ? (load.size <= 0.5 ? 0.36 : 0.55) : tier === 2 ? 0.64 : Math.min(1, 0.64 + (tier - 2) * 0.07)
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

export interface HitVol {
  kind: 'jaw' | 'horn' | 'claw'
  x: number
  y: number
  z: number
  r: number
}

const SPECIES: Record<string, { long: number; tall: number }> = {
  shrimp: { long: 0.78, tall: 0.82 },
  needle: { long: 1.28, tall: 0.62 },
  bell: { long: 0.72, tall: 1.22 },
  plate: { long: 0.95, tall: 0.9 },
}

/** Guppy-stage hunter: small body, first minutes of a new game. */
export function youngBite(load: Loadout, spent: number): boolean {
  return spent < 12 && load.legs === 0 && load.size <= 0.55
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

/** Per-part attack volumes at the visible jaw, horn, and claws. */
export function attackVolumes(
  load: Loadout,
  spent: number,
  boss: boolean,
  species: string,
  x: number,
  y: number,
  z: number,
  yaw: number,
): HitVol[] {
  const box = bodyBox(load, spent, boss, species)
  const cs = Math.cos(yaw)
  const sn = Math.sin(yaw)
  const vols: HitVol[] = []
  const grace = youngBite(load, spent) ? 0.62 : 0.1
  vols.push({
    kind: 'jaw',
    x: x + cs * box.mouth,
    y: y + box.rad * 0.05,
    z: z + sn * box.mouth,
    r: Math.max(box.biteR + grace, youngBite(load, spent) ? 0.7 : box.biteR),
  })
  const horn = hornById(load.horn)
  if (horn && load.horn && load.horn !== 'smooth') {
    const reach = box.mouth + (horn.len ?? 0.3) * box.scale * 0.55
    vols.push({
      kind: 'horn',
      x: x + cs * reach,
      y: y + box.rad * 0.55,
      z: z + sn * reach,
      r: 0.12 * box.scale + (horn.wd ?? 0.12) * 0.14 * box.scale,
    })
  }
  const claws = load.arms > 0 || load.armType === 'claw' || load.armType === 'spade' || load.feet === 'claw'
  if (claws && (load.arms > 0 || load.legs > 0)) {
    const side = box.rad * 0.95
    const fwd = box.mouth * 0.55
    const r = 0.16 * box.scale + (load.arms > 0 ? 0.04 : 0)
    vols.push({ kind: 'claw', x: x + cs * fwd - sn * side, y: y - box.rad * 0.1, z: z + sn * fwd + cs * side, r })
    vols.push({ kind: 'claw', x: x + cs * fwd + sn * side, y: y - box.rad * 0.1, z: z + sn * fwd - cs * side, r })
  }
  return vols
}

export function volumeHits(vols: HitVol[], bx: number, by: number, bz: number, br: number): HitVol | null {
  for (const v of vols) {
    const dx = bx - v.x
    const dy = by - v.y
    const dz = bz - v.z
    const reach = v.r + br
    if (dx * dx + dy * dy + dz * dz <= reach * reach) return v
  }
  return null
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
