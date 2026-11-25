/** Organic height of the seabed and shore. x runs sea → land → volcano, z is width. */
export const WATER = 5.6
export const WORLD_Z = 180
export const CHUNK = 28
/** Ocean floor ends and the beach ramp begins. */
export const SEA_END = 56
/** The raised land plateau begins. */
export const BEACH_END = 84
/** Dry land sits well above the water line. */
export const LAND_HEIGHT = 8.4
export const VOLCANO_X = 168

const carved = new Map<string, number>()
export const dirtyChunks = new Set<string>()

function key(ix: number, iy: number, iz: number): string {
  return `${ix}|${iy}|${iz}`
}

export function chunkId(x: number, z: number): string {
  return `${Math.floor(x / CHUNK)}|${Math.floor(z / CHUNK)}`
}

/** Positive density is solid. Caves and digs punch air through the smooth mass. */
export function density(x: number, y: number, z: number): number {
  const h = terrainHeight(x, z)
  const band = Math.sin(x * 0.07) * 5 + Math.cos(z * 0.06) * 4
  const cy = h - 2.4 + Math.sin(x * 0.16) * 0.35
  const tube = 1.15 - Math.hypot(z - band, (y - cy) * 1.15)
  const cave = Math.max(0, tube)
  const edit = carved.get(key(Math.round(x), Math.round(y), Math.round(z))) ?? 0
  return h - y - cave * 1.8 - edit
}

function editSphere(x: number, y: number, z: number, radius: number, delta: number): void {
  const r = Math.ceil(radius)
  for (let ix = -r; ix <= r; ix++) {
    for (let iy = -r; iy <= r; iy++) {
      for (let iz = -r; iz <= r; iz++) {
        const d = Math.hypot(ix, iy, iz)
        if (d > radius) continue
        const cx = Math.round(x + ix)
        const cy = Math.round(y + iy)
        const cz = Math.round(z + iz)
        const k = key(cx, cy, cz)
        const next = Math.max(0, (carved.get(k) ?? 0) + delta * (1 - d / radius))
        if (next <= 0.01) carved.delete(k)
        else carved.set(k, next)
        dirtyChunks.add(chunkId(cx, cz))
      }
    }
  }
}

export function carve(x: number, y: number, z: number, radius = 1.5, amount = 0.9): void {
  editSphere(x, y, z, radius, amount)
}

/** Put solid back. Used when gathering with nothing in reach. */
export function fill(x: number, y: number, z: number, radius = 1.2, amount = 0.7): void {
  editSphere(x, y, z, radius, -amount)
}

/** Highest solid surface under fromY, so caves and digs change the floor. */
export function groundAt(x: number, z: number, fromY: number): number {
  const surface = terrainHeight(x, z)
  const step = 0.2
  const cap = Math.max(surface, fromY) + 3
  // Quantize the start so the sample lattice never shifts with fromY (that jitter made the avatar bounce).
  let y = Math.ceil(Math.min(22, cap) / step) * step
  let prev = density(x, y + step, z)
  for (let i = 0; i < 80; i++) {
    const d = density(x, y, z)
    if (prev <= 0 && d > 0) {
      let lo = y
      let hi = y + step
      for (let k = 0; k < 6; k++) {
        const mid = (lo + hi) / 2
        if (density(x, mid, z) > 0) lo = mid
        else hi = mid
      }
      return (lo + hi) / 2
    }
    prev = d
    y -= step
    if (y < -2) break
  }
  return surface
}

export function terrainHeight(x: number, z: number): number {
  const n = Math.sin(x * 0.11) * 0.32 + Math.cos(z * 0.19 + x * 0.05) * 0.26 + Math.sin(z * 0.07) * 0.12
  if (x < SEA_END) return 0.28 + n * 0.45
  if (x < BEACH_END) {
    const t = (x - SEA_END) / (BEACH_END - SEA_END)
    const s = t * t * (3 - 2 * t)
    return (0.28 + n * 0.45) * (1 - s) + (LAND_HEIGHT + n * 0.4) * s
  }
  if (x < VOLCANO_X) return LAND_HEIGHT + n * 0.4 + Math.sin(x * 0.045) * 0.35
  return LAND_HEIGHT + 0.45 + Math.sin((x - 198) * 0.18) * 0.2 + n * 0.1
}

/** True when the ground here is a dry beach or the plateau. */
export function isDryLand(x: number, z: number): boolean {
  return terrainHeight(x, z) >= WATER - 0.15
}

/** X where the beach ramp meets the water, for this z. */
export function shoreX(z: number): number {
  let lo = SEA_END
  let hi = BEACH_END
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2
    if (terrainHeight(mid, z) < WATER) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const CARVE_CAP = 8000

export function exportCarves(): [string, number][] {
  const out: [string, number][] = []
  for (const [k, v] of carved) {
    if (v > 0.01) out.push([k, Math.round(v * 1000) / 1000])
    if (out.length >= CARVE_CAP) break
  }
  return out
}

export function importCarves(entries: unknown): void {
  carved.clear()
  dirtyChunks.clear()
  if (!Array.isArray(entries)) return
  for (const item of entries) {
    if (!Array.isArray(item) || item.length < 2) continue
    const k = item[0]
    const v = item[1]
    if (typeof k !== 'string' || typeof v !== 'number' || !Number.isFinite(v) || v <= 0.01) continue
    if (!/^[-0-9]+\|[-0-9]+\|[-0-9]+$/.test(k)) continue
    carved.set(k, v)
    const [sx, , sz] = k.split('|')
    const x = Number(sx)
    const z = Number(sz)
    if (Number.isFinite(x) && Number.isFinite(z)) dirtyChunks.add(chunkId(x, z))
  }
}

export function carveCount(): number {
  return carved.size
}
