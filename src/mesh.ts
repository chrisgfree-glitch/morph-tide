import * as THREE from 'three'
import {
  ACCENTS,
  COLORS,
  armById,
  feetById,
  hornById,
  jawById,
  styleById,
  teethById,
  type Loadout,
} from '../shared/catalog'
import { bodyBox } from '../shared/body'
import { tierOf } from '../shared/rules'
import { partById } from '../shared/evolve'

const GEO = {
  trunk: profile(1.85, 0.18, 'fish'),
  torso: profile(1.15, 0.24, 'land'),
  tail: profile(0.7, 0.16, 'tail'),
  skull: profile(0.55, 0.16, 'skull'),
  neck: new THREE.CapsuleGeometry(0.07, 0.16, 2, 6),
  upper: new THREE.CapsuleGeometry(0.055, 0.2, 2, 6),
  lower: new THREE.CapsuleGeometry(0.045, 0.18, 2, 5),
  foot: new THREE.SphereGeometry(0.12, 8, 6),
  jaw: new THREE.SphereGeometry(0.5, 10, 8),
  tooth: new THREE.ConeGeometry(0.035, 0.11, 5),
  horn: new THREE.ConeGeometry(0.05, 0.26, 6),
  fin: finShape(),
  caudal: caudalShape(),
  gill: new THREE.SphereGeometry(0.08, 8, 6),
  plate: new THREE.SphereGeometry(0.16, 8, 6),
  body: new THREE.SphereGeometry(0.5, 10, 8),
  eye: new THREE.SphereGeometry(1, 8, 6),
}

const BUMP = {
  scale: bump('scale'),
  hide: bump('hide'),
}

function profile(len: number, rad: number, kind: 'fish' | 'land' | 'tail' | 'skull'): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const t = i / n
    let r = rad
    if (kind === 'fish') {
      const hump = Math.sin(Math.PI * Math.pow(t, 0.72))
      const nose = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1
      const tail = t < 0.08 ? 0.45 + t / 0.08 : 1
      r = Math.max(0.03, rad * hump * nose * (t < 0.08 ? tail : 1))
    } else if (kind === 'land') {
      const chest = 0.72 + 0.28 * Math.sin(Math.PI * t)
      const rump = t < 0.12 ? 0.62 : 1
      r = rad * chest * rump
    } else if (kind === 'tail') {
      r = rad * (1 - t) * (0.55 + 0.45 * (1 - t))
    } else {
      const snout = t > 0.62 ? 1 - (t - 0.62) / 0.55 : 0.75 + t * 0.4
      r = rad * Math.max(0.18, snout)
    }
    pts.push(new THREE.Vector2(Math.max(0.02, r), (t - 0.5) * len))
  }
  const geo = new THREE.LatheGeometry(pts, 8)
  geo.rotateZ(-Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}

function finShape(): THREE.ShapeGeometry {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(0.08, 0.02)
  s.lineTo(0.42, 0.22)
  s.lineTo(0.16, 0.48)
  s.lineTo(0, 0.36)
  return new THREE.ShapeGeometry(s)
}

function caudalShape(): THREE.ShapeGeometry {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(0.08, 0.28)
  s.lineTo(0.42, 0.46)
  s.lineTo(0.16, 0.08)
  s.lineTo(0.4, -0.28)
  s.lineTo(0.06, -0.22)
  s.lineTo(0, 0)
  return new THREE.ShapeGeometry(s)
}

function bump(kind: 'scale' | 'hide'): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#808080'
  g.fillRect(0, 0, 64, 64)
  if (kind === 'scale') {
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const ox = (y % 2) * 6
        g.strokeStyle = '#2e2e2e'
        g.lineWidth = 2
        g.beginPath()
        g.arc(ox + x * 12, y * 11 + 4, 6, 0.15, Math.PI - 0.15)
        g.stroke()
        g.strokeStyle = '#c4c4c4'
        g.beginPath()
        g.arc(ox + x * 12, y * 11 + 6, 5, 0.25, Math.PI - 0.25)
        g.stroke()
      }
    }
  } else {
    for (let i = 0; i < 36; i++) {
      g.fillStyle = i % 2 ? '#5c5c5c' : '#a0a0a0'
      g.beginPath()
      g.ellipse((i * 17) % 64, (i * 29) % 64, 5, 2.2, i * 0.4, 0, Math.PI * 2)
      g.fill()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(kind === 'scale' ? 5 : 3, 2)
  tex.colorSpace = THREE.NoColorSpace
  return tex
}

function texFromCanvas(c: HTMLCanvasElement, srgb = false, repeatX = 4, repeatY = 2): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.anisotropy = 4
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.needsUpdate = true
  return tex
}

/** Procedural scale albedo, normal, and roughness. Free, no external files. */
function scaleMaps(): { color: THREE.CanvasTexture; normal: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const s = 256
  const height = document.createElement('canvas')
  height.width = height.height = s
  const g = height.getContext('2d')!
  g.fillStyle = '#7a7a7a'
  g.fillRect(0, 0, s, s)
  const cols = 10
  const rows = 12
  const rw = s / cols
  const rh = s / rows
  for (let y = -1; y <= rows; y++) {
    for (let x = -1; x <= cols; x++) {
      const cx = (x + 0.5) * rw + (y % 2 === 0 ? 0 : rw / 2)
      const cy = (y + 0.4) * rh
      const grd = g.createRadialGradient(cx, cy - 3, 2, cx, cy, rh * 0.72)
      grd.addColorStop(0, '#e8e4dc')
      grd.addColorStop(0.45, '#a8a8a4')
      grd.addColorStop(0.82, '#6a6a68')
      grd.addColorStop(1, '#2a2a2a')
      g.fillStyle = grd
      g.beginPath()
      g.ellipse(cx, cy, rw * 0.5, rh * 0.58, 0, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = 'rgba(20,20,20,0.7)'
      g.lineWidth = 1.6
      g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.45)'
      g.lineWidth = 1.4
      g.beginPath()
      g.ellipse(cx, cy - 2, rw * 0.32, rh * 0.28, 0, Math.PI * 1.05, Math.PI * 1.9)
      g.stroke()
    }
  }
  const src = g.getImageData(0, 0, s, s)
  const ncan = document.createElement('canvas')
  ncan.width = ncan.height = s
  const ng = ncan.getContext('2d')!
  const nd = ng.createImageData(s, s)
  const rcan = document.createElement('canvas')
  rcan.width = rcan.height = s
  const rg = rcan.getContext('2d')!
  const rd = rg.createImageData(s, s)
  const str = 4.2
  const at = (x: number, y: number) => src.data[(((y + s) % s) * s + ((x + s) % s)) * 4]!
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = at(x + 1, y) - at(x - 1, y)
      const dy = at(x, y + 1) - at(x, y - 1)
      let nx = -dx * str
      let ny = -dy * str
      let nz = 255
      const inv = 127.5 / Math.hypot(nx, ny, nz)
      const i = (y * s + x) * 4
      nd.data[i] = nx * inv + 128
      nd.data[i + 1] = ny * inv + 128
      nd.data[i + 2] = nz * inv + 128
      nd.data[i + 3] = 255
      const lum = at(x, y)
      // Darker roughness = shinier scale faces; edges stay rougher.
      const rough = Math.max(40, Math.min(220, 300 - lum))
      rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = rough
      rd.data[i + 3] = 255
    }
  }
  ng.putImageData(nd, 0, 0)
  rg.putImageData(rd, 0, 0)
  return {
    color: texFromCanvas(height, true, 5, 3),
    normal: texFromCanvas(ncan, false, 5, 3),
    rough: texFromCanvas(rcan, false, 5, 3),
  }
}

const SCALE = scaleMaps()
const hideMats: THREE.MeshStandardMaterial[] = []

export function bindHideTextures(color: THREE.Texture, normal: THREE.Texture, rough: THREE.Texture): void {
  for (const m of hideMats) {
    m.map = color
    m.normalMap = normal
    m.roughnessMap = rough
    m.needsUpdate = true
  }
}

function mat(color: number, rough: number, metal: number, skin: 'scale' | 'hide'): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial(
    skin === 'scale'
      ? {
          color,
          roughness: Math.min(rough, 0.32),
          metalness: Math.max(metal, 0.16),
          map: SCALE.color,
          normalMap: SCALE.normal,
          normalScale: new THREE.Vector2(1.4, 1.4),
          roughnessMap: SCALE.rough,
        }
      : {
          color,
          roughness: rough,
          metalness: metal,
          bumpMap: BUMP.hide,
          bumpScale: 0.02,
        },
  )
  if (skin === 'hide') hideMats.push(m)
  return m
}

function shift(hex: number, salt: number): number {
  const c = new THREE.Color(hex)
  const n = ((salt % 7) - 3) / 7
  c.offsetHSL(n * 0.02, -0.06, n * 0.03)
  return c.getHex()
}

function attachSwim(mat: THREE.MeshStandardMaterial): { uTime: { value: number }; uAmp: { value: number }; uFreq: { value: number } } {
  const uniforms = { uTime: { value: 0 }, uAmp: { value: 0.04 }, uFreq: { value: 2.4 } }
  mat.customProgramCacheKey = () => 'swim'
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uAmp = uniforms.uAmp
    shader.uniforms.uFreq = uniforms.uFreq
    shader.vertexShader = `uniform float uTime;\nuniform float uAmp;\nuniform float uFreq;\n${shader.vertexShader}`
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float tailW = smoothstep(0.2, -0.95, transformed.x);
       transformed.z += sin(uTime * uFreq + transformed.x * 5.0) * uAmp * tailW;`,
    )
  }
  return uniforms
}

function stageBody(tier: number): THREE.LatheGeometry {
  const len = tier === 1 ? 1.05 : tier === 2 ? 1.45 : 1.65
  const rad = tier === 1 ? 0.3 : tier === 2 ? 0.32 : 0.16
  const pts: THREE.Vector2[] = []
  const n = 16
  for (let i = 0; i <= n; i++) {
    const t = i / n
    let r = rad
    if (tier === 1) {
      const hump = Math.sin(Math.PI * Math.pow(Math.min(t, 0.92), 0.55))
      const nose = t > 0.86 ? 0.72 : 1
      r = rad * Math.max(0.2, hump * nose)
    } else if (tier === 2) {
      const hump = Math.sin(Math.PI * Math.pow(t, 0.62))
      const nose = t > 0.86 ? 1 - (t - 0.86) / 0.14 * 0.4 : 1
      r = rad * Math.max(0.28, hump * nose)
    } else {
      const hump = Math.pow(Math.sin(Math.PI * Math.min(t, 0.96)), 0.55)
      const snout = t > 0.7 ? 1 - (t - 0.7) * 2.1 : 1
      r = rad * Math.max(0.08, hump * snout)
    }
    pts.push(new THREE.Vector2(Math.max(0.015, r), (t - 0.5) * len))
  }
  const geo = new THREE.LatheGeometry(pts, 10)
  geo.rotateZ(-Math.PI / 2)
  if (tier === 3) geo.scale(1, 0.72, 1.15)
  if (tier === 1) geo.scale(1, 1.15, 0.9)
  geo.computeVertexNormals()
  return geo
}

/** Tier 1 guppy, tier 2 steelhead, tier 3 sturgeon. The body wave is a vertex shader. */
function stageFish(g: THREE.Group, tier: number, body: number, belly: number, accent: number): void {
  const len = tier === 1 ? 1.05 : tier === 2 ? 1.45 : 1.65
  const palettes = [
    { body: 0xa6c84a, belly: 0xf3e4a8, accent: 0x4f8f78 },
    { body: 0xb0bec6, belly: 0xeee8e0, accent: 0xc58a8a },
    { body: 0x8a7040, belly: 0xd8c49a, accent: 0x5a4a30 },
  ] as const
  const pal = palettes[Math.max(0, Math.min(2, tier - 1))]!
  const color = new THREE.Color(pal.body).lerp(new THREE.Color(body), 0.22).getHex()
  const bellyCol = new THREE.Color(pal.belly).lerp(new THREE.Color(belly), 0.2).getHex()
  const accentCol = new THREE.Color(pal.accent).lerp(new THREE.Color(accent), 0.25).getHex()
  const geo = stageBody(tier)
  const torso = part(g, geo, 0, 0, 0, 1, 1, 1, color, 'body', 0.3, 0.18, 'scale', true)
  torso.userData.swim = attachSwim(torso.material as THREE.MeshStandardMaterial)
  const eyeZ = tier === 1 ? 0.24 : tier === 2 ? 0.2 : 0.14
  const eyeS = tier === 1 ? 0.1 : tier === 2 ? 0.065 : 0.045
  for (const s of [-1, 1]) {
    part(g, GEO.eye, len * 0.3, tier === 3 ? 0.08 : 0.05, s * eyeZ, eyeS, eyeS * 0.85, eyeS * 0.7, 0xf3efe4, '', 0.2, 0, 'hide', false)
    part(g, GEO.eye, len * 0.33, tier === 3 ? 0.075 : 0.045, s * (eyeZ + 0.02), eyeS * 0.4, eyeS * 0.4, eyeS * 0.28, 0x1a221c, '', 0.35, 0.02, 'hide', false)
  }
  const fin = (x: number, y: number, z: number, sx: number, sy: number, name: string, rz: number) => {
    const m = part(g, GEO.fin, x, y, z, sx, sy, 1, accentCol, name, 0.55, 0.02, 'scale', false)
    m.rotation.z = rz
    m.userData.baseZ = rz
    const mat = m.material as THREE.MeshStandardMaterial
    mat.transparent = true
    mat.opacity = 0.9
    mat.side = THREE.DoubleSide
    return m
  }
  fin(len * 0.02, tier === 1 ? 0.28 : tier === 2 ? 0.2 : 0.1, 0, tier === 1 ? 0.4 : 0.55, tier === 3 ? 0.22 : 0.42, 'dorsal', 0.15)
  const pecL = fin(len * 0.08, -0.02, -(eyeZ + 0.02), 0.5, 0.36, 'finL', 0.55)
  const pecR = fin(len * 0.08, -0.02, eyeZ + 0.02, 0.5, 0.36, 'finR', -0.55)
  pecL.rotation.y = -0.25
  pecR.rotation.y = 0.25
  fin(-len * 0.08, -0.14, -0.05, 0.22, 0.16, '', 1.4)
  fin(-len * 0.08, -0.14, 0.05, 0.22, 0.16, '', -1.4)
  fin(-len * 0.16, -0.08, 0, 0.34, 0.26, 'anal', Math.PI)
  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(-len * 0.48, 0, 0)
  g.add(tail)
  if (tier === 3) {
    const upper = part(tail, GEO.fin, -0.02, 0.02, 0, 0.7, 1.35, 1, accentCol, 'caudal', 0.5, 0.02, 'scale', false)
    upper.rotation.z = 0.85
    const lower = part(tail, GEO.fin, 0.02, -0.02, 0, 0.22, 0.32, 1, accentCol, '', 0.5, 0.02, 'scale', false)
    lower.rotation.z = -0.7
    ;(upper.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    ;(lower.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    for (let i = 0; i < 5; i++) part(g, GEO.plate, len * 0.22 - i * 0.22, 0.09, 0, 0.42, 0.26, 0.34, 0xd8d0c2, '', 0.42, 0.18, 'hide', false)
    part(g, GEO.lower, len * 0.28, -0.1, 0.035, 0.16, 0.55, 0.16, bellyCol, '', 0.85, 0, 'scale', false)
    part(g, GEO.lower, len * 0.28, -0.1, -0.035, 0.16, 0.55, 0.16, bellyCol, '', 0.85, 0, 'scale', false)
  } else {
    const caudal = part(tail, GEO.caudal, 0, 0, 0, tier === 1 ? 0.85 : 1, tier === 2 ? 1.1 : 0.8, 1, accentCol, 'caudal', 0.5, 0.02, 'scale', false)
    caudal.rotation.z = Math.PI
    const mat = caudal.material as THREE.MeshStandardMaterial
    mat.side = THREE.DoubleSide
    mat.transparent = true
    mat.opacity = 0.92
  }
  if (tier === 2) {
    for (const s of [-1, 1]) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(len * 0.7, 0.05, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xd48980, roughness: 0.5, metalness: 0.02 }),
      )
      stripe.position.set(0, 0.02, s * 0.3)
      g.add(stripe)
    }
  }
}

/** Chibi piranha: round and cute at tier 1, spikier and meaner each tier and with sharper teeth / bigger jaws. */
function stagePiranha(g: THREE.Group, tier: number, load: Loadout, body: number): void {
  const menace = Math.min(1, (tier - 1) / 2 + (load.teeth && load.teeth !== 'peg' ? 0.2 : 0) + (load.jaw && load.jaw !== 'nip' ? 0.15 : 0))
  const len = 1.0 + tier * 0.12
  const blue = new THREE.Color(0x2f6fd0).lerp(new THREE.Color(body), 0.15).getHex()
  const stripeCol = 0x7fb8ee
  const face = 0xece6ee
  const orange = new THREE.Color(0xf2a020).lerp(new THREE.Color(0xff6a10), menace * 0.5).getHex()
  const ball = (rx: number, ry: number, rz: number) => new THREE.SphereGeometry(1, 18, 14).scale(rx, ry, rz)
  // round body, chunkier with menace
  const torso = part(g, ball(len * 0.5, 0.42 + menace * 0.06, 0.36), 0, 0, 0, 1, 1, 1, blue, 'body', 0.35, 0.12, 'scale', true)
  torso.userData.swim = attachSwim(torso.material as THREE.MeshStandardMaterial)
  // big white face plate
  part(g, ball(0.32, 0.38 + menace * 0.04, 0.37), len * 0.27, 0.01, 0, 1, 1, 1, face, '', 0.5, 0.02, 'scale', false)
  // light stripes from tier 2
  if (tier >= 2) for (let i = 0; i < 3; i++) {
    for (const sd of [-1, 1]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.02), new THREE.MeshStandardMaterial({ color: stripeCol, roughness: 0.45 }))
      st.position.set(-0.02 - i * 0.16, 0.02, sd * 0.33)
      st.rotation.z = -0.15
      g.add(st)
    }
  }
  // huge eyes: dark & friendly at tier 1, red and angry later
  const eyeS = 0.15 - menace * 0.03
  const iris = new THREE.Color(0x2a1a22).lerp(new THREE.Color(0xc0162a), Math.min(1, menace * 1.4)).getHex()
  for (const sd of [-1, 1]) {
    part(g, GEO.eye, len * 0.36, 0.14, sd * 0.24, eyeS, eyeS, eyeS * 0.8, 0xfaf6f2, '', 0.15, 0, 'hide', false)
    part(g, GEO.eye, len * 0.39, 0.14, sd * 0.29, eyeS * 0.62, eyeS * 0.62, eyeS * 0.45, iris, '', 0.2, 0.05, 'hide', false)
    part(g, GEO.eye, len * 0.4, 0.17, sd * 0.32, eyeS * 0.18, eyeS * 0.18, eyeS * 0.12, 0xffffff, '', 0.05, 0, 'hide', false)
    if (menace > 0.4) {
      // angry brow ridge
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: blue, roughness: 0.4 }))
      brow.position.set(len * 0.37, 0.27, sd * 0.25)
      brow.rotation.z = -0.35 * menace
      brow.rotation.x = sd * 0.25
      g.add(brow)
    }
  }
  // mouth: a smile at tier 1, gaping toothy maw later
  const gape = 0.06 + menace * 0.12
  const mouth = part(g, ball(0.1, gape, 0.17), len * 0.47, -0.13, 0, 1, 1, 1, 0x7a1c2a, 'jaw', 0.6, 0, 'hide', false)
  mouth.userData.baseY = mouth.position.y
  const fangs = tier === 1 ? 0 : 4 + Math.round(menace * 6)
  const fangH = 0.04 + menace * 0.07
  for (let i = 0; i < fangs; i++) {
    const t = fangs === 1 ? 0.5 : i / (fangs - 1)
    const z = (t - 0.5) * 0.28
    const top = i % 2 === 0
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.018 + menace * 0.01, fangH, 6), new THREE.MeshStandardMaterial({ color: 0xf6f0e4, roughness: 0.3 }))
    f.position.set(len * 0.52, top ? -0.13 + gape * 0.7 : -0.13 - gape * 0.7, z)
    f.rotation.z = top ? Math.PI : 0
    g.add(f)
  }
  // red gill slashes from tier 2
  if (tier >= 2) for (let i = 0; i < 2 + Math.round(menace); i++) for (const sd of [-1, 1]) {
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.02), new THREE.MeshStandardMaterial({ color: 0xc02838, roughness: 0.5 }))
    gl.position.set(len * 0.1 - i * 0.06, -0.02, sd * 0.35)
    gl.rotation.z = 0.25
    g.add(gl)
  }
  const fin = (x: number, y: number, z: number, sx: number, sy: number, name: string, rz: number) => {
    const m = part(g, GEO.fin, x, y, z, sx, sy, 1, orange, name, 0.5, 0.02, 'scale', false)
    m.rotation.z = rz
    m.userData.baseZ = rz
    ;(m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    return m
  }
  // dorsal: a soft nub at tier 1, a row of spikes later
  const spikes = tier === 1 ? 1 : 3 + Math.round(menace * 4)
  for (let i = 0; i < spikes; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, tier === 1 ? 0.14 : 0.18 + menace * 0.16, 5), new THREE.MeshStandardMaterial({ color: orange, roughness: 0.45 }))
    sp.position.set(len * 0.12 - i * 0.1, 0.4 + menace * 0.05 - i * 0.012, 0)
    sp.rotation.z = 0.5
    sp.name = i === 0 ? 'dorsal' : ''
    g.add(sp)
  }
  const pecL = fin(len * 0.05, -0.12, -0.34, 0.42 + menace * 0.2, 0.3, 'finL', 0.6)
  const pecR = fin(len * 0.05, -0.12, 0.34, 0.42 + menace * 0.2, 0.3, 'finR', -0.6)
  pecL.rotation.y = -0.3
  pecR.rotation.y = 0.3
  fin(-len * 0.05, -0.36, 0, 0.3 + menace * 0.2, 0.24, 'anal', Math.PI)
  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(-len * 0.48, 0, 0)
  g.add(tail)
  const caudal = part(tail, GEO.caudal, 0, 0, 0, 0.8 + menace * 0.4, 0.8 + menace * 0.5, 1, orange, 'caudal', 0.45, 0.02, 'scale', false)
  caudal.rotation.z = Math.PI
  ;(caudal.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
}


function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 33 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

function part(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: number,
  name = '',
  rough = 0.72,
  metal = 0.04,
  skin: 'scale' | 'hide' = 'scale',
  shadow = false,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color, rough, metal, skin))
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  m.castShadow = shadow
  m.receiveShadow = true
  if (name) m.name = name
  parent.add(m)
  return m
}

export function buildCreature(load: Loadout, spent: number, role: 'player' | 'npc' | 'boss', species = ''): THREE.Group {
  const g = new THREE.Group()
  const salt = hash(`${load.jaw}|${load.teeth}|${load.horn}|${load.color}|${role}`)
  const speciesTint: Record<string, number> = { shrimp: 0xc4a090, needle: 0x7f97a0, bell: 0x8a7894, plate: 0x8a7d62 }
  let body = shift(COLORS[load.color % COLORS.length] ?? 0x6e8e86, salt)
  if (speciesTint[species]) body = new THREE.Color(body).lerp(new THREE.Color(speciesTint[species]!), 0.5).getHex()
  const accent = shift(ACCENTS[load.accent % ACCENTS.length] ?? 0xd4c4a4, salt + 2)
  const belly = new THREE.Color(body).lerp(new THREE.Color(0xe6d8c4), 0.35).getHex()
  const jaw = jawById(load.jaw) ?? jawById('nip')!
  const teeth = teethById(load.teeth) ?? teethById('peg')!
  const horn = hornById(load.horn)
  const feet = feetById(load.feet)
  const style = styleById(load.wingStyle)
  const arm = armById(load.armType)
  const land = load.legs > 0
  const tier = tierOf(spent)
  const skin: 'scale' | 'hide' = land && load.lungs > 0 ? 'hide' : tier >= 6 ? 'hide' : 'scale'
  const box = bodyBox(load, spent, role === 'boss', species)
  g.scale.set(box.scale * box.long, box.scale * box.tall, box.scale)
  if (!land && role !== 'boss' && tier <= 3) {
    if (role === 'player') stagePiranha(g, tier, load, body)
    else stageFish(g, tier, body, belly, accent)
    const hp = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.06), new THREE.MeshBasicMaterial({ color: 0x8f4d48 }))
    hp.position.set(0.1, 0.55, 0)
    hp.name = 'hp'
    g.add(hp)
    g.userData.hp = hp
    dressMorph(g, load, accent, body)
    return g
  }

  part(g, land ? GEO.torso : GEO.trunk, land ? -0.05 : 0, 0, 0, 1, land ? 0.92 : 1, land ? 0.78 : 0.72, body, 'body', 0.68, 0.05, skin, true)

  if (land) {
    part(g, GEO.neck, 0.62, 0.08, 0, 1, 1.15, 1, body, 'neck', 0.7, 0.04, skin, true)
    part(g, GEO.skull, 1.05, 0.14, 0, 1, 1.05, 0.9, body, 'head', 0.62, 0.05, skin, true)
  }

  const headX = land ? 1.15 : 0.72
  const headY = land ? 0.16 : 0.04
  const eyeR = 0.055 + load.eyes * 0.01
  for (const s of [-1, 1]) {
    part(g, GEO.eye, headX, headY + 0.04, s * (land ? 0.12 : 0.14), eyeR, eyeR * 0.78, eyeR * 0.62, 0xf3efe6, '', 0.16, 0.02, 'hide', false)
    part(g, GEO.eye, headX + 0.03, headY + 0.04, s * (land ? 0.14 : 0.16), eyeR * 0.4, eyeR * 0.4, eyeR * 0.28, 0x1c2420, '', 0.3, 0.04, 'hide', false)
  }

  const jlen = 0.16 + (jaw.len ?? 0.3) * 0.22
  const jawM = part(
    g,
    GEO.jaw,
    (land ? headX : 0.62) + jlen * 0.15,
    (land ? headY : 0.02) - 0.07,
    0,
    jlen,
    0.16 + (jaw.ht ?? 0.12) * 0.2,
    0.14 + (jaw.wd ?? 0.16) * 0.15,
    belly,
    'jaw',
    0.6,
    0.05,
    skin,
    false,
  )
  jawM.rotation.z = 0.12
  const toothN = Math.min(5, teeth.n ?? 4)
  for (let i = 0; i < toothN; i++) {
    part(
      jawM,
      GEO.tooth,
      0.15 + (i % 3) * 0.16,
      0.42,
      ((i % 3) - 1) * 0.18,
      0.55,
      0.45 + (teeth.len ?? 0.08) * 3,
      0.55,
      0xe7dece,
      '',
      0.38,
      0.08,
      'hide',
      false,
    )
  }
  if (horn && horn.feat && horn.feat !== 'none') {
    const spike = part(g, GEO.horn, headX - 0.05, headY + 0.2, 0, 1, 0.7 + (horn.bite ?? 1) * 0.15, 1, accent, 'horn', 0.5, 0.12, 'hide', false)
    spike.rotation.z = -0.4
  }
  if (!land || load.lungs < 1) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const slit = part(g, GEO.gill, 0.28 - i * 0.045, 0.0, s * 0.16, 1, 0.7, 1, tier >= 5 ? 0x6a3030 : 0x3a4038, 'gill', 0.7, 0.02, skin, false)
        slit.rotation.z = s * 0.15
      }
    }
  }

  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(land ? -0.62 : -0.78, 0, 0)
  g.add(tail)
  part(tail, GEO.tail, -0.28, 0, 0, 1, 0.9, 0.75, body, '', 0.7, 0.04, skin, true)
  const caudal = part(tail, GEO.caudal, -0.62, 0, 0, 0.7 + load.tail * 0.12, 0.85, 1, accent, 'caudal', 0.55, 0.02, skin, false)
  caudal.material = mat(accent, 0.55, 0.02, skin)
  ;(caudal.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide

  if (load.fin > 0 || !land) {
    const dorsal = part(g, GEO.fin, land ? -0.2 : -0.05, land ? 0.2 : 0.16, 0, 0.85, 0.7 + load.fin * 0.15, 1, accent, 'dorsal', 0.55, 0.02, skin, false)
    ;(dorsal.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    for (const s of [-1, 1]) {
      const pec = part(g, GEO.fin, 0.22, -0.06, s * 0.12, 0.55, 0.4, 1, accent, s > 0 ? 'finR' : 'finL', 0.55, 0.02, skin, false)
      pec.rotation.y = s > 0 ? 0.9 : -0.9
      pec.rotation.z = s * 0.4
      ;(pec.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
      const pelvic = part(g, GEO.fin, -0.15, -0.12, s * 0.08, 0.35, 0.28, 1, accent, '', 0.55, 0.02, skin, false)
      pelvic.rotation.z = s * -0.6
      ;(pelvic.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    }
    const anal = part(g, GEO.fin, -0.45, -0.1, 0, 0.4 + load.tail * 0.05, 0.32, 1, accent, 'anal', 0.55, 0.02, skin, false)
    anal.rotation.z = Math.PI
    ;(anal.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    part(g, GEO.plate, 0.05, 0.02, 0.15, 3.2, 0.08, 0.04, 0x2a3330, 'line', 0.8, 0, skin, false)
  }
  if (load.spines) {
    for (let i = 0; i < 4; i++) {
      const spine = part(g, GEO.horn, -0.2 + i * 0.16, 0.22, 0, 0.45, 0.55, 0.45, accent, '', 0.48, 0.08, 'hide', false)
      spine.rotation.z = 0.15
    }
  }
  if (load.lure && !land) part(g, GEO.eye, 0.95, 0.28, 0, 0.05, 0.05, 0.05, 0xc4a06a, '', 0.4, 0.1, 'hide', false)

  const dig = (feet?.dig ?? 0) > 0
  for (let i = 0; i < load.legs; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const along = -0.28 + Math.floor(i / 2) * 0.28
    const hip = new THREE.Group()
    hip.name = `leg${i}`
    hip.position.set(along, -0.16, side * 0.12)
    g.add(hip)
    part(hip, GEO.upper, 0.02, -0.16, 0, 1, 1, 1, body, '', 0.7, 0.03, skin, true)
    const knee = new THREE.Group()
    knee.name = `knee${i}`
    knee.position.set(0.04, -0.32, 0)
    knee.rotation.z = -0.45
    hip.add(knee)
    part(knee, GEO.lower, 0, -0.14, 0, 1, 1, 1, body, '', 0.72, 0.03, skin, false)
    const paw = part(knee, GEO.foot, dig ? 0.12 : 0.06, -0.28, side * 0.02, dig ? 1.25 : 1, 1, 1, dig ? 0x8a7048 : accent, '', 0.8, 0.03, 'hide', false)
    paw.rotation.z = 0.3
  }

  const feather = style?.feat === 'feather' || style?.feat === 'limb'
  const membrane = feather ? 0xc4b49a : accent
  for (let i = 0; i < load.wings; i++) {
    for (const s of [-1, 1]) {
      const wing = new THREE.Group()
      wing.name = `wing${i}${s > 0 ? 'r' : 'l'}`
      wing.position.set(0.05 + i * 0.04, 0.18, s * 0.1)
      g.add(wing)
      const sheet = part(wing, GEO.fin, 0, 0, s * 0.2, 0.85 + (style?.fly ?? 1) * 0.2, 0.7, 1, membrane, '', 0.6, 0.02, 'hide', false)
      sheet.rotation.y = s > 0 ? 1.15 : -1.15
      ;(sheet.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    }
  }

  for (let i = 0; i < load.arms; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const shoulder = new THREE.Group()
    shoulder.name = `arm${i}`
    shoulder.position.set(0.42, -0.02, side * 0.16)
    g.add(shoulder)
    part(shoulder, GEO.upper, 0.08, -0.12, side * 0.04, 0.8, 0.9, 0.8, body, '', 0.68, 0.04, skin, false)
    const elbow = new THREE.Group()
    elbow.position.set(0.12, -0.28, side * 0.05)
    elbow.rotation.z = -0.4
    shoulder.add(elbow)
    part(elbow, GEO.lower, 0, -0.12, 0, 0.75, 0.85, 0.75, body, '', 0.7, 0.04, skin, false)
    if (arm?.feat === 'spade' || arm?.feat === 'claw' || arm?.feat === 'pick') {
      part(elbow, GEO.tooth, 0.06, -0.26, 0, 0.8, 0.9, 0.6, 0x8d7350, '', 0.5, 0.14, 'hide', false)
    }
  }

  if (load.breaker) part(g, GEO.horn, headX + 0.15, headY + 0.08, 0, 0.7, 0.55, 0.7, 0xcfc4b0, '', 0.4, 0.18, 'hide', false)
  if (!land && tier >= 4 && (teeth.n ?? 0) >= 6) {
    for (let i = 0; i < 3; i++) part(jawM, GEO.tooth, 0.05 + i * 0.12, 0.2, (i - 1) * 0.2, 0.7, 0.9, 0.5, 0xd8cfc0, '', 0.35, 0.1, 'hide', false)
  }
  if (!land && tier >= 5) {
    part(g, GEO.eye, headX - 0.15, headY + 0.12, 0.08, 0.035, 0.03, 0.03, 0xf3efe6, '', 0.2, 0, 'hide', false)
    part(g, GEO.eye, headX - 0.12, headY + 0.1, -0.08, 0.028, 0.024, 0.024, 0x1c2420, '', 0.3, 0, 'hide', false)
  }
  if (!land && (load.lure || tier >= 6)) {
    const lure = part(g, GEO.eye, headX + 0.15, 0.28, 0, 0.06, 0.06, 0.06, 0xc6d6a8, 'lure', 0.25, 0.15, 'hide', false)
    ;(lure.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x8aaa62)
  }
  if (!land && (load.barbels || tier >= 7)) {
    part(g, GEO.lower, headX, -0.2, 0.1, 0.35, 1.1, 0.35, 0x5a5048, 'tendril', 0.8, 0.02, 'hide', false)
    part(g, GEO.lower, headX - 0.05, -0.18, -0.1, 0.3, 0.9, 0.3, 0x4a4038, 'tendril', 0.8, 0.02, 'hide', false)
  }
  if (load.armor > 0) {
    for (let i = 0; i < load.armor + 1; i++) {
      part(g, GEO.plate, -0.15 + i * 0.2, 0.2, 0, 1, 1, 1, accent, '', 0.55, 0.1, skin, false)
    }
  }
  const sk = load.skin || 1
  const plateN = sk < 5 ? 0 : sk < 9 ? 2 : sk < 15 ? 4 : 6
  const plateColor = sk >= 16 ? 0x3a342f : sk >= 9 ? 0x7a7268 : 0x8a8174
  for (let i = 0; i < plateN; i++) {
    const plate = part(g, GEO.plate, -0.35 + i * 0.22, 0.16 + (sk >= 9 ? 0.04 : 0), (i % 2) * 0.02, sk >= 12 ? 1.15 : 0.85, sk >= 9 ? 0.7 : 0.4, 1.1, plateColor, 'scute', 0.48, sk >= 16 ? 0.22 : 0.08, 'hide', false)
    if (sk >= 16) (plate.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(sk >= 20 ? 0x6a8a72 : 0x3a2a22)
    if (sk >= 15 && i % 2 === 0) {
      const spine = part(g, GEO.horn, -0.3 + i * 0.22, 0.28, 0, 0.4, 0.45, 0.4, plateColor, '', 0.4, 0.12, 'hide', false)
      spine.rotation.z = 0.2
    }
  }

  const hp = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.06), new THREE.MeshBasicMaterial({ color: 0x8f4d48 }))
  hp.position.set(0.1, 0.55, 0)
  hp.name = 'hp'
  g.add(hp)
  g.userData.hp = hp
  dressMorph(g, load, accent, body)
  return g
}


function dressMorph(g: THREE.Group, load: Loadout, accent: number, body: number): void {
  const morph = load.morph
  if (!morph || !morph.v) return
  const skinTint: Record<string, number> = {
    scales: 0x7aa36a,
    slime: 0x4a8f7a,
    spiny: 0x8a7a4a,
    plates: 0xc4b49a,
    bio: 0x3aa090,
    leather: 0x6a6a72,
    blubber: 0xd8c8a8,
    whale: 0x6a7380,
    orca: 0x1c1c1c,
    magma: 0xb24a28,
  }
  if (morph.skin && skinTint[morph.skin]) {
    const tint = skinTint[morph.skin]!
    g.traverse((obj) => {
      if (obj.name !== 'body' && obj.name !== '') return
      const mesh = obj as THREE.Mesh
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined
      if (!mat || !mat.color) return
      if (obj.name === 'body') mat.color.lerp(new THREE.Color(tint), 0.55)
    })
  }
  if (morph.skin === 'bio') {
    g.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (!mat || !mat.emissive) return
      mat.emissive.setHex(0x3cffd0)
      mat.emissiveIntensity = 0.55
    })
  }
  if (morph.skin === 'magma') {
    g.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (!mat || !mat.emissive) return
      mat.emissive.setHex(0xff5520)
      mat.emissiveIntensity = 0.35
    })
  }
  if (morph.skin === 'plates' || morph.skin === 'whale' || morph.skin === 'orca') {
    for (let i = 0; i < 6; i++) {
      const pl = part(g, GEO.plate, 0.28 - i * 0.16, 0.1, 0, 0.4, 0.22, 0.32, morph.skin === 'orca' && i % 2 ? 0xf2f0ea : 0xd0c6b4, 'plate', 0.5, 0.12, 'hide', false)
      pl.userData.morph = true
    }
  }
  if (morph.skin === 'spiny') {
    for (let i = 0; i < 5; i++) {
      const s = part(g, GEO.horn, 0.2 - i * 0.14, 0.18, (i % 2 ? 0.06 : -0.06), 0.55, 0.7, 0.55, accent, 'spine', 0.4, 0.1, 'hide', false)
      s.rotation.z = 0.15
    }
  }

  // Head specials
  if (morph.head === 'angler') {
    const stalk = part(g, GEO.horn, 0.42, 0.22, 0, 0.7, 1.1, 0.7, accent, 'lure', 0.45, 0.05, 'hide', false)
    stalk.rotation.z = -0.9
    const bulb = part(g, GEO.eye, 0.62, 0.42, 0, 0.07, 0.07, 0.07, 0x9cff7a, 'lure-bulb', 0.3, 0, 'hide', false)
    ;(bulb.material as THREE.MeshStandardMaterial).emissive.setHex(0x7cff4a)
    ;(bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9
  }
  if (morph.head === 'hammerhead') {
    const hammer = part(g, GEO.plate, 0.55, 0.08, 0, 0.35, 0.18, 1.15, body, 'hammer', 0.55, 0.05, 'scale', true)
    hammer.rotation.y = 0
  }
  if (morph.head === 'swordfish') {
    const bill = part(g, GEO.horn, 0.7, 0.02, 0, 1.8, 0.45, 0.45, 0xe7dece, 'bill', 0.4, 0.08, 'hide', false)
    bill.rotation.z = -1.2
  }
  if (morph.head === 'turtle') {
    part(g, GEO.plate, 0.48, 0.02, 0, 0.4, 0.28, 0.4, 0xb8a078, 'beak', 0.5, 0.04, 'hide', false)
  }

  // Horns, levels I–III scale length
  if (morph.horn && morph.hornLv > 0) {
    const lv = morph.hornLv
    const count = morph.horn === 'trident' ? 3 : 1
    for (let i = 0; i < count; i++) {
      const z = count === 1 ? 0 : (i - 1) * 0.08
      const h = part(g, GEO.horn, 0.4, 0.22, z, 0.7 + lv * 0.25, 1 + lv * 0.45, 0.7, morph.horn === 'trident' ? 0x2a2428 : accent, 'horn', 0.4, 0.15, 'hide', false)
      h.rotation.z = -0.45
      if (morph.horn === 'crest') h.rotation.z = 0.15, h.scale.set(1.3, 0.7, 1.6)
    }
  }

  // Side / belly fins: restyle existing pecs or add
  const side = partById(morph.sideFin)
  if (side && morph.sideFin && morph.sideFin !== 'fan') {
    const scale = morph.sideFin === 'manta' ? 1.8 : morph.sideFin === 'flying' ? 1.5 : morph.sideFin === 'dolphin' ? 1.25 : morph.sideFin === 'sharkfin-side' ? 1.2 : 1
    for (const name of ['finL', 'finR']) {
      const fin = g.getObjectByName(name)
      if (fin) fin.scale.multiplyScalar(scale)
    }
    if (morph.sideFin === 'lionfish') {
      for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const ray = part(g, GEO.fin, 0.12, 0.02, s * (0.16 + i * 0.02), 0.35, 0.55, 1, 0xe8d45a, 'lion-ray', 0.5, 0.02, 'scale', false)
          ray.rotation.y = s * (0.7 + i * 0.1)
          ray.rotation.z = s * 0.3
        }
      }
    }
  }
  if (morph.bellyFin === 'lobe') {
    for (const s of [-1, 1]) {
      const lobe = part(g, GEO.fin, 0.05, -0.2, s * 0.08, 0.4, 0.3, 1, accent, 'lobe', 0.55, 0.02, 'scale', false)
      lobe.rotation.z = s * 1.2
    }
  }

  // Dorsal (on the back, y positive) — keep named 'dorsal'
  const dorsal = g.getObjectByName('dorsal')
  if (dorsal && morph.dorsal) {
    const sc = morph.dorsal === 'sail' ? 1.6 : morph.dorsal === 'sharkfin' ? 1.35 : morph.dorsal === 'spinyfin' ? 1.1 : morph.dorsal === 'newt' ? 1.2 : 1
    dorsal.scale.y *= sc
    dorsal.scale.x *= morph.dorsal === 'sail' ? 1.3 : 1
  }

  // Rear fins: LOW on the body, toward the tail — never on the back.
  const placeRear = (_id: string, x: number, y: number, z: number, name: string, scale = 1) => {
    const m = part(g, GEO.fin, x, y, z, 0.38 * scale, 0.28 * scale, 1, accent, name, 0.55, 0.02, 'scale', false)
    m.rotation.z = Math.PI * 0.85
    m.rotation.x = z > 0 ? 0.2 : z < 0 ? -0.2 : 0
    ;(m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    return m
  }
  if (morph.rear) {
    const sc = morph.rear === 'dorsalrear' ? 1.25 : morph.rear === 'sailrear' ? 1.2 : morph.rear === 'spinyrear' ? 1.05 : 1
    placeRear(morph.rear, -0.32, -0.16, 0, 'rear', sc)
    if (morph.rear === 'spinyrear') {
      for (const s of [-1, 1]) placeRear('spinyrear', -0.28, -0.14, s * 0.06, 'rear-spine', 0.7)
    }
  }
  for (let i = 0; i < Math.min(2, morph.extraRear || 0); i++) {
    placeRear('extraRear', -0.4 - i * 0.1, -0.15, (i === 0 ? -0.05 : 0.05), `extra-rear-${i + 1}`, 0.85)
  }

  // Tails
  const tail = g.getObjectByName('tail')
  if (tail && morph.tail && morph.tail !== 'fantail') {
    if (morph.tail === 'forked') {
      for (const s of [-1, 1]) {
        const lobe = part(tail, GEO.fin, -0.15, s * 0.08, 0, 0.55, 0.7, 1, accent, 'fork', 0.5, 0.02, 'scale', false)
        lobe.rotation.z = s * 0.55
      }
    }
    if (morph.tail === 'thresher') {
      const whip = part(tail, GEO.fin, -0.2, 0.2, 0, 0.5, 1.6, 1, accent, 'whip', 0.5, 0.02, 'scale', false)
      whip.rotation.z = 0.9
    }
    if (morph.tail === 'eel') {
      part(tail, GEO.tail, -0.4, 0, 0, 1.4, 0.5, 0.4, body, 'ribbon', 0.6, 0.04, 'scale', true)
    }
    if (morph.tail === 'barbed') {
      const barb = part(tail, GEO.horn, -0.35, 0, 0, 1.1, 0.8, 0.8, accent, 'barb', 0.45, 0.1, 'hide', false)
      barb.rotation.z = 1.2
    }
  }

  // Back armor: on the back, not a dorsal fin and not the Bony Plates skin.
  if (morph.armor === 'bonescales') {
    for (let i = 0; i < 8; i++) {
      const sc = part(g, GEO.plate, 0.28 - i * 0.1, 0.16, (i % 2 ? 0.07 : -0.07), 0.28, 0.14, 0.28, 0xd8c8a8, 'bonescale', 0.45, 0.1, 'hide', false)
      sc.userData.morph = true
    }
  }
  if (morph.armor === 'plating') {
    for (let i = 0; i < 4; i++) {
      const pl = part(g, GEO.plate, 0.24 - i * 0.18, 0.18, 0, 0.55, 0.2, 0.7, 0xc8c0b0, 'plating', 0.5, 0.14, 'hide', false)
      pl.userData.morph = true
    }
  }

  // Octopus body, arms, and limbs
  if (morph.branch === 'octopus') {
    const mantle = part(g, GEO.body, 0.05, 0.04, 0, 1.15, 0.9, 1.05, body, 'mantle', 0.35, 0.04, 'hide', true)
    mantle.scale.set(1.05, 0.85, 1.05)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const arm = part(g, GEO.lower, -0.15, -0.16, 0, 0.35, 1.5, 0.35, body, `arm${i}`, 0.55, 0.04, 'hide', false)
      arm.rotation.z = 1.1
      arm.rotation.y = a
      arm.position.set(Math.cos(a) * 0.16, -0.18, Math.sin(a) * 0.16)
    }
    if (morph.limb) {
      for (const s of [-1, 1]) {
        const leg = part(g, GEO.lower, 0.1, -0.22, s * 0.18, 0.4, 1.2, 0.4, body, 'limb', 0.55, 0.04, 'hide', false)
        leg.rotation.z = 0.6
        const belly = part(g, GEO.lower, -0.05, -0.24, s * 0.1, 0.35, 1.0, 0.35, body, 'limb-belly', 0.55, 0.04, 'hide', false)
        belly.rotation.z = 0.9
      }
    }
  }
}

export function preyInstanceGeo(species: string): THREE.BufferGeometry {
  const ball = (sx: number, sy: number, sz: number, r = 0.22) => {
    const geo = new THREE.SphereGeometry(r, 8, 6)
    geo.scale(sx, sy, sz)
    return geo
  }
  if (species === 'bell') return ball(1, 1.15, 1, 0.28)
  if (species === 'plate' || species === 'platebug') return ball(1.15, 0.7, 1.15, 0.3)
  if (species === 'crab') return ball(1.5, 0.45, 1.35, 0.26)
  if (species === 'beetle') return ball(1.15, 0.65, 0.9, 0.24)
  if (species === 'newt') return ball(1.8, 0.55, 0.55, 0.22)
  if (species === 'lizard') return ball(2.0, 0.5, 0.55, 0.22)
  if (species === 'hunter') return ball(2.3, 0.7, 0.75, 0.28)
  if (species === 'brute') return ball(1.6, 1.05, 1.15, 0.34)
  if (species === 'magma') return ball(1.2, 0.7, 0.7, 0.26)
  return ball(1.6, 0.7, 0.7, 0.22)
}

export const PREY_TINT: Record<string, number> = {
  shrimp: 0xc4a090,
  needle: 0x7f97a0,
  bell: 0xb89ad0,
  plate: 0x8a7d62,
  crab: 0xc46a4a,
  beetle: 0xc4a04a,
  newt: 0x6a8a5a,
  lizard: 0x8a9a4a,
  hunter: 0x6a5040,
  brute: 0x7a6a58,
  magma: 0xc45a2a,
}

export function creatureKey(load: Loadout, spent: number, species = ''): string {
  const m = load.morph
  const morph = m
    ? [m.branch, m.skin, m.head, m.horn, m.hornLv, m.sideFin, m.bellyFin, m.dorsal, m.rear, m.extraRear, m.tail, m.limb, m.armor, m.lungs].join('|')
    : ''
  return JSON.stringify({ ...load, morph, tier: tierOf(spent), bucket: Math.floor(spent / 1000), species })
}

export function poseCreature(g: THREE.Group, time: number, moving: boolean, bite: number, facing: number): void {
  const baseY = (g.userData.baseY as number) ?? g.position.y
  g.userData.baseY = baseY
  const land = g.getObjectByName('neck')
  const walk = !!g.userData.landWalk
  g.position.y = baseY + (walk ? (moving ? Math.abs(Math.sin(time * 9)) * 0.06 : 0.02) : moving ? Math.sin(time * 6) * 0.04 : Math.sin(time * 1.4) * 0.015)
  if (walk) g.rotation.x = moving ? 0.12 : 0.08
  const yaw = (g.userData.yaw as number | undefined) ?? (facing > 0 ? 0 : Math.PI)
  g.rotation.y = -yaw
  const prev = (g.userData.prevYaw as number | undefined) ?? yaw
  let turn = yaw - prev
  while (turn > Math.PI) turn -= Math.PI * 2
  while (turn < -Math.PI) turn += Math.PI * 2
  g.userData.prevYaw = yaw
  const bank = Math.max(-0.45, Math.min(0.45, -turn * 3))
  const wave = Math.sin(time * (moving ? 8 : 2.2))
  g.rotation.z = (!land ? wave * (moving ? 0.05 : 0.015) : 0) + bank
  g.traverse((obj) => {
    const swimU = (obj as THREE.Mesh).userData?.swim as { uTime: { value: number }; uAmp: { value: number }; uFreq: { value: number } } | undefined
    if (!swimU) return
    swimU.uTime.value = time
    swimU.uAmp.value = moving ? 0.2 : 0.045
    swimU.uFreq.value = moving ? 8 : 2.2
  })
  const tail = g.getObjectByName('tail')
  if (tail) {
    const beat = Math.sin(time * (moving ? 7.5 : 2.1) - 0.9)
    tail.rotation.y = beat * (moving ? 0.62 : 0.16)
    tail.rotation.z = beat * (land ? 0.08 : moving ? 0.22 : 0.06)
  }
  g.traverse((obj) => {
    if (obj.name !== 'gill') return
    const pulse = 0.75 + Math.sin(time * 3.2 + obj.position.x * 6) * 0.28
    obj.scale.y = pulse
  })
  const jaw = g.getObjectByName('jaw')
  if (jaw) jaw.rotation.z = bite > 0 ? -0.45 : Math.sin(time * 1.6) * 0.03
  const finL = g.getObjectByName('finL')
  const finR = g.getObjectByName('finR')
  const flutter = moving ? 0.1 : 0.28
  if (finL) finL.rotation.z = ((finL.userData.baseZ as number) ?? 0.35) + Math.sin(time * (moving ? 6 : 3)) * flutter
  if (finR) finR.rotation.z = ((finR.userData.baseZ as number) ?? -0.35) - Math.sin(time * (moving ? 6 : 3)) * flutter
  g.traverse((obj) => {
    if (obj.name.startsWith('leg')) {
      const n = Number(obj.name.slice(3))
      obj.rotation.z = moving ? Math.sin(time * 8 + n) * 0.45 : 0
    } else if (obj.name.startsWith('knee')) {
      const n = Number(obj.name.slice(4))
      const step = moving ? Math.sin(time * 8 + n) : 0
      obj.rotation.z = -0.4 - Math.max(0, step) * 0.35
    } else if (obj.name.startsWith('wing')) {
      const flap = Math.sin(time * (moving ? 9 : 2.5))
      obj.rotation.x = obj.name.endsWith('r') ? -0.35 - flap * 0.45 : 0.35 + flap * 0.45
    } else if (obj.name.startsWith('arm')) {
      const n = Number(obj.name.slice(3))
      if (g.userData.landWalk) {
        const stride = moving ? Math.sin(time * 9 + n * 0.8) : Math.sin(time * 1.2 + n) * 0.08
        obj.rotation.z = 0.55 + stride * 0.55
        obj.rotation.x = stride * 0.25
      } else {
        obj.rotation.z = moving ? Math.sin(time * 7 + n) * 0.25 : Math.sin(time * 1.4 + n) * 0.05
      }
    }
  })
}
