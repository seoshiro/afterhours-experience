import { describe, expect, it, vi } from 'vitest'
import { AmbientEngine } from './audio'

function deferred() {
  let resolve!: () => void
  let reject!: (reason: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function fakeContext(resume = Promise.resolve()) {
  const gains: Array<ReturnType<typeof makeGain>> = []
  const oscillators: Array<ReturnType<typeof makeOscillator>> = []
  const context = {
    state: 'suspended' as AudioContextState,
    currentTime: 10,
    destination: {},
    resume: vi.fn(async () => { await resume; context.state = 'running' }),
    close: vi.fn(async () => { context.state = 'closed' }),
    createGain: vi.fn(() => { const gain = makeGain(); gains.push(gain); return gain }),
    createOscillator: vi.fn(() => { const oscillator = makeOscillator(); oscillators.push(oscillator); return oscillator }),
    createBiquadFilter: vi.fn(() => ({ type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: vi.fn() })),
  }
  return { context, asAudioContext: context as unknown as AudioContext, gains, oscillators }
}

function makeGain() {
  return {
    gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() },
    connect: vi.fn(),
  }
}

function makeOscillator() {
  return { type: '', frequency: { value: 0 }, detune: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }
}

describe('opt-in ambient lifecycle', () => {
  it('constructs silently and creates no audio context before explicit start', () => {
    const factory = vi.fn()
    const engine = new AmbientEngine(factory)
    expect(engine.isActive).toBe(false)
    expect(factory).not.toHaveBeenCalled()
  })

  it('starts from an explicit call, then mutes immediately and disposes all sources', async () => {
    const fake = fakeContext()
    const engine = new AmbientEngine(() => fake.asAudioContext)
    expect(await engine.start()).toBe(true)
    expect(engine.isActive).toBe(true)
    expect(fake.context.resume).toHaveBeenCalledOnce()
    expect(fake.oscillators.length).toBeGreaterThan(0)
    expect(await engine.start()).toBe(true)
    expect(fake.context.resume).toHaveBeenCalledOnce()
    await engine.stop()
    expect(engine.isActive).toBe(false)
    expect(fake.gains[0].gain.cancelScheduledValues).toHaveBeenCalledWith(10)
    expect(fake.gains[0].gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10)
    for (const source of fake.oscillators) {
      expect(source.stop).toHaveBeenCalledOnce()
      expect(source.disconnect).toHaveBeenCalledOnce()
    }
    expect(fake.context.close).toHaveBeenCalledOnce()
    await engine.stop()
    expect(fake.context.close).toHaveBeenCalledOnce()
  })

  it('cancels an interrupted delayed resume without creating or starting oscillators', async () => {
    const pending = deferred()
    const fake = fakeContext(pending.promise)
    const engine = new AmbientEngine(() => fake.asAudioContext)
    const started = engine.start()
    await engine.stop()
    pending.resolve()
    expect(await started).toBe(false)
    expect(engine.isActive).toBe(false)
    expect(fake.context.createOscillator).not.toHaveBeenCalled()
    expect(fake.context.close).toHaveBeenCalled()
  })

  it('keeps the latest start when an earlier resume resolves out of order', async () => {
    const first = deferred()
    const firstFake = fakeContext(first.promise)
    const secondFake = fakeContext()
    const factory = vi.fn().mockReturnValueOnce(firstFake.asAudioContext).mockReturnValueOnce(secondFake.asAudioContext)
    const engine = new AmbientEngine(factory)
    const oldStart = engine.start()
    expect(await engine.start()).toBe(true)
    first.resolve()
    expect(await oldStart).toBe(false)
    expect(firstFake.context.createOscillator).not.toHaveBeenCalled()
    expect(firstFake.context.close).toHaveBeenCalledOnce()
    expect(secondFake.context.close).not.toHaveBeenCalled()
    expect(engine.isActive).toBe(true)
    await engine.stop()
    expect(secondFake.context.close).toHaveBeenCalledOnce()
  })

  it('handles unsupported audio and denied resume without throwing to the UI', async () => {
    const unsupported = new AmbientEngine(() => { throw new Error('Unsupported') })
    expect(await unsupported.start()).toBe(false)
    expect(unsupported.isActive).toBe(false)
    const pending = deferred()
    const fake = fakeContext(pending.promise)
    const engine = new AmbientEngine(() => fake.asAudioContext)
    const started = engine.start()
    pending.reject(new Error('NotAllowedError'))
    expect(await started).toBe(false)
    expect(fake.context.close).toHaveBeenCalledOnce()
    expect(fake.context.createOscillator).not.toHaveBeenCalled()
    expect(engine.isActive).toBe(false)
  })
})
