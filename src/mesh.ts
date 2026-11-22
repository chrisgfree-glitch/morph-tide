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

const GEO = {
  trunk: profile(1.7, 0.26, 'fish'),
  torso: profile(1.15, 0.24, 'land'),
  tail: profile(0.7, 0.16, 'tail'),
  skull: profile(0.55, 0.16, 'skull'),
  neck: new THREE.CapsuleGeometry(0.07, 0.16, 2, 6),
  upper: new THREE.CapsuleGeometry(0.055, 0.2, 2, 6),
  lower: new THREE.CapsuleGeometry(0.045, 0.18, 2, 5),
  foot: new THREE.BoxGeometry(0.2, 0.06, 0.12),
  jaw: new THREE.BoxGeometry(1, 0.22, 0.55),
  tooth: new THREE.ConeGeometry(0.035, 0.11, 5),
  horn: new THREE.ConeGeometry(0.05, 0.26, 6),
  fin: finShape(),
  caudal: caudalShape(),
  gill: new THREE.BoxGeometry(0.012, 0.16, 0.05),
  plate: new THREE.BoxGeometry(0.22, 0.05, 0.28),
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

function mat(color: number, rough: number, metal: number, skin: 'scale' | 'hide'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    bumpMap: BUMP[skin],
    bumpScale: skin === 'scale' ? 0.035 : 0.02,
  })
}

function shift(hex: number, salt: number): number {
  const c = new THREE.Color(hex)
  const n = ((salt % 7) - 3) / 7
  c.offsetHSL(n * 0.02, -0.06, n * 0.03)
  return c.getHex()
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

export function buildCreature(load: Loadout, spent: number, role: 'player' | 'npc' | 'boss'): THREE.Group {
  const g = new THREE.Group()
  const salt = hash(`${load.jaw}|${load.teeth}|${load.horn}|${load.color}|${role}`)
  const body = shift(COLORS[load.color % COLORS.length] ?? 0x6e8e86, salt)
  const accent = shift(ACCENTS[load.accent % ACCENTS.length] ?? 0xd4c4a4, salt + 2)
  const belly = new THREE.Color(body).lerp(new THREE.Color(0xe6d8c4), 0.35).getHex()
  const jaw = jawById(load.jaw) ?? jawById('nip')!
  const teeth = teethById(load.teeth) ?? teethById('peg')!
  const horn = hornById(load.horn)
  const feet = feetById(load.feet)
  const style = styleById(load.wingStyle)
  const arm = armById(load.armType)
  const land = load.legs > 0
  const skin: 'scale' | 'hide' = land && load.lungs > 0 ? 'hide' : 'scale'
  const scale = 0.9 + load.size * 0.4 + (role === 'boss' ? 1.35 : 0) + Math.min(0.35, spent / 500)
  g.scale.setScalar(scale)

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
    const spike = part(g, GEO.horn, headX - 0.05, headY + 0.2, 0, 1, 0.7 + (horn.bite ?? 1) * 0.15, 1, accent, '', 0.5, 0.12, 'hide', false)
    spike.rotation.z = -0.4
  }
  if (!land || load.lungs < 1) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const slit = part(g, GEO.gill, 0.28 - i * 0.045, 0.0, s * 0.16, 1, 0.7, 1, 0x3a4038, '', 0.7, 0.02, skin, false)
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
    }
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
  if (load.armor > 0) {
    for (let i = 0; i < load.armor + 1; i++) {
      part(g, GEO.plate, -0.15 + i * 0.2, 0.2, 0, 1, 1, 1, accent, '', 0.55, 0.1, skin, false)
    }
  }

  const hp = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.06), new THREE.MeshBasicMaterial({ color: 0x8f4d48 }))
  hp.position.set(0.1, 0.55, 0)
  hp.name = 'hp'
  g.add(hp)
  g.userData.hp = hp
  return g
}

export function creatureKey(load: Loadout, spent: number): string {
  return JSON.stringify({ ...load, spent: Math.floor(spent / 40) })
}

export function poseCreature(g: THREE.Group, time: number, moving: boolean, bite: number, facing: number): void {
  const baseY = (g.userData.baseY as number) ?? g.position.y
  g.userData.baseY = baseY
  const land = g.getObjectByName('neck')
  g.position.y = baseY + (moving ? Math.sin(time * 6) * 0.04 : Math.sin(time * 1.4) * 0.015)
  g.rotation.y = facing > 0 ? 0 : Math.PI
  g.rotation.z = moving && !land ? Math.sin(time * 5) * 0.05 : 0
  const tail = g.getObjectByName('tail')
  if (tail) {
    const beat = Math.sin(time * (moving ? 9 : 2.2))
    tail.rotation.y = beat * (moving ? 0.55 : 0.12)
    tail.rotation.z = land ? beat * 0.08 : 0
  }
  const jaw = g.getObjectByName('jaw')
  if (jaw) jaw.rotation.z = bite > 0 ? -0.45 : Math.sin(time * 1.6) * 0.03
  const finL = g.getObjectByName('finL')
  const finR = g.getObjectByName('finR')
  if (finL) finL.rotation.z = 0.35 + Math.sin(time * 4) * 0.15
  if (finR) finR.rotation.z = -0.35 - Math.sin(time * 4) * 0.15
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
      obj.rotation.z = moving ? Math.sin(time * 7 + n) * 0.25 : Math.sin(time * 1.4 + n) * 0.05
    }
  })
}
