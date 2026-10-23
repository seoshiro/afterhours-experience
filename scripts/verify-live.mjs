import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import console from 'node:console'

const base = 'https://seoshiro.github.io/afterhours-experience/'
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const local = JSON.parse(await readFile('dist/release.json', 'utf8'))
if (local.commit !== commit) throw new Error('Local build manifest does not match HEAD')
const response = await globalThis.fetch(`${base}release.json?verify=${commit}`, { signal: globalThis.AbortSignal.timeout(15000) })
if (!response.ok) throw new Error(`Live manifest HTTP ${response.status}`)
const live = await response.json()
if (live.commit !== commit || JSON.stringify(live.assets) !== JSON.stringify(local.assets)) throw new Error('Live source SHA or manifest differs from this build')
const assets = []
for (const asset of local.assets) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(asset.path) || asset.path.includes('..') || asset.path.startsWith('/')) throw new Error('Invalid manifest path')
  const result = await globalThis.fetch(`${base}${asset.path}?verify=${commit}`, { signal: globalThis.AbortSignal.timeout(15000) })
  if (!result.ok) throw new Error(`${asset.path}: HTTP ${result.status}`)
  const bytes = new Uint8Array(await result.arrayBuffer())
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (digest !== asset.sha256) throw new Error(`${asset.path}: SHA-256 mismatch`)
  assets.push({ path: asset.path, sha256: digest, bytes: bytes.length, status: 'PASS' })
}
await mkdir('release', { recursive: true })
await writeFile('release/identity.json', JSON.stringify({ at: new Date().toISOString(), base, commit, status: 'PASS', assets }, null, 2) + '\n')
console.log(`PASS: live commit ${commit} and ${assets.length} asset SHA-256 digests match the local build`)
