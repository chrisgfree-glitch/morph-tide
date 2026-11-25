/** Standard Gamepad API button indices (Xbox layout). */
export const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  VIEW: 8,
  START: 9,
  L3: 10,
  R3: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const

export const MOVE_DEAD = 0.2
export const LOOK_DEAD = 0.18
export const TRIGGER = 0.45

export interface PadLike {
  connected?: boolean
  axes: ArrayLike<number>
  buttons: ArrayLike<{ pressed: boolean; value: number }>
}

export type PadLayer = 'play' | 'build' | 'menu' | 'map' | 'title'

export interface PadFrame {
  connected: boolean
  using: boolean
  lx: number
  ly: number
  rx: number
  ry: number
  bite: boolean
  sprint: boolean
  dig: boolean
  use: boolean
  rise: boolean
  dive: boolean
  horn: boolean
  start: boolean
  view: boolean
  dash: boolean
  evolve: boolean
  build: boolean
  lock: boolean
  place: boolean
  pickup: boolean
  leaveBuild: boolean
  rotateUp: boolean
  rotateDown: boolean
  cyclePrev: boolean
  cycleNext: boolean
  confirm: boolean
  back: boolean
  navUp: boolean
  navDown: boolean
  navLeft: boolean
  navRight: boolean
}

export function deadzone(x: number, y: number, dead = MOVE_DEAD): { x: number; y: number } {
  const m = Math.hypot(x, y)
  if (m <= dead || m === 0) return { x: 0, y: 0 }
  const s = Math.min(1, (m - dead) / (1 - dead))
  return { x: (x / m) * s, y: (y / m) * s }
}

export function held(pad: PadLike, i: number, analog = TRIGGER): boolean {
  const b = pad.buttons[i]
  return !!b && (b.pressed || b.value > analog)
}

export function snapshotButtons(prev: boolean[], pad: PadLike): { held: boolean[]; edge: boolean[]; next: boolean[] } {
  const heldArr: boolean[] = []
  const edgeArr: boolean[] = []
  const next: boolean[] = []
  for (let i = 0; i < 16; i++) {
    const now = held(pad, i)
    edgeArr[i] = now && !(prev[i] ?? false)
    heldArr[i] = now
    next[i] = now
  }
  return { held: heldArr, edge: edgeArr, next }
}

const empty = (): PadFrame => ({
  connected: false,
  using: false,
  lx: 0,
  ly: 0,
  rx: 0,
  ry: 0,
  bite: false,
  sprint: false,
  dig: false,
  use: false,
  rise: false,
  dive: false,
  horn: false,
  start: false,
  view: false,
  dash: false,
  evolve: false,
  build: false,
  lock: false,
  place: false,
  pickup: false,
  leaveBuild: false,
  rotateUp: false,
  rotateDown: false,
  cyclePrev: false,
  cycleNext: false,
  confirm: false,
  back: false,
  navUp: false,
  navDown: false,
  navLeft: false,
  navRight: false,
})

export function readPad(pad: PadLike | null, prev: boolean[], layer: PadLayer, navLatch: boolean): { frame: PadFrame; prev: boolean[]; navLatch: boolean } {
  if (!pad) return { frame: empty(), prev: [], navLatch: false }
  const move = deadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, MOVE_DEAD)
  const look = deadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, LOOK_DEAD)
  const snap = snapshotButtons(prev, pad)
  const e = snap.edge
  const h = snap.held
  const using = snap.held.some(Boolean) || Math.hypot(move.x, move.y, look.x, look.y) > 0.02
  const frame = empty()
  frame.connected = pad.connected !== false
  frame.using = using
  frame.lx = move.x
  frame.ly = move.y
  frame.rx = look.x
  frame.ry = look.y
  frame.start = e[BTN.START] ?? false
  frame.view = e[BTN.VIEW] ?? false
  frame.back = e[BTN.B] ?? false
  frame.confirm = e[BTN.A] ?? false

  if (layer === 'menu' || layer === 'title') {
    const stickUp = move.y < -0.65 && !navLatch
    const stickDown = move.y > 0.65 && !navLatch
    frame.navUp = (e[BTN.UP] ?? false) || stickUp
    frame.navDown = (e[BTN.DOWN] ?? false) || stickDown
    frame.navLeft = (e[BTN.LEFT] ?? false) || (move.x < -0.65 && !navLatch)
    frame.navRight = (e[BTN.RIGHT] ?? false) || (move.x > 0.65 && !navLatch)
    return { frame, prev: snap.next, navLatch: Math.abs(move.y) > 0.65 || Math.abs(move.x) > 0.65 }
  }

  if (layer === 'map') {
    return { frame, prev: snap.next, navLatch: false }
  }

  if (layer === 'build') {
    frame.cyclePrev = e[BTN.LEFT] ?? false
    frame.cycleNext = e[BTN.RIGHT] ?? false
    frame.rotateUp = e[BTN.RB] ?? false
    frame.rotateDown = e[BTN.LB] ?? false
    frame.place = (e[BTN.A] ?? false) || (e[BTN.RT] ?? false)
    frame.pickup = e[BTN.X] ?? false
    frame.leaveBuild = (e[BTN.B] ?? false) || (e[BTN.Y] ?? false) || (e[BTN.DOWN] ?? false)
    frame.sprint = h[BTN.L3] ?? false
    frame.bite = false
    frame.dash = false
    return { frame, prev: snap.next, navLatch: false }
  }

  // play
  frame.bite = h[BTN.RT] ?? false
  frame.sprint = h[BTN.L3] ?? false
  frame.horn = e[BTN.LT] ?? false
  frame.dash = e[BTN.B] ?? false
  frame.dig = h[BTN.X] ?? false
  frame.use = h[BTN.X] ?? false
  frame.rise = (h[BTN.A] ?? false) || (h[BTN.RB] ?? false)
  frame.dive = h[BTN.LB] ?? false
  frame.build = (e[BTN.Y] ?? false) || (e[BTN.UP] ?? false)
  frame.lock = e[BTN.R3] ?? false
  return { frame, prev: snap.next, navLatch: false }
}

export const PAD_HELP = [
  'Left stick — move',
  'Right stick — camera',
  'RT — attack (bite)',
  'LT — second attack (tail / horn lunge)',
  'A — jump on land, rise in water; confirm',
  'RB — rise    LB — dive',
  'B — dodge; back in menus',
  'X — interact, gather, pick up',
  'Y — menu (build & craft)',
  'D-pad Up — open build menu; Left / Right — cycle options; Down — put away',
  'In build: RB / LB rotate, A or RT place',
  'L3 — boost    R3 — lock on',
  'Start — pause    View — Select (Evolve)',
  'In menus: D-pad or left stick to move, A to confirm, B to back',
] as const
