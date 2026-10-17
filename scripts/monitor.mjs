// UserPromptSubmit: warn when context usage passes warnRatio of contextWindow
import { readStdin, loadConfig, currentTokens } from './lib.mjs'

const input = readStdin()
const cfg = loadConfig(input.cwd || process.cwd())
if (!cfg.enabled || !input.transcript_path) process.exit(0)
const used = currentTokens(input.transcript_path)
if (used < cfg.contextWindow * cfg.warnRatio) process.exit(0)
const fmt = n => n.toLocaleString()
console.log(JSON.stringify({
  systemMessage: `auto-compact: context ${fmt(used)} tokens; auto-compaction fires at ${fmt(cfg.contextWindow)}. Run /compact now at a clean stopping point if you prefer.`,
  hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext:
    `Context is ${fmt(used)} tokens and will auto-compact at ${fmt(cfg.contextWindow)}. Keep working state concise.` },
}))
