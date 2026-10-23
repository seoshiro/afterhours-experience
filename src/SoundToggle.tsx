import { useEffect, useRef, useState } from 'react'
import { AmbientEngine } from './audio'
import './interaction.css'

export default function SoundToggle() {
  const engine = useRef<AmbientEngine | null>(null)
  const requested = useRef(false)
  const operation = useRef(0)
  const [state, setState] = useState<'off' | 'starting' | 'on' | 'unavailable'>('off')

  useEffect(() => {
    const stop = () => {
      requested.current = false
      operation.current += 1
      void engine.current?.stop()
      setState('off')
    }
    const visibility = () => { if (document.visibilityState === 'hidden') stop() }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', stop)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', stop)
      requested.current = false
      operation.current += 1
      void engine.current?.stop()
    }
  }, [])

  async function toggle() {
    const current = ++operation.current
    if (requested.current) {
      requested.current = false
      setState('off')
      await engine.current?.stop()
      return
    }
    requested.current = true
    setState('starting')
    if (!engine.current) engine.current = new AmbientEngine()
    const started = await engine.current.start()
    if (current !== operation.current) return
    if (document.visibilityState === 'hidden') {
      requested.current = false
      void engine.current.stop()
      setState('off')
      return
    }
    requested.current = started
    setState(started ? 'on' : 'unavailable')
  }

  const label = state === 'on' ? 'Mute sound' : state === 'starting' ? 'Cancel sound' : state === 'unavailable' ? 'Sound unavailable' : 'Enable sound'
  return <div className="sound-toggle-wrap">
    <button type="button" className={`sound-toggle ${state === 'on' ? 'sound-toggle--on' : ''}`} aria-pressed={state === 'on' || state === 'starting'} onClick={() => void toggle()} title="Optional quiet synthesized ambient. Stops when this page is hidden.">
      <span className="sound-toggle__mark" aria-hidden="true"><i /><i /><i /><i /></span>
      <span>{label}</span>
    </button>
    <span className="sound-toggle__status" role="status">{state === 'unavailable' ? 'Your browser could not start audio. The experience is still complete.' : ''}</span>
  </div>
}
