// Usage: node recall.mjs <regex>   — search archived conversations of the current project
import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from './lib.mjs'

const pat = process.argv[2]
if (!pat) { console.error('usage: recall.mjs <regex>'); process.exit(1) }
const cwd = process.cwd(), root = path.join(cwd, loadConfig(cwd).archive.root)
const re = new RegExp(pat, 'i')
let hits = 0
for (const s of fs.existsSync(root) ? fs.readdirSync(root) : []) {
  const d = path.join(root, s)
  if (!fs.statSync(d).isDirectory()) continue
  for (const f of fs.readdirSync(d).filter(f => f.endsWith('-conversation.md'))) {
    fs.readFileSync(path.join(d, f), 'utf8').split('\n').forEach((l, i) => {
      if (re.test(l) && hits < 40) { hits++; console.log(`${path.join(d, f)}:${i + 1}: ${l.slice(0, 240)}`) }
    })
  }
}
if (!hits) console.log('no matches')
