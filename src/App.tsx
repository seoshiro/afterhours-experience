import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react'
import * as m from 'motion/react-m'
import Artwork from './Artwork'
import PosterStudio from './PosterStudio'
import SoundToggle from './SoundToggle'
import { filterSessions, readSaved, SESSIONS, toggleSaved, writeSaved, type Discipline } from './programme'

const acts = [
  {id:'signal' as const, n:'01', time:'19:00 — 22:00', title:'Signal', subtitle:'First, we tune in.', text:'The city falls out of focus. A low frequency finds its way through. Enter a field of slow light, soft circuits and unfamiliar possibilities.', tags:'AMBIENT / LIGHT / ARRIVAL'},
  {id:'fracture' as const, n:'02', time:'22:00 — 01:30', title:'Fracture', subtitle:'Then, we come apart.', text:'Rhythm slips its grid. Images break into new shapes. The room becomes an instrument, and every body is part of the composition.', tags:'BROKEN BEAT / LIVE AV / MOVEMENT'},
  {id:'afterimage' as const, n:'03', time:'01:30 — 04:00', title:'Afterimage', subtitle:'Some things stay.', text:'At the edge of morning, everything stretches. Sound becomes a trace. Light becomes a memory. We leave a little different from how we arrived.', tags:'DEEP LISTENING / IMMERSION / RELEASE'},
]
function initialSaved() { try { return readSaved(window.localStorage) } catch { return [] } }

export default function App() {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [animateSave, setAnimateSave] = useState(false)
  const [discipline,setDiscipline] = useState<Discipline>('All')
  const [savedOnly,setSavedOnly] = useState(false)
  const [saved,setSaved] = useState<string[]>(initialSaved)
  const [notice,setNotice] = useState('Your night, saved only on this device.')
  const sessions = filterSessions(discipline,savedOnly,saved)
  const pendingFocus = useRef<string | null>(null)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', change)
    return () => preference.removeEventListener('change', change)
  }, [])
  useLayoutEffect(() => {
    const id = pendingFocus.current
    if (id === null) return
    pendingFocus.current = null
    const target = id
      ? document.querySelector<HTMLButtonElement>(`button[data-session-id="${id}"]`)
      : document.querySelector<HTMLButtonElement>('.empty-state button')
    target?.focus({ preventScroll: true })
  }, [saved, savedOnly])
  function save(id: string, fromPointer: boolean) {
    setAnimateSave(fromPointer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (savedOnly && saved.includes(id) && document.activeElement instanceof HTMLElement && document.activeElement.dataset.sessionId === id) {
      const index = sessions.findIndex(session => session.id === id)
      const remaining = sessions.filter(session => session.id !== id)
      pendingFocus.current = remaining[Math.min(index, remaining.length - 1)]?.id ?? ''
    }
    const next = toggleSaved(saved,id)
    setSaved(next)
    let success = false
    try { success = writeSaved(window.localStorage,next) } catch { /* unavailable storage */ }
    const title = SESSIONS.find(s=>s.id===id)?.title ?? 'Session'
    setNotice(success ? `${title} ${next.includes(id) ? 'added to' : 'removed from'} your night.` : 'Storage is unavailable. Your selection works for this visit.')
  }
  return <MotionConfig reducedMotion="user"><LazyMotion features={domAnimation} strict><div className="app-shell">
    <a className="skip-link" href="#programme">Skip to programme</a>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Afterhours home">a/h<span>✳</span></a>
      <nav className="nav-links" aria-label="Main navigation"><a href="#acts">The experience</a><a href="#programme">Programme</a><a href="#poster">Make a poster ↗</a></nav>
      <SoundToggle />
    </header>
    <main>
      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-meta"><p className="eyebrow">INDEPENDENT SOUND.<br/>EXPANDED VISIONS.</p><p className="edition">AN IMAGINARY GATHERING<br/>EDITION 001 / 2026</p></div>
        <div className="hero-body"><h1 className="hero-title" id="hero-title"><span>AFTER</span><span>HOURS</span></h1><div className="hero-art"><Artwork variant="hero"/><span className="art-caption">FIG. 01 — A SIGNAL WITHOUT A SOURCE</span></div></div>
        <div className="hero-footer"><p className="hero-description">A night outside of time.<br/>Electronic music × audiovisual art.<br/><span>Fictional festival. Real curiosity.</span></p><p className="hero-date">24—25 OCT<br/><span>19:00 UNTIL ALMOST MORNING</span></p><a className="round-link" href="#acts" aria-label="Explore the three acts">↓</a></div>
      </section>
      <div className="ticker" aria-hidden="true"><span>LEAVE THE EVERYDAY AT THE DOOR</span><span>✳</span><span>FOLLOW THE FREQUENCY</span><span>✳</span><span>STAY A LITTLE LONGER</span><span>✳</span></div>
      <section className="intro" id="about" aria-labelledby="intro-title"><p className="section-label">THE INVITATION / 001</p><h2 className="intro-statement" id="intro-title">For the hours<br/>that <em>don't belong</em><br/>to anyone.</h2><div className="intro-note"><span className="mini-mark" aria-hidden="true">↳</span><p>Somewhere between a dance floor and an art space, AFTERHOURS imagines a different kind of gathering. Three acts. Nine encounters. One shared state of mind.</p><p className="small-note">This is an independent design fiction.<br/>Every session and space is imagined.</p></div></section>
      <section className="acts" id="acts" aria-labelledby="acts-title"><div className="section-heading"><p className="section-label">A NIGHT IN THREE ACTS</p><h2 id="acts-title">Lose track.<br/>Find something.</h2><span className="section-counter">01 — 03</span></div>
        {acts.map(act=><article key={act.id} className={`act act-${act.id}`}><div className="act-topline"><span>ACT {act.n} / {act.subtitle}</span><span>{act.time}</span></div><div className="act-layout"><span className="act-number" aria-hidden="true">{act.n}</span><div className="act-copy"><h3>{act.title}</h3><p>{act.text}</p><span className="act-tags">{act.tags}</span></div><div className="act-art"><Artwork variant={act.id}/></div></div></article>)}
      </section>
      <section className="programme" id="programme" tabIndex={-1} aria-labelledby="programme-title"><div className="section-heading"><p className="section-label">THE RUNNING ORDER / 002</p><h2 id="programme-title">Follow your<br/><em>own frequency.</em></h2><span className="section-counter">09 ENCOUNTERS</span></div><div className="programme-intro"><p>No wrong turns. Filter the programme, collect a few moments, and make the night your own.</p><span>ALL SESSIONS ARE FICTIONAL<br/>TIMES BELONG TO THE CONCEPT</span></div>
        <div className="programme-controls"><div className="filter-list" role="group" aria-label="Filter programme by discipline">{(['All','Sound','Visual','Live'] as const).map(type=><button className="filter-button" key={type} aria-pressed={discipline===type} onClick={()=>setDiscipline(type)}>{type}{type==='All' ? ' encounters' : ''}</button>)}</div><button className="saved-filter" aria-pressed={savedOnly} onClick={()=>setSavedOnly(!savedOnly)}>My night <span>{saved.length.toString().padStart(2,'0')}</span> ↗</button></div>
        <div className="programme-status"><span aria-live="polite">{sessions.length} {sessions.length===1?'encounter':'encounters'}{savedOnly?' in your night':''}</span><p role="status">{notice}</p></div>
        <div className="programme-list">{sessions.map(session=><article className={`session session-${session.act}`} key={session.id}><div className="session-time"><time>{session.time}</time><span>{session.duration}</span></div><div className="session-info"><span className="session-type">{session.type} / {session.act}</span><h3>{session.title}</h3><p className="session-description">{session.description}</p></div><span className="session-act" aria-hidden="true">{session.act==='signal'?'↗':session.act==='fracture'?'✳':'◒'}</span><button className="save-session" data-session-id={session.id} aria-label={`${saved.includes(session.id)?'Remove':'Save'} ${session.title}`} aria-pressed={saved.includes(session.id)} onClick={(event)=>save(session.id,event.detail>0)}><m.span key={reducedMotion ? 'still' : 'animated'} aria-hidden="true" initial={false} animate={{ rotate: saved.includes(session.id) ? 0 : -90, scale: saved.includes(session.id) ? 1.1 : 1 }} transition={{ duration: reducedMotion || !animateSave ? 0 : .16, ease: [0.2, 0.8, 0.2, 1] }}>{saved.includes(session.id)?'✓':'+'}</m.span></button></article>)}{sessions.length===0&&<div className="empty-state"><p>{saved.length===0?'Your night is still an open canvas.':'No encounters in this frequency.'}</p><span>{saved.length===0?'Save a session with the + button to begin.':'Try another discipline or show the full programme.'}</span><button onClick={()=>{setDiscipline('All');setSavedOnly(false)}}>Explore all encounters ↗</button></div>}</div>
      </section>
      <PosterStudio />
      <section className="closing" aria-labelledby="closing-title"><div className="closing-meta"><span>NO COORDINATES. NO EXPECTATIONS.</span><span>JUST A DIFFERENT STATE OF MIND.</span></div><h2 className="closing-title" id="closing-title">THE NIGHT<br/>IS <em>YOURS.</em><span aria-hidden="true">↗</span></h2><div className="closing-bottom"><p>An imaginary place.<br/>A very real feeling.</p><a href="#top">BACK TO THE SIGNAL ↑</a></div></section>
    </main>
    <footer className="site-footer"><a className="brand" href="#top" aria-label="Back to Afterhours home">a/h<span>✳</span></a><p>AFTERHOURS © 2026<br/>A FICTIONAL FESTIVAL & DESIGN CONCEPT.</p><p>NO TICKETS. NO REAL EVENT.<br/>MADE FOR THE LOVE OF WHAT COMES NEXT.</p><a href="https://github.com/seoshiro/afterhours-experience" target="_blank" rel="noreferrer">ABOUT THE PROJECT ↗</a></footer>
  </div></LazyMotion></MotionConfig>
}
