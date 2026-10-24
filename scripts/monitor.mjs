// UserPromptSubmit: at checkpointRatio ask the model to write brief.md (once per cycle); at warnRatio warn
import fs from 'node:fs'
import path from 'node:path'
import { readStdin, loadConfig, currentTokens, sessionDir } from './lib.mjs'

const input = readStdin()
const cwd = input.cwd || process.cwd()
const cfg = loadConfig(cwd)
if (!cfg.enabled || !input.transcript_path) process.exit(0)
const used = currentTokens(input.transcript_path)
const fmt = n => n.toLocaleString()
const out = {}

if (used >= cfg.contextWindow * cfg.warnRatio) {
  out.systemMessage = `auto-compact: context ${fmt(used)} tokens; auto-compaction fires at ${fmt(cfg.contextWindow)}. Run /compact now at a clean stopping point if you prefer.`
  out.hookSpecificOutput = { hookEventName: 'UserPromptSubmit', additionalContext:
    `Context is ${fmt(used)} tokens and will auto-compact at ${fmt(cfg.contextWindow)}. Finish the current step, avoid starting large reads, and make sure brief.md is current.` }
} else if (used >= cfg.contextWindow * cfg.checkpointRatio) {
  const dir = sessionDir(cfg, cwd, input.session_id)
  const marker = path.join(dir, '.checkpoint-asked')
  if (!fs.existsSync(marker)) {
    try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(marker, new Date().toISOString()) } catch {}
    const target = path.join(dir, 'brief.md')
    out.hookSpecificOutput = { hookEventName: 'UserPromptSubmit', additionalContext:
      `auto-compact checkpoint: context is ${fmt(used)} of ${fmt(cfg.contextWindow)} tokens. Before answering, write ${target} (max ~${cfg.briefTokens} tokens, terse) so it survives compaction. Sections: ` +
      `1) Goal and the user's key requests quoted verbatim; 2) Decisions made, each with its reason; 3) Verified (command and result) vs NOT verified; ` +
      `4) Files touched/read and their state; 5) Outward side effects done (pushed, published, installed, rewritten) and where backups are; ` +
      `6) Current step and exact next step; 7) Open questions and gotchas. Then continue with the user's request.` }
  }
}
if (out.hookSpecificOutput || out.systemMessage) console.log(JSON.stringify(out))
