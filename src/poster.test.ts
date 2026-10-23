import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPosterPng, createPosterSvg, downloadPoster, normalizePhase, posterFilename, POSTER_THEMES, type PosterTheme } from './poster'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('poster values and SVG output', () => {
  it.each([[-1, 0], [0, 0], [2.49, 2], [2.5, 3], [12, 12], [99, 12], [NaN, 6], [Infinity, 6], [-Infinity, 6]])('bounds and rounds phase %s to %s', (input, expected) => {
    expect(normalizePhase(input)).toBe(expected)
  })

  it('creates distinct deterministic original output for each theme and phase', () => {
    const outputs = POSTER_THEMES.map(theme => createPosterSvg(theme, 6))
    expect(new Set(outputs).size).toBe(3)
    expect(createPosterSvg('lime', 6)).toBe(outputs[0])
    expect(createPosterSvg('lime', 0)).not.toBe(createPosterSvg('lime', 12))
    for (const svg of outputs) {
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('viewBox="0 0 600 800"')
      expect(svg).toContain('FICTIONAL DESIGN CONCEPT')
      expect(svg).toContain('NO REAL EVENT')
      expect(svg).toMatch(/19:00[^<]*04:00/)
      expect(svg).not.toMatch(/<script|<foreignObject|onload=|onerror=|href=|url\(https?:/i)
      expect(svg).not.toContain('undefined')
      expect(svg).not.toContain('NaN')
    }
  })

  it.each(['__proto__', 'toString', '../../bad', '"><script>alert(1)</script>'])('rejects runtime invalid theme: %s', (input) => {
    const theme = input as PosterTheme
    expect(createPosterSvg(theme, 6)).toBe(createPosterSvg('lime', 6))
    expect(posterFilename(theme, 'svg')).toBe('afterhours-lime.svg')
    expect(posterFilename(theme, 'png')).toBe('afterhours-lime.png')
  })

  it('only produces fixed safe filenames and known file extensions', () => {
    for (const theme of POSTER_THEMES) {
      expect(posterFilename(theme, 'svg')).toMatch(/^afterhours-(lime|coral|blue)\.svg$/)
      expect(posterFilename(theme, 'png')).toMatch(/^afterhours-(lime|coral|blue)\.png$/)
    }
    expect(posterFilename('lime', '../../bad' as 'png')).toBe('afterhours-lime.svg')
  })
})

describe('poster browser resource lifecycle', () => {
  it('rejects an already-cancelled PNG export without allocating an object URL', async () => {
    const create = vi.spyOn(URL, 'createObjectURL')
    const controller = new AbortController()
    controller.abort()
    await expect(createPosterPng(createPosterSvg('lime', 6), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(create).not.toHaveBeenCalled()
  })

  it('aborts an in-flight SVG image and revokes its URL', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-poster')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    class PendingImage { onload: (() => void) | null = null; onerror: (() => void) | null = null; src = '' }
    vi.stubGlobal('Image', PendingImage)
    const controller = new AbortController()
    const exported = createPosterPng(createPosterSvg('lime', 6), controller.signal)
    const assertion = expect(exported).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await assertion
    expect(create).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-poster')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('expires a stalled image render and frees its object URL', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-stalled')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    class PendingImage { onload: (() => void) | null = null; onerror: (() => void) | null = null; src = '' }
    vi.stubGlobal('Image', PendingImage)
    const exported = createPosterPng(createPosterSvg('coral', 4))
    const assertion = expect(exported).rejects.toThrow('took too long')
    await vi.advanceTimersByTimeAsync(10000)
    await assertion
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-stalled')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('offers SVG fallback when canvas is unavailable and cleans the URL', async () => {
    vi.stubGlobal('window', globalThis)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-canvas')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    class LoadedImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) { queueMicrotask(() => this.onload?.()) }
    }
    vi.stubGlobal('Image', LoadedImage)
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => null }) })
    await expect(createPosterPng(createPosterSvg('blue', 4))).rejects.toThrow('Try SVG instead')
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-canvas')
  })

  it('cancels pending PNG encoding and ignores a late encoder callback', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-encoding')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    class LoadedImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) { Promise.resolve().then(() => this.onload?.()) }
    }
    let encode: ((blob: Blob | null) => void) | undefined
    vi.stubGlobal('Image', LoadedImage)
    vi.stubGlobal('document', { createElement: () => ({
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback: (blob: Blob | null) => void) => { encode = callback },
    }) })
    const controller = new AbortController()
    const exported = createPosterPng(createPosterSvg('blue', 2), controller.signal)
    const assertion = expect(exported).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    await Promise.resolve()
    expect(encode).toBeTypeOf('function')
    controller.abort()
    await assertion
    encode?.(new Blob(['late'], { type: 'image/png' }))
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-encoding')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('expires pending PNG encoding instead of holding the UI busy indefinitely', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-encoding-timeout')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    class LoadedImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) { Promise.resolve().then(() => this.onload?.()) }
    }
    vi.stubGlobal('Image', LoadedImage)
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ drawImage: vi.fn() }), toBlob: () => {} }) })
    const exported = createPosterPng(createPosterSvg('blue', 4))
    const assertion = expect(exported).rejects.toThrow('PNG export took too long')
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(10000)
    await assertion
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-encoding-timeout')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('releases a download once on expiry or repeated cleanup', () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-download')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    const append = vi.fn()
    vi.stubGlobal('document', { createElement: () => link, body: { append } })
    const release = downloadPoster(new Blob(['test']), 'afterhours-lime.svg')
    expect(link.download).toBe('afterhours-lime.svg')
    expect(append).toHaveBeenCalledWith(link)
    expect(link.click).toHaveBeenCalledOnce()
    expect(link.remove).toHaveBeenCalledOnce()
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    release()
    release()
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-download')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('removes the temporary link and URL when a browser refuses a download', () => {
    vi.stubGlobal('window', globalThis)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-refused')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const link = { href: '', download: '', click: () => { throw new Error('Download blocked') }, remove: vi.fn() }
    vi.stubGlobal('document', { createElement: () => link, body: { append: vi.fn() } })
    expect(() => downloadPoster(new Blob(['test']), 'afterhours-lime.svg')).toThrow('Download blocked')
    expect(link.remove).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-refused')
  })
})
