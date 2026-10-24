// PreCompact: write the verbatim conversation to <project>/.claude/handoffs/<session>/
import fs from 'node:fs'
import path from 'node:path'
import { buildBrief, buildTail, buildTurnIndex } from './brief.mjs'
import { readStdin, loadConfig, transcriptLines, textOf, sessionDir } from './lib.mjs'

const input = readStdin()
const cwd = input.cwd || process.cwd()
const cfg = loadConfig(cwd)
if (!cfg.enabled || !input.transcript_path) process.exit(0)

try {
  const dir = sessionDir(cfg, cwd, input.session_id)
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = path.join(dir, `${stamp}-conversation.md`)
  const msgs = []
  const out = [`# Conversation archive — ${input.session_id}`, `Trigger: ${input.trigger || 'unknown'} · ${new Date().toISOString()}`, '']
  let n = 0
  for (const e of transcriptLines(input.transcript_path)) {
    if (e.type !== 'user' && e.type !== 'assistant') continue
    const t = textOf(e.message?.content)
    if (!t) continue
    const block = `## ${e.type === 'user' ? 'User' : 'Assistant'} #${++n}
${t}
`
    msgs.push(block); out.push(block)
  }
  fs.writeFileSync(file, out.join('\n'), { flag: 'wx' })
  // newest messages up to ~retainTokens (4 chars/token), kept verbatim for re-injection
  let budget = cfg.retainTokens * 4, tail = []
  for (let i = msgs.length - 1; i >= 0 && budget > 0; i--) { tail.unshift(msgs[i].length > budget ? msgs[i].slice(-budget) : msgs[i]); budget -= msgs[i].length }
  fs.writeFileSync(path.join(dir, 'latest-tail-raw.md'), `# Verbatim tail (~${cfg.retainTokens} tokens) before compaction\n\n${tail.join('\n')}`)
  fs.writeFileSync(path.join(dir, 'latest-tail.md'), `# Tail digest (~${cfg.tailTokens} tokens; tool output dropped; full tail in latest-tail-raw.md)\n\n${buildTail(input.transcript_path, cfg.tailTokens)}`)
  fs.writeFileSync(path.join(dir, 'brief.auto.md'), buildBrief(input.transcript_path, { maxChars: cfg.briefTokens * 4 }))
  fs.writeFileSync(path.join(dir, 'turns.md'), buildTurnIndex(input.transcript_path))
  fs.rmSync(path.join(dir, '.checkpoint-asked'), { force: true })
  fs.appendFileSync(path.join(dir, 'index.md'), `- ${stamp} (${input.trigger || 'compact'}): ${path.basename(file)} — ${n} messages\n`)
  if (cfg.archive.gitIgnore) {
    const gi = path.join(cwd, '.gitignore'), line = cfg.archive.root.replace(/\\/g, '/') + '/'
    const cur = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : ''
    if (!cur.split(/\r?\n/).includes(line) && fs.existsSync(path.join(cwd, '.git')))
      fs.appendFileSync(gi, (cur && !cur.endsWith('\n') ? '\n' : '') + line + '\n')
  }
} catch (err) {
  console.error(`auto-compact: archive failed: ${err.message}`) // never block compaction
}
process.exit(0)
