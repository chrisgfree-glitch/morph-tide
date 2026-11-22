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

  private tone(freq: number, dur: number, type: OscillatorType, gain: number): void {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const amp = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    amp.gain.setValueAtTime(gain, t)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(amp)
    amp.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  blip(kind: string): void {
    if (kind === 'bite') this.tone(210, 0.07, 'square', 0.05)
    else if (kind === 'hit' || kind === 'tower') this.tone(140, 0.06, 'square', 0.04)
    else if (kind === 'hurt' || kind === 'trap') this.tone(90, 0.15, 'sawtooth', 0.05)
    else if (kind === 'eat' || kind === 'gem') this.tone(660, 0.08, 'square', 0.05)
    else if (kind === 'dig' || kind === 'mine' || kind === 'chop') this.tone(110, 0.05, 'square', 0.03)
    else if (kind === 'warn' || kind === 'alert' || kind === 'wave') this.tone(70, 0.3, 'sawtooth', 0.06)
    else if (kind === 'win' || kind === 'held') this.tone(520, 0.12, 'triangle', 0.05)
    else this.tone(440, 0.04, 'square', 0.03)
  }
}

export const audio = new Chiptune()
