export const POSTER_THEMES = ['lime', 'coral', 'blue'] as const
export type PosterTheme = (typeof POSTER_THEMES)[number]

const palettes: Record<PosterTheme, { background: string; ink: string; accent: string }> = {
  lime: { background: '#d9ff43', ink: '#182018', accent: '#263ee8' },
  coral: { background: '#ff795e', ink: '#182018', accent: '#263ee8' },
  blue: { background: '#263ee8', ink: '#f3f0e5', accent: '#d9ff43' },
}

export function normalizePhase(value: number): number {
  return Number.isFinite(value) ? Math.min(12, Math.max(0, Math.round(value))) : 6
}

export function posterFilename(theme: PosterTheme, format: 'svg' | 'png'): string {
  const safeTheme = POSTER_THEMES.includes(theme) ? theme : 'lime'
  return `afterhours-${safeTheme}.${format === 'png' ? 'png' : 'svg'}`
}

/** Entirely original vector artwork. All dynamic values are bounded numbers or a fixed palette. */
export function createPosterSvg(theme: PosterTheme, phase: number): string {
  const safeTheme = POSTER_THEMES.includes(theme) ? theme : 'lime'
  const palette = palettes[safeTheme]
  const position = normalizePhase(phase)
  const centre = 293 + position * 6
  const rings = Array.from({ length: 24 }, (_, index) => {
    const radius = 26 + index * 10
    return `<circle cx="${centre}" cy="493" r="${radius}"/>`
  }).join('')
  const lines = Array.from({ length: 12 }, (_, index) => {
    const x = 55 + index * 44
    return `<path d="M${x} 318  ${x - 145 + position * 3} 671"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
<title>AFTERHOURS — a fictional festival poster</title>
<desc>Original generative artwork, edition ${position.toString().padStart(2, '0')}. Three acts, one imaginary night.</desc>
<defs><clipPath id="field"><rect x="26" y="307" width="548" height="374"/></clipPath></defs>
<rect width="600" height="800" fill="${palette.background}"/>
<g fill="${palette.ink}" font-family="Arial, Helvetica, sans-serif">
<text x="26" y="36" font-size="10" letter-spacing="1.9">ELECTRONIC MUSIC × AUDIOVISUAL EXHIBITION</text>
<text x="574" y="36" text-anchor="end" font-size="10">VOL. 001</text>
<path d="M26 48H574" stroke="${palette.ink}"/>
<text x="17" y="169" font-size="143" font-weight="900" letter-spacing="-11" textLength="555" lengthAdjust="spacingAndGlyphs">AFTER</text>
<text x="18" y="289" font-size="143" font-weight="900" letter-spacing="-12" textLength="555" lengthAdjust="spacingAndGlyphs">HOURS</text>
</g>
<g clip-path="url(#field)">
<rect x="26" y="307" width="548" height="374" fill="${palette.accent}"/>
<g fill="none" stroke="${palette.background}" stroke-width="2.5">${rings}</g>
<g stroke="${palette.ink}" stroke-width="7" opacity=".92">${lines}</g>
<circle cx="${centre}" cy="493" r="33" fill="${palette.background}"/>
<path d="M${centre - 12} 493h24m-12-12v24" stroke="${palette.ink}" stroke-width="2"/>
</g>
<g fill="${palette.ink}" font-family="Arial, Helvetica, sans-serif">
<text x="26" y="714" font-size="13" font-weight="700" letter-spacing="1">A NIGHT OUTSIDE OF TIME.</text>
<text x="26" y="739" font-size="10" letter-spacing=".5">I. SIGNAL / II. FRACTURE / III. AFTERIMAGE</text>
<text x="574" y="714" text-anchor="end" font-size="13" font-weight="700">19:00—04:00</text>
<text x="574" y="739" text-anchor="end" font-size="10">EDITION ${position.toString().padStart(2, '0')}</text>
<path d="M26 756H574" stroke="${palette.ink}"/>
<text x="26" y="777" font-size="9" letter-spacing="1">FICTIONAL DESIGN CONCEPT · NO REAL EVENT</text>
<text x="574" y="777" text-anchor="end" font-size="9">AFTERHOURS / 001</text>
</g>
</svg>`
}

export async function createPosterPng(svg: string, signal?: AbortSignal): Promise<Blob> {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      const timeout = window.setTimeout(() => finish(new Error('The poster took too long to render. Try SVG instead.')), 10000)
      const abort = () => finish(new DOMException('Export cancelled', 'AbortError'))
      const finish = (error?: Error) => {
        window.clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
        img.onload = null
        img.onerror = null
        if (error) { img.src = ''; reject(error) }
        else resolve(img)
      }
      img.onload = () => finish()
      img.onerror = () => finish(new Error('PNG is unavailable in this browser. Try SVG instead.'))
      signal?.addEventListener('abort', abort, { once: true })
      img.src = source
    })
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 1600
    const context = canvas.getContext('2d')
    if (!context) throw new Error('PNG is unavailable in this browser. Try SVG instead.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      let settled = false
      const finish = (blob?: Blob | null, error?: Error) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
        if (error) reject(error)
        else if (blob) resolve(blob)
        else reject(new Error('PNG export failed. Try SVG instead.'))
      }
      const abort = () => finish(null, new DOMException('Export cancelled', 'AbortError'))
      const timeout = window.setTimeout(() => finish(null, new Error('PNG export took too long. Try SVG instead.')), 10000)
      signal?.addEventListener('abort', abort, { once: true })
      try { canvas.toBlob((blob) => finish(blob), 'image/png') }
      catch (error) { finish(null, error instanceof Error ? error : new Error('PNG export failed. Try SVG instead.')) }
    })
  } finally {
    URL.revokeObjectURL(source)
  }
}

/** The returned release function is idempotent and cancels its own expiry timer. */
export function downloadPoster(blob: Blob, filename: string): () => void {
  const url = URL.createObjectURL(blob)
  let released = false
  let expiry = 0
  const release = () => {
    if (released) return
    released = true
    window.clearTimeout(expiry)
    URL.revokeObjectURL(url)
  }
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    try { link.click() }
    finally { link.remove() }
    expiry = window.setTimeout(release, 1000)
    return release
  } catch (error) {
    release()
    throw error
  }
}
