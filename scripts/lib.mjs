import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const DEFAULTS = {
  enabled: true,
  contextWindow: 120000, // auto-compact fires at this many tokens (CLAUDE_CODE_AUTO_COMPACT_WINDOW)
  retainTokens: 20000,   // tail of the conversation re-surfaced verbatim after compaction
  tailTokens: 5000,      // trimmed digest of the tail that is re-read after compaction (full tail stays on disk)
  briefTokens: 2000,     // size cap of the always-loaded brief injected after compaction
  checkpointRatio: 0.70, // once per cycle, ask the model to write brief.md above this fraction
  warnRatio: 0.85,       // warn above this fraction of contextWindow
  archive: { root: '.claude/handoffs', gitIgnore: true },
}

export function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}') } catch { return {} }
}

export function userConfigPath() { return path.join(os.homedir(), '.claude', 'autocompact.json') }
export function projectConfigPath(cwd) { return path.join(cwd, '.claude', 'autocompact.json') }

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return {} } }

// project overrides user overrides defaults
export function loadConfig(cwd) {
  const u = readJson(userConfigPath()), p = readJson(projectConfigPath(cwd))
  return { ...DEFAULTS, ...u, ...p, archive: { ...DEFAULTS.archive, ...u.archive, ...p.archive } }
}

export function* transcriptLines(file) {
  let raw = ''
  try { raw = fs.readFileSync(file, 'utf8') } catch { return }
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try { yield JSON.parse(line) } catch {}
  }
}

export function textOf(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map(b => {
    if (b.type === 'text') return b.text
    if (b.type === 'tool_use') return `[tool_use ${b.name}] ${JSON.stringify(b.input).slice(0, 400)}`
    if (b.type === 'tool_result') return `[tool_result] ${textOf(b.content).slice(0, 400)}`
    return ''
  }).filter(Boolean).join('\n')
}

// Context size = usage of the most recent main-thread assistant turn
export function currentTokens(file) {
  let last = 0
  for (const e of transcriptLines(file)) {
    const u = e.message?.usage
    if (e.type === 'assistant' && u && !e.isSidechain)
      last = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0)
  }
  return last
}

export function sessionDir(cfg, cwd, sessionId) {
  return path.join(cwd, cfg.archive.root, sessionId || 'unknown')
}
