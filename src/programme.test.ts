import { describe, expect, it, vi } from 'vitest'
import {
  filterSessions,
  parseSaved,
  readSaved,
  SESSIONS,
  STORAGE_KEY,
  toggleSaved,
  writeSaved,
} from './programme'

describe('local shortlist boundary', () => {
  it.each([null, '', '{broken', 'null', 'true', '17', '[]', '{}'])('recovers safely from corrupt or absent data: %s', (raw) => {
    expect(parseSaved(raw)).toEqual([])
  })

  it.each([
    '{"version":2,"ids":["soft-circuit"]}',
    '{"version":"1","ids":["soft-circuit"]}',
    '{"version":1,"ids":"soft-circuit"}',
    '{"version":1}',
    '{"ids":["soft-circuit"]}',
  ])('rejects incompatible schemas: %s', (raw) => {
    expect(parseSaved(raw)).toEqual([])
  })

  it('whitelists known string IDs, deduplicates and preserves chosen order', () => {
    const raw = JSON.stringify({ version: 1, ids: ['blue-hour', '__proto__', 'soft-circuit', 1, {}, null, 'blue-hour', '<script>alert(1)</script>'] })
    expect(parseSaved(raw)).toEqual(['blue-hour', 'soft-circuit'])
  })

  it('bounds oversized storage input before parsing', () => {
    expect(parseSaved(JSON.stringify({ version: 1, ids: ['soft-circuit'], padding: 'x'.repeat(10001) }))).toEqual([])
  })

  it('handles denied storage reads without blocking content', () => {
    expect(readSaved({ getItem: () => { throw new DOMException('Denied', 'SecurityError') } })).toEqual([])
  })

  it('reads only the namespaced versioned key', () => {
    const getItem = vi.fn(() => '{"version":1,"ids":["fieldwork"]}')
    expect(readSaved({ getItem })).toEqual(['fieldwork'])
    expect(getItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY)
  })

  it('returns failure on quota or denial instead of throwing', () => {
    for (const name of ['QuotaExceededError', 'SecurityError']) {
      expect(writeSaved({ setItem: () => { throw new DOMException('Unavailable', name) } }, ['soft-circuit'])).toBe(false)
    }
  })

  it('roundtrips known IDs while excluding untrusted IDs and never mutating input', () => {
    const ids = Object.freeze(['soft-circuit', 'not-a-session', 'body-noise'])
    const setItem = vi.fn()
    expect(writeSaved({ setItem }, ids)).toBe(true)
    expect(setItem).toHaveBeenCalledTimes(1)
    const [key, raw] = setItem.mock.calls[0] as [string, string]
    expect(key).toBe(STORAGE_KEY)
    expect(JSON.parse(raw)).toEqual({ version: 1, ids: ['soft-circuit', 'body-noise'] })
    expect(parseSaved(raw)).toEqual(['soft-circuit', 'body-noise'])
    expect(ids).toEqual(['soft-circuit', 'not-a-session', 'body-noise'])
  })
})

describe('programme selection', () => {
  it('has unique IDs and all nine fictional encounters', () => {
    expect(SESSIONS).toHaveLength(9)
    expect(new Set(SESSIONS.map(session => session.id)).size).toBe(9)
    expect(new Set(SESSIONS.map(session => session.act))).toEqual(new Set(['signal', 'fracture', 'afterimage']))
  })

  it('keeps running-order sequence across midnight', () => {
    expect(filterSessions('All', false, []).map(session => session.time)).toEqual(['19:00', '19:30', '20:30', '22:00', '23:00', '00:00', '01:30', '02:30', '03:30'])
  })

  it.each(['Sound', 'Visual', 'Live'] as const)('filters %s and intersects with the shortlist', (type) => {
    const expected = SESSIONS.filter(session => session.type === type)
    expect(filterSessions(type, false, [])).toEqual(expected)
    expect(filterSessions(type, true, [expected[1].id])).toEqual([expected[1]])
  })

  it('shows an empty state when nothing matches and ignores unknown saved IDs', () => {
    expect(filterSessions('All', true, [])).toEqual([])
    expect(filterSessions('All', true, ['unknown'])).toEqual([])
    expect(filterSessions('Sound', true, ['fieldwork'])).toEqual([])
  })

  it('toggles repeatedly and rejects IDs outside the programme', () => {
    const original = Object.freeze(['soft-circuit'])
    expect(toggleSaved(original, 'soft-circuit')).toEqual([])
    const added = toggleSaved(original, 'blue-hour')
    expect(added).toEqual(['soft-circuit', 'blue-hour'])
    expect(toggleSaved(added, 'blue-hour')).toEqual(original)
    expect(toggleSaved(original, 'unknown')).toEqual(original)
    expect(toggleSaved(original, 'unknown')).not.toBe(original)
    expect(original).toEqual(['soft-circuit'])
  })
})
