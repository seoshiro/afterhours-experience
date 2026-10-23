export type Discipline = 'All' | 'Sound' | 'Visual' | 'Live'
export type ActId = 'signal' | 'fracture' | 'afterimage'
export interface Session { id: string; time: string; title: string; type: Exclude<Discipline, 'All'>; act: ActId; description: string; duration: string }
export const SESSIONS: Session[] = [
  { id:'soft-circuit', time:'19:00', title:'Soft circuit', type:'Sound', act:'signal', description:'A room slowly remembers how to listen.', duration:'45 min' },
  { id:'light-leak', time:'19:30', title:'Light leak studies', type:'Visual', act:'signal', description:'Projected colour, held just before it disappears.', duration:'60 min' },
  { id:'carrier-wave', time:'20:30', title:'Carrier wave', type:'Live', act:'signal', description:'An improvised dialogue between voltage and breath.', duration:'50 min' },
  { id:'pressure-system', time:'22:00', title:'Pressure system', type:'Sound', act:'fracture', description:'Broken rhythms for a beautifully unstable floor.', duration:'75 min' },
  { id:'fieldwork', time:'23:00', title:'Fieldwork / no. 03', type:'Visual', act:'fracture', description:'An impossible landscape assembled in real time.', duration:'45 min' },
  { id:'body-noise', time:'00:00', title:'Body / noise', type:'Live', act:'fracture', description:'Movement becomes sound. Sound becomes architecture.', duration:'60 min' },
  { id:'blue-hour', time:'01:30', title:'Blue hour, extended', type:'Sound', act:'afterimage', description:'Long-form frequencies for the spaces in between.', duration:'90 min' },
  { id:'retinal-memory', time:'02:30', title:'Retinal memory', type:'Visual', act:'afterimage', description:'A final image that stays when your eyes are closed.', duration:'45 min' },
  { id:'almost-morning', time:'03:30', title:'Almost morning', type:'Live', act:'afterimage', description:'A collective exhale at the edge of the imaginary dawn.', duration:'30 min' },
]
export const STORAGE_KEY = 'afterhours:night:v1'
const validIds = new Set(SESSIONS.map(s=>s.id))
export function parseSaved(raw: string | null): string[] {
  if (!raw || raw.length > 10000) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1 || !('ids' in parsed) || !Array.isArray(parsed.ids)) return []
    return [...new Set(parsed.ids.filter((id): id is string => typeof id === 'string' && validIds.has(id)))].slice(0,SESSIONS.length)
  } catch { return [] }
}
export function filterSessions(type: Discipline, savedOnly: boolean, saved: readonly string[]): Session[] {
  return SESSIONS.filter(s=>(type === 'All' || s.type === type) && (!savedOnly || saved.includes(s.id)))
}
export function toggleSaved(saved: readonly string[], id: string): string[] {
  if (!validIds.has(id)) return [...saved]
  return saved.includes(id) ? saved.filter(item=>item!==id) : [...saved,id]
}
export function readSaved(storage: Pick<Storage,'getItem'>): string[] { try { return parseSaved(storage.getItem(STORAGE_KEY)) } catch { return [] } }
export function writeSaved(storage: Pick<Storage,'setItem'>, ids: readonly string[]): boolean {
  try { storage.setItem(STORAGE_KEY,JSON.stringify({version:1,ids:ids.filter(id=>validIds.has(id))})); return true } catch { return false }
}
