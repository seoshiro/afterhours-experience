type AudioContextFactory = () => AudioContext

/** No audio context is created until start() is explicitly called by a user gesture. */
export class AmbientEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private sources: OscillatorNode[] = []
  private generation = 0
  private active = false

  constructor(private readonly factory: AudioContextFactory = () => {
    const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Constructor) throw new Error('Web Audio is unavailable')
    return new Constructor()
  }) {}

  get isActive() { return this.active }

  async start(): Promise<boolean> {
    if (this.active) return true
    const generation = ++this.generation
    let context: AudioContext | null = null
    try {
      context = this.factory()
      this.context = context
      await context.resume()
      if (generation !== this.generation || context.state === 'closed') {
        if (context.state !== 'closed') await context.close().catch(() => {})
        return false
      }
      const master = context.createGain()
      master.gain.setValueAtTime(0, context.currentTime)
      master.gain.linearRampToValueAtTime(0.045, context.currentTime + 1.2)
      master.connect(context.destination)
      this.master = master
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 370
      filter.Q.value = 0.3
      filter.connect(master)
      this.sources = [55, 82.4069, 110.25].map((frequency, index) => {
        const oscillator = context!.createOscillator()
        oscillator.type = index === 1 ? 'triangle' : 'sine'
        oscillator.frequency.value = frequency
        oscillator.detune.value = index * 2 - 2
        const voice = context!.createGain()
        voice.gain.value = 0.2
        oscillator.connect(voice)
        voice.connect(filter)
        oscillator.start()
        return oscillator
      })
      const tide = context.createOscillator()
      tide.frequency.value = 0.065
      const depth = context.createGain()
      depth.gain.value = 95
      tide.connect(depth)
      depth.connect(filter.frequency)
      tide.start()
      this.sources.push(tide)
      this.active = true
      return true
    } catch {
      if (generation === this.generation) {
        this.active = false
        this.context = null
        this.master = null
        this.sources.forEach((source) => { try { source.stop() } catch { /* Already stopped. */ } })
        this.sources = []
      }
      if (context && context.state !== 'closed') await context.close().catch(() => {})
      return false
    }
  }

  async stop(): Promise<void> {
    ++this.generation
    this.active = false
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime)
      this.master.gain.setValueAtTime(0, this.context.currentTime)
    }
    this.sources.forEach((source) => { try { source.stop(); source.disconnect() } catch { /* Already stopped. */ } })
    this.sources = []
    this.master = null
    const context = this.context
    this.context = null
    if (context && context.state !== 'closed') await context.close().catch(() => {})
  }
}
