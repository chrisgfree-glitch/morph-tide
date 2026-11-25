import * as THREE from 'three'
import { CHUNK, SEA_END, groundAt } from '../shared/terrain'
import { LAND_TREES, scatterChunk, type LandTreeId, type Spot } from '../shared/landcover'

const TMP = new THREE.Object3D()

function merge(parts: { geo: THREE.BufferGeometry; x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; sx?: number; sy?: number; sz?: number; color: number }[]): THREE.BufferGeometry {
  const out: THREE.BufferGeometry[] = []
  for (const p of parts) {
    const g = p.geo.clone()
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0))
    m.compose(new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0), q, new THREE.Vector3(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1))
    g.applyMatrix4(m)
    const col = new THREE.Color(p.color)
    const n = (g.getAttribute('position')?.count ?? 0)
    const colors = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    out.push(g)
  }
  const merged = out.length === 1 ? out[0]! : (out[0] ? mergeGeos(out) : new THREE.BoxGeometry(0.2, 0.2, 0.2))
  merged.computeVertexNormals()
  return merged
}

function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = []
  const nrm: number[] = []
  const col: number[] = []
  const idx: number[] = []
  let base = 0
  for (const g of geos) {
    const p = g.getAttribute('position') as THREE.BufferAttribute
    const n = g.getAttribute('normal') as THREE.BufferAttribute | null
    const c = g.getAttribute('color') as THREE.BufferAttribute | null
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i))
      if (n) nrm.push(n.getX(i), n.getY(i), n.getZ(i))
      else nrm.push(0, 1, 0)
      if (c) col.push(c.getX(i), c.getY(i), c.getZ(i))
      else col.push(1, 1, 1)
    }
    const index = g.getIndex()
    if (index) {
      for (let i = 0; i < index.count; i++) idx.push(index.getX(i) + base)
    } else {
      for (let i = 0; i < p.count; i++) idx.push(base + i)
    }
    base += p.count
    g.dispose()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setIndex(idx)
  return geo
}

const cyl = (rt: number, rb: number, h: number, seg = 5) => new THREE.CylinderGeometry(rt, rb, h, seg, 1)
const cone = (r: number, h: number, seg = 5) => new THREE.ConeGeometry(r, h, seg)
const sph = (r: number, seg = 6) => new THREE.SphereGeometry(r, seg, seg - 1)

function coneTree(bark: number, leaf: number, layers: number, slim: number, droop: number): THREE.BufferGeometry {
  const parts: Parameters<typeof merge>[0] = [
    { geo: cyl(0.12 * slim, 0.2, 2.2, 6), y: 1.1, color: bark },
    { geo: cyl(0.2, 0.26, 0.22, 6), y: 0.1, color: bark },
  ]
  for (let i = 0; i < layers; i++) {
    const t = i / Math.max(1, layers - 1)
    const leafB = i % 2 ? leaf : leaf + 0x102010
    parts.push({
      geo: cone(0.85 - t * 0.48, 1.15 - t * 0.18, 7),
      y: 1.55 + i * (0.7 - droop * 0.1),
      sy: 1 + droop * 0.2,
      color: leafB,
    })
  }
  return merge(parts)
}

function roundTree(bark: number, leaf: number, trunkH: number, canopy: number, wide: number): THREE.BufferGeometry {
  return merge([
    { geo: cyl(0.14, 0.22, trunkH, 6), y: trunkH / 2, color: bark },
    { geo: cyl(0.22, 0.28, 0.22, 6), y: 0.1, color: bark },
    { geo: sph(canopy, 7), y: trunkH + canopy * 0.15, sx: wide, sy: 0.85, sz: wide, color: leaf },
    { geo: sph(canopy * 0.72, 6), y: trunkH + canopy * 0.5, x: 0.32, sx: 0.85, color: leaf + 0x0c1808 },
    { geo: sph(canopy * 0.62, 6), y: trunkH + canopy * 0.42, x: -0.28, z: 0.18, color: leaf },
    { geo: cyl(0.05, 0.07, canopy * 0.7, 4), y: trunkH + canopy * 0.2, x: 0.28, rz: -0.7, color: bark },
  ])
}

const TREE_GEO: Record<LandTreeId, () => THREE.BufferGeometry> = {
  pine: () => coneTree(0x5a3a22, 0x2f5a32, 4, 1, 0),
  fir: () => coneTree(0x4a3220, 0x1f4a2c, 5, 0.8, 0.15),
  spruce: () => coneTree(0x4a3828, 0x245038, 5, 0.9, 0.45),
  cedar: () =>
    merge([
      { geo: cyl(0.1, 0.16, 1.2, 5), y: 0.6, color: 0x6a3e22 },
      { geo: cyl(0.55, 0.35, 0.22, 6), y: 0.85, color: 0x3a5a32 },
      { geo: cyl(0.45, 0.28, 0.2, 6), y: 1.15, color: 0x3a5a32 },
      { geo: cyl(0.32, 0.16, 0.2, 6), y: 1.42, color: 0x3a5a32 },
    ]),
  redwood: () =>
    merge([
      { geo: cyl(0.12, 0.22, 2.4, 6), y: 1.2, color: 0x7a2e1c },
      { geo: sph(0.45, 6), y: 2.35, sx: 1.1, sy: 0.7, color: 0x2a5a32 },
      { geo: sph(0.32, 6), y: 2.65, color: 0x2a5a32 },
    ]),
  oak: () => roundTree(0x5a3a1c, 0x3a6a28, 1.05, 0.7, 1.45),
  maple: () => roundTree(0x5a3820, 0xb24a22, 1.0, 0.65, 1.4),
  birch: () =>
    merge([
      { geo: cyl(0.06, 0.09, 1.35, 5), y: 0.68, color: 0xe8e0d0 },
      { geo: sph(0.42, 6), y: 1.45, sx: 1.1, sy: 0.75, color: 0x7aaa4a },
    ]),
  aspen: () =>
    merge([
      { geo: cyl(0.055, 0.08, 1.3, 5), y: 0.65, color: 0xd8d0b8 },
      { geo: sph(0.38, 6), y: 1.4, sx: 1.05, sy: 0.8, color: 0xc8d45a },
    ]),
  willow: () =>
    merge([
      { geo: cyl(0.09, 0.14, 1.15, 5), y: 0.58, color: 0x5a4a28 },
      { geo: sph(0.55, 6), y: 1.35, sx: 1.3, sy: 0.5, color: 0x6a8a40 },
      { geo: cyl(0.02, 0.02, 0.9, 4), y: 0.7, x: 0.45, rz: 0.25, color: 0x6a8a40 },
      { geo: cyl(0.02, 0.02, 0.9, 4), y: 0.7, x: -0.4, rz: -0.2, color: 0x6a8a40 },
      { geo: cyl(0.02, 0.02, 0.85, 4), y: 0.65, z: 0.4, rx: 0.22, color: 0x6a8a40 },
    ]),
  cottonwood: () => roundTree(0x6a5a38, 0xc8d8a0, 1.25, 0.72, 1.35),
  palm: () =>
    merge([
      { geo: cyl(0.06, 0.1, 1.5, 5), y: 0.75, color: 0x8a6a38 },
      ...[0, 1, 2, 3, 4, 5].map((i) => ({
        geo: cone(0.12, 0.7, 4),
        y: 1.52,
        ry: (i / 6) * Math.PI * 2,
        rz: 1.05,
        x: Math.cos((i / 6) * Math.PI * 2) * 0.15,
        z: Math.sin((i / 6) * Math.PI * 2) * 0.15,
        color: 0x3a8a3a,
      })),
    ]),
  cypress: () =>
    merge([
      { geo: cyl(0.08, 0.12, 1.6, 5), y: 0.8, color: 0x4a3a28 },
      { geo: cone(0.28, 1.5, 6), y: 1.35, color: 0x2a4a32 },
      { geo: cyl(0.05, 0.08, 0.25, 4), y: 0.08, x: 0.18, color: 0x4a3a28 },
      { geo: cyl(0.05, 0.08, 0.25, 4), y: 0.08, x: -0.16, color: 0x4a3a28 },
    ]),
  mangrove: () =>
    merge([
      { geo: cyl(0.08, 0.1, 0.9, 5), y: 0.7, color: 0x3a3220 },
      { geo: sph(0.48, 6), y: 1.2, sx: 1.2, sy: 0.7, color: 0x2a5a32 },
      { geo: cyl(0.03, 0.05, 0.7, 4), y: 0.2, x: 0.22, rz: 0.5, color: 0x3a3220 },
      { geo: cyl(0.03, 0.05, 0.7, 4), y: 0.2, x: -0.2, rz: -0.45, color: 0x3a3220 },
      { geo: cyl(0.03, 0.05, 0.65, 4), y: 0.18, z: 0.2, rx: 0.45, color: 0x3a3220 },
    ]),
  ferntree: () =>
    merge([
      { geo: cyl(0.07, 0.12, 0.7, 6), y: 0.35, color: 0x5a4a28 },
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
        geo: cone(0.16, 0.7, 4),
        y: 0.72,
        ry: (i / 8) * Math.PI * 2,
        rz: 0.95,
        x: Math.cos((i / 8) * Math.PI * 2) * 0.1,
        z: Math.sin((i / 8) * Math.PI * 2) * 0.1,
        color: 0x2e7a38,
      })),
    ]),
  cycad: () =>
    merge([
      { geo: cyl(0.16, 0.2, 0.45, 6), y: 0.22, color: 0x5a4a30 },
      ...[0, 1, 2, 3, 4, 5].map((i) => ({
        geo: cone(0.12, 0.55, 4),
        y: 0.5,
        ry: (i / 6) * Math.PI * 2,
        rz: 0.85,
        color: 0x3a6a28,
      })),
    ]),
  ginkgo: () =>
    merge([
      { geo: cyl(0.08, 0.12, 1.1, 5), y: 0.55, color: 0x6a5a38 },
      { geo: sph(0.28, 5), y: 1.2, x: 0.28, color: 0xd4c44a },
      { geo: sph(0.28, 5), y: 1.25, x: -0.22, color: 0xd4c44a },
      { geo: sph(0.32, 5), y: 1.45, color: 0xe0d058 },
    ]),
  baobab: () =>
    merge([
      { geo: cyl(0.28, 0.34, 0.9, 6), y: 0.45, color: 0xb89a68 },
      { geo: cyl(0.08, 0.1, 0.45, 4), y: 1.05, x: 0.18, rz: -0.3, color: 0xb89a68 },
      { geo: cyl(0.08, 0.1, 0.45, 4), y: 1.05, x: -0.16, rz: 0.28, color: 0xb89a68 },
      { geo: sph(0.22, 5), y: 1.3, x: 0.28, color: 0x6a8a38 },
      { geo: sph(0.22, 5), y: 1.3, x: -0.24, color: 0x6a8a38 },
    ]),
  snag: () =>
    merge([
      { geo: cyl(0.07, 0.13, 1.3, 5), y: 0.65, color: 0x6a6860 },
      { geo: cyl(0.03, 0.04, 0.5, 4), y: 1.2, x: 0.18, rz: -0.8, color: 0x6a6860 },
      { geo: cyl(0.03, 0.04, 0.4, 4), y: 0.95, x: -0.16, rz: 0.9, color: 0x5a5850 },
      { geo: cyl(0.025, 0.03, 0.35, 4), y: 1.35, z: 0.1, rx: 0.6, color: 0x6a6860 },
    ]),
  horsetail: () =>
    merge([
      { geo: cyl(0.07, 0.09, 1.5, 6), y: 0.75, color: 0x4a7a48 },
      { geo: cyl(0.18, 0.18, 0.04, 6), y: 0.35, color: 0x3a6a38 },
      { geo: cyl(0.16, 0.16, 0.04, 6), y: 0.7, color: 0x3a6a38 },
      { geo: cyl(0.13, 0.13, 0.04, 6), y: 1.05, color: 0x3a6a38 },
      { geo: cone(0.12, 0.2, 5), y: 1.55, color: 0x3a6a38 },
    ]),
}

function rockGeo(kind: string): THREE.BufferGeometry {
  const paint = (g: THREE.BufferGeometry, a: number, b: number) => {
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const ca = new THREE.Color(a)
    const cb = new THREE.Color(b)
    for (let i = 0; i < pos.count; i++) {
      const t = ((i * 17) % 11) / 11
      const c = ca.clone().lerp(cb, t)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
      const s = 0.82 + ((i * 13) % 9) * 0.035
      pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * (0.7 + ((i * 5) % 7) * 0.05), pos.getZ(i) * s)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }
  if (kind === 'outcrop') {
    return merge([
      { geo: paint(new THREE.BoxGeometry(1.35, 0.7, 0.95), 0x8a8476, 0x6a6458), y: 0.1, color: 0x8a8476 },
      { geo: paint(new THREE.BoxGeometry(0.7, 0.45, 0.6), 0x7a7468, 0x5a564c), x: 0.4, y: 0.28, z: 0.1, ry: 0.4, color: 0x7a7468 },
      { geo: paint(new THREE.IcosahedronGeometry(0.22, 0), 0x9a9588, 0x7a766c), x: -0.45, y: 0.08, z: 0.28, color: 0x9a9588 },
    ])
  }
  if (kind === 'pebble') {
    const g = new THREE.IcosahedronGeometry(0.24, 1)
    return paint(g, 0xa39e90, 0x7a766c)
  }
  return merge([
    { geo: paint(new THREE.IcosahedronGeometry(0.62, 1), 0x8e8a7c, 0x6a665c), color: 0x8e8a7c },
    { geo: paint(new THREE.IcosahedronGeometry(0.28, 0), 0x9a9588, 0x706c62), x: 0.42, y: -0.12, z: 0.18, color: 0x9a9588 },
    { geo: paint(new THREE.IcosahedronGeometry(0.18, 0), 0x7a766c, 0x5c5850), x: -0.38, y: -0.16, z: -0.12, color: 0x7a766c },
  ])
}

function plantGeo(kind: string): THREE.BufferGeometry {
  if (kind === 'fern') {
    return merge(
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
        geo: new THREE.ConeGeometry(0.16, 0.7, 4),
        y: 0.28,
        ry: (i / 8) * Math.PI * 2,
        rz: 0.55 + (i % 3) * 0.12,
        x: Math.cos((i / 8) * Math.PI * 2) * 0.08,
        z: Math.sin((i / 8) * Math.PI * 2) * 0.08,
        color: i % 2 ? 0x3a7a38 : 0x2e6a30,
      })),
    )
  }
  if (kind === 'shrub') {
    return merge([
      { geo: cyl(0.04, 0.06, 0.22, 4), y: 0.1, color: 0x4a3a22 },
      { geo: sph(0.32, 6), y: 0.34, sx: 1.25, sy: 0.85, color: 0x3a6a30 },
      { geo: sph(0.22, 5), y: 0.42, x: 0.18, color: 0x4a7a38 },
      { geo: sph(0.18, 5), y: 0.38, x: -0.16, z: 0.12, color: 0x2e5a28 },
    ])
  }
  if (kind === 'berry') {
    return merge([
      { geo: cyl(0.04, 0.06, 0.2, 4), y: 0.1, color: 0x4a3a22 },
      { geo: sph(0.32, 6), y: 0.34, sx: 1.2, sy: 0.95, color: 0x2e6a32 },
      { geo: sph(0.2, 5), y: 0.42, x: 0.16, color: 0x3a7a38 },
      { geo: sph(0.07, 5), y: 0.48, x: 0.16, color: 0xc42848 },
      { geo: sph(0.065, 5), y: 0.44, x: -0.14, z: 0.12, color: 0xc42848 },
      { geo: sph(0.06, 5), y: 0.54, z: -0.12, color: 0xd44060 },
      { geo: sph(0.055, 5), y: 0.58, x: 0.06, color: 0xe85070 },
      { geo: sph(0.05, 5), y: 0.4, x: -0.08, z: -0.14, color: 0xb02040 },
    ])
  }
  return merge(
    [0, 1, 2, 3, 4, 5, 6].map((i) => ({
      geo: new THREE.ConeGeometry(0.045, 0.55 + (i % 3) * 0.12, 3),
      y: 0.26,
      ry: (i / 7) * Math.PI * 2,
      rz: 0.12 * (i % 2 ? 1 : -1),
      x: Math.cos((i / 7) * Math.PI * 2) * 0.06,
      z: Math.sin((i / 7) * Math.PI * 2) * 0.06,
      color: i % 2 ? 0x6a8a3a : 0x5a7a30,
    })),
  )
}

const TREE_GEOS = Object.fromEntries(LAND_TREES.map((id) => [id, TREE_GEO[id]().scale(2.05, 2.05, 2.05)])) as Record<LandTreeId, THREE.BufferGeometry>
const ROCK_GEOS = { boulder: rockGeo('boulder'), outcrop: rockGeo('outcrop'), pebble: rockGeo('pebble') }
const PLANT_GEOS = { fern: plantGeo('fern'), grass: plantGeo('grass'), shrub: plantGeo('shrub'), berry: plantGeo('berry') }

function instanced(geo: THREE.BufferGeometry, color: number, cap: number, vertexColors = false, cast = false): THREE.InstancedMesh {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.02,
    vertexColors,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, cap)
  mesh.frustumCulled = true
  mesh.castShadow = cast
  mesh.receiveShadow = true
  return mesh
}

const TINT = new THREE.Color()
function place(mesh: THREE.InstancedMesh, n: number, s: Spot, yOff = 0, extraScale = 1): number {
  TMP.position.set(s.x, s.y + yOff, s.z)
  TMP.rotation.set((s.rot % 1) * 0.08, s.rot, 0)
  const stretch = 0.92 + (Math.abs(s.x * 12.9898 + s.z * 78.233) % 1) * 0.16
  TMP.scale.set(s.scale * extraScale * (0.96 + (s.rot % 1) * 0.08), s.scale * extraScale * stretch, s.scale * extraScale)
  TMP.updateMatrix()
  mesh.setMatrixAt(n, TMP.matrix)
  const hue = ((s.x * 3.1 + s.z * 5.7 + s.rot) % 1) * 0.08 - 0.04
  const lit = ((s.x * 1.7 + s.z * 2.3) % 1) * 0.14 - 0.07
  TINT.setHSL(0.08 + hue, 0.12, 0.55 + lit)
  mesh.setColorAt(n, TINT)
  return n + 1
}

/** Instanced land trees, rocks and plants for one chunk. Caller must dispose previous. */
export function buildLandFlora(cx: number, cz: number, quality: 'high' | 'mid' | 'low', group: THREE.Group, bucket: THREE.Object3D[]): void {
  const ox = cx * CHUNK
  if (ox + CHUNK < SEA_END) return
  const scatter = scatterChunk(cx, cz, CHUNK, groundAt, quality)
  for (const id of LAND_TREES) {
    const spots = scatter.trees.filter((s) => s.kind === id)
    if (!spots.length) continue
    const mesh = instanced(TREE_GEOS[id], 0xffffff, Math.max(spots.length, 1), true, quality !== 'low')
    let n = 0
    for (const s of spots) n = place(mesh, n, s, 0, 1)
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    group.add(mesh)
    bucket.push(mesh)
  }
  const rockColors: Record<string, number> = { boulder: 0x8a8a7a, outcrop: 0x7a7468, pebble: 0x9a9588 }
  for (const kind of ['boulder', 'outcrop', 'pebble'] as const) {
    const spots = scatter.rocks.filter((s) => s.kind === kind)
    if (!spots.length) continue
    const mesh = instanced(ROCK_GEOS[kind], rockColors[kind]!, Math.max(spots.length, 1), true, quality !== 'low' && kind !== 'pebble')
    let n = 0
    for (const s of spots) n = place(mesh, n, s, kind === 'outcrop' ? 0.1 : 0.05, 1)
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    group.add(mesh)
    bucket.push(mesh)
  }
  for (const kind of ['fern', 'grass', 'shrub', 'berry'] as const) {
    const spots = kind === 'berry' ? scatter.berries : scatter.plants.filter((s) => s.kind === kind)
    if (!spots.length) continue
    const mesh = instanced(PLANT_GEOS[kind], 0xffffff, Math.max(spots.length, 1), true)
    if (kind === 'berry') {
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.emissive = new THREE.Color(0x3a1020)
      mat.emissiveIntensity = 0.35
    }
    let n = 0
    for (const s of spots) n = place(mesh, n, s, 0, 1)
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    group.add(mesh)
    bucket.push(mesh)
  }
}

export const LAND_TREE_COUNT = LAND_TREES.length
