export class Chiptune {
  private ctx: AudioContext | null = null
  muted = false

  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext
      this.ctx = new Ctx()
    }
    void this.ctx.resume()
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const amp = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    amp.gain.setValueAtTime(0.0001, t)
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(amp)
    amp.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  blip(kind: string): void {
    if (kind === 'bite') this.tone(210, 0.08, 'square', 0.06)
    else if (kind === 'hit' || kind === 'tower') this.tone(155, 0.07, 'square', 0.06)
    else if (kind === 'hurt' || kind === 'trap' || kind === 'geyser') this.tone(90, 0.16, 'sawtooth', 0.07)
    else if (kind === 'eat' || kind === 'gem') {
      this.tone(660, 0.07, 'square', 0.06)
      this.tone(880, 0.1, 'triangle', 0.04, 0.05)
    } else if (kind === 'evolve') {
      this.tone(400, 0.08, 'triangle', 0.06)
      this.tone(560, 0.12, 'triangle', 0.05, 0.07)
    } else if (kind === 'dig' || kind === 'mine' || kind === 'chop') this.tone(110, 0.06, 'square', 0.04)
    else if (kind === 'warn' || kind === 'alert' || kind === 'wave') this.tone(70, 0.3, 'sawtooth', 0.06)
    else if (kind === 'win' || kind === 'held') this.tone(520, 0.12, 'triangle', 0.05)
    else this.tone(440, 0.04, 'square', 0.03)
  }
}

export const audio = new Chiptune()
