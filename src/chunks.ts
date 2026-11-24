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
  private kelp: THREE.InstancedMesh[] = []
  private sway = { value: 0 }

  tick(time: number): void {
    this.sway.value = time
  }

  replant(): void {
    this.plant(this.px, this.pz)
  }

  private plant(cx: number, cz: number): void {
    this.plants?.geometry.dispose()
    this.plants?.removeFromParent()
    for (const rock of this.rocks) rock.removeFromParent()
    this.rocks = []
    for (const blade of this.kelp) blade.removeFromParent()
    this.kelp = []
    this.scatterRocks(cx, cz)
    this.scatterKelp(cx, cz)
    this.scatterGrass(cx, cz)
  }

  private rockMat = rockMaterial()
  private rockGeos = [0, 1, 2, 3, 4].map((seed) => rockGeo(seed))
  private kelpGeos = [0, 1, 2].map((kind) => kelpBlade(kind))

  private scatterRocks(cx: number, cz: number): void {
    const mat = this.rockMat
    const geos = this.rockGeos
    const clusters = this.quality === 'high' ? 7 : this.quality === 'mid' ? 5 : 3
    const per = this.quality === 'high' ? 5 : this.quality === 'mid' ? 4 : 3
    const cap = clusters * per
    const dummy = new THREE.Object3D()
    const moss = new THREE.Color()
    const buckets: { mesh: THREE.InstancedMesh; n: number }[] = geos.map((geo) => ({
      mesh: new THREE.InstancedMesh(geo, mat, cap),
      n: 0,
    }))
    for (let c = 0; c < clusters; c++) {
      let px = cx * CHUNK + ((c * 29 + 8) % CHUNK) - CHUNK * 0.15
      let pz = cz * CHUNK + ((c * 17 + 5) % CHUNK) - CHUNK * 0.2
      if (cx === 0 && cz === 0 && c === 0) { px = 8.2; pz = 1.4 }
      if (cx === 0 && cz === 0 && c === 1) { px = 11.5; pz = -2.1 }
      if (cx === 0 && cz === 0 && c === 2) { px = 5.6; pz = -1.2 }
      const members = 2 + ((c + (px < 72 ? 2 : 0)) % (per - 1))
      for (let i = 0; i < members; i++) {
        const seed = (c * 3 + i) % geos.length
        const bucket = buckets[seed]!
        const x = px + ((i * 1.15 + c * 0.4) % 3.2) - 1.4
        const z = pz + ((i * 0.9 + c * 0.55) % 2.6) - 1.1
        const y = groundAt(x, z, 6)
        const s = (cx === 0 && cz === 0 && c < 3 ? 0.7 : 0.42) + ((c * 5 + i * 3) % 7) * 0.2
        dummy.position.set(x, y - s * 0.2, z)
        dummy.rotation.set(0.12 * ((i % 5) - 2), c * 1.17 + i * 0.83, 0.16 * ((i % 4) - 1.5))
        dummy.scale.set(
          s * (0.7 + (i % 4) * 0.14),
          s * (0.38 + (seed % 3) * 0.18 + (i % 2) * 0.08),
          s * (0.62 + (i % 3) * 0.16),
        )
        dummy.updateMatrix()
        bucket.mesh.setMatrixAt(bucket.n, dummy.matrix)
        const wet = x < 72 ? 1 : 0
        const tone = (c * 7 + i * 13) % 5
        if (tone === 0) moss.setRGB(0.32 + wet * 0.04, 0.48 + wet * 0.12, 0.3)
        else if (tone === 1) moss.setRGB(0.4, 0.52 + wet * 0.1, 0.34)
        else if (tone === 2) moss.setRGB(0.48, 0.44, 0.36)
        else if (tone === 3) moss.setRGB(0.3 + wet * 0.05, 0.42, 0.38)
        else moss.setRGB(0.5, 0.46, 0.4)
        moss.offsetHSL(0, 0, ((i % 5) - 2) * 0.03)
        bucket.mesh.setColorAt(bucket.n, moss)
        bucket.n++
      }
    }
    for (const bucket of buckets) {
      if (!bucket.n) continue
      bucket.mesh.count = bucket.n
      bucket.mesh.instanceMatrix.needsUpdate = true
      if (bucket.mesh.instanceColor) bucket.mesh.instanceColor.needsUpdate = true
      bucket.mesh.frustumCulled = true
      this.group.add(bucket.mesh)
      this.rocks.push(bucket.mesh)
    }
  }

  private scatterKelp(cx: number, cz: number): void {
    const patches = this.quality === 'high' ? 8 : this.quality === 'mid' ? 5 : 3
    const per = this.quality === 'high' ? 7 : this.quality === 'mid' ? 5 : 4
    const dummy = new THREE.Object3D()
    const tint = new THREE.Color()
    this.kelpGeos.forEach((geo, kind) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4aae78,
        roughness: 0.48 + kind * 0.06,
        metalness: 0.0,
        emissive: 0x163a28,
        emissiveIntensity: 0.28,
        side: THREE.DoubleSide,
      })
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.sway
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace(
            '#include <begin_vertex>',
            `float swayH = position.y;
             vec3 transformed = vec3(position);
             float id = float(gl_InstanceID);
             float wave = sin(uTime * 0.85 + id * 0.47 + transformed.x * 0.8);
             float roll = cos(uTime * 0.62 + id * 0.33);
             transformed.x += wave * swayH * swayH * (0.7 + float(${kind}) * 0.12);
             transformed.z += roll * swayH * swayH * 0.4;
            `,
          )
      }
      const mesh = new THREE.InstancedMesh(geo, mat, patches * per)
      let n = 0
      for (let p = 0; p < patches; p++) {
        const px = cx * CHUNK + ((p * 21 + kind * 9) % (CHUNK * 2)) - CHUNK * 0.35
        const pz = cz * CHUNK + ((p * 13 + kind * 6) % (CHUNK * 2)) - CHUNK * 0.4
        if (px > 70) continue
        for (let i = 0; i < per; i++) {
          if ((i + kind) % 3 !== kind % 3 && this.quality === 'low' && i > 1) continue
          const x = px + ((i * 7 + kind * 3) % 9) * 0.45 - 1.8
          const z = pz + ((i * 5 + kind * 2) % 7) * 0.4 - 1.2
          if (x > 70) continue
          const y = groundAt(x, z, 6)
          const h = (this.quality === 'low' ? 1.15 : 1.45) + (i % 5) * 0.28 + kind * 0.18
          dummy.position.set(x, y, z)
          dummy.rotation.y = i * 0.73 + kind * 0.4
          dummy.scale.set(0.85 + (i % 3) * 0.2, h, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(n, dummy.matrix)
          const pal = [0x3aa872, 0x4cb878, 0x2e9a8a, 0x58c46a, 0x349878]
          tint.set(pal[(p + i + kind) % pal.length]!).offsetHSL(0, 0, ((i % 5) - 2) * 0.035)
          mesh.setColorAt(n, tint)
          n++
        }
      }
      if (!n) {
        mat.dispose()
        return
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.frustumCulled = true
      this.group.add(mesh)
      this.kelp.push(mesh)
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
      if (sea) continue
      for (let i = 0; i < per; i++) {
        const x = px + ((i * 5) % 7) - 3
        const z = pz + ((i * 3) % 5) - 2
        const y = groundAt(x, z, 6)
        const h = 0.45 + (i % 4) * 0.18
        dummy.position.set(x, y, z)
        dummy.rotation.y = i * 0.9
        dummy.scale.set(0.7 + (i % 3) * 0.15, h, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(n, dummy.matrix)
        tint.set(0x6a8a46).offsetHSL(0, 0, ((i % 5) - 2) * 0.03)
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
  const mat = new THREE.MeshStandardMaterial({ color: 0x7d8a72, roughness: 0.86, metalness: 0.02 })
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
  const geo = new THREE.IcosahedronGeometry(1, seed % 2 === 0 ? 1 : 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const squat = seed === 2 || seed === 4
  const tall = seed === 1
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = hash(x * 3.1 + seed, y * 2.7, z * 3.4)
    const k = hash(z * 2.2, x * 4.1 + seed, y * 1.7)
    const r = 0.72 + n * 0.62 + k * 0.12
    let ny = y * r
    if (ny < -0.12) ny = -0.12
    const sx = squat ? 1.05 : 0.86 + seed * 0.05
    const sy = tall ? 0.86 : squat ? 0.42 : 0.56 + (seed % 3) * 0.08
    const sz = 0.78 + (seed % 3) * 0.08 + k * 0.1
    pos.setXYZ(i, x * r * sx, ny * sy, z * r * sz)
  }
  geo.computeVertexNormals()
  return geo
}

function kelpBlade(kind: number): THREE.BufferGeometry {
  const w = kind === 0 ? 0.16 : kind === 1 ? 0.3 : 0.2
  const ribbon = (yaw: number) => {
    const geo = new THREE.PlaneGeometry(w, 1, 1, 6)
    geo.translate(0, 0.5, 0)
    geo.rotateY(yaw)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const wave = Math.sin(y * 6.2 + kind) * 0.045 * y
      const taper = kind === 1 ? 1 - y * 0.18 : kind === 2 ? 1 - y * 0.52 : 1 - y * 0.28
      const nx = x * (yaw === 0 ? taper : 1) + (yaw === 0 ? wave : 0)
      const nz = z * (yaw === 0 ? 1 : taper) + (yaw === 0 ? 0 : wave)
      let ox = nx
      if (kind === 2 && y > 0.55 && yaw === 0) ox += (x >= 0 ? 0.09 : -0.09) * (y - 0.55) * 3
      pos.setXYZ(i, ox, y, nz)
    }
    return geo
  }
  const a = ribbon(0)
  const b = ribbon(Math.PI / 2)
  const geo = a
  const posA = a.getAttribute('position') as THREE.BufferAttribute
  const posB = b.getAttribute('position') as THREE.BufferAttribute
  const merged = new Float32Array(posA.array.length + posB.array.length)
  merged.set(posA.array, 0)
  merged.set(posB.array, posA.array.length)
  const idxA = a.getIndex()!.array
  const idxB = b.getIndex()!.array
  const index = new Uint16Array(idxA.length + idxB.length)
  index.set(idxA, 0)
  for (let i = 0; i < idxB.length; i++) index[idxA.length + i] = idxB[i]! + posA.count
  geo.setAttribute('position', new THREE.BufferAttribute(merged, 3))
  geo.setIndex(new THREE.BufferAttribute(index, 1))
  b.dispose()
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
