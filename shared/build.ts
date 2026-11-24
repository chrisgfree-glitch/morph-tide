import type { Buy } from './rules'
import { tierOf } from './rules'
import { groundAt } from './terrain'

export interface PieceHost {
  pieces: Piece[]
  nextId: number
}

export interface PieceOwner {
  id: number
  bag: Record<string, number>
  spent: number
  x: number
}

export interface Piece {
  id: number
  kind: string
  x: number
  y: number
  z: number
  yaw: number
  owner: number
}

export interface PieceDef {
  id: string
  name: string
  cost: Record<string, number>
  sx: number
  sy: number
  sz: number
  tier: number
  sea: boolean
  /** Also registers a functional den / shelter base. */
  base?: boolean
}

export const PIECES: PieceDef[] = [
  { id: 'lean', name: 'Lean-to', cost: { kelp: 2 }, sx: 1.8, sy: 1.15, sz: 1.3, tier: 1, sea: true, base: true },
  { id: 'floor', name: 'Floor', cost: { kelp: 1, mud: 1 }, sx: 1.7, sy: 0.16, sz: 1.7, tier: 1, sea: true },
  { id: 'wall', name: 'Wall', cost: { mud: 2 }, sx: 1.7, sy: 1.25, sz: 0.22, tier: 1, sea: true },
  { id: 'roof', name: 'Roof', cost: { kelp: 2, sticks: 1 }, sx: 1.9, sy: 0.22, sz: 1.9, tier: 1, sea: true },
  { id: 'door', name: 'Doorway', cost: { sticks: 2, mud: 1 }, sx: 1.2, sy: 1.3, sz: 0.22, tier: 2, sea: true },
  { id: 'den', name: 'Den', cost: { sticks: 4, stone: 3, hide: 1 }, sx: 2.2, sy: 1.6, sz: 2.2, tier: 5, sea: false, base: true },
]

export function pieceById(id: string): PieceDef | undefined {
  return PIECES.find((p) => p.id === id)
}

export function costLine(cost: Record<string, number>): string {
  return Object.entries(cost)
    .map(([mat, n]) => `${n} ${mat}`)
    .join(', ')
}

export function canAfford(bag: Record<string, number>, cost: Record<string, number>): boolean {
  return Object.entries(cost).every(([mat, n]) => (bag[mat] ?? 0) >= n)
}

export function payCost(bag: Record<string, number>, cost: Record<string, number>): void {
  for (const [mat, n] of Object.entries(cost)) bag[mat] = (bag[mat] ?? 0) - n
}

export function refundCost(bag: Record<string, number>, cost: Record<string, number>): void {
  for (const [mat, n] of Object.entries(cost)) bag[mat] = (bag[mat] ?? 0) + n
}

const GRID = 0.85

export function snapPose(w: PieceHost, def: PieceDef, x: number, y: number, z: number, yaw: number): { x: number; y: number; z: number; yaw: number } {
  let sx = Math.round(x / GRID) * GRID
  let sz = Math.round(z / GRID) * GRID
  let sy = y
  let syaw = Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2)
  let best = 1.15
  for (const p of w.pieces) {
    const other = pieceById(p.kind)
    if (!other) continue
    const dx = p.x - sx
    const dz = p.z - sz
    const d = Math.hypot(dx, dz)
    if (d < 0.05 || d > 2.4) continue
    const alongX = Math.abs(dx) >= Math.abs(dz)
    const gap = alongX ? (other.sx + def.sx) * 0.5 : (other.sz + def.sz) * 0.5
    const nx = alongX ? p.x + Math.sign(sx - p.x || 1) * gap : p.x
    const nz = alongX ? p.z : p.z + Math.sign(sz - p.z || 1) * gap
    const nd = Math.hypot(nx - sx, nz - sz)
    if (nd < best) {
      best = nd
      sx = nx
      sz = nz
      syaw = p.yaw
      sy = p.y + (def.id === 'roof' ? other.sy * 0.5 + def.sy * 0.5 : def.id === 'floor' && other.id === 'wall' ? -other.sy * 0.35 : 0)
    }
  }
  const floor = groundAt(sx, sz, sy + 2)
  if (def.id === 'floor' || def.id === 'lean' || def.id === 'den') sy = floor + def.sy * 0.5
  else if (def.id === 'roof') sy = Math.max(sy, floor + 1.15)
  else sy = Math.max(sy, floor + def.sy * 0.5)
  return { x: sx, y: sy, z: sz, yaw: syaw }
}

export function pieceBlocked(w: PieceHost, def: PieceDef, x: number, y: number, z: number, yaw: number, ignoreId = 0): boolean {
  for (const p of w.pieces) {
    if (p.id === ignoreId) continue
    const other = pieceById(p.kind)
    if (!other) continue
    const sameFacing = Math.abs(((p.yaw - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 2.5
    const rx = (def.sx + other.sx) * 0.38
    const rz = (def.sz + other.sz) * 0.38
    const ry = (def.sy + other.sy) * 0.38
    if (Math.abs(p.x - x) < rx && Math.abs(p.z - z) < rz && Math.abs(p.y - y) < ry && sameFacing) return true
  }
  return false
}

export function placePiece(w: PieceHost, you: PieceOwner, kind: string, x: number, y: number, z: number, yaw: number, free = false): Buy & { piece?: Piece } {
  const def = pieceById(kind)
  if (!def) return { ok: false, reason: 'Unknown piece' }
  if (tierOf(you.spent) < def.tier) return { ok: false, reason: `Unlocks at tier ${def.tier}` }
  if (!def.sea && you.x < 66) return { ok: false, reason: 'Needs the first shore' }
  const pose = snapPose(w, def, x, y, z, yaw)
  if (pieceBlocked(w, def, pose.x, pose.y, pose.z, pose.yaw)) return { ok: false, reason: 'Blocked' }
  if (!free && !canAfford(you.bag, def.cost)) return { ok: false, reason: `Need ${costLine(def.cost)}` }
  if (!free) payCost(you.bag, def.cost)
  const piece: Piece = { id: w.nextId++, kind, x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw, owner: you.id }
  w.pieces.push(piece)
  return { ok: true, reason: `${def.name} placed`, piece }
}

export function refundPiece(w: PieceHost, you: PieceOwner, id: number): Buy & { piece?: Piece } {
  const piece = w.pieces.find((p) => p.id === id)
  if (!piece) return { ok: false, reason: 'Nothing to pick up' }
  if (piece.owner !== you.id) return { ok: false, reason: 'Not yours' }
  const def = pieceById(piece.kind)
  w.pieces = w.pieces.filter((p) => p.id !== id)
  if (def) refundCost(you.bag, def.cost)
  return { ok: true, reason: def ? `${def.name} packed · ${costLine(def.cost)} returned` : 'Packed', piece }
}

export function nearestPiece(w: PieceHost, x: number, y: number, z: number, reach = 2.6): Piece | undefined {
  let best: Piece | undefined
  let score = reach
  for (const p of w.pieces) {
    const d = Math.hypot(p.x - x, p.y - y, p.z - z)
    if (d < score) {
      score = d
      best = p
    }
  }
  return best
}

export function canPlace(w: PieceHost, you: PieceOwner, kind: string, x: number, y: number, z: number, yaw: number, free = false): { ok: boolean; pose: { x: number; y: number; z: number; yaw: number }; reason: string } {
  const def = pieceById(kind)
  const fallback = { x, y, z, yaw }
  if (!def) return { ok: false, pose: fallback, reason: 'Unknown piece' }
  if (tierOf(you.spent) < def.tier) return { ok: false, pose: fallback, reason: `Unlocks at tier ${def.tier}` }
  if (!def.sea && you.x < 66) return { ok: false, pose: fallback, reason: 'Needs the first shore' }
  const pose = snapPose(w, def, x, y, z, yaw)
  if (pieceBlocked(w, def, pose.x, pose.y, pose.z, pose.yaw)) return { ok: false, pose, reason: 'Blocked' }
  if (!free && !canAfford(you.bag, def.cost)) return { ok: false, pose, reason: `Need ${costLine(def.cost)}` }
  return { ok: true, pose, reason: costLine(def.cost) }
}
