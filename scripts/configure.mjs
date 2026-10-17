// Usage: node configure.mjs [--tokens 120000] [--retain 20000] [--warn 0.85] [--enabled true|false] [--project] | --show
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadConfig, userConfigPath, projectConfigPath } from './lib.mjs'

const args = process.argv.slice(2)
const get = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined }
const cwd = process.cwd()
if (args.includes('--show') || !args.length) { console.log(JSON.stringify(loadConfig(cwd), null, 2)); process.exit(0) }

const target = args.includes('--project') ? projectConfigPath(cwd) : userConfigPath()
let cur = {}; try { cur = JSON.parse(fs.readFileSync(target, 'utf8')) } catch {}
const keys = { tokens: 'contextWindow', retain: 'retainTokens', warn: 'warnRatio' }
const num = (k, lo, hi) => {
  const v = get(k); if (v === undefined) return
  const n = Number(v)
  if (!(n >= lo && n <= hi)) { console.error(`--${k} must be in [${lo}, ${hi}]`); process.exit(1) }
  cur[keys[k]] = n
}
num('tokens', 10000, 10_000_000); num('retain', 0, 200000); num('warn', 0.1, 1)
if (get('enabled') !== undefined) cur.enabled = get('enabled') === 'true'
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, JSON.stringify(cur, null, 2))

// Claude Code's native trigger: auto-compact window in tokens (user settings env)
if (get('tokens') !== undefined) {
  const sp = path.join(os.homedir(), '.claude', 'settings.json')
  let s = {}; try { s = JSON.parse(fs.readFileSync(sp, 'utf8').replace(/^﻿/, '')) } catch (e) { if (fs.existsSync(sp)) { console.error('settings.json unreadable, not touching it'); process.exit(1) } }
  s.env = { ...s.env, CLAUDE_CODE_AUTO_COMPACT_WINDOW: String(cur.contextWindow) }
  fs.writeFileSync(sp, JSON.stringify(s, null, 2))
  console.log(`Set CLAUDE_CODE_AUTO_COMPACT_WINDOW=${cur.contextWindow} in ${sp} (restart Claude Code to apply).`)
}
console.log(`Saved ${target}`)
