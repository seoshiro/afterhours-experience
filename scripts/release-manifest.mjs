import { createHash } from 'node:crypto'
import process from 'node:process'
import console from 'node:console'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join, relative } from 'node:path'
const root = 'dist'
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(e => e.isDirectory() ? walk(join(dir,e.name)) : join(dir,e.name)))
  return files.flat()
}
const sha = process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const files = (await walk(root)).filter(f => !f.endsWith('release.json')).sort()
const assets = await Promise.all(files.map(async path => ({path:relative(root,path).replaceAll('\\','/'),sha256:createHash('sha256').update(await readFile(path)).digest('hex')})))
await writeFile(join(root,'release.json'),JSON.stringify({commit:sha,assets},null,2)+'\n')
console.log(`Release ${sha}: ${assets.length} asset SHA-256 digests`)
