import * as THREE from 'three'
import { ARM_TYPES, BREAKERS, BUILDINGS, COLOR_NAMES, COLORS, CUTTERS, DEFENSES, FEET, FIN_LINE, GEMS, HORNS, JAWS, TAIL_LINE, TEETH, WING_STYLES } from '../shared/catalog'
import { buildAt, createWorld, placeDefense, playerOf, step, tryPurchase, type Ent, type Frame, type World } from '../shared/sim'
import { defenseCap, landOk, tierOf } from '../shared/rules'
import { audio } from './audio'
import { buildCreature, creatureKey, poseCreature } from './mesh'

const SAVE = 'evo2.eden.v2'

export class Game {
  world: World
  playing = false
  paused = false
  evoOpen = false
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
  private bubbles: THREE.Mesh[] = []
  private sAx = 0
  private sAy = 0
  private stick = { x: 0, y: 0 }
  private mouseBite = false
  private mouseUp = false
  private quality: 'high' | 'low'
  private camPos = new THREE.Vector3(8, 4, 9)
  private lookPos = new THREE.Vector3(10, 2, 0)
  private camGoal = new THREE.Vector3()
  private lookGoal = new THREE.Vector3()
  private camDist = 8.4
  private hintLeft = 0
  private dashT = 0
  private hornT = 0
  private actHeld = false
  private cd = { dash: 0, horn: 0, act: 0, build: 0 }

  constructor(canvas: HTMLCanvasElement) {
    this.world = createWorld()
    const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerHeight <= 520
    this.quality = coarse ? 'low' : 'high'
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === 'high', powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = this.quality === 'high'
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setPixelRatio(this.quality === 'high' ? Math.min(1.5, window.devicePixelRatio || 1) : 1)
    this.renderer.setClearColor(0x1c3a42)
    this.scene.fog = new THREE.Fog(0x7f9698, 16, 46)
    this.scene.background = skyTexture()
    this.scene.add(new THREE.HemisphereLight(0xffe2c4, 0x3a5560, 0.72))
    this.sun = new THREE.DirectionalLight(0xffd7a8, 1.45)
    this.sun.position.set(12, 18, 10)
    this.sun.castShadow = this.quality === 'high'
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
    this.paintWorld()
    this.resize()
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      this.keys.add(e.key.toLowerCase())
      if (e.key === 'e' || e.key === 'E') this.toggleEvo()
      if (e.key === 'b' || e.key === 'B') this.toggleBuild()
      if (e.key === 'Escape') this.paused = !this.paused
      if (e.key === 'm' || e.key === 'M') this.muted()
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()))
    this.bindUi()
    this.load()
    requestAnimationFrame(() => this.frame())
  }

  private muted(): void {
    audio.muted = !audio.muted
  }

  private phoneLayout(): boolean {
    return window.matchMedia('(pointer: coarse)').matches || window.innerHeight <= 520
  }

  private resize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    const aspect = w / Math.max(1, h)
    const wide = aspect >= 1.25
    this.camera.fov = wide ? 33 : 48
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
    this.camDist = wide ? 8.4 : 14
    const fog = this.scene.fog as THREE.Fog
    fog.near = wide ? 24 : 14
    fog.far = wide ? 70 : 42
    this.renderer.setSize(w, h, false)
    const touch = document.getElementById('touch')
    if (touch) touch.hidden = !this.playing || !this.phoneLayout()
    document.getElementById('t-pause')?.toggleAttribute('hidden', !this.playing || !this.phoneLayout())
    document.getElementById('t-evo')?.toggleAttribute('hidden', !this.playing || !this.phoneLayout())
    const portrait = h > w && w <= 540
    document.getElementById('rotate')?.classList.toggle('on', portrait)
  }

  private paintWorld(): void {
    const g = this.decor
    g.add(ribbon(0, 72, 56, (x) => 0.15 + Math.sin(x * 0.22) * 0.22 + (x / 72) * 0.45, (x, y) => (x > 52 || y > 0.55 ? 0xc2ae8e : y > 0.35 ? 0x8a7d68 : 0x3e534c)))
    g.add(ribbon(64, 220, 70, (x) => 0.72 + Math.sin(x * 0.16) * 0.28 + Math.sin(x * 0.05) * 0.2, (x, y) => {
      if (x > 168) return y > 1.15 ? 0x6e6862 : 0x8a4638
      return y > 1.05 ? 0x6d8458 : 0x6a5340
    }))
    const waterGeo = new THREE.PlaneGeometry(76, 8, 36, 8)
    waterGeo.rotateX(-Math.PI / 2)
    const water = new THREE.Mesh(waterGeo, waterMat(this.waterU))
    water.position.set(36, 5.7, 0)
    water.name = 'water'
    g.add(water)
    const caustic = new THREE.Mesh(new THREE.PlaneGeometry(70, 7), causticMat(this.waterU))
    caustic.rotation.x = -Math.PI / 2
    caustic.position.set(34, 0.62, 0)
    g.add(caustic)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6d726c, roughness: 0.9, metalness: 0.04 })
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xb7a488, roughness: 0.95, metalness: 0 })
    const kelpMat = new THREE.MeshStandardMaterial({ color: 0x5e7a58, roughness: 0.7, metalness: 0.02 })
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x6a7d52, roughness: 0.86, metalness: 0 })
    const lavaMat = new THREE.MeshStandardMaterial({ color: 0x8a4634, roughness: 0.55, metalness: 0.05, emissive: 0x5a2418, emissiveIntensity: 0.45 })
    for (const x of [12, 24, 37, 49, 61]) {
      const rock = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), x > 48 ? sandMat : rockMat)
      rock.scale.set(1.4, 0.7, 1.1)
      rock.position.set(x, 0.55 + (x % 3) * 0.15, (x % 5) - 2)
      rock.castShadow = true
      rock.receiveShadow = true
      g.add(rock)
      const kelp = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.1, 3, 6), kelpMat)
      kelp.position.set(x + 1.4, 1.2, 0.4)
      kelp.rotation.z = 0.2
      g.add(kelp)
    }
    for (const x of [78, 96, 112, 130, 148]) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), mossMat)
      bush.scale.set(1.3, 0.7, 1)
      bush.position.set(x, 1.35, (x % 4) - 1.5)
      bush.castShadow = true
      g.add(bush)
    }
    for (const x of [176, 188, 202]) {
      const vent = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 10), lavaMat)
      vent.position.set(x, 1.5, 0)
      vent.castShadow = true
      g.add(vent)
    }
    const count = this.quality === 'high' ? 18 : 8
    const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xd5e4e0, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.45 })
    for (let i = 0; i < count; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), bubbleMat)
      b.position.set(6 + (i * 3.7) % 58, 0.6 + (i % 5), (i % 3) - 1)
      b.userData.baseX = b.position.x
      g.add(b)
      this.bubbles.push(b)
    }
  }

  private applyQuality(): void {
    const high = this.quality === 'high'
    this.renderer.shadowMap.enabled = high
    this.sun.castShadow = high
    this.renderer.setPixelRatio(high ? Math.min(1.5, window.devicePixelRatio || 1) : 1)
    this.resize()
    const btn = document.getElementById('quality')
    if (btn) btn.textContent = high ? 'Detail: high' : 'Detail: low'
  }

  private bindUi(): void {
    const solo = document.getElementById('solo')
    const online = document.getElementById('online')
    const name = document.getElementById('name') as HTMLInputElement | null
    solo?.addEventListener('click', () => {
      audio.unlock()
      void this.enterWide()
      this.name = name?.value.trim() || 'Tidewisp'
      playerOf(this.world).name = this.name
      this.start()
    })
    online?.addEventListener('click', () => {
      audio.unlock()
      const url = (import.meta.env.VITE_EVO_WORKER as string | undefined) || ''
      const msg = document.getElementById('title-msg')
      if (!url) {
        if (msg) msg.textContent = 'No worker URL set (VITE_EVO_WORKER). Playing the local sea instead.'
        this.name = name?.value.trim() || 'Tidewisp'
        playerOf(this.world).name = this.name
        this.start()
        return
      }
      void this.tryOnline(url)
    })
    document.getElementById('evo-close')?.addEventListener('click', () => this.toggleEvo(false))
    document.getElementById('build-close')?.addEventListener('click', () => this.toggleBuild(false))
    document.getElementById('resume')?.addEventListener('click', () => {
      this.world.over = false
      const you = playerOf(this.world)
      you.alive = true
      you.hp = you.maxHp
      you.ep = Math.max(0, you.ep - 5)
      if (!landOk(you.load, you.spent)) you.x = 8
      this.save()
    })
    this.paintColors()
    this.touch()
    this.guardSurface()
    this.applyQuality()
    document.getElementById('quality')?.addEventListener('pointerup', (e) => {
      e.preventDefault()
      this.quality = this.quality === 'high' ? 'low' : 'high'
      this.applyQuality()
    })
    document.getElementById('full')?.addEventListener('pointerup', (e) => {
      e.preventDefault()
      void this.enterWide()
    })
    const view = this.renderer.domElement
    view.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button === 0) this.mouseBite = true
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
    const nodes = document.querySelectorAll('canvas, #stick, #t-bite, #t-dash, #t-horn, #t-act, #t-build')
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
    document.getElementById('t-pause')?.addEventListener('pointerup', (e) => {
      e.preventDefault()
      this.paused = !this.paused
      this.world.banner = this.paused ? 'Paused' : ''
      this.world.bannerT = this.paused ? 60 : 0
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

  private async tryOnline(url: string): Promise<void> {
    const msg = document.getElementById('title-msg')
    if (msg) msg.textContent = 'Reaching the living world…'
    try {
      const ws = new WebSocket(url.replace(/^http/, 'ws') + '/ws')
      const ok = await new Promise<boolean>((resolve) => {
        const timer = window.setTimeout(() => resolve(false), 4000)
        ws.onopen = () => {
          window.clearTimeout(timer)
          resolve(true)
        }
        ws.onerror = () => resolve(false)
      })
      if (!ok) throw new Error('offline')
      ws.close()
      if (msg) msg.textContent = 'Worker answered. This build keeps the shard sim local until you deploy and set the URL for live sync. Starting offline-safe play.'
    } catch {
      if (msg) msg.textContent = 'The shard is quiet. Playing alone on this shore.'
    }
    this.name = (document.getElementById('name') as HTMLInputElement | null)?.value.trim() || 'Tidewisp'
    playerOf(this.world).name = this.name
    this.start()
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
        ? 'The stick moves every way, including up and down. Bite is the big button. Dash, horn, dig or gather, and build arc beside it.'
        : 'WASD swims. W rises. Click to bite. E evolve, F dig, G gather.'
      this.hintLeft = 7
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
    if (ep) ep.textContent = `EP ${Math.floor(you.ep)} · tier ${tier}`
    if (!root) return
    const row = (kind: string, id: string, name: string, need: number, cost: number, on: boolean) => {
      const locked = tier < need
      return `<button data-kind="${kind}" data-id="${id}" ${locked ? 'disabled' : ''}>${locked ? '🔒 ' : ''}${name}${on ? ' · on' : ''}${locked ? ` · Unlocks at tier ${need}` : cost ? ` · ${cost} EP` : ''}</button>`
    }
    const blocks: string[] = []
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
        const result = tryPurchase(you, kind, id)
        this.world.banner = result.reason
        this.world.bannerT = 2
        audio.blip(result.ok ? 'eat' : 'hurt')
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
        audio.blip(result.ok ? 'dig' : 'hurt')
      }),
    )
  }

  private gather(dt: number): Frame {
    const k = this.keys
    const left = k.has('a') || k.has('arrowleft')
    const right = k.has('d') || k.has('arrowright')
    const up = k.has('w') || k.has('arrowup') || k.has(' ')
    const down = k.has('s') || k.has('arrowdown')
    const pads = navigator.getGamepads?.()
    let ax = (right ? 1 : 0) - (left ? 1 : 0) + this.stick.x
    let ay = (up ? 1 : 0) - (down ? 1 : 0) + this.stick.y
    let jump = up || this.stick.y > 0.45
    let bite = k.has('j') || this.mouseBite
    let dig = false
    let use = false
    const pad = pads?.[0]
    if (pad) {
      const lx = pad.axes[0] ?? 0
      const ly = pad.axes[1] ?? 0
      if (Math.abs(lx) > 0.2) ax += lx
      if (Math.abs(ly) > 0.2) ay -= ly
      if (pad.buttons[0]?.pressed) jump = true
      if (pad.buttons[2]?.pressed) bite = true
    }
    const you = playerOf(this.world)
    if (this.dashT > 0) {
      ax = you.facing
      this.dashT -= dt
    }
    if (this.hornT > 0) {
      ax = you.facing
      bite = true
      this.hornT -= dt
    }
    if (this.actHeld) {
      const near = this.world.nodes.some((n) => n.amount > 0 && Math.abs(n.x - you.x) < 2.2)
      if (near) use = true
      else dig = true
    }
    ax = Math.max(-1, Math.min(1, ax))
    ay = Math.max(-1, Math.min(1, ay))
    const ease = 1 - Math.exp(-dt * 9)
    this.sAx += (ax - this.sAx) * ease
    this.sAy += (ay - this.sAy) * ease
    if (this.mouseUp) {
      this.mouseBite = false
      this.mouseUp = false
    }
    return { ax: this.sAx, ay: this.sAy, jump, bite, dig: k.has('f') || dig, use: k.has('g') || use, ink: k.has('q') }
  }

  private frame(): void {
    requestAnimationFrame(() => this.frame())
    const dt = Math.min(0.033, this.clock.getDelta())
    this.time += dt
    this.waterU.value = this.time
    if (this.playing && !this.paused && !this.evoOpen && !this.buildOpen && !this.world.over) {
      const ev = step(this.world, dt, this.gather(dt))
      for (const e of ev) if (e.t !== 'note') audio.blip(e.t)
      if (ev.some((e) => e.t === 'warn')) navigator.vibrate?.(80)
    }
    this.sync()
    const you = playerOf(this.world)
    const sea = you.region === 'sea'
    const camY = sea ? you.y + 0.2 : you.y + 0.45
    this.camGoal.set(you.x - you.facing * 0.2, camY, this.camDist)
    this.lookGoal.set(you.x + you.facing * 1.5, you.y, 0)
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
    const ck = 1 - Math.exp(-dt * 2.6)
    this.camPos.lerp(this.camGoal, ck)
    this.lookPos.lerp(this.lookGoal, 1 - Math.exp(-dt * 3.2))
    this.camera.position.copy(this.camPos)
    if (this.world.shake > 0) this.camera.position.x += Math.sin(this.time * 40) * 0.12
    this.camera.lookAt(this.lookPos)
    this.sun.position.set(you.x - 10, 18, 12)
    this.sun.target.position.set(you.x, 1, 0)
    const fog = this.scene.fog as THREE.Fog
    const fogColor = sea ? new THREE.Color(0x1e4a52) : you.region === 'volcano' ? new THREE.Color(0x8a6a58) : new THREE.Color(0xa9b8ae)
    fog.color.lerp(fogColor, 0.04)
    for (const b of this.bubbles) {
      if (!sea) {
        b.visible = false
        continue
      }
      b.visible = true
      b.position.y += dt * 0.7
      b.position.x = (b.userData.baseX as number) + Math.sin(this.time + b.position.y) * 0.15
      if (b.position.y > 5.4) b.position.y = 0.4
    }
    if (this.hintLeft > 0) {
      this.hintLeft -= dt
      if (this.hintLeft <= 0) {
        const hint = document.getElementById('hint')
        if (hint) hint.hidden = true
      }
    }
    this.hud()
    this.renderer.render(this.scene, this.camera)
  }

  private sync(): void {
    const seen = new Set<number>()
    for (const e of this.world.ents) {
      if (!e.alive && e.kind !== 'player') {
        this.meshes.get(e.id)?.removeFromParent()
        continue
      }
      seen.add(e.id)
      const sig = creatureKey(e.load, e.spent) + e.kind
      let group = this.meshes.get(e.id)
      if (!group || this.keysigs.get(e.id) !== sig) {
        group?.removeFromParent()
        group = buildCreature(e.load, e.spent, e.kind === 'boss' ? 'boss' : e.kind === 'player' ? 'player' : 'npc')
        this.scene.add(group)
        this.meshes.set(e.id, group)
        this.keysigs.set(e.id, sig)
      }
      const y = e.kind === 'player' || e.region !== 'sea' ? Math.max(e.y, 1.05) : e.y
      group.userData.baseY = y
      group.position.set(e.x, y, e.kind === 'npc' ? ((e.id % 5) - 2) * 0.35 : 0)
      poseCreature(group, this.time + e.salt, Math.abs(e.vx) + Math.abs(e.vy) > 0.25, e.biteT, e.facing)
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

  private hud(): void {
    const you = playerOf(this.world)
    const set = (id: string, text: string) => {
      const el = document.getElementById(id)
      if (el) el.textContent = text
    }
    set('hp', `HP ${Math.ceil(you.hp)}/${you.maxHp}`)
    set('ep', `EP ${Math.floor(you.ep)}`)
    set('tier', `T${tierOf(you.spent)} ${you.region}`)
    set('banner', this.world.bannerT > 0 ? this.world.banner : '')
    const pause = document.getElementById('t-pause')
    if (pause) pause.textContent = this.paused ? 'Play' : 'Pause'
    const over = document.getElementById('overlay')
    if (over) over.hidden = !this.world.over && !this.world.won
    if (this.world.won) set('overlay-text', 'The colossus stills. Eden is a body you grow toward.')
    if (this.world.over) set('overlay-text', 'The body fails. Continue keeps your parts.')
  }

  save(): void {
    const you = playerOf(this.world)
    try {
      localStorage.setItem(SAVE, JSON.stringify({ name: you.name, ep: you.ep, spent: you.spent, load: you.load, unlocked: you.unlocked, bag: you.bag, gems: you.gems, clan: you.clan }))
    } catch {
      /* ignore */
    }
  }

  load(): void {
    try {
      const raw = localStorage.getItem(SAVE)
      if (!raw) return
      const data = JSON.parse(raw) as Partial<Ent>
      const you = playerOf(this.world)
      if (data.load) you.load = { ...you.load, ...data.load }
      if (typeof data.ep === 'number') you.ep = data.ep
      if (typeof data.spent === 'number') you.spent = data.spent
      if (data.unlocked) you.unlocked = data.unlocked
      if (data.bag) you.bag = data.bag
      if (data.gems) you.gems = data.gems
      if (data.name) you.name = data.name
      if (typeof data.clan === 'string') you.clan = data.clan
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

function ribbon(x0: number, x1: number, segs: number, yAt: (x: number) => number, colorAt: (x: number, y: number) => number): THREE.Mesh {
  const zs = [-3.6, -1.2, 1.2, 3.6]
  const cols = zs.length
  const rows = segs + 1
  const pos = new Float32Array(rows * cols * 3)
  const col = new Float32Array(rows * cols * 3)
  const idx: number[] = []
  for (let i = 0; i < rows; i++) {
    const x = x0 + ((x1 - x0) * i) / segs
    for (let j = 0; j < cols; j++) {
      const y = yAt(x) + Math.sin(x * 0.47 + j) * 0.08
      const o = (i * cols + j) * 3
      pos[o] = x
      pos[o + 1] = y
      pos[o + 2] = zs[j]!
      const c = new THREE.Color(colorAt(x, y))
      col[o] = c.r
      col[o + 1] = c.g
      col[o + 2] = c.b
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j
      idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 }),
  )
  mesh.receiveShadow = true
  mesh.castShadow = true
  return mesh
}

function waterMat(time: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { time },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec3 p = position;
        p.y += sin(p.x * 0.55 + time * 1.3) * 0.07 + sin(p.z * 1.3 + time) * 0.04;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        float wave = sin(vUv.x * 26.0 + time) * sin(vUv.y * 16.0 - time * 0.7);
        vec3 deep = vec3(0.04, 0.20, 0.26);
        vec3 shallow = vec3(0.27, 0.50, 0.46);
        vec3 col = mix(deep, shallow, vUv.x * 0.8 + wave * 0.05);
        gl_FragColor = vec4(col, 0.46);
      }
    `,
  })
}

function causticMat(time: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { time },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        float a = sin(vUv.x * 7.0 + time * 0.8) * sin(vUv.y * 5.0 - time * 0.5);
        float b = sin(vUv.x * 13.0 - time * 0.6 + vUv.y * 8.0);
        float c = pow(max(0.0, a * 0.55 + b * 0.45), 2.0);
        gl_FragColor = vec4(0.55, 0.78, 0.7, 0.09 * c);
      }
    `,
  })
}
