/** Organic height of the seabed and shore. x runs sea → land → volcano, z is width. */
export const WATER = 5.6
export const WORLD_Z = 180
export const CHUNK = 28

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
  let y = Math.min(14, fromY + 3)
  let prev = density(x, y + 0.4, z)
  for (let i = 0; i < 48; i++) {
    const d = density(x, y, z)
    if (prev <= 0 && d > 0) return y
    prev = d
    y -= 0.35
    if (y < -2) break
  }
  return terrainHeight(x, z)
}

export function terrainHeight(x: number, z: number): number {
  const n = Math.sin(x * 0.11) * 0.32 + Math.cos(z * 0.19 + x * 0.05) * 0.26 + Math.sin(z * 0.07) * 0.12
  if (x < 56) return 0.28 + n * 0.45
  if (x < 76) {
    const t = (x - 56) / 20
    const s = t * t * (3 - 2 * t)
    return (0.28 + n * 0.45) * (1 - s) + (1.25 + n * 0.35) * s
  }
  if (x < 168) return 1.18 + n * 0.4 + Math.sin(x * 0.045) * 0.22
  return 1.12 + Math.sin((x - 198) * 0.18) * 0.12 + n * 0.08
}
