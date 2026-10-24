// SessionStart(compact): inject the small brief inline; point at the tail digest and archive for on-demand detail
import fs from 'node:fs'
import path from 'node:path'
import { readStdin, loadConfig, sessionDir } from './lib.mjs'

const input = readStdin()
const cwd = input.cwd || process.cwd()
const cfg = loadConfig(cwd)
if (!cfg.enabled) process.exit(0)
const dir = sessionDir(cfg, cwd, input.session_id)
let files = []
try { files = fs.readdirSync(dir).filter(f => f.endsWith('-conversation.md')).sort() } catch {}
if (!files.length) process.exit(0)

const read = f => { try { return fs.readFileSync(path.join(dir, f), 'utf8') } catch { return '' } }
const modelBrief = read('brief.md')
const brief = (modelBrief || read('brief.auto.md')).slice(0, cfg.briefTokens * 4)
if (modelBrief) { try { fs.renameSync(path.join(dir, 'brief.md'), path.join(dir, 'brief.prev.md')) } catch {} } // one-shot: next cycle writes a fresh one

const p = f => path.join(dir, f)
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext:
  `Context was just compacted. Working brief (${modelBrief ? 'written by you before compaction' : 'mechanical; decisions and verification status were not captured'}):\n\n${brief}\n\n` +
  `On demand only (do not read eagerly): tail digest ${p('latest-tail.md')}; turn index ${p('turns.md')} (grep it); ` +
  `full archive ${path.join(dir, files.at(-1))}; raw tail ${p('latest-tail-raw.md')}. ` +
  `Files you read before compaction must be re-read before editing. Treat remembered paths, flags and states as unverified until checked. ` +
  `If a detail is missing, search the archive (Grep) or use the auto-compact "recall" skill instead of guessing.` } }))
