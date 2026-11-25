/** Soft, muffled underwater SFX. Procedural Web Audio only — no assets, no services. */

export type SfxKind =
  | 'bite'
  | 'hit'
  | 'hurt'
  | 'eat'
  | 'heal'
  | 'evolve'
  | 'dig'
  | 'mine'
  | 'chop'
  | 'gather'
  | 'gem'
  | 'warn'
  | 'alert'
  | 'wave'
  | 'trap'
  | 'geyser'
  | 'ui'
  | 'win'
  | 'held'
  | 'tower'
  | 'gate'
  | 'boss-unlock'

const COOLDOWN: Record<string, number> = {
  bite: 0.32,
  hit: 0.7,
  hurt: 0.45,
  eat: 0.4,
  heal: 0.7,
  evolve: 1.1,
  dig: 0.28,
  mine: 0.28,
  chop: 0.28,
  gather: 0.4,
  gem: 0.5,
  warn: 1.4,
  alert: 1.6,
  wave: 1.6,
  trap: 0.7,
  geyser: 0.7,
  ui: 0.18,
  win: 1.2,
  held: 1.2,
  tower: 0.5,
  gate: 0.8,
  'boss-unlock': 1.2,
}

const MUTE_KEY = 'morph-tide-mute'
const VOL_KEY = 'morph-tide-vol'
const GLOBAL_GAP = 0.12

export class Chiptune {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private wet: BiquadFilterNode | null = null
  muted = false
  volume = 0.55
  counts: Record<string, number> = { total: 0, suppressed: 0 }
  private last: Record<string, number> = {}
  private lastAny = -99

  loadSettings(): void {
    try {
      const mute = localStorage.getItem(MUTE_KEY)
      const vol = localStorage.getItem(VOL_KEY)
      if (vol !== null) this.volume = Math.max(0, Math.min(1, Number(vol)))
      if (mute === '1') this.muted = true
      if (this.master) this.master.gain.value = this.muted ? 0 : this.volume
    } catch {
      /* private mode */
    }
  }

  saveSettings(): void {
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0')
      localStorage.setItem(VOL_KEY, String(this.volume))
    } catch {
      /* private mode */
    }
  }

  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume
      this.wet = this.ctx.createBiquadFilter()
      this.wet.type = 'lowpass'
      this.wet.frequency.value = 1100
      this.wet.Q.value = 0.65
      this.master.connect(this.wet)
      this.wet.connect(this.ctx.destination)
    }
    void this.ctx.resume()
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value))
    if (this.volume <= 0) this.muted = true
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume
    this.saveSettings()
  }

  setMuted(on: boolean): void {
    this.muted = on
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume
    this.saveSettings()
  }

  resetCounts(): void {
    this.counts = { total: 0, suppressed: 0 }
  }

  /** Returns false when the blip is muted, cooling down, or too soon after another sound. */
  blip(kind: string): boolean {
    if (!this.ctx || this.muted) {
      this.counts.suppressed = (this.counts.suppressed ?? 0) + 1
      return false
    }
    const now = this.ctx.currentTime
    const cd = COOLDOWN[kind] ?? 0.5
    if (now - (this.last[kind] ?? -99) < cd || now - this.lastAny < GLOBAL_GAP) {
      this.counts.suppressed = (this.counts.suppressed ?? 0) + 1
      return false
    }
    this.last[kind] = now
    this.lastAny = now
    this.counts[kind] = (this.counts[kind] ?? 0) + 1
    this.counts.total = (this.counts.total ?? 0) + 1
    this.play(kind)
    return true
  }

  private dest(): AudioNode {
    return this.master ?? this.ctx!.destination
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slide = 0): void {
    if (!this.ctx) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const amp = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
    amp.gain.setValueAtTime(0.0001, t)
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.018)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(amp)
    amp.connect(this.dest())
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }

  private bubble(freq: number, dur: number, gain: number, delay = 0): void {
    this.tone(freq, dur, 'sine', gain, delay, -freq * 0.35)
  }

  /** Soft water whoosh: filtered noise swell, no click. */
  private whoosh(gain: number, dur = 0.42): void {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const len = Math.floor(this.ctx.sampleRate * dur)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.8
    bp.frequency.setValueAtTime(320, t)
    bp.frequency.exponentialRampToValueAtTime(620, t + dur * 0.5)
    bp.frequency.exponentialRampToValueAtTime(260, t + dur)
    const amp = this.ctx.createGain()
    amp.gain.setValueAtTime(0.0001, t)
    amp.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(bp); bp.connect(amp); amp.connect(this.dest())
    src.start(t); src.stop(t + dur + 0.02)
  }

  /** Swim strokes: paced by speed, never blocks combat sounds. */
  swim(speed01: number): void {
    if (!this.ctx || this.muted || speed01 < 0.15) return
    const now = this.ctx.currentTime
    const gap = 0.75 - 0.35 * Math.min(1, speed01)
    if (now - (this.last.swim ?? -99) < gap) return
    this.last.swim = now
    this.counts.swim = (this.counts.swim ?? 0) + 1
    this.whoosh(0.018 + 0.022 * Math.min(1, speed01))
    // a few soft trailing bubbles, random pitch so it never sounds looped
    const n = 1 + Math.floor(Math.random() * (speed01 > 0.6 ? 3 : 2))
    for (let i = 0; i < n; i++) {
      this.bubble(480 + Math.random() * 420, 0.05 + Math.random() * 0.04, 0.006 + Math.random() * 0.004, 0.08 + i * (0.07 + Math.random() * 0.06))
    }
  }

  private play(kind: string): void {
    if (kind === 'bite') {
      this.bubble(210, 0.09, 0.028)
      this.bubble(320, 0.06, 0.014, 0.04)
    } else if (kind === 'eat' || kind === 'gem') {
      this.bubble(420, 0.08, 0.024)
      this.bubble(540, 0.1, 0.016, 0.06)
    } else if (kind === 'heal') {
      this.bubble(360, 0.1, 0.02)
      this.bubble(480, 0.12, 0.012, 0.07)
    } else if (kind === 'hit' || kind === 'tower') {
      this.tone(92, 0.1, 'sine', 0.03, 0, -30)
      this.bubble(180, 0.07, 0.012, 0.03)
    } else if (kind === 'hurt' || kind === 'trap' || kind === 'geyser') {
      this.tone(78, 0.16, 'triangle', 0.032, 0, -28)
    } else if (kind === 'evolve' || kind === 'win' || kind === 'held' || kind === 'gate' || kind === 'boss-unlock') {
      this.tone(280, 0.12, 'sine', 0.026, 0, 40)
      this.tone(360, 0.16, 'triangle', 0.02, 0.08, 50)
      this.bubble(520, 0.12, 0.012, 0.14)
    } else if (kind === 'dig' || kind === 'mine' || kind === 'chop' || kind === 'gather') {
      this.tone(130, 0.08, 'sine', 0.022, 0, -40)
      this.bubble(240, 0.07, 0.01, 0.03)
    } else if (kind === 'warn' || kind === 'alert' || kind === 'wave') {
      this.tone(110, 0.18, 'sine', 0.024, 0, -20)
    } else if (kind === 'ui') {
      this.bubble(380, 0.05, 0.014)
    } else {
      this.bubble(300, 0.06, 0.012)
    }
  }
}

export const audio = new Chiptune()
