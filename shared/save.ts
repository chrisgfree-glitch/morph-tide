import { exportCarves, importCarves } from './terrain'
import { applyWorldSnapshot, playerOf, snapshotWorld, type Ent, type World } from './sim'
import type { Piece } from './build'
import type { Loadout } from './catalog'

export const SAVE_KEY = 'evo2.eden.v2'
export const SAVE_VERSION = 3

export interface GameSave {
  v: number
  name?: string
  ep?: number
  spent?: number
  load?: Loadout
  unlocked?: string[]
  bag?: Record<string, number>
  gems?: Record<string, number>
  clan?: string
  x?: number
  y?: number
  z?: number
  yaw?: number
  pitch?: number
  hp?: number
  maxHp?: number
  air?: number
  alive?: boolean
  region?: Ent['region']
  eats?: number
  gateOpen?: boolean
  time?: number
  terrain?: unknown
  columns?: { x: number; dug: number; prog: number }[]
  nodes?: { id: number; mat: string; amount: number; hp: number }[]
  bases?: import('./sim').Base[]
  pieces?: Piece[]
}

export function encodeGameSave(w: World): GameSave {
  const you = playerOf(w)
  const snap = snapshotWorld(w)
  return {
    v: SAVE_VERSION,
    name: you.name,
    ep: you.ep,
    spent: you.spent,
    load: { ...you.load },
    unlocked: [...you.unlocked],
    bag: { ...you.bag },
    gems: { ...you.gems },
    clan: you.clan,
    x: you.x,
    y: you.y,
    z: you.z,
    yaw: you.yaw,
    pitch: you.pitch,
    hp: you.hp,
    maxHp: you.maxHp,
    air: you.air,
    alive: you.alive,
    region: you.region,
    eats: w.eats,
    gateOpen: w.gateOpen,
    time: w.time,
    terrain: exportCarves(),
    columns: snap.columns,
    nodes: snap.nodes,
    bases: snap.bases,
    pieces: snap.pieces,
  }
}

export function applyGameSave(w: World, data: GameSave): void {
  const you = playerOf(w)
  if (data.load) you.load = { ...you.load, ...data.load }
  if (typeof data.ep === 'number') you.ep = data.ep
  if (typeof data.spent === 'number') you.spent = data.spent
  if (data.unlocked) you.unlocked = data.unlocked
  if (data.bag) you.bag = data.bag
  if (data.gems) you.gems = data.gems
  if (data.name) you.name = data.name
  if (typeof data.clan === 'string') you.clan = data.clan
  if (typeof data.x === 'number' && Number.isFinite(data.x)) you.x = data.x
  if (typeof data.y === 'number' && Number.isFinite(data.y)) you.y = data.y
  if (typeof data.z === 'number' && Number.isFinite(data.z)) you.z = data.z
  if (typeof data.yaw === 'number' && Number.isFinite(data.yaw)) you.yaw = data.yaw
  if (typeof data.pitch === 'number' && Number.isFinite(data.pitch)) you.pitch = data.pitch
  if (typeof data.maxHp === 'number' && Number.isFinite(data.maxHp)) you.maxHp = data.maxHp
  if (typeof data.hp === 'number' && Number.isFinite(data.hp)) you.hp = data.hp
  if (typeof data.air === 'number' && Number.isFinite(data.air)) you.air = data.air
  if (typeof data.alive === 'boolean') you.alive = data.alive
  if (data.region === 'sea' || data.region === 'land' || data.region === 'volcano') you.region = data.region
  if (typeof data.eats === 'number' && Number.isFinite(data.eats)) w.eats = data.eats
  if (typeof data.gateOpen === 'boolean') w.gateOpen = data.gateOpen
  if (typeof data.time === 'number' && Number.isFinite(data.time)) w.time = data.time
  if (data.terrain) importCarves(data.terrain)
  applyWorldSnapshot(w, data)
}

export function parseGameSave(raw: string): GameSave | null {
  try {
    const data = JSON.parse(raw) as GameSave
    if (!data || typeof data !== 'object') return null
    return data
  } catch {
    return null
  }
}

export function serializeGameSave(data: GameSave): string {
  return JSON.stringify(data)
}
