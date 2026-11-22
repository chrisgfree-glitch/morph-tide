import type { Loadout } from './catalog'
import { cellSeconds, compute } from './rules'

export interface Layer {
  rock: string
  cells: number
  trap?: string
}

export interface Column {
  x: number
  layers: Layer[]
  dug: number
  prog: number
  hint: string
}

export function heatProof(load: Loadout, spent: number): boolean {
  return compute(load, spent).heat > 0
}

export function fullColumn(x: number): Column {
  return {
    x,
    dug: 0,
    prog: 0,
    hint: '',
    layers: [
      { rock: 'sandstone', cells: 4 },
      { rock: 'granite', cells: 3 },
      { rock: 'obsidian', cells: 2, trap: 'cavein' },
      { rock: 'deep-stone', cells: 1, trap: 'lava-vein' },
    ],
  }
}

export function tubeColumn(x: number): Column {
  const col = fullColumn(x)
  col.dug = 7
  col.hint = 'A lava tube shortcuts the upper strata.'
  return col
}

export function ventColumn(x: number): Column {
  const col = fullColumn(x)
  col.dug = 9
  col.hint = 'Deep stone gleams in an open vent.'
  return col
}

export function currentRock(col: Column): { rock: string; trap?: string } | null {
  let left = col.dug
  for (const layer of col.layers) {
    if (left < layer.cells) return { rock: layer.rock, trap: layer.trap }
    left -= layer.cells
  }
  return null
}

export function digTick(col: Column, load: Loadout, spent: number, dt: number, heat: boolean): { cell: boolean; deep: boolean; trap?: string; blocked: string } {
  const cur = currentRock(col)
  if (!cur) return { cell: false, deep: false, blocked: 'Vein exhausted' }
  let secs = cellSeconds(load, spent, cur.rock)
  if (secs === null) return { cell: false, deep: false, blocked: cur.rock === 'deep-stone' ? 'Needs a tier 7 mk III breaker' : `Cannot break ${cur.rock}` }
  if (!heat) secs *= 1.55
  col.prog += dt / secs
  if (col.prog < 1) return { cell: false, deep: false, blocked: '' }
  col.prog = 0
  col.dug += 1
  const deep = cur.rock === 'deep-stone'
  return { cell: true, deep, trap: cur.trap, blocked: '' }
}

export function columnSeconds(load: Loadout, spent: number, kind: 'full' | 'tube' | 'vent'): number | null {
  const col = kind === 'tube' ? tubeColumn(0) : kind === 'vent' ? ventColumn(0) : fullColumn(0)
  const heat = heatProof(load, spent)
  let t = 0
  for (let i = 0; i < 24; i++) {
    const cur = currentRock(col)
    if (!cur) return t
    let secs = cellSeconds(load, spent, cur.rock)
    if (secs === null) return null
    if (!heat) secs *= 1.55
    t += secs
    col.dug += 1
    if (cur.rock === 'deep-stone') return t
  }
  return null
}
