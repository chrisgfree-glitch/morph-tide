import * as THREE from 'three'
import { WATER, WORLD_Z, terrainHeight } from '../shared/terrain'

export function buildTerrain(quality: 'high' | 'low'): THREE.Mesh {
  const segX = quality === 'high' ? 160 : 90
  const segZ = quality === 'high' ? 64 : 36
  const geo = new THREE.PlaneGeometry(220, WORLD_Z * 2, segX, segZ)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + 110
    const z = pos.getZ(i)
    pos.setY(i, terrainHeight(x, z))
    pos.setX(i, x)
  }
  geo.computeVertexNormals()
  const colors = new Float32Array(pos.count * 3)
  const tint = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i)
    const x = pos.getX(i)
    tint.set(x > 168 ? 0x6a4638 : h < 0.9 ? 0xb7a488 : h < 1.5 ? 0x6d8458 : 0x6e6862)
    colors[i * 3] = tint.r
    colors[i * 3 + 1] = tint.g
    colors[i * 3 + 2] = tint.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 }),
  )
  mesh.receiveShadow = true
  mesh.name = 'ground'
  return mesh
}

function triFn(name: string): string {
  return `
    vec3 tri_${name}(sampler2D tex, vec3 p, vec3 n, float sc) {
      vec3 w = abs(n);
      w /= w.x + w.y + w.z + 0.0001;
      return texture2D(tex, p.yz * sc).rgb * w.x
        + texture2D(tex, p.xz * sc).rgb * w.y
        + texture2D(tex, p.xy * sc).rgb * w.z;
    }
  `
}

function terrainMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSandC: { value: null }, uSandN: { value: null },
      uMudC: { value: null }, uMudN: { value: null },
      uGrassC: { value: null }, uGrassN: { value: null },
      uRockC: { value: null }, uRockN: { value: null },
      uLavaC: { value: null }, uLavaN: { value: null },
      uDetail: { value: null },
      uQuality: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec4 wpos = modelMatrix * vec4(position, 1.0);
        vWorld = wpos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wpos;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D uSandC; uniform sampler2D uSandN;
      uniform sampler2D uMudC; uniform sampler2D uMudN;
      uniform sampler2D uGrassC; uniform sampler2D uGrassN;
      uniform sampler2D uRockC; uniform sampler2D uRockN;
      uniform sampler2D uLavaC; uniform sampler2D uLavaN;
      uniform sampler2D uDetail;
      uniform float uQuality;
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      ${triFn('x')}
      void main() {
        vec3 n = normalize(vNormal);
        vec3 p = vWorld;
        float slope = 1.0 - clamp(n.y, 0.0, 1.0);
        float sc = 0.18;
        vec3 sand = tri_x(uSandC, p, n, sc);
        vec3 mud = tri_x(uMudC, p, n, sc);
        vec3 grass = tri_x(uGrassC, p, n, sc * 0.9);
        vec3 rock = tri_x(uRockC, p, n, sc * 0.7);
        vec3 lava = tri_x(uLavaC, p, n, sc * 0.6);
        float sandW = smoothstep(2.4, 0.35, vWorld.y) * (1.0 - smoothstep(70.0, 82.0, vWorld.x));
        float mudW = sandW * smoothstep(1.1, 0.15, vWorld.y);
        sandW *= 1.0 - mudW;
        float lavaW = smoothstep(162.0, 176.0, vWorld.x);
        float rockW = clamp(smoothstep(0.22, 0.72, slope) + lavaW * 0.35, 0.0, 1.0) * (1.0 - sandW * 0.85);
        float moss = tri_x(uDetail, p, n, sc * 1.4).g;
        float grassW = (1.0 - sandW - mudW) * (1.0 - lavaW);
        grassW *= 1.0 - rockW * 0.85;
        grass = mix(grass, grass * vec3(0.75, 0.95, 0.7), moss);
        float sum = sandW + mudW + grassW + rockW + lavaW + 0.0001;
        vec3 albedo = (sand * sandW + mud * mudW + grass * grassW + rock * rockW + lava * lavaW) / sum;
        vec3 nTex = tri_x(uSandN, p, n, sc) * sandW + tri_x(uMudN, p, n, sc) * mudW
          + tri_x(uGrassN, p, n, sc) * grassW + tri_x(uRockN, p, n, sc) * rockW
          + tri_x(uLavaN, p, n, sc) * lavaW;
        nTex = nTex / sum * 2.0 - 1.0;
        if (uQuality > 0.5) {
          vec3 detail = texture2D(uDetail, p.xz * 0.85).rgb * 2.0 - 1.0;
          float close = smoothstep(22.0, 5.0, length(cameraPosition - vWorld));
          nTex = mix(nTex, nTex + detail * 0.45, close);
        }
        vec3 worldN = normalize(n + nTex * 0.55);
        vec3 L = normalize(vec3(-0.45, 0.86, 0.25));
        float ndl = max(dot(worldN, L), 0.0);
        float cave = smoothstep(5.6, 0.4, vWorld.y) * (1.0 - smoothstep(70.0, 84.0, vWorld.x));
        float caust = pow(max(sin(vWorld.x * 0.85 + uTime * 1.3) * sin(vWorld.z * 0.62 - uTime), 0.0), 2.0);
        vec3 wet = vec3(0.32, 0.52, 0.5);
        albedo = mix(albedo, albedo * wet, cave * 0.82);
        vec3 ambient = albedo * mix(vec3(0.62, 0.64, 0.6), vec3(0.28, 0.48, 0.5), cave);
        vec3 lit = albedo * ndl * vec3(1.05, 0.95, 0.82);
        vec3 col = ambient + lit + vec3(0.65, 0.9, 0.8) * caust * cave * (uQuality > 0.5 ? 0.45 : 0.22);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

export function buildWater(time: { value: number }): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(86, WORLD_Z * 2, 48, 24)
  geo.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geo, waterMat(time))
  mesh.position.set(40, WATER, 0)
  mesh.name = 'water'
  return mesh
}

function waterMat(time: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { time, uQuality: { value: 1 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float time;
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.35 + time * 1.2) * 0.08 + sin(p.z * 0.55 + time * 0.8) * 0.05;
        p.y += w;
        vec4 wpos = modelMatrix * vec4(p, 1.0);
        vWorld = wpos.xyz;
        float dx = cos(p.x * 0.35 + time * 1.2) * 0.35 * 0.08;
        float dz = cos(p.z * 0.55 + time * 0.8) * 0.55 * 0.05;
        vNormal = normalize(vec3(-dx, 1.0, -dz));
        gl_Position = projectionMatrix * viewMatrix * wpos;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float time;
      uniform float uQuality;
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 n = normalize(vNormal);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 deep = vec3(0.08, 0.52, 0.56);
        vec3 shallow = vec3(0.22, 0.74, 0.72);
        float shore = smoothstep(20.0, 70.0, vWorld.x);
        vec3 refr = mix(deep, shallow, shore);
        vec3 sky = vec3(0.48, 0.88, 0.90);
        float below = step(cameraPosition.y, vWorld.y);
        vec3 ceilCol = vec3(0.30, 0.82, 0.84);
        vec3 col = mix(mix(refr, sky, fres * 0.48), mix(refr, ceilCol, 0.62 + fres * 0.22), below);
        float caust = pow(max(sin(vWorld.x * 0.9 + time) * sin(vWorld.z * 0.7 - time), 0.0), 2.0);
        col += vec3(0.50, 0.95, 0.90) * caust * (0.10 + below * 0.16);
        float alpha = (below > 0.5 ? 0.78 : 0.42) + fres * 0.16;
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

export async function loadPbr(quality: 'high' | 'low', host: { setMaterial(m: THREE.Material): void }, water: THREE.Mesh): Promise<void> {
  const loader = new THREE.TextureLoader()
  const load = (file: string, color: boolean) =>
    new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(
        `/textures/${file}.webp`,
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping
          tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
          tex.generateMipmaps = true
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.anisotropy = 16
          resolve(tex)
        },
        undefined,
        () => reject(new Error(file)),
      )
    })
  const [sandC, sandN, mudC, mudN, grassC, grassN, rockC, rockN, lavaC, lavaN, detail, hideC, hideN, hideR] = await Promise.all([
    load('sand_color', true), load('sand_normal', false),
    load('mud_color', true), load('mud_normal', false),
    load('grass_color', true), load('grass_normal', false),
    load('rock_color', true), load('rock_normal', false),
    load('lava_color', true), load('lava_normal', false),
    load('moss_normal', false),
    load('hide_color', true), load('hide_normal', false), load('hide_rough', false),
  ])
  const mat = terrainMat()
  host.setMaterial(mat)
  mat.uniforms.uSandC!.value = sandC
  mat.uniforms.uSandN!.value = sandN
  mat.uniforms.uMudC!.value = mudC
  mat.uniforms.uMudN!.value = mudN
  mat.uniforms.uGrassC!.value = grassC
  mat.uniforms.uGrassN!.value = grassN
  mat.uniforms.uRockC!.value = rockC
  mat.uniforms.uRockN!.value = rockN
  mat.uniforms.uLavaC!.value = lavaC
  mat.uniforms.uLavaN!.value = lavaN
  mat.uniforms.uDetail!.value = detail
  mat.uniforms.uQuality!.value = quality === 'high' ? 1 : 0
  const waterMat = water.material as THREE.ShaderMaterial
  waterMat.uniforms.uQuality!.value = quality === 'high' ? 1 : 0
  const { bindHideTextures } = await import('./mesh')
  bindHideTextures(hideC, hideN, hideR)
}

export function setTerrainQuality(host: { material: THREE.Material }, water: THREE.Mesh, quality: 'high' | 'low'): void {
  const q = quality === 'high' ? 1 : 0
  const mat = host.material as THREE.ShaderMaterial
  if (mat.uniforms?.uQuality) mat.uniforms.uQuality.value = q
  const waterMat = water.material as THREE.ShaderMaterial
  if (waterMat.uniforms?.uQuality) waterMat.uniforms.uQuality.value = q
}
