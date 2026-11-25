import * as THREE from 'three'
import { ARM_TYPES, BREAKERS, COLOR_NAMES, COLORS, CUTTERS, FEET, FIN_LINE, GEMS, HORNS, JAWS, ROCK_TINT, SKINS, TAIL_LINE, TEETH, TREE_TINT, TIER_SPENT, WING_STYLES, treeById } from '../shared/catalog'
import { createWorld, nearestInCone, playerOf, step, tryPurchase, type Ent, type Frame, type World } from '../shared/sim'
import { readPad, type PadLayer } from '../shared/pad'
import { SAVE_KEY, applyGameSave, encodeGameSave, parseGameSave, serializeGameSave } from '../shared/save'
import { PIECES, canPlace, costLine, nearestPiece, pieceById, placePiece, refundPiece } from '../shared/build'
import { canDig, fishGoal, growFish, hideStock, tierOf } from '../shared/rules'
import { audio } from './audio'
import { attackVolumes, type HitVol } from '../shared/body'
import { buildCreature, creatureKey, poseCreature } from './mesh'
import { ChunkWorld } from './chunks'
import { buildWater, loadPbr, setTerrainQuality } from './world3d'
import { WATER, groundAt } from '../shared/terrain'

const SAVE = SAVE_KEY

export class Game {
  world: World
  playing = false
  paused = false
  evoOpen = false
  settingsOpen = false
  selectOpen = false
  pauseOpen = false
  quitOpen = false
  mapOpen = false
  /** Solo stays false, so the map pauses. A live shard session sets this and the map stays an overlay. */
  liveMultiplayer = false
  private evoTab: 'parts' | 'skin' = 'parts'
  buildOpen = false
  name = 'Tidewisp'
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80)
  private clock = new THREE.Clock()
  private keys = new Set<string>()
  private meshes = new Map<number, THREE.Group>()
  private keysigs = new Map<number, string>()
  private decor = new THREE.Group()
  private time = 0
  private sun: THREE.DirectionalLight
  private waterU = { value: 0 }
  private bubbles: THREE.InstancedMesh | null = null
  private bubbleBases: { x: number; y: number; z: number; s: number }[] = []
  private shafts: THREE.InstancedMesh | null = null
  private skyBg: THREE.Texture
  private underBg = new THREE.Color(0x4ecfd4)
  private nodeGroup = new THREE.Group()
  private hitDebug: THREE.Mesh[] = []
  private sAx = 0
  private sAy = 0
  private stick = { x: 0, y: 0 }
  private mouseBite = false
  private mouseUp = false
  private quality: 'high' | 'mid' | 'low'
  qualityMode: 'auto' | 'low' | 'mid' | 'high' = 'auto'
  lookSens = 0.5
  invertY = false
  private shoreTold = false
  private explored = new Set<string>()
  private mapOffX = 0
  private mapOffZ = 0
  private padOn = false
  private padHelpOpen = false
  private touchForced = false
  private padPrev: boolean[] = []
  private focusIndex = 0
  private navLatch = false
  private sliderWait = 0
  private padPromptT = 0
  private gp = { lx: 0, ly: 0, rx: 0, ry: 0, attack: false, horn: false, dash: false, dig: false, rise: false, dive: false, sprint: false, use: false }
  private zoom = 1
  private lockId = 0
  private buildMode = false
  private buildIndex = 0
  private buildYaw = 0
  private buildFree = false
  private orbitId = -1
  private lookPtrs = new Map<number, { x: number; y: number }>()
  private pieceGroup = new THREE.Group()
  private ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x88c070, transparent: true, opacity: 0.45, depthWrite: false }))
  private camPos = new THREE.Vector3(8, 4, 9)
  private lookPos = new THREE.Vector3(10, 2, 0)
  private camGoal = new THREE.Vector3()
  private lookGoal = new THREE.Vector3()
  private camDist = 6.4
  private firstPerson = false
  private yaw = 0.4
  private pitch = -0.12
  private yawT = 0.4
  private pitchT = 0.05
  private lookId = -1
  private lookLast = { x: 0, y: 0 }
  private lookDragT = 0
  private camDistT = 6.2
  private riseHeld = false
  private diveHeld = false
  private resTick = 0
  private lastNow = performance.now()
  private chunks!: ChunkWorld
  private waterMesh!: THREE.Mesh
  private hintLeft = 0
  private debug = false
  private preview?: THREE.WebGLRenderer
  private previewScene?: THREE.Scene
  private debugLine: THREE.LineSegments
  private debrisMeshes: THREE.Mesh[] = []
  private bursts: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = []
  private dashT = 0
  private hornT = 0
  private actHeld = false
  private cd = { dash: 0, horn: 0, act: 0, build: 0 }
  private punch = { t: 1, dur: 0.22, amp: 0, ax: 1, ay: 0.35 }
  private saveAcc = 0
  private lastSaved: string | null = null
  private toastT = 0

  constructor(canvas: HTMLCanvasElement) {
    this.world = createWorld()
    const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerHeight <= 520
    this.quality = coarse ? 'mid' : 'high'
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.12
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setPixelRatio(this.pixelCap())
    this.renderer.setClearColor(0x4eb8c4)
    this.scene.fog = new THREE.Fog(0x6ed4d8, 18, 72)
    this.skyBg = skyTexture()
    this.scene.background = this.skyBg
    this.scene.add(new THREE.HemisphereLight(0xffefd2, 0x2d7a7c, 0.95))
    this.sun = new THREE.DirectionalLight(0xffeed0, 1.85)
    this.sun.position.set(12, 18, 10)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1024, 1024)
    this.sun.shadow.camera.near = 2
    this.sun.shadow.camera.far = 48
    this.sun.shadow.camera.left = -18
    this.sun.shadow.camera.right = 18
    this.sun.shadow.camera.top = 12
    this.sun.shadow.camera.bottom = -12
    this.scene.add(this.sun)
    this.scene.add(this.sun.target)
    const cool = new THREE.DirectionalLight(0x7ed4d8, 0.46)
    cool.position.set(-8, 4, -6)
    this.scene.add(cool)
    this.scene.add(this.decor)
    this.scene.add(this.nodeGroup)
    this.scene.add(this.pieceGroup)
    this.ghost.visible = false
    this.scene.add(this.ghost)
    this.debug = new URLSearchParams(location.search).get('debug') === 'hit'
    const dbg = new THREE.BufferGeometry()
    dbg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3))
    this.debugLine = new THREE.LineSegments(dbg, new THREE.LineBasicMaterial({ color: 0xb7e2c2 }))
    this.debugLine.frustumCulled = false
    this.debugLine.visible = false
    this.scene.add(this.debugLine)
    this.load()
    this.paintWorld()
    this.resize()
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('keydown', (e) => {
      const typing = isTypingTarget(e.target)
      if (!typing && shouldGuardKey(e, this.playing)) e.preventDefault()
      if (typing && e.key !== 'Escape') return
      const inMenu = this.menuTargets().length > 0
      if (inMenu && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')) {
        this.moveFocus(-1)
        return
      }
      if (inMenu && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
        this.moveFocus(1)
        return
      }
      if (inMenu && (e.key === 'Enter')) {
        this.activateFocus(0)
        return
      }
      this.keys.add(e.key.toLowerCase())
      if (e.key === 'Escape') {
        if (!this.closeTopMenu() && this.playing) this.toggleSelect(true)
        return
      }
      if (inMenu) return
      if (this.buildMode) {
        if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E' || e.key === 'r' || e.key === 'R') {
          this.buildYaw += e.key.toLowerCase() === 'q' ? Math.PI / 2 : -Math.PI / 2
        }
        if (e.key === '[' || e.key === ']') this.cyclePiece(e.key === ']' ? 1 : -1)
        if (e.key === 'b' || e.key === 'B') this.toggleBuild(false)
        return
      }
      if ((e.key === 'e' || e.key === 'E')) this.toggleEvo()
      if ((e.key === 'b' || e.key === 'B')) this.toggleBuild(true)
      if ((e.key === 'm' || e.key === 'M')) this.toggleMap()
      if (e.key === 'h' || e.key === 'H') this.debug = !this.debug
      if (e.key === 'v' || e.key === 'V') this.firstPerson = !this.firstPerson
      if (e.key === 'Tab') this.toggleLock()
      if ((e.key === 'q' || e.key === 'Q') && this.cd.dash <= 0) {
        this.cd.dash = 1.15
        this.dashT = 0.2
      }
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()))
    this.bindUi()
    requestAnimationFrame(() => this.frame())
  }

  private phoneLayout(): boolean {
    return window.matchMedia('(pointer: coarse)').matches || window.innerHeight <= 520
  }

  private pixelCap(): number {
    const dpr = window.devicePixelRatio || 1
    return Math.min(this.phoneLayout() ? 1.35 : 2, dpr)
  }

  private resize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    const aspect = w / Math.max(1, h)
    const wide = aspect >= 1.25
    this.camera.fov = wide ? 68 : 58
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
    this.camDistT = this.firstPerson ? 0.45 : (wide ? 6.2 : 8)
    if (this.firstPerson) this.camDist = 0.45
    const fog = this.scene.fog as THREE.Fog
    fog.near = wide ? 24 : 14
    fog.far = wide ? 70 : 42
    this.renderer.setSize(w, h, false)
    this.applyTouchVisibility()
    document.getElementById('t-evo')?.toggleAttribute('hidden', !this.playing || !this.phoneLayout())
    document.getElementById('t-settings')?.toggleAttribute('hidden', !this.playing)
    const portrait = h > w && w <= 540
    document.getElementById('rotate')?.classList.toggle('on', portrait)
  }

  private paintWorld(): void {
    const g = this.decor
    this.chunks = new ChunkWorld(this.quality)
    g.add(this.chunks.group)
    this.chunks.update(8, 0)
    this.waterMesh = buildWater(this.waterU)
    g.add(this.waterMesh)
    this.spawnShafts(g)
    void loadPbr(this.quality === 'low' ? 'low' : 'high', this.chunks, this.waterMesh).catch(() => {
      /* vertex-colored chunks remain if a texture is missing */
    })
    const lavaMat = new THREE.MeshStandardMaterial({ color: 0x8a4634, roughness: 0.55, metalness: 0.05, emissive: 0x5a2418, emissiveIntensity: 0.45 })
    for (const x of [176, 188, 202]) {
      const vent = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), lavaMat)
      vent.scale.set(1, 1.6, 1)
      vent.position.set(x, 1.5, 0)
      vent.castShadow = true
      g.add(vent)
    }
    this.spawnBubbles(g)
  }

  private spawnBubbles(g: THREE.Group): void {
    if (this.bubbles) {
      this.bubbles.removeFromParent()
      this.bubbles.geometry.dispose()
    }
    const count = this.quality === 'high' ? 40 : this.quality === 'mid' ? 22 : 10
    const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xd5e4e0, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.45 })
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), bubbleMat, count)
    mesh.frustumCulled = false
    this.bubbleBases = []
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const base = { x: 6 + (i * 3.7) % 58, y: 0.6 + (i % 7) * 0.55, z: (i % 5) - 2, s: 0.7 + (i % 4) * 0.18 }
      this.bubbleBases.push(base)
      dummy.position.set(base.x, base.y, base.z)
      dummy.scale.setScalar(base.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    g.add(mesh)
    this.bubbles = mesh
  }

  private spawnShafts(g: THREE.Group): void {
    if (this.shafts) {
      this.shafts.removeFromParent()
      this.shafts.geometry.dispose()
      const mat = this.shafts.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat.dispose()
      this.shafts = null
    }
    const n = this.quality === 'high' ? 8 : this.quality === 'mid' ? 5 : 2
    const geo = new THREE.PlaneGeometry(1.8, 16)
    geo.translate(0, -8, 0)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: { uTime: this.waterU, uGain: { value: this.quality === 'low' ? 0.32 : 0.48 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uGain;
        void main() {
          float shaft = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          shaft *= pow(vUv.y, 0.55);
          float flicker = 0.78 + 0.22 * sin(uTime * 0.65 + vUv.y * 2.4);
          vec3 col = vec3(0.78, 0.98, 0.94);
          gl_FragColor = vec4(col, shaft * flicker * uGain);
        }
      `,
    })
    const mesh = new THREE.InstancedMesh(geo, mat, n)
    mesh.frustumCulled = false
    mesh.renderOrder = 3
    const dummy = new THREE.Object3D()
    for (let i = 0; i < n; i++) {
      dummy.position.set(4 + i * 4.8, WATER + 0.2, ((i * 5) % 9) - 4)
      dummy.rotation.set(0, i * 0.55, 0.04)
      dummy.scale.set(0.65 + (i % 3) * 0.22, 0.85 + (i % 2) * 0.2, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    g.add(mesh)
    this.shafts = mesh
  }

  private stepShafts(): void {
    if (!this.shafts) return
    const dummy = new THREE.Object3D()
    const cam = this.camera.position
    const n = this.shafts.count
    for (let i = 0; i < n; i++) {
      const x = 4 + i * 4.8
      const z = ((i * 5) % 9) - 4
      dummy.position.set(x, WATER + 0.2, z)
      dummy.rotation.set(0, Math.atan2(cam.x - x, cam.z - z), 0.03)
      dummy.scale.set(0.65 + (i % 3) * 0.22, 0.85 + (i % 2) * 0.2, 1)
      dummy.updateMatrix()
      this.shafts.setMatrixAt(i, dummy.matrix)
    }
    this.shafts.instanceMatrix.needsUpdate = true
  }

  private applyQuality(): void {

    this.renderer.setPixelRatio(this.pixelCap())
    const shadows = this.quality !== 'low'
    this.renderer.shadowMap.enabled = shadows
    this.sun.castShadow = shadows
    const map = this.quality === 'high' ? 2048 : 1024
    this.sun.shadow.mapSize.set(map, map)
    if (this.chunks) {
      this.chunks.quality = this.quality
      setTerrainQuality(this.chunks, this.waterMesh, this.quality === 'low' ? 'low' : 'high')
      this.chunks.replant()
    }
    if (this.waterMesh) this.spawnShafts(this.decor)
    this.resize()
    const pick = document.getElementById('set-quality') as HTMLSelectElement | null
    if (pick && pick.value !== this.qualityMode) pick.value = this.qualityMode
  }

  private bindUi(): void {
    const solo = document.getElementById('solo')
    const name = document.getElementById('name') as HTMLInputElement | null
    solo?.addEventListener('click', () => {
      audio.unlock()
      void this.enterWide()
      this.name = name?.value.trim() || 'Tidewisp'
      playerOf(this.world).name = this.name
      this.start()
    })
    document.getElementById('evo-close')?.addEventListener('click', () => this.toggleEvo(false))
    document.getElementById('build-close')?.addEventListener('click', () => this.toggleBuild(false))
    document.getElementById('settings-close')?.addEventListener('click', () => this.togglePause(false))
    document.getElementById('t-settings')?.addEventListener('click', () => this.toggleSelect())
    document.getElementById('select-pause')?.addEventListener('click', () => this.togglePause(true))
    document.getElementById('select-evolve')?.addEventListener('click', () => this.openEvolveFromSelect())
    document.getElementById('select-quit')?.addEventListener('click', () => this.toggleQuit(true))
    document.getElementById('pause-resume')?.addEventListener('click', () => this.resumePlay())
    document.getElementById('pause-save')?.addEventListener('click', () => this.manualSave())
    document.getElementById('pause-load')?.addEventListener('click', () => this.manualLoad())
    document.getElementById('pause-pad')?.addEventListener('click', () => this.togglePadHelp(true))
    document.getElementById('pad-help-close')?.addEventListener('click', () => this.togglePadHelp(false))
    document.getElementById('quit-save')?.addEventListener('click', () => this.quitToTitle(true))
    document.getElementById('quit-quit')?.addEventListener('click', () => this.quitToTitle(false))
    document.getElementById('quit-cancel')?.addEventListener('click', () => this.toggleQuit(false))
    document.getElementById('t-map')?.addEventListener('click', () => this.toggleMap())
    document.getElementById('map-close')?.addEventListener('click', () => this.toggleMap(false))
    this.renderer.domElement.addEventListener('pointerdown', () => this.revealTouch())
    document.getElementById('grow')?.addEventListener('click', () => this.growStage())
    document.getElementById('set-restart')?.addEventListener('click', () => this.restart())
    document.getElementById('set-sens')?.addEventListener('input', (e) => {
      this.lookSens = Number((e.target as HTMLInputElement).value) || 1
    })
    document.getElementById('set-invert')?.addEventListener('change', (e) => {
      this.invertY = (e.target as HTMLInputElement).checked
    })
    document.getElementById('set-vol')?.addEventListener('input', (e) => {
      audio.setVolume(Number((e.target as HTMLInputElement).value))
      audio.muted = audio.volume <= 0
      const mute = document.getElementById('set-mute')
      if (mute) mute.textContent = audio.muted ? 'Unmute' : 'Mute'
    })
    document.getElementById('set-mute')?.addEventListener('click', () => {
      audio.muted = !audio.muted
      const mute = document.getElementById('set-mute')
      if (mute) mute.textContent = audio.muted ? 'Unmute' : 'Mute'
    })
    document.getElementById('set-quality')?.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as Game['qualityMode']
      this.qualityMode = mode
      if (mode !== 'auto') this.quality = mode
      else this.quality = this.phoneLayout() ? 'mid' : 'high'
      this.applyQuality()
    })
    document.getElementById('resume')?.addEventListener('click', () => {
      if (this.world.won) {
        this.restart()
        return
      }
      this.world.over = false
      const you = playerOf(this.world)
      you.alive = true
      you.hp = you.maxHp
      you.ep = Math.max(0, you.ep - 5)
      you.x = 8
      you.y = 2.4
      you.z = 0
      this.save()
    })
    this.paintColors()
    this.touch()
    this.guardSurface()
    this.applyQuality()
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save()
    })
    window.addEventListener('pagehide', () => this.save())
    const view = this.renderer.domElement
    view.addEventListener('click', () => {
      if (this.phoneLayout() || !this.playing) return
      if (document.pointerLockElement !== view) void view.requestPointerLock()
    })
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== view && this.orbitId < 0) return
      if (document.pointerLockElement === view) this.applyLook(e.movementX, e.movementY, 0.00115)
    })
    view.addEventListener('wheel', (e) => {
      if (!this.playing) return
      e.preventDefault()
      this.zoom = Math.max(0.5, Math.min(1.7, this.zoom * (e.deltaY > 0 ? 1.08 : 0.92)))
    }, { passive: false })
    const look = document.getElementById('look')
    look?.addEventListener('pointerdown', (e) => {
      if (!this.playing || this.selectOpen || this.pauseOpen || this.evoOpen || this.quitOpen || this.mapOpen || this.padHelpOpen) return
      if ((e.target as HTMLElement | null)?.closest?.('#stick, #arc, #hud, #t-evo, button')) return
      this.lookId = e.pointerId
      this.lookLast = { x: e.clientX, y: e.clientY }
      this.lookDragT = 0.55
      look.setPointerCapture(e.pointerId)
    })
    look?.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return
      const dx = e.clientX - this.lookLast.x
      const dy = e.clientY - this.lookLast.y
      this.lookLast = { x: e.clientX, y: e.clientY }
      // Prefer yaw (left/right). Use client deltas because movementX is unreliable on touch.
      this.applyLook(dx, dy * 0.35, 0.008)
      this.lookDragT = 0.45
    })
    const endLook = (e: PointerEvent) => {
      if (e.pointerId === this.lookId) {
        this.lookId = -1
        this.lookDragT = Math.max(this.lookDragT, 0.4)
      }
    }
    look?.addEventListener('pointerup', endLook)
    look?.addEventListener('pointercancel', endLook)
    document.getElementById('view')?.addEventListener('pointerup', (e) => {
      e.preventDefault()
      this.firstPerson = !this.firstPerson
    })
    view.addEventListener('pointerdown', (e) => {
      this.lookPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (e.pointerType === 'mouse' && e.button === 1) this.toggleLock()
      if (e.pointerType === 'mouse' && e.button === 2) {
        this.orbitId = e.pointerId
        view.setPointerCapture(e.pointerId)
      }
      if (e.pointerType === 'mouse' && e.button === 0 && document.pointerLockElement === view) {
        if (this.buildMode) this.confirmPlace()
        else this.mouseBite = true
      }
    })
    view.addEventListener('pointermove', (e) => {
      const prev = this.lookPtrs.get(e.pointerId)
      if (prev) {
        if (e.pointerId === this.orbitId || this.lookPtrs.size >= 2) this.applyLook(e.movementX, e.movementY, this.lookPtrs.size >= 2 ? 0.003 : 0.0024)
        this.lookPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }
    })
    view.addEventListener('pointerup', (e) => {
      this.lookPtrs.delete(e.pointerId)
      if (e.pointerId === this.orbitId) this.orbitId = -1
      this.mouseUp = true
    })
    view.addEventListener('pointercancel', (e) => {
      this.lookPtrs.delete(e.pointerId)
      if (e.pointerId === this.orbitId) this.orbitId = -1
    })
  }

  private guardSurface(): void {
    window.addEventListener('contextmenu', (e) => {
      if (isTypingTarget(e.target)) return
      if (this.playing) e.preventDefault()
    })
    const nodes = document.querySelectorAll('canvas, #stick, #t-bite, #t-up, #t-dive, #t-dash, #t-horn, #t-act, #t-build, #t-evo')
    nodes.forEach((el) => {
      el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false })
      el.addEventListener('pointerdown', (e) => {
        if ((e as PointerEvent).pointerType !== 'mouse') e.preventDefault()
      })
      el.addEventListener('contextmenu', (e) => e.preventDefault())
    })
  }

  private paintColors(): void {
    const host = document.getElementById('colors')
    if (!host) return
    host.innerHTML = COLOR_NAMES.map(
      (name, i) => `<button data-color="${i}" style="background:#${COLORS[i]!.toString(16).padStart(6, '0')}">${name}</button>`,
    ).join('')
    host.querySelectorAll('button').forEach((btn) =>
      btn.addEventListener('click', () => {
        const you = playerOf(this.world)
        you.load.color = Number((btn as HTMLButtonElement).dataset.color ?? 0)
        this.keysigs.clear()
      }),
    )
  }

  private async enterWide(): Promise<void> {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    } catch {
      /* fullscreen needs a gesture, and some browsers block it */
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> }
      await orientation.lock?.('landscape')
    } catch {
      /* lock is refused outside fullscreen on most desktop browsers */
    }
  }

  private touch(): void {
    const root = document.getElementById('touch')
    if (!root) return
    root.hidden = !this.playing || !this.phoneLayout()
    const hold = (id: string, down: () => void, up: () => void) => {
      const el = document.getElementById(id)
      if (!el) return
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        down()
      })
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
      el.addEventListener('pointerleave', up)
    }
    hold('t-bite', () => this.keys.add('j'), () => this.keys.delete('j'))
    hold('t-up', () => { this.riseHeld = true }, () => { this.riseHeld = false })
    hold('t-dive', () => { this.diveHeld = true }, () => { this.diveHeld = false })
    hold('t-act', () => {
      this.actHeld = true
      if (this.cd.act <= 0) this.cd.act = 0.35
    }, () => {
      this.actHeld = false
    })
    const tap = (id: string, run: () => void) => {
      document.getElementById(id)?.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        run()
      })
    }
    tap('t-dash', () => {
      if (this.cd.dash > 0) return
      this.cd.dash = 1.15
      this.dashT = 0.2
    })
    tap('t-horn', () => {
      if (this.cd.horn > 0) return
      this.cd.horn = 1.7
      this.hornT = 0.18
    })
    tap('t-build', () => {
      if (this.cd.build > 0) return
      this.cd.build = 0.4
      this.toggleBuild()
    })
    document.getElementById('t-evo')?.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      this.toggleEvo()
    })
    const stick = document.getElementById('stick')
    const knob = document.getElementById('knob')
    if (!stick || !knob) return
    let pid = -1
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      const rect = stick.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      const max = rect.width * 0.36
      const mag = Math.min(max, Math.hypot(dx, dy))
      const ang = Math.atan2(dy, dx)
      this.stick.x = Math.cos(ang) * (mag / max)
      this.stick.y = -Math.sin(ang) * (mag / max)
      knob.style.transform = `translate(${Math.cos(ang) * mag}px, ${Math.sin(ang) * mag}px)`
    }
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = -1
      this.stick.x = 0
      this.stick.y = 0
      knob.style.transform = 'translate(0px, 0px)'
    }
    stick.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      pid = e.pointerId
      stick.setPointerCapture(e.pointerId)
      move(e)
    })
    stick.addEventListener('pointermove', move)
    stick.addEventListener('pointerup', end)
    stick.addEventListener('pointercancel', end)
  }

  private applyLook(dx: number, dy: number, scale: number): void {
    this.yawT -= dx * scale * this.lookSens
    const pitchDelta = (this.invertY ? dy : -dy) * scale * 0.7 * this.lookSens
    this.pitchT = Math.max(-1.05, Math.min(1.05, this.pitchT + pitchDelta))
  }

  private easeLook(dt: number): void {
    const k = 1 - Math.exp(-dt * 9)
    this.yaw += (this.yawT - this.yaw) * k
    this.pitch += (this.pitchT - this.pitch) * k
  }

  growStage(): void {
    const you = playerOf(this.world)
    const result = growFish(you.ep, you.spent)
    this.world.banner = result.reason
    this.world.bannerT = 4
    if (!result.ok) {
      audio.blip('hurt')
      return
    }
    you.ep = result.ep
    you.spent = result.spent
    this.keysigs.delete(you.id)
    this.feel('evolve')
    this.save()
    if (this.evoOpen) this.renderEvo()
  }

  toggleSelect(force?: boolean): void {
    if (!this.playing && force !== false) return
    const next = force ?? !this.selectOpen
    if (!next) {
      this.toggleQuit(false)
      this.togglePause(false)
    }
    this.selectOpen = next
    const el = document.getElementById('select')
    if (el) el.hidden = !this.selectOpen
    if (this.selectOpen) this.focusIndex = 0
    this.syncPause()
    this.markFocus()
  }

  togglePause(force?: boolean): void {
    const next = force ?? !this.pauseOpen
    this.pauseOpen = next
    this.settingsOpen = next
    const el = document.getElementById('settings')
    if (el) el.hidden = !this.pauseOpen
    if (this.pauseOpen) {
      this.selectOpen = true
      const sel = document.getElementById('select')
      if (sel) sel.hidden = true
      this.focusIndex = 0
    } else {
      const sel = document.getElementById('select')
      if (sel) sel.hidden = !this.selectOpen
    }
    this.syncPause()
    this.markFocus()
  }

  toggleQuit(force?: boolean): void {
    const next = force ?? !this.quitOpen
    this.quitOpen = next
    const el = document.getElementById('quit-ask')
    if (el) el.hidden = !this.quitOpen
    if (this.quitOpen) {
      this.selectOpen = true
      const sel = document.getElementById('select')
      if (sel) sel.hidden = true
      this.focusIndex = 0
    } else {
      const sel = document.getElementById('select')
      if (sel) sel.hidden = !this.selectOpen
    }
    this.syncPause()
    this.markFocus()
  }

  private openEvolveFromSelect(): void {
    this.selectOpen = true
    document.getElementById('select')?.setAttribute('hidden', '')
    this.toggleEvo(true)
    this.syncPause()
  }

  private resumePlay(): void {
    this.toggleQuit(false)
    this.togglePause(false)
    this.toggleEvo(false)
    this.toggleSelect(false)
  }

  /** Close the topmost submenu or Select. Returns true if something closed. */
  closeTopMenu(): boolean {
    if (this.padHelpOpen) {
      this.togglePadHelp(false)
      return true
    }
    if (this.evoOpen) {
      this.toggleEvo(false)
      if (this.selectOpen) {
        const sel = document.getElementById('select')
        if (sel) sel.hidden = false
        this.focusIndex = 0
        this.markFocus()
      }
      this.syncPause()
      return true
    }
    if (this.quitOpen) {
      this.toggleQuit(false)
      return true
    }
    if (this.pauseOpen) {
      this.togglePause(false)
      return true
    }
    if (this.mapOpen) {
      this.toggleMap(false)
      return true
    }
    if (this.buildMode) {
      this.toggleBuild(false)
      return true
    }
    if (this.selectOpen) {
      this.toggleSelect(false)
      return true
    }
    return false
  }

  private showToast(text: string): void {
    const el = document.getElementById('save-toast')
    if (el) {
      el.textContent = text
      el.hidden = false
    }
    this.toastT = 1.6
  }

  manualSave(): boolean {
    this.save()
    this.showToast('Saved')
    return true
  }

  manualLoad(): boolean {
    const raw = this.lastSaved ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(SAVE) : null)
    if (!raw) {
      this.showToast('No save')
      return false
    }
    const data = parseGameSave(raw)
    if (!data) {
      this.showToast('No save')
      return false
    }
    applyGameSave(this.world, data)
    this.lastSaved = serializeGameSave(data)
    const you = playerOf(this.world)
    this.yaw = you.yaw
    this.yawT = you.yaw
    this.pitch = you.pitch
    this.pitchT = you.pitch
    this.keysigs.clear()
    this.showToast('Loaded')
    return true
  }

  quitToTitle(saveFirst: boolean): void {
    if (saveFirst) this.save()
    else if (this.lastSaved) {
      const data = parseGameSave(this.lastSaved)
      if (data) applyGameSave(this.world, data)
    }
    this.goToTitle()
  }

  goToTitle(): void {
    this.playing = false
    this.resumePlay()
    this.buildMode = false
    this.ghost.visible = false
    document.getElementById('build-tray')?.setAttribute('hidden', '')
    document.getElementById('hud')?.setAttribute('hidden', '')
    document.getElementById('map')?.setAttribute('hidden', '')
    document.getElementById('overlay')?.setAttribute('hidden', '')
    document.getElementById('pad-map')?.setAttribute('hidden', '')
    document.getElementById('pad-help')?.setAttribute('hidden', '')
    this.padHelpOpen = false
    document.getElementById('save-toast')?.setAttribute('hidden', '')
    this.toastT = 0
    document.getElementById('title')?.removeAttribute('hidden')
    this.applyTouchVisibility()
    this.syncPause()
  }

  toggleSettings(force?: boolean): void {
    if (force === false) this.resumePlay()
    else this.toggleSelect(true)
  }

  toggleMap(force?: boolean): void {
    if (!this.playing && force !== false) return
    this.mapOpen = force ?? !this.mapOpen
    const el = document.getElementById('map')
    if (el) el.hidden = !this.mapOpen
    if (!this.mapOpen) {
      this.mapOffX = 0
      this.mapOffZ = 0
    }
    this.syncPause()
    if (this.mapOpen) this.drawMap()
  }

  /** Solo pauses while the map is open. Multiplayer keeps the world running under the overlay. */
  private syncPause(): void {
    this.paused = this.selectOpen || this.pauseOpen || this.quitOpen || this.evoOpen || (this.mapOpen && !this.liveMultiplayer)
  }

  restart(): void {
    for (const group of this.meshes.values()) group.removeFromParent()
    this.meshes.clear()
    this.keysigs.clear()
    this.world = createWorld()
    this.playing = false
    this.paused = false
    this.settingsOpen = false
    this.selectOpen = false
    this.pauseOpen = false
    this.quitOpen = false
    this.mapOpen = false
    this.explored.clear()
    document.getElementById('map')?.setAttribute('hidden', '')
    this.shoreTold = false
    this.evoOpen = false
    this.buildOpen = false
    this.yaw = 0.4
    this.pitch = -0.12
    this.yawT = 0.4
    this.pitchT = -0.12
    for (const id of ['settings', 'select', 'quit-ask', 'save-toast', 'evo', 'build', 'hud', 'overlay']) document.getElementById(id)?.setAttribute('hidden', '')
    document.getElementById('title')?.removeAttribute('hidden')
    try {
      localStorage.removeItem(SAVE)
    } catch {
      /* ignore */
    }
  }

  start(): void {
    this.playing = true
    document.getElementById('title')?.setAttribute('hidden', '')
    document.getElementById('hud')?.removeAttribute('hidden')
    this.resize()
    const hint = document.getElementById('hint')
    const touch = !document.getElementById('touch')?.hidden
    const you = playerOf(this.world)
    const guppyStart = you.spent < 12 && you.load.legs === 0 && you.load.size <= 0.55
    if (hint && guppyStart && !localStorage.getItem('evo2.hinted')) {
      hint.hidden = false
      hint.textContent = touch
        ? 'You are a tiny guppy. Eat the fry around you (5 to start). The left stick steers. Drag the right side to look. Attack locks on and lunges.'
        : 'You are a tiny guppy. Eat the fry around you (5 to start). Mouse looks, click bites, WASD steers. E evolves.'
      this.hintLeft = 8
      localStorage.setItem('evo2.hinted', '1')
    }
    this.save()
  }

  toggleEvo(force?: boolean): void {
    this.evoOpen = force ?? !this.evoOpen
    const el = document.getElementById('evo')
    if (!el) return
    el.hidden = !this.evoOpen
    if (this.evoOpen) this.renderEvo()
    else if (this.selectOpen && !this.pauseOpen && !this.quitOpen) {
      const sel = document.getElementById('select')
      if (sel) sel.hidden = false
      this.focusIndex = 0
      this.markFocus()
    }
    this.syncPause()
  }

  toggleBuild(force?: boolean): void {
    this.buildMode = force ?? !this.buildMode
    this.buildOpen = false
    document.getElementById('build')?.setAttribute('hidden', '')
    const tray = document.getElementById('build-tray')
    if (tray) tray.hidden = !this.buildMode
    this.ghost.visible = this.buildMode
    if (this.buildMode) this.renderBuild()
  }

  toggleLock(): void {
    if (this.lockId) {
      this.lockId = 0
      return
    }
    const you = playerOf(this.world)
    const aim = nearestInCone(this.world, you)
    this.lockId = aim?.id ?? 0
    if (this.lockId) this.world.banner = `Locked · ${aim?.name ?? 'prey'}`
    this.world.bannerT = this.lockId ? 1.4 : 0
  }

  private cyclePiece(dir: number): void {
    this.buildIndex = (this.buildIndex + dir + PIECES.length) % PIECES.length
    this.renderBuild()
  }

  private aimPoint(you: Ent): { x: number; y: number; z: number } {
    const dist = 2.3
    const x = you.x + Math.cos(you.yaw) * dist
    const z = you.z + Math.sin(you.yaw) * dist
    const y = you.y
    return { x, y, z }
  }

  private confirmPlace(): void {
    const you = playerOf(this.world)
    const def = PIECES[this.buildIndex]
    if (!def) return
    const aim = this.aimPoint(you)
    const result = placePiece(this.world, you, def.id, aim.x, aim.y, aim.z, you.yaw + this.buildYaw, this.buildFree)
    this.world.banner = result.reason
    this.world.bannerT = 2
    if (result.ok) {
      this.feel('dig')
      this.buildFree = false
      if (def.base && result.piece) this.attachShelter(def.name, result.piece.x, you)
      this.save()
    } else audio.blip('hurt')
    this.renderBuild()
  }

  private pickupPiece(): boolean {
    const you = playerOf(this.world)
    const aim = this.aimPoint(you)
    const near = nearestPiece(this.world, aim.x, you.y, aim.z, 2.8) ?? nearestPiece(this.world, you.x, you.y, you.z, 2.2)
    if (!near) return false
    const result = refundPiece(this.world, you, near.id)
    this.world.banner = result.reason
    this.world.bannerT = 2
    if (result.ok) {
      this.feel('gather')
      const idx = PIECES.findIndex((p) => p.id === near.kind)
      if (idx >= 0) this.buildIndex = idx
      this.buildYaw = near.yaw - you.yaw
      this.buildFree = false
      const def = pieceById(near.kind)
      if (def?.base) {
        const i = this.world.bases.findIndex((b) => b.owner === you.id && Math.abs(b.x - near.x) < 1.4 && b.name === def.name)
        if (i >= 0) this.world.bases.splice(i, 1)
      }
      if (!this.buildMode) this.toggleBuild(true)
      this.save()
    } else audio.blip('hurt')
    this.renderBuild()
    return result.ok
  }

  private attachShelter(name: string, x: number, you: Ent): void {
    if (this.world.bases.some((b) => b.owner === you.id && Math.abs(b.x - x) < 1.4 && b.name === name)) return
    this.world.bases.push({
      id: this.world.nextId++,
      owner: you.id,
      name,
      tier: 1,
      clan: you.clan,
      x,
      biome: you.region,
      hp: 22,
      maxHp: 22,
      mats: {},
      gems: {},
      shield: 0,
      warn: 0,
      raidUntil: 0,
      wave: 0,
      nextAt: 1e9,
      online: true,
      defs: [],
    })
  }

  private renderEvo(): void {
    const you = playerOf(this.world)
    const tier = tierOf(you.spent)
    const root = document.getElementById('evo-body')
    const ep = document.getElementById('evo-ep')
    if (ep) ep.textContent = `DNA ${Math.floor(you.ep)} · tier ${tier} · skin ${you.load.skin || 1}`
    this.paintPreview()
    if (!root) return
    const tabs = `<p class="tabs"><button data-kind="tab" data-id="parts">Parts</button><button data-kind="tab" data-id="skin">Skin</button></p>`
    if (this.evoTab === 'skin') {
      const cur = Math.max(1, you.load.skin || 1)
      const now = SKINS[cur - 1]
      const next = SKINS[cur]
      const cost = next
        ? `${next.dna} DNA${next.hides ? ` · ${next.hides} hides` : ''}${next.mat ? ` · ${next.matN} ${next.mat}` : ''}${next.gem ? ` · ${next.gemN} ${next.gem}` : ''}`
        : 'complete'
      root.innerHTML = [
        tabs,
        `<h3>Skin ${cur}/20 · ${now?.name ?? 'Bare skin'}</h3>`,
        `<p>Resistance +${now?.def ?? 0} · HP +${now?.hp ?? 0}${now?.spd ? ` · speed ${now.spd}` : ''}</p>`,
        `<p>Held: ${Math.floor(you.ep)} DNA · ${hideStock(you.bag)} hides</p>`,
        next ? `<button data-kind="skin" data-id="next">Grow ${next.name} · ${cost}</button>` : '<p>Legendary inlay is complete.</p>',
      ].join('')
      root.querySelectorAll('button').forEach((btn) =>
        btn.addEventListener('click', () => {
          const kind = (btn as HTMLButtonElement).dataset.kind ?? ''
          if (kind === 'tab') {
            this.evoTab = ((btn as HTMLButtonElement).dataset.id as 'parts' | 'skin') ?? 'parts'
            this.renderEvo()
            return
          }
          const result = tryPurchase(you, 'skin', 'next')
          this.world.banner = result.reason
          this.world.bannerT = 2
          if (result.ok) this.feel('evolve')
          else audio.blip('hurt')
          this.keysigs.delete(you.id)
          this.renderEvo()
          this.save()
        }),
      )
      return
    }
    const row = (kind: string, id: string, name: string, need: number, cost: number, on: boolean) => {
      const locked = tier < need
      return `<button data-kind="${kind}" data-id="${id}" ${locked ? 'disabled' : ''}>${locked ? '🔒 ' : ''}${name}${on ? ' · on' : ''}${locked ? ` · Unlocks at tier ${need}` : cost ? ` · ${cost} EP` : ''}</button>`
    }
    const blocks: string[] = [tabs]
    blocks.push('<h3>Jaws</h3>')
    for (const j of JAWS) blocks.push(row('jaw', j.id, j.name, j.tier, j.cost, you.load.jaw === j.id))
    blocks.push('<h3>Teeth</h3>')
    for (const j of TEETH) blocks.push(row('teeth', j.id, j.name, j.tier, j.cost, you.load.teeth === j.id))
    blocks.push('<h3>Horns</h3>')
    for (const j of HORNS) blocks.push(row('horn', j.id, j.name, j.tier, j.cost, you.load.horn === j.id))
    blocks.push('<h3>Lines</h3>')
    blocks.push(row('fin', 'next', `Fins → ${FIN_LINE[you.load.fin + 1]?.name ?? 'max'}`, FIN_LINE[you.load.fin + 1]?.tier ?? 1, FIN_LINE[you.load.fin + 1]?.cost ?? 0, false))
    blocks.push(row('tail', 'next', `Tail → ${TAIL_LINE[you.load.tail + 1]?.name ?? 'max'}`, TAIL_LINE[you.load.tail + 1]?.tier ?? 1, TAIL_LINE[you.load.tail + 1]?.cost ?? 0, false))
    blocks.push(row('lungs', 'next', 'Next lungs', you.load.lungs >= 1 ? 5 : 2, 6, false))
    blocks.push(row('legs', 'next', 'Next legs', 2, 8, false))
    blocks.push(row('wings', 'next', `Wing pairs ${you.load.wings}`, 5, 16, false))
    blocks.push(row('arms', 'next', `Arms ${you.load.arms}`, 5, 16, false))
    blocks.push('<h3>Feet</h3>')
    for (const j of FEET) blocks.push(row('feet', j.id, j.name, j.tier, j.cost, you.load.feet === j.id))
    blocks.push('<h3>Wing style</h3>')
    for (const j of WING_STYLES) blocks.push(row('wingStyle', j.id, j.name, j.tier, j.cost, you.load.wingStyle === j.id))
    blocks.push('<h3>Arm type</h3>')
    for (const j of ARM_TYPES) blocks.push(row('armType', j.id, j.name, j.tier, j.cost, you.load.armType === j.id))
    blocks.push('<h3>Breakers · tier 4</h3>')
    for (const j of BREAKERS) blocks.push(row('breaker', j.id, j.name, j.tier, j.cost, you.load.breaker === j.id))
    blocks.push('<h3>Cutters · tier 4</h3>')
    for (const j of CUTTERS) blocks.push(row('cutter', j.id, j.name, j.tier, j.cost, you.load.cutter === j.id))
    blocks.push('<h3>Shallows</h3>')
    for (const id of ['camo', 'lure', 'spines', 'ink', 'barbels']) blocks.push(row(id, id, id, 1, 5, false))
    blocks.push('<h3>Colors</h3>')
    blocks.push(COLOR_NAMES.map((name, i) => row('accent', String(i), `Accent ${name}`, 1, 0, you.load.accent === i)).join(''))
    blocks.push('<h3>Final gems · tier 10</h3>')
    for (const g of GEMS) blocks.push(row('spec', g.id, `${g.name} (${you.gems[g.id] ?? 0}/${g.need})`, 10, 40, you.load.spec === g.id))
    root.innerHTML = blocks.join('')
    root.querySelectorAll('button').forEach((btn) =>
      btn.addEventListener('click', () => {
        const kind = (btn as HTMLButtonElement).dataset.kind ?? ''
        const id = (btn as HTMLButtonElement).dataset.id ?? ''
        if (kind === 'tab') {
          this.evoTab = (id as 'parts' | 'skin') || 'parts'
          this.renderEvo()
          return
        }
        const result = tryPurchase(you, kind, id)
        this.world.banner = result.reason
        this.world.bannerT = 2
        if (result.ok) this.feel('evolve')
        else audio.blip('hurt')
        this.keysigs.delete(you.id)
        this.renderEvo()
        this.save()
      }),
    )
  }

  private renderBuild(): void {
    const root = document.getElementById('build-picks')
    const status = document.getElementById('build-status')
    const you = playerOf(this.world)
    if (!root) return
    root.innerHTML = PIECES.map((b, i) => {
      const have = costLine(b.cost)
     const on = i === this.buildIndex ? ' on' : ''
      return `<button data-i="${i}" class="${on.trim()}">${b.name} · ${have}</button>`
    }).join('')
    const def = PIECES[this.buildIndex]
    if (status && def) {
      const bag = Object.entries(def.cost).map(([m, n]) => `${you.bag[m] ?? 0}/${n} ${m}`).join(' · ')
      status.textContent = this.buildFree ? `${def.name} · free to place after pickup` : `${def.name} · ${bag}`
    }
    root.querySelectorAll('button').forEach((btn) =>
      btn.addEventListener('click', () => {
        this.buildIndex = Number((btn as HTMLButtonElement).dataset.i ?? 0)
        this.renderBuild()
      }),
    )
  }

  private feel(kind: string): void {
    audio.blip(kind)
    if (kind === 'hit' || kind === 'bite') {
      this.kickCam(0.1)
      navigator.vibrate?.(25)
    } else if (kind === 'eat' || kind === 'gem' || kind === 'chop' || kind === 'dig' || kind === 'mine' || kind === 'gather') {
      this.kickCam(0.08, 0.7, 0.5)
      navigator.vibrate?.(30)
    } else if (kind === 'evolve') {
      this.kickCam(0.16, 0.45, 0.85)
      navigator.vibrate?.(45)
      const you = playerOf(this.world)
      this.burst(you.x, you.y + 0.3, 0xc4f0d8, 'Evolved')
      this.world.hitStop = Math.max(this.world.hitStop, 0.09)
    } else if (kind === 'hurt' || kind === 'trap' || kind === 'geyser') {
      this.kickCam(0.2)
      navigator.vibrate?.(80)
    } else if (kind === 'warn' || kind === 'alert' || kind === 'wave') {
      this.kickCam(0.12)
      navigator.vibrate?.(80)
    }
  }

  private kickCam(amp: number, ax = 1, ay = 0.35): void {
    const leftover = this.punch.t < this.punch.dur ? this.punch.amp : 0
    this.punch.t = 0
    this.punch.dur = 0.22
    this.punch.amp = Math.max(amp, leftover)
    this.punch.ax = ax
    this.punch.ay = ay
  }

  private placeCamera(you: Ent, dt: number): void {
    const aheadX = Math.cos(this.yaw)
    const aheadZ = Math.sin(this.yaw)
    const lock = this.world.ents.find((e) => e.id === this.lockId && e.alive)
    const lookX = you.x + you.vx * 0.12
    const lookZ = you.z + you.vz * 0.12
    if (this.firstPerson) {
      const fx = Math.cos(you.yaw)
      const fz = Math.sin(you.yaw)
      this.camGoal.set(you.x - fx * 0.15, you.y + 0.32, you.z - fz * 0.15)
      this.lookGoal.set(you.x + fx * 1.4, you.y + 0.04 + Math.sin(this.pitch) * 1.2, you.z + fz * 1.4)
      this.camera.near = 0.04
      return
    }
    this.camera.near = 0.1
    const k = 1 - Math.exp(-Math.max(0, dt) * 3.2)
    this.camDist += (this.camDistT - this.camDist) * k
    const tight = you.biteT > 0 || this.dashT > 0
    const dist = this.camDist * this.zoom * (tight ? 0.62 : 1)
    const height = tight ? 1.15 : 1.7
    this.camGoal.set(you.x - aheadX * dist, you.y + height, you.z - aheadZ * dist)
    if (lock) this.lookGoal.set(lock.x, lock.y + 0.4, lock.z)
    else this.lookGoal.set(lookX + aheadX * 6, you.y + 0.5 + Math.sin(this.pitch) * 3.2, lookZ + aheadZ * 6)
    this.probeCamera(you)
  }

  private probeCamera(you: Ent): void {
    const fromX = you.x
    const fromY = you.y + 0.55
    const fromZ = you.z
    const to = this.camGoal
    const steps = 10
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const x = fromX + (to.x - fromX) * t
      const y = fromY + (to.y - fromY) * t
      const z = fromZ + (to.z - fromZ) * t
      const floor = groundAt(x, z, y) + 0.5
      if (y < floor) {
        const back = (i - 1) / steps
        to.set(fromX + (to.x - fromX) * back, Math.max(fromY + (to.y - fromY) * back, floor), fromZ + (to.z - fromZ) * back)
        break
      }
    }
  }

  private stepBubbles(dt: number, sea: boolean): void {
    const mesh = this.bubbles
    if (!mesh) return
    mesh.visible = sea
    if (!sea) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < this.bubbleBases.length; i++) {
      const b = this.bubbleBases[i]!
      b.y += dt * 0.7
      if (b.y > 5.4) b.y = 0.4
      dummy.position.set(b.x + Math.sin(this.time + b.y) * 0.15, b.y, b.z)
      dummy.scale.setScalar(b.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  private syncNodes(): void {
    const needed = this.world.nodes.length
    while (this.nodeGroup.children.length < needed) {
      const m = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.86, metalness: 0.04 }),
      )
      m.castShadow = true
      this.nodeGroup.add(m)
    }
    this.nodeGroup.children.forEach((obj, i) => {
      const node = this.world.nodes[i]
      const mesh = obj as THREE.Mesh
      if (!node || node.amount <= 0) {
        mesh.visible = false
        return
      }
      mesh.visible = true
      const z = ((node.id % 5) - 2) * 1.6
      const y = groundAt(node.x, z, 8)
      mesh.position.set(node.x, y + 0.25, z)
      const tint = TREE_TINT[node.mat] ?? ROCK_TINT[node.mat] ?? (node.kind === 'mat' ? 0x6a8a58 : 0x8a8070)
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.color.setHex(tint)
      const tree = treeById(node.mat)
      mesh.scale.setScalar(node.kind === 'tree' ? (tree?.cls === 'hard' ? 1.15 : 0.9) : node.kind === 'rock' ? 0.85 : 0.55)
    })
  }


  private syncPieces(): void {
    const needed = this.world.pieces.length
    while (this.pieceGroup.children.length < needed) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 0.84, metalness: 0.04 }),
      )
      m.castShadow = true
      m.receiveShadow = true
      this.pieceGroup.add(m)
    }
    const tint: Record<string, number> = { lean: 0x8a9a58, floor: 0x7a6a48, wall: 0x9a8a68, roof: 0x6a5840, door: 0x5a4834, den: 0x6a5a44 }
    this.pieceGroup.children.forEach((obj, i) => {
      const piece = this.world.pieces[i]
      const mesh = obj as THREE.Mesh
      if (!piece) {
        mesh.visible = false
        return
      }
      const def = pieceById(piece.kind)
      mesh.visible = true
      mesh.position.set(piece.x, piece.y, piece.z)
      mesh.rotation.set(0, -piece.yaw, 0)
      mesh.scale.set(def?.sx ?? 1, def?.sy ?? 1, def?.sz ?? 1)
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.color.setHex(tint[piece.kind] ?? 0xb89a6a)
    })
  }

  private updateGhost(): void {
    const you = playerOf(this.world)
    if (!this.buildMode) {
      this.ghost.visible = false
      return
    }
    const def = PIECES[this.buildIndex]
    if (!def) {
      this.ghost.visible = false
      return
    }
    const aim = this.aimPoint(you)
    const check = canPlace(this.world, you, def.id, aim.x, aim.y, aim.z, you.yaw + this.buildYaw, this.buildFree)
    this.ghost.visible = true
    this.ghost.position.set(check.pose.x, check.pose.y, check.pose.z)
    this.ghost.rotation.set(0, -check.pose.yaw, 0)
    this.ghost.scale.set(def.sx, def.sy, def.sz)
    const mat = this.ghost.material as THREE.MeshStandardMaterial
    mat.color.setHex(check.ok ? 0x6ec070 : 0xc05040)
    mat.opacity = 0.48
  }

  private applyCamFeel(dt: number): void {
    if (this.punch.t < this.punch.dur) {
      const u = Math.min(1, this.punch.t / this.punch.dur)
      const wave = Math.sin(Math.PI * u) * (1 - u)
      this.camera.position.x += wave * this.punch.amp * this.punch.ax
      this.camera.position.y += wave * this.punch.amp * this.punch.ay
      this.punch.t += dt
    }
    if (this.world.shake > 0) {
      const a = Math.min(0.1, this.world.shake * 0.28)
      this.camera.position.x += Math.sin(this.time * 8) * a
      this.camera.position.y += Math.cos(this.time * 6.2) * a * 0.35
    }
  }

  private applyTouchVisibility(): void {
    const show = this.playing && this.phoneLayout() && (!this.padOn || this.touchForced)
    const touch = document.getElementById('touch')
    const look = document.getElementById('look')
    if (touch) touch.hidden = !show
    if (look) look.hidden = !show
    this.syncTouchButtons()
  }

  private syncTouchButtons(): void {
    if (!this.playing) return
    const you = playerOf(this.world)
    const inWater = you.region === 'sea' || you.y < 5.8
    const dig = document.getElementById('t-act')
    const rise = document.getElementById('t-up')
    const dive = document.getElementById('t-dive')
    if (dig) dig.hidden = !canDig(you.load, you.spent)
    if (rise) rise.hidden = false
    if (dive) dive.hidden = !inWater
  }

  private revealTouch(): void {
    if (!this.padOn) return
    this.touchForced = true
    this.applyTouchVisibility()
  }

  private menuTargets(): HTMLElement[] {
    const pick = (ids: string[]) => ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el && !el.hidden)
    if (this.padHelpOpen) return pick(['pad-help-close'])
    if (this.quitOpen) return pick(['quit-save', 'quit-quit', 'quit-cancel'])
    if (this.pauseOpen) return pick(['pause-resume', 'pause-save', 'pause-load', 'pause-pad', 'settings-close', 'set-sens', 'set-invert', 'set-vol', 'set-mute', 'set-quality', 'set-restart'])
    if (this.evoOpen) {
      const body = [...document.querySelectorAll('#evo-body button, #evo-close')].filter((el): el is HTMLElement => el instanceof HTMLElement && !el.hidden && !(el as HTMLButtonElement).disabled)
      return body
    }
    if (this.selectOpen) return pick(['select-pause', 'select-evolve', 'select-quit'])
    if (this.mapOpen) return pick(['map-close'])
    if (!this.playing) return pick(['solo'])
    const over = document.getElementById('overlay')
    if (over && !over.hidden) return pick(['resume'])
    return []
  }

  private markFocus(): void {
    document.querySelectorAll('.pad-focus').forEach((el) => el.classList.remove('pad-focus'))
    const items = this.menuTargets()
    if (!items.length) return
    this.focusIndex = Math.max(0, Math.min(items.length - 1, this.focusIndex))
    items[this.focusIndex]?.classList.add('pad-focus')
  }

  private moveFocus(dir: number): void {
    const items = this.menuTargets()
    if (!items.length) return
    this.focusIndex = (this.focusIndex + dir + items.length) % items.length
    this.markFocus()
  }

  private activateFocus(nudge: number): void {
    const el = this.menuTargets()[this.focusIndex]
    if (!el) return
    if (el instanceof HTMLInputElement && el.type === 'range') {
      const step = Number(el.step) || 0.1
      el.value = String(Math.min(Number(el.max), Math.max(Number(el.min), Number(el.value) + nudge * step)))
      el.dispatchEvent(new Event('input', { bubbles: true }))
      return
    }
    if (el instanceof HTMLSelectElement && nudge) {
      el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + nudge))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }
    if (nudge) return
    el.click()
  }

  togglePadHelp(force?: boolean): void {
    this.padHelpOpen = force ?? !this.padHelpOpen
    const el = document.getElementById('pad-help')
    if (el) el.hidden = !this.padHelpOpen
    if (this.padHelpOpen) {
      this.focusIndex = 0
      this.markFocus()
    }
  }

  private pollPad(dt: number): void {
    const pads = navigator.getGamepads?.()
    const pad = pads ? Array.from(pads).find((p) => p && p.connected) ?? null : null
    const connected = !!pad
    const map = document.getElementById('pad-map')
    if (connected && !this.padOn) {
      this.padOn = true
      this.touchForced = false
      this.padPromptT = 2.2
      const prompt = document.getElementById('pad-prompt')
      if (prompt) {
        prompt.hidden = false
        prompt.textContent = 'Controller connected'
      }
      this.applyTouchVisibility()
    }
    if (!connected && this.padOn) {
      this.padOn = false
      this.touchForced = false
      this.padPrev = []
      this.navLatch = false
      this.padPromptT = 2.2
      const prompt = document.getElementById('pad-prompt')
      if (prompt) {
        prompt.hidden = false
        prompt.textContent = 'Controller disconnected'
      }
      this.applyTouchVisibility()
    }
    if (map) map.hidden = !this.padOn || !this.playing || this.selectOpen || this.pauseOpen || this.quitOpen || this.evoOpen || this.mapOpen || this.padHelpOpen
    this.gp = { lx: 0, ly: 0, rx: 0, ry: 0, attack: false, horn: false, dash: false, dig: false, rise: false, dive: false, sprint: false, use: false }
    if (!connected) return
    let layer: PadLayer = 'play'
    if (!this.playing) layer = 'title'
    else if (this.padHelpOpen || this.menuTargets().length && !this.buildMode) layer = 'menu'
    else if (this.mapOpen) layer = 'map'
    else if (this.buildMode) layer = 'build'
    // Pause/select/evo/quit take menu layer even if build is also on.
    if (this.padHelpOpen || this.selectOpen || this.pauseOpen || this.quitOpen || this.evoOpen) layer = this.playing ? 'menu' : 'title'
    if (this.mapOpen && layer === 'play') layer = 'map'
    const read = readPad(pad, this.padPrev, layer, this.navLatch)
    this.padPrev = read.prev
    this.navLatch = read.navLatch
    const f = read.frame
    if (f.using && this.touchForced) {
      this.touchForced = false
      this.applyTouchVisibility()
    }
    if (f.start && this.playing) {
      if (this.padHelpOpen) this.togglePadHelp(false)
      if (this.pauseOpen) this.togglePause(false)
      else {
        if (this.evoOpen) this.toggleEvo(false)
        if (this.quitOpen) this.toggleQuit(false)
        if (this.mapOpen) this.toggleMap(false)
        if (this.selectOpen) this.toggleSelect(false)
        this.togglePause(true)
      }
      return
    }
    if (f.view && this.playing) {
      if (this.padHelpOpen) this.togglePadHelp(false)
      if (this.selectOpen) this.toggleSelect(false)
      else {
        if (this.pauseOpen) this.togglePause(false)
        if (this.evoOpen) this.toggleEvo(false)
        if (this.quitOpen) this.toggleQuit(false)
        if (this.mapOpen) this.toggleMap(false)
        this.toggleSelect(true)
      }
      return
    }
    if (layer === 'map') {
      this.mapOffX += f.lx * dt * 36
      this.mapOffZ += f.ly * dt * 36
      if (f.back) this.toggleMap(false)
      return
    }
    if (layer === 'menu' || layer === 'title') {
      if (f.navUp) this.moveFocus(-1)
      if (f.navDown) this.moveFocus(1)
      this.sliderWait -= dt
      if (this.sliderWait <= 0 && (f.navLeft || f.navRight)) {
        this.activateFocus(f.navLeft ? -1 : 1)
        this.sliderWait = 0.16
      }
      if (f.confirm) this.activateFocus(0)
      if (f.back) this.closeTopMenu()
      return
    }
    if (Math.abs(f.rx) > 0) this.yawT -= f.rx * dt * 1.15 * this.lookSens
    if (Math.abs(f.ry) > 0) {
      const pitchDelta = (this.invertY ? f.ry : -f.ry) * dt * 0.7 * this.lookSens
      this.pitchT = Math.max(-1.15, Math.min(1.15, this.pitchT + pitchDelta))
    }
    if (layer === 'build') {
      if (f.cyclePrev) this.cyclePiece(-1)
      if (f.cycleNext) this.cyclePiece(1)
      if (f.rotateUp) this.buildYaw += Math.PI / 2
      else if (f.rotateDown) this.buildYaw -= Math.PI / 2
      if (f.place) this.confirmPlace()
      if (f.pickup) this.pickupPiece()
      if (f.leaveBuild) this.toggleBuild(false)
      this.gp = { lx: f.lx, ly: f.ly, rx: f.rx, ry: f.ry, attack: false, horn: false, dash: false, dig: false, rise: false, dive: false, sprint: f.sprint, use: false }
      return
    }
    if (f.build) this.toggleBuild(true)
    if (f.evolve) this.toggleEvo()
    if (f.lock) this.toggleLock()
    if (f.dash && this.cd.dash <= 0) {
      this.cd.dash = 1.05
      this.dashT = 0.2
    }
    if (f.horn && this.cd.horn <= 0) {
      this.cd.horn = 1.7
      this.hornT = 0.18
    }
    this.gp = {
      lx: f.lx,
      ly: f.ly,
      rx: f.rx,
      ry: f.ry,
      attack: f.bite,
      horn: false,
      dash: false,
      dig: f.dig,
      rise: f.rise,
      dive: f.dive,
      sprint: f.sprint,
      use: f.use,
    }
  }

  private drawMap(): void {
    const canvas = document.getElementById('map-canvas') as HTMLCanvasElement | null
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const you = playerOf(this.world)
    const w = canvas.width
    const h = canvas.height
    const cx = you.x + this.mapOffX
    const cz = you.z + this.mapOffZ
    const spanX = 160
    const spanZ = 96
    const toX = (x: number) => ((x - (cx - spanX / 2)) / spanX) * w
    const toY = (z: number) => ((z - (cz - spanZ / 2)) / spanZ) * h
    ctx.fillStyle = '#143840'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#6d7358'
    ctx.fillRect(toX(66), 0, w, h)
    ctx.fillStyle = '#d7cbb8'
    ctx.fillRect(toX(60), 0, Math.max(6, toX(72) - toX(60)), h)
    ctx.fillStyle = '#1d5560'
    for (const key of this.explored) {
      const [ix, iz] = key.split('|').map(Number)
      ctx.fillRect(toX(ix * 12), toY(iz * 12), Math.max(4, toX(12) - toX(0)), Math.max(4, toY(12) - toY(0)))
    }
    ctx.fillStyle = '#e7e0d4'
    ctx.beginPath()
    ctx.arc(toX(you.x), toY(you.z), 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#d4c4a4'
    ctx.font = '16px sans-serif'
    ctx.fillText('First shore', toX(76), Math.max(18, toY(-8)))
  }

  private gather(dt: number): Frame {
    const k = this.keys
    const left = k.has('a') || k.has('arrowleft')
    const right = k.has('d') || k.has('arrowright')
    const forwardKey = k.has('w') || k.has('arrowup')
    const backKey = k.has('s') || k.has('arrowdown')
    let camForward = (forwardKey ? 1 : 0) - (backKey ? 1 : 0) + this.stick.y - this.gp.ly
    let camStrafe = (right ? 1 : 0) - (left ? 1 : 0) + this.stick.x + this.gp.lx
    let jump = k.has(' ') || this.riseHeld || this.gp.rise
    const dive = k.has('c') || k.has('control') || this.diveHeld || this.gp.dive
    const sprint = k.has('shift') || this.gp.sprint
    let bite = !this.buildMode && (k.has('j') || this.mouseBite || this.gp.attack)
    let dig = false
    let use = false
    const you = playerOf(this.world)
    const orbit = this.yaw
    const lock = this.world.ents.find((e) => e.id === this.lockId && e.alive)
    if (!lock) this.lockId = 0
    if (this.dashT > 0) {
      if (Math.hypot(camForward, camStrafe) < 0.2) camForward = 1
      this.dashT -= dt
    }
    if (this.hornT > 0) {
      camForward = 1
      bite = true
      this.hornT -= dt
    }
    if ((this.actHeld || this.gp.dig || k.has('f')) && !this.buildMode) {
      if (this.pickupPiece()) {
        use = false
        dig = false
      } else {
        const near = this.world.nodes.some((n) => n.amount > 0 && Math.abs(n.x - you.x) < 2.2)
        if (near) use = true
        else dig = true
      }
    }
    if (this.buildMode && (this.actHeld || k.has('f'))) this.pickupPiece()
    if (!backKey && camForward > -0.2 && !this.buildMode) {
      const prey = nearestInCone(this.world, you)
      const near = prey ? Math.hypot(prey.x - you.x, prey.y - you.y, prey.z - you.z) : 99
      camForward = Math.min(1, camForward + (near < 2.4 ? 0.12 : 0.62))
    }
    // Camera-relative move; when locked, face the prey and strafe around it.
    let moveF = camForward
    let moveS = camStrafe
    if (lock) {
      const want = Math.atan2(lock.z - you.z, lock.x - you.x)
      let turn = want - you.yaw
      while (turn > Math.PI) turn -= Math.PI * 2
      while (turn < -Math.PI) turn += Math.PI * 2
      you.yaw += turn * Math.min(1, dt * 8)
      if (this.lookDragT <= 0) this.yawT += ((want - this.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.08
    } else if (Math.hypot(camForward, camStrafe) > 0.15) {
      const wish = Math.atan2(
        Math.sin(orbit) * camForward + Math.cos(orbit) * camStrafe,
        Math.cos(orbit) * camForward - Math.sin(orbit) * camStrafe,
      )
      let turn = wish - you.yaw
      while (turn > Math.PI) turn -= Math.PI * 2
      while (turn < -Math.PI) turn += Math.PI * 2
      you.yaw += turn * Math.min(1, dt * 8)
      moveF = Math.min(1, Math.hypot(camForward, camStrafe))
      moveS = 0
    }
    if (bite || this.lockId) {
      const aim = lock ?? nearestInCone(this.world, you)
      if (aim) {
        const adx = aim.x - you.x
        const adz = aim.z - you.z
        const want = Math.atan2(adz, adx)
        let turn = want - you.yaw
        while (turn > Math.PI) turn -= Math.PI * 2
        while (turn < -Math.PI) turn += Math.PI * 2
        you.yaw += turn * (bite ? 0.85 : 0.2)
        const dist = Math.hypot(adx, adz) || 1
        const wantP = Math.atan2(aim.y - you.y, dist) * 0.85
        this.pitch += (wantP - this.pitch) * (bite ? 0.55 : 0.12)
        this.pitchT = this.pitch
      }
    }
    you.pitch = this.pitch
    const fwd = Math.max(-1, Math.min(1, moveF))
    const ax = Math.max(-1, Math.min(1, moveS))
    const lookClimb = Math.max(-1, Math.min(1, Math.sin(this.pitch) * 1.25))
    const ay = dive ? -1 : jump ? 1 : lookClimb
    const ease = 1 - Math.exp(-dt * 12)
    this.sAx += (ax - this.sAx) * ease
    this.sAy += (fwd - this.sAy) * ease
    if (this.mouseUp) {
      this.mouseBite = false
      this.mouseUp = false
    }
    return {
      ax: this.sAx,
      ay,
      jump: jump || lookClimb > 0.2,
      bite,
      dig: k.has('f') || dig,
      use: k.has('g') || use,
      ink: false,
      dash: this.dashT > 0.12 || this.gp.dash,
      horn: this.hornT > 0.1 || this.gp.horn,
      forward: this.sAy,
      dive: dive || lookClimb < -0.2,
      sprint,
    }
  }

  private frame(): void {
    requestAnimationFrame(() => this.frame())
    const dt = Math.min(0.033, this.clock.getDelta())
    this.time += dt
    this.saveAcc += dt
    if (this.playing && this.saveAcc >= 8) {
      this.saveAcc = 0
      this.save()
    }
    this.waterU.value = this.time
    if (this.lookDragT > 0) this.lookDragT = Math.max(0, this.lookDragT - dt)
    this.easeLook(dt)
    this.pollPad(dt)
    if (this.playing) {
      const you = playerOf(this.world)
      this.explored.add(`${Math.floor(you.x / 12)}|${Math.floor(you.z / 12)}`)
    }
    if (this.mapOpen) this.drawMap()
    if (this.padPromptT > 0) {
      this.padPromptT -= dt
      if (this.padPromptT <= 0) document.getElementById('pad-prompt')?.setAttribute('hidden', '')
    }
    if (this.toastT > 0) {
      this.toastT -= dt
      if (this.toastT <= 0) document.getElementById('save-toast')?.setAttribute('hidden', '')
    }
    if (this.world.hitStop > 0) this.world.hitStop = Math.max(0, this.world.hitStop - dt)
    else if (this.playing && !this.paused && !this.evoOpen && !this.selectOpen && !this.pauseOpen && !this.quitOpen && !this.mapOpen && !this.world.over) {
      const ev = step(this.world, dt, this.gather(dt))
      for (const e of ev) {
        if (e.t !== 'note') this.feel(e.t === 'eat' ? 'eat' : e.t)
        if (e.t === 'hit' || e.t === 'hurt') {
          this.burst(e.x, e.y, e.t === 'hit' ? 0xffe6a0 : 0xc4b59a, e.text)
          if (e.t === 'hit') this.flashHit(e.x, e.y)
        }
        if (e.t === 'eat') {
          this.burst(e.x, e.y, 0xf0e0a8, e.text)
          this.world.hitStop = Math.max(this.world.hitStop, 0.055)
        }
        if (e.t === 'gate') this.burst(e.x, e.y, 0xd4c4a4, e.text)
        if (e.t === 'warn') this.flashHit(e.x, e.y)
        if (e.t === 'note' && e.text) {
          this.world.banner = e.text
          this.world.bannerT = Math.max(this.world.bannerT, 2.2)
        }
        if (e.t === 'eat') this.flashHit(e.x, e.y)
      }
    }
    this.sync()
    const you = playerOf(this.world)
    const sea = you.region === 'sea'
    this.placeCamera(you, dt)
    this.chunks?.update(you.x, you.z)
    this.chunks?.tick(this.time)
    const groundMat = this.chunks?.material as THREE.ShaderMaterial | undefined
    if (groundMat?.uniforms?.uTime) groundMat.uniforms.uTime.value = this.time
    this.cd.dash = Math.max(0, this.cd.dash - dt)
    this.cd.horn = Math.max(0, this.cd.horn - dt)
    this.cd.act = Math.max(0, this.cd.act - dt)
    this.cd.build = Math.max(0, this.cd.build - dt)
    ring('t-dash', this.cd.dash, 1.15)
    ring('t-horn', this.cd.horn, 1.7)
    ring('t-act', this.cd.act, 0.35)
    ring('t-build', this.cd.build, 0.4)
    ring('t-bite', you.biteCd, 0.42)
    const near = this.world.nodes.some((n) => n.amount > 0 && Math.abs(n.x - you.x) < 2.2)
    const actLbl = document.getElementById('t-act-lbl')
    const actBtn = document.getElementById('t-act')
    if (actLbl) actLbl.textContent = near ? 'Get' : 'Dig'
    actBtn?.setAttribute('aria-label', near ? 'Gather' : 'Dig')
    const tight = you.biteT > 0 || this.dashT > 0
    const ck = 1 - Math.exp(-dt * (tight ? 10 : 5.5))
    this.camPos.lerp(this.camGoal, ck)
    this.lookPos.lerp(this.lookGoal, 1 - Math.exp(-dt * (tight ? 8 : 5)))
    this.camera.position.copy(this.camPos)
    this.applyCamFeel(dt)
    this.camera.lookAt(this.lookPos)
    this.camera.updateProjectionMatrix()
    this.sun.position.set(you.x - 10, 18, 12)
    this.sun.target.position.set(you.x, 1, 0)
    const fog = this.scene.fog as THREE.Fog
    const under = this.camera.position.y < WATER && this.camera.position.x < 78
    const zone = you.region
    const fogColor = under
      ? new THREE.Color(0x46c8d0)
      : zone === 'volcano'
        ? new THREE.Color(0x8a4030)
        : zone === 'sea'
          ? new THREE.Color(0x7ee0e2)
          : new THREE.Color(0xe2d4b4)
    fog.color.lerp(fogColor, 0.35)
    fog.near = under ? (this.quality === 'low' ? 5 : 6) : zone === 'volcano' ? 12 : zone === 'sea' ? 22 : 26
    fog.far = under ? (this.quality === 'low' ? 22 : 28) : zone === 'volcano' ? 80 : zone === 'sea' ? 110 : 140
    this.renderer.setClearColor(under ? 0x46c8d0 : zone === 'volcano' ? 0x6a382c : zone === 'sea' ? 0x6ed4dc : 0xe2d4b4)
    this.renderer.toneMappingExposure = zone === 'volcano' ? 1.06 : under ? 1.18 : zone === 'sea' ? 1.22 : 1.24
    this.underBg.copy(fog.color)
    this.scene.background = under ? this.underBg : this.skyBg
    this.adaptResolution(dt)
    this.stepBubbles(dt, sea)
    this.stepShafts()
    this.syncNodes()
    this.syncPieces()
    this.updateGhost()
    if (this.hintLeft > 0) {
      this.hintLeft -= dt
      if (this.hintLeft <= 0) {
        const hint = document.getElementById('hint')
        if (hint) hint.hidden = true
      }
    }
    this.paintDebris()
    this.paintDebug()
    this.stepBursts(dt)
    this.stepFlash(dt)
    this.hud()
    if (this.evoOpen) this.paintPreview()
    this.renderer.render(this.scene, this.camera)
  }

  private flashHit(x: number, y: number): void {
    for (const group of this.meshes.values()) {
      if (Math.hypot(group.position.x - x, group.position.y - y) > 2.4) continue
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined
        if (!mat || !mat.emissive) return
        mat.emissive.setHex(0xfff1c4)
        mat.emissiveIntensity = 0.8
        group.userData.flash = 0.22
      })
    }
  }

  private stepFlash(dt: number): void {
    for (const group of this.meshes.values()) {
      if (!(group.userData.flash > 0)) continue
      group.userData.flash -= dt
      const on = group.userData.flash > 0
      group.traverse((obj) => {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
        if (!mat || !mat.emissive) return
        if (!on) {
          mat.emissive.setHex(0x000000)
          mat.emissiveIntensity = 0
        }
      })
    }
  }

  private burst(x: number, y: number, color: number, text: string): void {
    const you = playerOf(this.world)
    for (let i = 0; i < 12; i++) {
      let slot = this.bursts.find((b) => b.life <= 0)
      if (!slot) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), new THREE.MeshBasicMaterial({ color }))
        this.scene.add(m)
        slot = { m, v: new THREE.Vector3(), life: 0 }
        this.bursts.push(slot)
      }
      ;(slot.m.material as THREE.MeshBasicMaterial).color.setHex(color)
      slot.m.position.set(x, y + 0.2, you.z)
      slot.m.visible = true
      slot.v.set((Math.random() - 0.5) * 3.2, 0.6 + Math.random() * 2, (Math.random() - 0.5) * 2.2)
      slot.life = 0.55
    }
    if (!text) return
    const pop = document.createElement('span')
    pop.className = 'pop'
    pop.textContent = text
    document.body.appendChild(pop)
    const w = window.innerWidth
    const h = window.innerHeight
    pop.style.left = `${w * 0.5 + (x - playerOf(this.world).x) * 28}px`
    pop.style.top = `${h * 0.42 - (y - playerOf(this.world).y) * 28}px`
    window.setTimeout(() => pop.remove(), 700)
  }

  private stepBursts(dt: number): void {
    for (const b of this.bursts) {
      if (b.life <= 0) {
        b.m.visible = false
        continue
      }
      b.life -= dt
      b.v.y -= 3 * dt
      b.m.position.addScaledVector(b.v, dt)
    }
  }

  private paintDebris(): void {
    const list = this.world.debris
    while (this.debrisMeshes.length < list.length) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ color: 0x6d6256, roughness: 0.92 }))
      this.scene.add(m)
      this.debrisMeshes.push(m)
    }
    this.debrisMeshes.forEach((m, i) => {
      const d = list[i]
      m.visible = !!d
      if (d) m.position.set(d.x, d.y, 0)
    })
  }

  private adaptResolution(_dt: number): void {
    const now = performance.now()
    const ms = now - this.lastNow
    this.lastNow = now
    if (this.qualityMode !== 'auto') {
      this.resTick = 0
      return
    }
    this.resTick += ms
    if (this.resTick < 500) return
    this.resTick = 0
    const slow = ms > 42
    if (slow && this.quality === 'high') this.quality = 'mid'
    else if (slow && this.quality === 'mid') this.quality = 'low'
    else if (ms < 20 && this.quality === 'low') this.quality = 'mid'
    else return
    this.applyQuality()
  }

  private paintDebug(): void {
    this.debugLine.visible = false
    const btn = document.getElementById('hit')
    if (btn) btn.textContent = this.debug ? 'Hit on' : 'Hit'
    if (!this.debug) {
      for (const m of this.hitDebug) m.visible = false
      return
    }
    const vols: HitVol[] = []
    for (const e of this.world.ents) {
      if (!e.alive || e.kind === 'meat') continue
      vols.push(...attackVolumes(e.load, e.spent, e.kind === 'boss', e.species, e.x, e.y, e.z, e.yaw))
    }
    const colors = { jaw: 0xffe6a0, horn: 0xd4a0ff, claw: 0xa0e6ff }
    while (this.hitDebug.length < vols.length) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.8, depthTest: false }),
      )
      m.frustumCulled = false
      this.scene.add(m)
      this.hitDebug.push(m)
    }
    this.hitDebug.forEach((m, i) => {
      const v = vols[i]
      if (!v) {
        m.visible = false
        return
      }
      m.visible = true
      m.position.set(v.x, v.y, v.z)
      m.scale.setScalar(Math.max(0.06, v.r))
      ;(m.material as THREE.MeshBasicMaterial).color.setHex(colors[v.kind])
    })
  }

  private sync(): void {
    this.syncTouchButtons()
    const seen = new Set<number>()
    for (const e of this.world.ents) {
      if (!e.alive && e.kind !== 'player') {
        this.meshes.get(e.id)?.removeFromParent()
        continue
      }
      seen.add(e.id)
      const sig = creatureKey(e.load, e.spent, e.species) + e.kind
      let group = this.meshes.get(e.id)
      if (!group || this.keysigs.get(e.id) !== sig) {
        const from = group?.userData.viewS as { x: number; y: number; z: number } | undefined
        group?.removeFromParent()
        group = buildCreature(e.load, e.spent, e.kind === 'boss' ? 'boss' : e.kind === 'player' ? 'player' : 'npc', e.species)
        group.userData.targetS = { x: group.scale.x, y: group.scale.y, z: group.scale.z }
        group.userData.viewS = from ?? { x: group.scale.x, y: group.scale.y, z: group.scale.z }
        if (from) group.scale.set(from.x, from.y, from.z)
        this.scene.add(group)
        this.meshes.set(e.id, group)
        this.keysigs.set(e.id, sig)
      }
      const wantS = (group.userData.targetS ?? { x: group.scale.x, y: group.scale.y, z: group.scale.z }) as { x: number; y: number; z: number }
      const viewS = (group.userData.viewS ?? wantS) as { x: number; y: number; z: number }
      const sk = e.kind === 'player' ? 1 - Math.exp(-0.048 * 3.2) : 1
      viewS.x += (wantS.x - viewS.x) * sk
      viewS.y += (wantS.y - viewS.y) * sk
      viewS.z += (wantS.z - viewS.z) * sk
      group.userData.viewS = viewS
      group.scale.set(viewS.x, viewS.y, viewS.z)
      const y = e.kind === 'player' || e.region !== 'sea' ? Math.max(e.y, 1.05) : e.y
      group.userData.baseY = y
      group.userData.yaw = e.yaw
      group.position.set(e.x, y, e.z)
      group.visible = true
      poseCreature(group, this.time + e.salt, Math.abs(e.vx) + Math.abs(e.vy) > 0.25, e.biteT > 0 || e.tele > 0 ? 1 : 0, e.facing)
      if (e.tele > 0) {
        group.userData.teleGlow = true
        const pulse = 0.4 + Math.sin(this.time * 14) * 0.3
        group.traverse((obj) => {
          const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
          if (!mat || !mat.emissive) return
          mat.emissive.setHex(0xff6a3a)
          mat.emissiveIntensity = pulse
        })
      } else if (group.userData.teleGlow && !(group.userData.flash > 0)) {
        group.userData.teleGlow = false
        group.traverse((obj) => {
          const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
          if (!mat || !mat.emissive) return
          mat.emissive.setHex(0x000000)
          mat.emissiveIntensity = 0
        })
      }
      const hp = group.userData.hp as THREE.Object3D | undefined
      if (hp) hp.scale.x = Math.max(0.05, e.hp / e.maxHp)
    }
    for (const [id, group] of this.meshes) {
      if (!seen.has(id)) {
        group.removeFromParent()
        this.meshes.delete(id)
        this.keysigs.delete(id)
      }
    }
  }

  private paintPreview(): void {
    const canvas = document.getElementById('evo-preview') as HTMLCanvasElement | null
    if (!canvas || !this.evoOpen) return
    if (!this.preview) {
      this.preview = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      this.preview.setSize(320, 180, false)
      this.preview.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      this.preview.outputColorSpace = THREE.SRGBColorSpace
      this.previewScene = new THREE.Scene()
      this.previewScene.background = new THREE.Color(0x143840)
      this.previewScene.add(new THREE.HemisphereLight(0xffe2c4, 0x1a4450, 1.1))
      const sun = new THREE.DirectionalLight(0xfff1d0, 1.2)
      sun.position.set(2, 3, 4)
      this.previewScene.add(sun)
    }
    const you = playerOf(this.world)
    const fish = buildCreature(you.load, you.spent, 'player', you.species)
    fish.rotation.y = 0.55
    const bar = fish.getObjectByName('hp')
    if (bar) bar.visible = false
    this.previewScene?.children.filter((c) => c.type === 'Group').forEach((c) => c.removeFromParent())
    this.previewScene?.add(fish)
    const cam = new THREE.PerspectiveCamera(32, 320 / 180, 0.05, 20)
    cam.position.set(1.8, 0.42, 2.5)
    cam.lookAt(0, 0, 0)
    this.preview?.render(this.previewScene!, cam)
  }

  private hud(): void {
    const you = playerOf(this.world)
    const set = (id: string, text: string) => {
      const el = document.getElementById(id)
      if (el) el.textContent = text
    }
    const tier = tierOf(you.spent)
    const goal = fishGoal(you.spent, you.ep)
    const prev = TIER_SPENT[Math.min(tier, 3) - 1] ?? 0
    const nextMark = tier >= 3 ? null : TIER_SPENT[tier]
    const growth = nextMark == null ? 100 : Math.round(((you.spent - prev) / Math.max(1, nextMark - prev)) * 100)
    set('hp', `HP ${Math.ceil(you.hp)}/${you.maxHp}`)
    set('ep', goal.next ? `EP ${Math.floor(you.ep)}/${goal.cost}` : `EP ${Math.floor(you.ep)}`)
    const stageName = goal.stage.charAt(0).toUpperCase() + goal.stage.slice(1)
    set('tier', tier >= 3 ? 'Sturgeon · Tier 3/3' : `${stageName} · Tier ${tier}/3 · Growth ${growth}%`)
    set('goal', earlyGoal(this.world, you, goal.line))
    const grow = document.getElementById('grow') as HTMLButtonElement | null
    if (grow) {
      grow.hidden = !goal.next
      if (goal.next) {
        grow.disabled = you.ep < goal.cost
        grow.textContent = you.ep < goal.cost ? `Need ${goal.cost} EP for a ${goal.next}` : `Grow a ${goal.next} · ${goal.cost} EP`
      }
    }
    if (!this.shoreTold && tier >= 3 && you.x >= 66) {
      this.shoreTold = true
      this.world.banner = 'The first shore. Next: keep growing inland.'
      this.world.bannerT = 8
    }
    const digBtn = document.getElementById('t-act') as HTMLButtonElement | null
    const locked = tier < 3
    if (digBtn) {
      digBtn.disabled = locked
      digBtn.title = locked ? 'Unlocks at Tier 3' : 'Dig'
      if (locked) {
        const lbl = document.getElementById('t-act-lbl')
        if (lbl) lbl.textContent = 'Tier 3'
        digBtn.setAttribute('aria-label', 'Unlocks at Tier 3')
      }
    }
    set('banner', this.world.bannerT > 0 ? this.world.banner : '')
    const lockEl = document.getElementById('lock-tag')
    const lockedPrey = this.world.ents.find((e) => e.id === this.lockId && e.alive)
    if (lockEl) {
      lockEl.hidden = !lockedPrey
      lockEl.textContent = lockedPrey ? `Lock · ${lockedPrey.name}` : ''
    }
    const over = document.getElementById('overlay')
    const again = document.getElementById('resume')
    if (over) over.hidden = !this.world.over
    if (this.world.over) {
      set('overlay-title', 'The body fails')
      set('overlay-text', 'Your parts stay with you. Wake in the shallows and try again.')
      if (again) again.textContent = 'Retry'
    }
  }

  save(): void {
    try {
      const data = encodeGameSave(this.world)
      const raw = serializeGameSave(data)
      this.lastSaved = raw
      localStorage.setItem(SAVE, raw)
    } catch {
      /* ignore */
    }
  }

  load(): void {
    try {
      const raw = localStorage.getItem(SAVE)
      if (!raw) return
      const data = parseGameSave(raw)
      if (!data) return
      applyGameSave(this.world, data)
      this.lastSaved = serializeGameSave(encodeGameSave(this.world))
      const you = playerOf(this.world)
      this.yaw = you.yaw
      this.yawT = you.yaw
      this.pitch = you.pitch
      this.pitchT = you.pitch
    } catch {
      /* ignore */
    }
  }
}

export function mount(): Game | null {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement
  let game: Game
  try {
    game = new Game(canvas)
  } catch (err) {
    const msg = document.getElementById('title-msg')
    if (msg) msg.textContent = err instanceof Error ? err.message : 'WebGL is unavailable here.'
    return null
  }
  const api = {
    ready: true,
    game,
    start: () => game.start(),
    snapshot: () => {
      const you = playerOf(game.world)
      return { x: you.x, y: you.y, hp: you.hp, ep: you.ep, spent: you.spent, eats: game.world.eats, tier: tierOf(you.spent), jaw: you.load.jaw, wings: you.load.wings, region: you.region, pvp: game.world.pvp, bases: game.world.bases.length, raiders: game.world.raiders.length, pieces: game.world.pieces.length, lockId: game['lockId'], buildMode: game['buildMode'], selectOpen: game.selectOpen, pauseOpen: game.pauseOpen, evoOpen: game.evoOpen, quitOpen: game.quitOpen, playing: game.playing }
    },
    toggleBuild: (on?: boolean) => game.toggleBuild(on),
    toggleLock: () => game.toggleLock(),
    toggleSelect: (on?: boolean) => game.toggleSelect(on),
    togglePause: (on?: boolean) => game.togglePause(on),
    toggleQuit: (on?: boolean) => game.toggleQuit(on),
    resume: () => game['resumePlay'](),
    save: () => game.manualSave(),
    load: () => game.manualLoad(),
    quit: (saveFirst?: boolean) => game.quitToTitle(!!saveFirst),
    place: () => game['confirmPlace'](),
    pickup: () => game['pickupPiece'](),
    cycle: (dir: number) => game['cyclePiece'](dir),
  }
  ;(window as unknown as { evo: typeof api }).evo = api
  return game
}

function earlyGoal(w: World, you: Ent, fallback: string): string {
  const guppy = you.spent < 12 && you.load.legs === 0 && you.load.size <= 0.55
  if (guppy && w.eats < 5) return `Eat 5 fish (${w.eats}/5)`
  if (you.load.lungs < 1) {
    if (you.spent < 12) return 'Grow lungs — first grow a steelhead, then Evolve (E)'
    return you.ep >= 6 ? 'Grow lungs — open Evolve (E)' : 'Grow lungs — earn 6 EP, then Evolve (E)'
  }
  const mine = w.bases.some((b) => b.owner === you.id) || w.pieces.some((p) => p.owner === you.id && (p.kind === 'lean' || p.kind === 'den'))
  if (!mine) return 'Dig a den — gather 2 kelp, then Build (B) and place a lean-to'
  if (you.x < 66) return 'Reach the first shore'
  const boss = w.ents.find((e) => e.kind === 'boss')
  if (boss?.alive) return 'The Strand Colossus bars the inland. Defeat it to pass.'
  if (w.gateOpen && you.x < 168) return 'The inland is open. Keep growing.'
  return fallback
}

function ring(id: string, left: number, max: number): void {
  const circle = document.querySelector(`#${id} .ring circle`) as SVGCircleElement | null
  if (!circle) return
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, left / max))
  circle.style.strokeDashoffset = String(pct * 97.4)
}

function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, 0, 256)
  grd.addColorStop(0, '#d9cbb6')
  grd.addColorStop(0.42, '#9eb4b4')
  grd.addColorStop(0.62, '#c9b89a')
  grd.addColorStop(1, '#1a3c46')
  g.fillStyle = grd
  g.fillRect(0, 0, 4, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}


function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  return target.isContentEditable
}

const GAME_KEYS = new Set([
  ' ', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'w', 'a', 's', 'd', 'W', 'A', 'S', 'D',
  'q', 'e', 'r', 'f', 'b', 'c', 'm', 'h', 'v', 'j', 'g',
  'Q', 'E', 'R', 'F', 'B', 'C', 'M', 'H', 'V', 'J', 'G',
  'Shift', 'Control', '[', ']', 'Escape',
])

function shouldGuardKey(e: KeyboardEvent, playing: boolean): boolean {
  if (e.metaKey || (e.ctrlKey && e.key !== 'Control')) return false
  if (e.key === 'Tab' || e.key === ' ' || e.key.startsWith('Arrow')) return true
  return playing && GAME_KEYS.has(e.key)
}

