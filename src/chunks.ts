import * as THREE from 'three'
import { CHUNK, WORLD_Z, dirtyChunks, groundAt } from '../shared/terrain'

/** Smooth heightfield for one chunk. Digs and caves change the surface through groundAt. */
export function meshChunk(cx: number, cz: number, cells: number): THREE.BufferGeometry | null {
  const ox = cx * CHUNK
  const oz = cz * CHUNK
  const n = Math.max(4, cells)
  const positions: number[] = []
  const indices: number[] = []
  const row = n + 1
  for (let iz = 0; iz <= n; iz++) {
    for (let ix = 0; ix <= n; ix++) {
      const x = ox + (ix / n) * CHUNK
      const z = oz + (iz / n) * CHUNK
      const y = groundAt(x, z, 8)
      positions.push(x, y, z)
    }
  }
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const a = iz * row + ix
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1)
    }
  }
  if (positions.length < 9) return null
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export class ChunkWorld {
  group = new THREE.Group()
  private chunks = new Map<string, THREE.Mesh>()
  private plants: THREE.InstancedMesh | null = null
  material: THREE.Material
  private px = 999
  private pz = 999
  quality: 'high' | 'mid' | 'low'

  constructor(quality: 'high' | 'mid' | 'low') {
    this.quality = quality
    this.material = new THREE.MeshStandardMaterial({ color: 0x7d8a6a, roughness: 0.92, metalness: 0.02 })
  }

  setMaterial(mat: THREE.Material): void {
    this.material = mat
    for (const mesh of this.chunks.values()) mesh.material = mat
  }

  update(x: number, z: number): void {
    const cx = Math.floor(x / CHUNK)
    const cz = Math.floor(z / CHUNK)
    const moved = cx !== this.px || cz !== this.pz
    if (!moved && dirtyChunks.size === 0) return
    const radius = this.quality === 'high' ? 2 : 1
    const keep = new Set<string>()
    for (let ix = cx - radius; ix <= cx + radius; ix++) {
      for (let iz = cz - radius; iz <= cz + radius; iz++) {
        if (ix < -1 || ix > 18 || Math.abs(iz * CHUNK) > WORLD_Z + CHUNK) continue
        const id = `${ix}|${iz}`
        keep.add(id)
        const dist = Math.abs(ix - cx) + Math.abs(iz - cz)
        const cells = this.quality === 'low' || dist > 1 ? 5 : this.quality === 'mid' || dist > 0 ? 7 : 9
        if (!this.chunks.has(id) || dirtyChunks.has(id)) {
          const old = this.chunks.get(id)
          old?.geometry.dispose()
          old?.removeFromParent()
          const geo = meshChunk(ix, iz, cells)
          if (!geo) {
            this.chunks.delete(id)
            continue
          }
          const mesh = new THREE.Mesh(geo, this.material)
          mesh.castShadow = this.quality !== 'low' && dist === 0
          mesh.receiveShadow = true
          this.group.add(mesh)
          this.chunks.set(id, mesh)
        }
      }
    }
    for (const [id, mesh] of this.chunks) {
      if (!keep.has(id)) {
        mesh.geometry.dispose()
        mesh.removeFromParent()
        this.chunks.delete(id)
      }
    }
    dirtyChunks.clear()
    if (moved) this.plant(cx, cz)
    this.px = cx
    this.pz = cz
  }

  private rocks: THREE.InstancedMesh[] = []
  private sway = { value: 0 }

  tick(time: number): void {
    this.sway.value = time
  }

  private plant(cx: number, cz: number): void {
    this.plants?.geometry.dispose()
    this.plants?.removeFromParent()
    for (const rock of this.rocks) rock.removeFromParent()
    this.rocks = []
    this.scatterRocks(cx, cz)
    this.scatterGrass(cx, cz)
  }

  private rockMat = rockMaterial()
  private rockGeos = [0, 1, 2].map((seed) => rockGeo(seed))

  private scatterRocks(cx: number, cz: number): void {
    const mat = this.rockMat
    const geos = this.rockGeos
    const each = this.quality === 'high' ? 10 : this.quality === 'mid' ? 6 : 4
    const dummy = new THREE.Object3D()
    const algae = new THREE.Color()
    geos.forEach((geo, seed) => {
      const mesh = new THREE.InstancedMesh(geo, mat, each)
      let n = 0
      for (let i = 0; i < each; i++) {
        const x = cx * CHUNK + ((i * 19 + seed * 7) % CHUNK) - CHUNK * 0.2
        const z = cz * CHUNK + ((i * 13 + seed * 11) % CHUNK) - CHUNK * 0.3
        const y = groundAt(x, z, 6)
        const s = 0.45 + ((i * 3 + seed) % 5) * 0.22
        dummy.position.set(x, y - s * 0.22, z)
        dummy.rotation.set(0.05 * seed, i * 1.7, 0.08 * (i % 3))
        dummy.scale.set(s * (0.8 + (i % 3) * 0.15), s * (0.45 + (seed % 2) * 0.15), s * (0.7 + (i % 2) * 0.2))
        dummy.updateMatrix()
        mesh.setMatrixAt(n, dummy.matrix)
        const wet = x < 72 ? 0.35 : 0.05
        algae.setRGB(0.45 - wet * 0.1, 0.48 + wet * 0.15, 0.4)
        mesh.setColorAt(n, algae)
        n++
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      this.group.add(mesh)
      this.rocks.push(mesh)
    })
  }

  private scatterGrass(cx: number, cz: number): void {
    const patches = this.quality === 'high' ? 10 : this.quality === 'mid' ? 6 : 4
    const per = this.quality === 'high' ? 9 : this.quality === 'mid' ? 6 : 5
    const geo = bladeGeo()
    const mat = new THREE.MeshStandardMaterial({ color: 0x6d8a58, roughness: 0.72, side: THREE.DoubleSide })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.sway
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `float swayH = position.y;
           vec3 transformed = vec3(position);
           float id = float(gl_InstanceID);
           float wave = sin(uTime * 1.15 + id * 0.65 + transformed.x * 0.4);
           transformed.x += wave * swayH * swayH * 0.55;
           transformed.z += cos(uTime * 0.85 + id * 0.4) * swayH * swayH * 0.28;
          `,
        )
    }
    const mesh = new THREE.InstancedMesh(geo, mat, patches * per)
    const dummy = new THREE.Object3D()
    const tint = new THREE.Color()
    let n = 0
    for (let p = 0; p < patches; p++) {
      const px = cx * CHUNK + ((p * 23) % (CHUNK * 2)) - CHUNK * 0.4
      const pz = cz * CHUNK + ((p * 17) % (CHUNK * 2)) - CHUNK * 0.5
      const sea = px < 74
      for (let i = 0; i < per; i++) {
        const x = px + ((i * 5) % 7) - 3
        const z = pz + ((i * 3) % 5) - 2
        const y = groundAt(x, z, 6)
        const h = (sea ? 0.9 : 0.45) + (i % 4) * 0.18
        dummy.position.set(x, y, z)
        dummy.rotation.y = i * 0.9
        dummy.scale.set(0.7 + (i % 3) * 0.15, h, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(n, dummy.matrix)
        tint.set(sea ? 0x4f7a48 : 0x6a8a46).offsetHSL(0, 0, ((i % 5) - 2) * 0.03)
        mesh.setColorAt(n, tint)
        n++
      }
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    this.group.add(mesh)
    this.plants = mesh
  }
}

function rockMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0x8d877c, roughness: 0.9, metalness: 0.03 })
  const loader = new THREE.TextureLoader()
  ;(['rock_color', 'rock_normal', 'rock_rough'] as const).forEach((name, i) => {
    loader.load(`/textures/${name}.webp`, (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
      tex.generateMipmaps = true
      tex.anisotropy = 4
      if (i === 0) mat.map = tex
      else if (i === 1) mat.normalMap = tex
      else mat.roughnessMap = tex
      mat.needsUpdate = true
    })
  })
  return mat
}

function rockGeo(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = hash(x * 3.1 + seed, y * 2.7, z * 3.4)
    const r = 0.82 + n * 0.55
    let ny = y * r
    if (ny < -0.12) ny = -0.12
    pos.setXYZ(i, x * r * (0.9 + seed * 0.08), ny * (0.62 + seed * 0.06), z * r * (0.85 + (seed % 2) * 0.1))
  }
  geo.computeVertexNormals()
  return geo
}

function bladeGeo(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.16, 1, 1, 4)
  geo.translate(0, 0.5, 0)
  return geo
}

function hash(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}
