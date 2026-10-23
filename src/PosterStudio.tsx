import { useEffect, useRef, useState } from 'react'
import { createPosterPng, createPosterSvg, downloadPoster, normalizePhase, posterFilename, POSTER_THEMES, type PosterTheme } from './poster'
import './interaction.css'

export default function PosterStudio() {
  const [theme, setTheme] = useState<PosterTheme>('lime')
  const [phase, setPhase] = useState(6)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const pending = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const releaseDownload = useRef<(() => void) | null>(null)
  const svg = createPosterSvg(theme, phase)

  useEffect(() => () => {
    controller.current?.abort()
    releaseDownload.current?.()
  }, [])

  async function exportPoster(format: 'svg' | 'png') {
    if (pending.current) return
    pending.current = true
    const abort = new AbortController()
    controller.current = abort
    setBusy(true)
    setStatus(`Preparing ${format.toUpperCase()}…`)
    try {
      // Keep the synchronous click guard until React can commit the busy state.
      // A burst of native .click() calls must produce only one download.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      if (abort.signal.aborted) return
      const blob = format === 'svg'
        ? new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        : await createPosterPng(svg, abort.signal)
      if (abort.signal.aborted) return
      releaseDownload.current?.()
      releaseDownload.current = downloadPoster(blob, posterFilename(theme, format))
      setStatus(`${format.toUpperCase()} download started. Your edition is yours.`)
    } catch (error) {
      if (!abort.signal.aborted) setStatus(error instanceof Error ? error.message : 'Export failed. Please try again.')
    } finally {
      pending.current = false
      if (!abort.signal.aborted) setBusy(false)
    }
  }

  return <section id="poster" className="poster-studio" aria-labelledby="poster-title">
    <div className="poster-studio__heading">
      <span className="eyebrow">04 / TAKE A PIECE OF THE NIGHT</span>
      <span className="poster-studio__edition">PUBLIC EDITION 001 ↙</span>
    </div>
    <div className="poster-studio__body">
      <div className="poster-preview-wrap">
        <span className="poster-registration poster-registration--top" aria-hidden="true">+</span>
        <img className="poster-preview" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} width="600" height="800" alt={`Your AFTERHOURS poster in ${theme}, interference edition ${phase.toString().padStart(2, '0')}.`} />
        <span className="poster-registration poster-registration--bottom" aria-hidden="true">+</span>
        <span className="poster-preview-caption">600 × 800 / ORIGINAL VECTOR ARTWORK</span>
      </div>
      <div className="poster-controls">
        <span className="poster-studio__index" aria-hidden="true">↗</span>
        <h2 id="poster-title">The night.<br />Your imprint.</h2>
        <p>A poster is a memory of a place you haven’t been. Change the frequency. Make this one yours.</p>
        <fieldset className="poster-colour">
          <legend>01 — Choose your colour</legend>
          <div className="poster-swatches">
            {POSTER_THEMES.map((option) => <button key={option} type="button" className={`poster-swatch poster-swatch--${option}`} aria-pressed={theme === option} onClick={() => { setTheme(option); setStatus('') }}><span className="poster-swatch__dot" aria-hidden="true" />{option}<span aria-hidden="true">{theme === option ? '↗' : ' '}</span></button>)}
          </div>
        </fieldset>
        <div className="poster-frequency">
          <label htmlFor="poster-phase">02 — Shift the interference <output htmlFor="poster-phase">{phase.toString().padStart(2, '0')}</output></label>
          <input id="poster-phase" type="range" min="0" max="12" step="1" value={phase} onChange={(event) => { setPhase(normalizePhase(Number(event.target.value))); setStatus('') }} />
          <div className="poster-frequency__labels" aria-hidden="true"><span>LOW</span><span>HIGH</span></div>
        </div>
        <div className="poster-exports" aria-label="Export your poster" aria-busy={busy}>
          <button type="button" className="poster-export poster-export--primary" aria-disabled={busy} onClick={() => void exportPoster('png')}>Export PNG <span aria-hidden="true">↓</span></button>
          <button type="button" className="poster-export" aria-disabled={busy} onClick={() => void exportPoster('svg')}>Export SVG <span aria-hidden="true">↓</span></button>
        </div>
        <p className="poster-export-note">Free to keep. Made in your browser.<br />PNG 1200 × 1600 · SVG scales infinitely.</p>
        <p className="poster-status" role="status" aria-live="polite">{status || '\u00a0'}</p>
      </div>
    </div>
  </section>
}
