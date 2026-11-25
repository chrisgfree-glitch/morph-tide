/** Standalone concept preview. Not imported by the shipped game. */
import * as THREE from 'three'
import { starterLoad } from '../shared/catalog'
import { buildCreature, poseCreature } from '../src/mesh'

function scaleTexture(tint: THREE.Color): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#e8f0ee'
  g.fillRect(0, 0, 256, 256)
  const fill = `rgb(${Math.round(tint.r * 210 + 30)}, ${Math.round(tint.g * 200 + 35)}, ${Math.round(tint.b * 190 + 40)})`
  const line = `rgb(${Math.round(tint.r * 70)}, ${Math.round(tint.g * 90)}, ${Math.round(tint.b * 85)})`
  for (let row = -1; row < 18; row++) {
    const y = row * 16 + 8
    const odd = row % 2 ? 10 : 0
    for (let col = -1; col < 16; col++) {
      const x = col * 18 + odd
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + 9, y + 16, x + 18, y)
      g.lineTo(x + 16, y - 2)
      g.quadraticCurveTo(x + 9, y + 11, x + 2, y - 2)
      g.closePath()
      g.fillStyle = fill
      g.fill()
      g.strokeStyle = line
      g.lineWidth = 1.6
      g.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2.4, 1.5)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function toonMat(color: number, map?: THREE.Texture, vertexColors = false): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, map, vertexColors })
}

function shadeBody(geo: THREE.BufferGeometry, back: number, belly: number): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const col = new Float32Array(pos.count * 3)
  const a = new THREE.Color(back)
  const b = new THREE.Color(belly)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const t = THREE.MathUtils.clamp((y + 0.22) / 0.44, 0, 1)
    const c = a.clone().lerp(b, 1 - t)
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.computeVertexNormals()
}

function latheBody(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 36; i++) {
    const t = i / 36
    // Streamlined: blunt nose, full mid, taper to a wrist before the tail
    const nose = 1 - Math.exp(-t * 9)
    const mid = Math.sin(Math.PI * Math.pow(Math.min(t, 0.98), 0.72))
    const tail = t > 0.72 ? Math.pow(1 - (t - 0.72) / 0.28, 1.15) : 1
    const r = 0.035 + 0.22 * nose * mid * tail
    pts.push(new THREE.Vector2(r, (t - 0.52) * 1.7))
  }
  const geo = new THREE.LatheGeometry(pts, 28)
  geo.rotateZ(-Math.PI / 2)
  shadeBody(geo, 0x2f6a5a, 0xd8efe4)
  return geo
}

function fin(shape: 'dorsal' | 'pectoral' | 'anal' | 'caudal' | 'pelvic'): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  let verts: number[]
  if (shape === 'caudal') {
    verts = [
      0, 0, 0, -0.42, 0.32, 0, -0.18, 0.02, 0,
      0, 0, 0, -0.18, -0.02, 0, -0.42, -0.3, 0,
      0, 0, 0, -0.18, 0.02, 0, -0.18, -0.02, 0,
    ]
  } else if (shape === 'dorsal') {
    verts = [0, 0, 0, -0.28, 0.02, 0, -0.08, 0.28, 0, 0, 0, 0, -0.36, 0.0, 0, -0.28, 0.02, 0]
  } else if (shape === 'anal') {
    verts = [0, 0, 0, -0.22, 0, 0, -0.06, -0.16, 0]
  } else if (shape === 'pelvic') {
    verts = [0, 0, 0, -0.12, -0.02, 0, -0.02, -0.12, 0.04]
  } else {
    verts = [0, 0, 0, -0.16, 0.02, 0.02, -0.02, -0.1, 0.2]
  }
  const pos = new Float32Array(verts)
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

export function buildConceptFish(skin = 0x3fae8c, flap = 0.22): THREE.Group {
  const g = new THREE.Group()
  g.name = 'concept-fish'
  const tint = new THREE.Color(skin)
  const scales = scaleTexture(tint)
  const bodyMat = new THREE.MeshToonMaterial({ color: skin, map: scales, vertexColors: true })
  const body = new THREE.Mesh(latheBody(), bodyMat)
  body.name = 'body'
  g.add(body)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), toonMat(skin))
  head.position.set(0.62, 0.01, 0)
  head.scale.set(1.15, 0.92, 0.95)
  g.add(head)

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16, Math.PI), toonMat(0x5a3040))
  mouth.position.set(0.78, -0.04, 0)
  mouth.rotation.set(0, Math.PI / 2, -0.4)
  g.add(mouth)

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), toonMat(0xf4f0e6))
    eye.position.set(0.66, 0.06, s * 0.13)
    g.add(eye)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), toonMat(0x1a221c))
    pupil.position.set(0.69, 0.06, s * 0.148)
    g.add(pupil)
    // Operculum plate + gill slits behind the eye
    const oper = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10, 0, Math.PI * 0.7, 0.2, 1.4), toonMat(new THREE.Color(skin).multiplyScalar(0.85).getHex()))
    oper.position.set(0.48, 0.0, s * 0.1)
    oper.rotation.set(s * 0.15, s * (1.15 + flap * 0.7), s * 0.1)
    oper.scale.set(0.85, 0.95, 0.55 + flap * 0.15)
    oper.name = s > 0 ? 'operculumR' : 'operculumL'
    g.add(oper)
    for (let i = 0; i < 4; i++) {
      const slit = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.07, 4, 6), toonMat(0x1c3a32))
      slit.position.set(0.5 - i * 0.025, 0.01, s * (0.155 + i * 0.004))
      slit.rotation.set(0.2, s * 0.3, 0.5)
      slit.scale.set(1, 1 + i * 0.08, 1)
      g.add(slit)
    }
  }

  const finMat = new THREE.MeshToonMaterial({ color: new THREE.Color(skin).offsetHSL(0, -0.05, -0.08).getHex(), transparent: true, opacity: 0.92, side: THREE.DoubleSide })
  const dorsal = new THREE.Mesh(fin('dorsal'), finMat)
  dorsal.position.set(0.05, 0.2, 0)
  g.add(dorsal)
  const anal = new THREE.Mesh(fin('anal'), finMat)
  anal.position.set(-0.15, -0.16, 0)
  g.add(anal)
  const caudal = new THREE.Mesh(fin('caudal'), finMat)
  caudal.position.set(-0.78, 0, 0)
  caudal.name = 'caudal'
  g.add(caudal)
  for (const s of [-1, 1]) {
    const pec = new THREE.Mesh(fin('pectoral'), finMat)
    pec.position.set(0.32, -0.04, s * 0.12)
    pec.rotation.set(s * 0.15, s * 0.55, s * 0.4)
    pec.name = s > 0 ? 'pecR' : 'pecL'
    g.add(pec)
    const pel = new THREE.Mesh(fin('pelvic'), finMat)
    pel.position.set(0.02, -0.14, s * 0.06)
    pel.rotation.set(s * 0.2, s * 0.2, 0)
    g.add(pel)
  }

  // Mid-wave pose so the stills show the side-to-side swim
  caudal.rotation.y = 0.45
  body.rotation.y = 0.08
  g.userData.flap = flap
  return g
}

function animateConcept(g: THREE.Group, time: number): void {
  const wave = Math.sin(time * 3.2)
  const tail = g.getObjectByName('caudal')
  if (tail) tail.rotation.y = wave * 0.55
  g.rotation.y = wave * 0.08
  const flap = 0.14 + Math.sin(time * 2.4) * 0.12
  for (const name of ['operculumL', 'operculumR']) {
    const op = g.getObjectByName(name)
    if (!op) continue
    op.rotation.y = (name === 'operculumR' ? 1 : -1) * (1.15 + flap * 0.7)
  }
}

export async function renderConceptShots(outDir: string): Promise<string[]> {
  const w = 1280
  const h = 720
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(1)
  renderer.setClearColor(0x8fd4d6, 1)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x8fd4d6, 6, 16)
  const cam = new THREE.PerspectiveCamera(32, w / h, 0.1, 40)
  scene.add(new THREE.HemisphereLight(0xd8f4f6, 0x3a6a68, 1.1))
  const key = new THREE.DirectionalLight(0xfff4e0, 1.15)
  key.position.set(3, 4, 5)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xa8d8e8, 0.45)
  fill.position.set(-4, 1, -2)
  scene.add(fill)

  const current = buildCreature(starterLoad(), 0, 'player')
  current.userData.baseY = 0
  poseCreature(current, 0.8, true, 0, 1)
  const concept = buildConceptFish(0x3fae8c, 0.28)
  animateConcept(concept, 0.55)

  const saved: string[] = []
  const shot = (name: string) => {
    void outDir
    renderer.render(scene, cam)
    const data = renderer.domElement.toDataURL('image/png')
    const slot = window as unknown as { __shots?: Record<string, string> }
    slot.__shots = { ...(slot.__shots ?? {}), [name]: data }
    saved.push(name)
  }

  const show = (obj: THREE.Object3D, on: boolean) => {
    obj.visible = on
  }

  scene.add(concept)
  // side
  cam.position.set(0.1, 0.15, 3.1)
  cam.lookAt(0.05, 0.02, 0)
  shot('fish-concept-side.png')
  // 3/4
  cam.position.set(1.7, 0.55, 2.5)
  cam.lookAt(0.05, 0.0, 0)
  shot('fish-concept-three-quarter.png')
  // top
  cam.position.set(0.1, 3.15, 0.15)
  cam.up.set(0, 0, -1)
  cam.lookAt(0.05, 0, 0)
  shot('fish-concept-top.png')
  cam.up.set(0, 1, 0)

  // side by side with current
  show(concept, true)
  scene.add(current)
  concept.position.set(0.85, 0, 0)
  current.position.set(-0.95, 0, 0)
  current.rotation.y = 0
  cam.position.set(0.0, 0.2, 3.6)
  cam.lookAt(0, 0.0, 0)
  shot('fish-concept-compare.png')

  return saved
}

;(window as unknown as { renderConceptShots: typeof renderConceptShots }).renderConceptShots = renderConceptShots
