import * as THREE from 'three'
import { ARM_TYPES, BREAKERS, BUILDINGS, COLOR_NAMES, COLORS, CUTTERS, DEFENSES, FEET, FIN_LINE, GEMS, HORNS, JAWS, ROCK_TINT, SKINS, TAIL_LINE, TEETH, TREE_TINT, TIER_SPENT, WING_STYLES, treeById } from '../shared/catalog'
import { applyWorldSnapshot, buildAt, createWorld, nearestInCone, placeDefense, playerOf, snapshotWorld, step, tryPurchase, type Ent, type Frame, type World } from '../shared/sim'
import { defenseCap, fishGoal, growFish, hideStock, tierOf } from '../shared/rules'
import { audio } from './audio'
import { attackVolumes, type HitVol } from '../shared/body'
import { buildCreature, creatureKey, poseCreature } from './mesh'
import { ChunkWorld } from './chunks'
import { buildWater, loadPbr, setTerrainQuality } from './world3d'
import { WATER, exportCarves, groundAt, importCarves } from '../shared/terrain'

const SAVE = 'evo2.eden.v2'

export class Game {
  world: World
  playing = false
  paused = false
  evoOpen = false
  settingsOpen = false
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
  private touchForced = false
  private padPrev: boolean[] = []
  private focusIndex = 0
  private navLatch = false
  private sliderWait = 0
  private padPromptT = 0
  private gp = { lx: 0, ly: 0, rx: 0, ry: 0, attack: false, dig: false, rise: false, dive: false }
  private camPos = new THREE.Vector3(8, 4, 9)
  private lookPos = new THREE.Vector3(10, 2, 0)
  private camGoal = new THREE.Vector3()
  private lookGoal = new THREE.Vector3()
  private camDist = 6.4
  private firstPerson = false
  private yaw = 0.4
  private pitch = 0.05
  private yawT = 0.4
  private pitchT = 0.05
  private lookId = -1
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
    this.renderer.setClearColor(0x1c3a42)
    this.scene.fog = new THREE.Fog(0x7f9698, 16, 46)
    this.scene.background = skyTexture()
    this.scene.add(new THREE.HemisphereLight(0xffe2c4, 0x3a5560, 0.85))
    this.sun = new THREE.DirectionalLight(0xffe4bc, 1.7)
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
    const cool = new THREE.DirectionalLight(0x8eb4c4, 0.38)
    cool.position.set(-8, 4, -6)
    this.scene.add(cool)
    this.scene.add(this.decor)
    this.scene.add(this.nodeGroup)
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
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      this.keys.add(e.key.toLowerCase())
      if (e.key === 'e' || e.key === 'E') this.toggleEvo()
      if (e.key === 'b' || e.key === 'B') this.toggleBuild()
      if (e.key === 'Escape') {
        if (this.mapOpen) this.toggleMap(false)
        else if (this.settingsOpen) this.toggleSettings(false)
        else if (this.playing) this.toggleSettings(true)
      }
      if ((e.key === 'm' || e.key === 'M') && !(e.target instanceof HTMLInputElement)) this.toggleMap()
      if (e.key === 'h' || e.key === 'H') this.debug = !this.debug
      if (e.key === 'v' || e.key === 'V') this.firstPerson = !this.firstPerson
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
    this.camDist = this.firstPerson ? 0.45 : wide ? 6.2 : 8
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
    }
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
    document.getElementById('settings-close')?.addEventListener('click', () => this.toggleSettings(false))
    document.getElementById('t-settings')?.addEventListener('click', () => this.toggleSettings())
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
      if (document.pointerLockElement !== view) return
      this.applyLook(e.movementX, e.movementY, 0.00115)
    })
    const look = document.getElementById('look')
    look?.addEventListener('pointerdown', (e) => {
      if (!this.playing) return
      this.lookId = e.pointerId
      look.setPointerCapture(e.pointerId)
    })
    look?.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return
      this.applyLook(e.movementX, e.movementY, 0.0024)
    })
    const endLook = (e: PointerEvent) => {
      if (e.pointerId === this.lookId) this.lookId = -1
    }
    look?.addEventListener('pointerup', endLook)
    look?.addEventListener('pointercancel', endLook)
    document.getElementById('view')?.addEventListener('pointerup', (e) => {
      e.preventDefault()
      this.firstPerson = !this.firstPerson
    })
    view.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button === 0 && document.pointerLockElement === view) this.mouseBite = true
    })
    view.addEventListener('pointerup', () => {
      this.mouseUp = true
    })
  }

  private guardSurface(): void {
    window.addEventListener('contextmenu', (e) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, #title, .panel, #overlay')) return
      e.preventDefault()
    })
    const nodes = document.querySelectorAll('canvas, #stick, #t-bite, #t-up, #t-dive, #t-dash, #t-horn, #t-act, #t-build')
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
    document.getElementById('t-evo')?.addEventListener('pointerup', (e) => {
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

  toggleSettings(force?: boolean): void {
    this.settingsOpen = force ?? !this.settingsOpen
    const el = document.getElementById('settings')
    if (el) el.hidden = !this.settingsOpen
    if (this.settingsOpen) this.focusIndex = 0
    this.syncPause()
    this.markFocus()
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
    this.paused = this.settingsOpen || (this.mapOpen && !this.liveMultiplayer)
  }

  restart(): void {
    for (const group of this.meshes.values()) group.removeFromParent()
    this.meshes.clear()
    this.keysigs.clear()
    this.world = createWorld()
    this.playing = false
    this.paused = false
    this.settingsOpen = false
    this.mapOpen = false
    this.explored.clear()
    document.getElementById('map')?.setAttribute('hidden', '')
    this.shoreTold = false
    this.evoOpen = false
    this.buildOpen = false
    this.yaw = 0.4
    this.pitch = 0.05
    this.yawT = 0.4
    this.pitchT = 0.05
    for (const id of ['settings', 'evo', 'build', 'hud', 'overlay']) document.getElementById(id)?.setAttribute('hidden', '')
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
    if (hint && !localStorage.getItem('evo2.hinted')) {
      hint.hidden = false
      hint.textContent = touch
        ? 'Eat 5 fish to start. The left stick steers. Drag the right side to look. Attack locks on and lunges. When a predator flashes, swim aside.'
        : 'Eat 5 fish to start. Mouse looks, click bites, WASD steers. E evolves. When a predator flashes, dart aside.'
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
  }

  toggleBuild(force?: boolean): void {
    this.buildOpen = force ?? !this.buildOpen
    const el = document.getElementById('build')
    if (!el) return
    el.hidden = !this.buildOpen
    if (this.buildOpen) this.renderBuild()
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
    const root = document.getElementById('build-body')
    if (!root) return
    const you = playerOf(this.world)
    const bits = [
      ...BUILDINGS.map((b) => `<button data-build="${b.id}">${b.name} · tier ${b.tier}</button>`),
      ...DEFENSES.map((d) => `<button data-def="${d.id}">${d.name} · tier ${d.tier} · cap ${defenseCap(tierOf(you.spent))}</button>`),
    ]
    root.innerHTML = bits.join('')
    root.querySelectorAll('button').forEach((btn) =>
      btn.addEventListener('click', () => {
        const el = btn as HTMLButtonElement
        const result = el.dataset.build ? buildAt(this.world, el.dataset.build) : placeDefense(this.world, el.dataset.def ?? '')
        this.world.banner = result.reason
        this.world.bannerT = 2
        if (result.ok) this.feel('dig')
        else audio.blip('hurt')
        this.save()
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

  private placeCamera(you: Ent, _dt: number): void {
    const aheadX = Math.cos(you.yaw)
    const aheadZ = Math.sin(you.yaw)
    const lookX = aheadX * 0.35 * you.vx + you.x
    const lookZ = aheadZ * 0.35 * you.vz + you.z
    if (this.firstPerson) {
      this.camGoal.set(you.x - aheadX * 0.15, you.y + 0.32, you.z - aheadZ * 0.15)
      this.lookGoal.set(you.x + aheadX * 1.4, you.y + 0.04 + Math.sin(this.pitch) * 1.2, you.z + aheadZ * 1.4)
      this.camera.near = 0.04
      return
    }
    this.camera.near = 0.1
    const tight = you.biteT > 0 || this.dashT > 0
    const dist = this.camDist * (tight ? 0.62 : 1)
    const height = tight ? 1.15 : 1.7
    this.camGoal.set(you.x - aheadX * dist, you.y + height, you.z - aheadZ * dist)
    this.lookGoal.set(lookX + aheadX * 8, you.y + 0.5 + Math.sin(this.pitch) * 4, lookZ + aheadZ * 8)
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
  }

  private revealTouch(): void {
    if (!this.padOn) return
    this.touchForced = true
    this.applyTouchVisibility()
  }

  private menuTargets(): HTMLElement[] {
    const pick = (ids: string[]) => ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el && !el.hidden)
    if (this.settingsOpen) return pick(['settings-close', 'set-sens', 'set-invert', 'set-vol', 'set-mute', 'set-quality', 'set-restart'])
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

  private pollPad(dt: number): void {
    const pads = navigator.getGamepads?.()
    const pad = pads ? Array.from(pads).find((p) => p && p.connected) ?? null : null
    const connected = !!pad
    if (connected && !this.padOn) {
      this.padOn = true
      this.touchForced = false
      this.padPromptT = 2.4
      const prompt = document.getElementById('pad-prompt')
      if (prompt) prompt.hidden = false
      this.applyTouchVisibility()
    }
    if (!connected && this.padOn) {
      this.padOn = false
      this.touchForced = false
      this.applyTouchVisibility()
    }
    this.gp = { lx: 0, ly: 0, rx: 0, ry: 0, attack: false, dig: false, rise: false, dive: false }
    const remember = () => {
      for (let i = 0; i < 16; i++) this.padPrev[i] = pressed(i)
    }
    if (!pad) return
    const pressed = (i: number) => !!pad.buttons[i]?.pressed
    const edge = (i: number) => {
      const now = pressed(i)
      const was = this.padPrev[i] ?? false
      this.padPrev[i] = now
      return now && !was
    }
    const lx = pad.axes[0] ?? 0
    const ly = pad.axes[1] ?? 0
    const rx = pad.axes[2] ?? 0
    const ry = pad.axes[3] ?? 0
    const using = pad.buttons.some((b) => b.pressed) || Math.hypot(lx, ly, rx, ry) > 0.28
    if (using && this.touchForced) {
      this.touchForced = false
      this.applyTouchVisibility()
    }
    if (edge(9)) this.toggleMap()
    if (edge(8)) this.toggleSettings()
    const menu = this.menuTargets()
    if (this.mapOpen && !this.settingsOpen) {
      this.mapOffX += lx * dt * 36
      this.mapOffZ += ly * dt * 36
      if (edge(1)) this.toggleMap(false)
      remember()
      return
    }
    if (menu.length) {
      const up = edge(12) || (ly < -0.65 && !this.navLatch)
      const down = edge(13) || (ly > 0.65 && !this.navLatch)
      this.navLatch = Math.abs(ly) > 0.65
      if (up) this.moveFocus(-1)
      if (down) this.moveFocus(1)
      this.sliderWait -= dt
      if (this.sliderWait <= 0 && (Math.abs(lx) > 0.55 || pressed(14) || pressed(15))) {
        this.activateFocus(lx < 0 || pressed(14) ? -1 : 1)
        this.sliderWait = 0.16
      }
      if (edge(0)) this.activateFocus(0)
      if (edge(1)) {
        if (this.settingsOpen) this.toggleSettings(false)
        else if (this.mapOpen) this.toggleMap(false)
      }
      remember()
      return
    }
    remember()
    this.gp = { lx, ly, rx, ry, attack: pressed(0), dig: pressed(1), dive: pressed(2), rise: pressed(3) }
    if (Math.abs(rx) > 0.18) this.yawT -= rx * dt * 0.85 * this.lookSens
    if (Math.abs(ry) > 0.18) {
      const pitchDelta = (this.invertY ? ry : -ry) * dt * 0.55 * this.lookSens
      this.pitchT = Math.max(-1.05, Math.min(1.05, this.pitchT + pitchDelta))
    }
    if (edge(4)) {
      if (this.cd.dash <= 0) {
        this.cd.dash = 1.15
        this.dashT = 0.2
      }
    }
    if (edge(5)) {
      if (this.cd.horn <= 0) {
        this.cd.horn = 1.7
        this.hornT = 0.18
      }
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
    let forward = (forwardKey ? 1 : 0) - (backKey ? 1 : 0) + this.stick.y - (Math.abs(this.gp.ly) > 0.2 ? this.gp.ly : 0)
    let ax = (right ? 1 : 0) - (left ? 1 : 0) + this.stick.x + (Math.abs(this.gp.lx) > 0.2 ? this.gp.lx : 0)
    let ay = 0
    let jump = k.has(' ') || this.riseHeld || this.gp.rise
    const dive = k.has('shift') || k.has('c') || this.diveHeld || this.gp.dive
    let bite = k.has('j') || this.mouseBite || this.gp.attack
    let dig = false
    let use = false
    const you = playerOf(this.world)
    if (this.dashT > 0) {
      forward = 1
      this.dashT -= dt
    }
    if (this.hornT > 0) {
      forward = 1
      bite = true
      this.hornT -= dt
    }
    if (this.actHeld || this.gp.dig) {
      const near = this.world.nodes.some((n) => n.amount > 0 && Math.abs(n.x - you.x) < 2.2)
      if (near) use = true
      else dig = true
    }
    if (!backKey && forward > -0.2) forward = Math.min(1, forward + 0.62)
    if (bite) {
      const aim = nearestInCone(this.world, you)
      if (aim) {
        const adx = aim.x - you.x
        const adz = aim.z - you.z
        const want = Math.atan2(adz, adx)
        let turn = want - this.yaw
        while (turn > Math.PI) turn -= Math.PI * 2
        while (turn < -Math.PI) turn += Math.PI * 2
        this.yaw += turn * 0.9
        this.yawT = this.yaw
        const dist = Math.hypot(adx, adz) || 1
        const wantP = Math.atan2(aim.y - you.y, dist) * 0.85
        this.pitch += (wantP - this.pitch) * 0.55
        this.pitchT = this.pitch
      }
    }
    you.yaw = this.yaw
    you.pitch = this.pitch
    ax = Math.max(-1, Math.min(1, ax))
    forward = Math.max(-1, Math.min(1, forward))
    const lookClimb = Math.max(-1, Math.min(1, Math.sin(this.pitch) * 1.25))
    ay = dive ? -1 : jump ? 1 : lookClimb
    const ease = 1 - Math.exp(-dt * 12)
    this.sAx += (ax - this.sAx) * ease
    this.sAy += (forward - this.sAy) * ease
    if (this.mouseUp) {
      this.mouseBite = false
      this.mouseUp = false
    }
    return { ax: this.sAx, ay, jump: jump || lookClimb > 0.2, bite, dig: k.has('f') || dig, use: k.has('g') || use, ink: k.has('q'), dash: this.dashT > 0.12, horn: this.hornT > 0.1, forward: this.sAy, dive: dive || lookClimb < -0.2 }
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
    if (this.world.hitStop > 0) this.world.hitStop = Math.max(0, this.world.hitStop - dt)
    else if (this.playing && !this.paused && !this.evoOpen && !this.buildOpen && !this.world.over) {
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
      ? new THREE.Color(0x0a5460)
      : zone === 'volcano'
        ? new THREE.Color(0x8a4030)
        : zone === 'sea'
          ? new THREE.Color(0x6aa8b0)
          : new THREE.Color(0xd2c4a4)
    fog.color.lerp(fogColor, 0.2)
    fog.near = under ? 2 : zone === 'volcano' ? 10 : zone === 'sea' ? 16 : 20
    fog.far = under ? 26 : zone === 'volcano' ? 70 : zone === 'sea' ? 90 : 120
    this.renderer.setClearColor(under ? 0x083e48 : zone === 'volcano' ? 0x6a382c : zone === 'sea' ? 0x7eb4b8 : 0xd2c4a4)
    this.renderer.toneMappingExposure = zone === 'volcano' ? 1.06 : zone === 'sea' ? 1.16 : 1.2
    this.adaptResolution(dt)
    this.stepBubbles(dt, sea)
    this.syncNodes()
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
        group?.removeFromParent()
        group = buildCreature(e.load, e.spent, e.kind === 'boss' ? 'boss' : e.kind === 'player' ? 'player' : 'npc', e.species)
        this.scene.add(group)
        this.meshes.set(e.id, group)
        this.keysigs.set(e.id, sig)
      }
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
    const you = playerOf(this.world)
    try {
      const world = snapshotWorld(this.world)
      localStorage.setItem(
        SAVE,
        JSON.stringify({
          name: you.name,
          ep: you.ep,
          spent: you.spent,
          load: you.load,
          unlocked: you.unlocked,
          bag: you.bag,
          gems: you.gems,
          clan: you.clan,
          terrain: exportCarves(),
          columns: world.columns,
          nodes: world.nodes,
          bases: world.bases,
        }),
      )
    } catch {
      /* ignore */
    }
  }

  load(): void {
    try {
      const raw = localStorage.getItem(SAVE)
      if (!raw) return
      const data = JSON.parse(raw) as Partial<Ent> & {
        terrain?: unknown
        columns?: { x: number; dug: number; prog: number }[]
        nodes?: { id: number; mat: string; amount: number; hp: number }[]
        bases?: import('../shared/sim').Base[]
      }
      const you = playerOf(this.world)
      if (data.load) you.load = { ...you.load, ...data.load }
      if (typeof data.ep === 'number') you.ep = data.ep
      if (typeof data.spent === 'number') you.spent = data.spent
      if (data.unlocked) you.unlocked = data.unlocked
      if (data.bag) you.bag = data.bag
      if (data.gems) you.gems = data.gems
      if (data.name) you.name = data.name
      if (typeof data.clan === 'string') you.clan = data.clan
      if (data.terrain) importCarves(data.terrain)
      applyWorldSnapshot(this.world, data)
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
      return { x: you.x, y: you.y, hp: you.hp, ep: you.ep, spent: you.spent, tier: tierOf(you.spent), jaw: you.load.jaw, wings: you.load.wings, region: you.region, pvp: game.world.pvp, bases: game.world.bases.length, raiders: game.world.raiders.length }
    },
  }
  ;(window as unknown as { evo: typeof api }).evo = api
  return game
}

function earlyGoal(w: World, you: Ent, fallback: string): string {
  if (w.eats < 5) return `Eat 5 fish (${w.eats}/5)`
  if (you.load.lungs < 1) {
    if (you.spent < 12) return 'Grow lungs — first grow a steelhead, then Evolve (E)'
    return you.ep >= 6 ? 'Grow lungs — open Evolve (E)' : 'Grow lungs — earn 6 EP, then Evolve (E)'
  }
  const mine = w.bases.some((b) => b.owner === you.id)
  if (!mine) return 'Dig a den — gather 2 kelp, then Build (B) a lean-to'
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

