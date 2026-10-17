// SessionStart(compact): tell the model where the pre-compaction history lives
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
const latest = path.join(dir, files.at(-1))
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext:
  `Context was just compacted. The verbatim pre-compaction conversation is archived at ${latest} (index: ${path.join(dir, 'index.md')}). ` +
  `Read the retained verbatim tail first: ${path.join(dir, 'latest-tail.md')}. If the summary lacks a detail you need, search the archive (Grep) or use the auto-compact "recall" skill instead of guessing.` } }))
