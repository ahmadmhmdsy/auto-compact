// Builders for the compact brief, trimmed tail digest and per-turn index (pure functions over the transcript)
import { transcriptLines } from './lib.mjs'

const SIDE_EFFECT = /\b(git\s+(push|commit|tag|reset|rebase)|gh\s+(repo|pr|release|issue)|npm\s+(publish|install\s+-g)|rm\s+-|rmdir|Remove-Item|curl\s+.*-X\s*(POST|PUT|DELETE)|settings\.json|deploy)\b/i
const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s)

// Real human text only: no tool results, no injected system-reminders or slash-command wrappers
function humanText(content) {
  const parts = typeof content === 'string' ? [content]
    : Array.isArray(content) ? content.filter(b => b.type === 'text').map(b => b.text) : []
  return parts.join('\n')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<local-command-[a-z]+>[\s\S]*?<\/local-command-[a-z]+>/g, '')
    .replace(/<command-(name|message|args)>[\s\S]*?<\/command-\1>/g, '')
    .trim()
}

function assistantText(content) {
  return Array.isArray(content) ? content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim() : ''
}

export function scan(file) {
  const turns = [], edited = new Map(), read = new Set(), effects = []
  for (const e of transcriptLines(file)) {
    if (e.isSidechain) continue
    const c = e.message?.content
    if (e.type === 'user' && !e.isMeta) {
      const t = humanText(c)
      if (t) turns.push({ role: 'user', text: t })
    } else if (e.type === 'assistant') {
      const t = assistantText(c)
      if (t) turns.push({ role: 'assistant', text: t })
      if (Array.isArray(c)) for (const b of c) {
        if (b.type !== 'tool_use') continue
        const p = b.input?.file_path || b.input?.notebook_path
        if (['Edit', 'Write', 'NotebookEdit'].includes(b.name) && p) edited.set(p, (edited.get(p) || 0) + 1)
        else if (b.name === 'Read' && p) read.add(p)
        else if ((b.name === 'Bash' || b.name === 'PowerShell') && SIDE_EFFECT.test(b.input?.command || ''))
          effects.push(clip(b.input.command.replace(/\s+/g, ' '), 160))
      }
    }
  }
  return { turns, edited, read, effects }
}

// Mechanical brief: the floor. A model-written brief.md overrides it when present.
export function buildBrief(file, { maxChars = 8000 } = {}) {
  const { turns, edited, read, effects } = scan(file)
  const users = turns.filter(t => t.role === 'user')
  const lastA = [...turns].reverse().find(t => t.role === 'assistant')
  const sec = (title, lines) => lines.length ? `## ${title}\n${lines.join('\n')}\n` : ''
  // newest user messages win the budget; first message is always kept (original goal)
  let budget = Math.floor(maxChars * 0.55)
  const kept = []
  const first = users[0]
  for (let i = users.length - 1; i >= 1 && budget > 0; i--) {
    const m = clip(users[i].text, 700); kept.unshift(m); budget -= m.length
  }
  const userLines = [
    ...(first ? [`- (original) ${clip(first.text, 700)}`] : []),
    ...kept.map(m => `- ${m}`),
  ]
  const out = [
    '# Auto-compact brief (mechanical — generated from the transcript)',
    sec('Your messages, verbatim (original first, then newest)', userLines),
    sec('Files edited (count)', [...edited].map(([p, n]) => `- ${p} ×${n}`)),
    sec('Files read', [...read].slice(-25).map(p => `- ${p}`)),
    sec('Outward / state-changing commands run', effects.slice(-15).map(c => `- \`${c}\``)),
    sec('Last assistant message (current step / next step)', lastA ? [clip(lastA.text, 1200)] : []),
    '_Not captured mechanically: decisions + reasons, verified-vs-unverified. See brief.md if present._',
  ].join('\n')
  return clip(out, maxChars)
}

// Digest tail: user messages + assistant prose + edit targets; tool output dropped.
export function buildTail(file, tokens) {
  const { turns } = scan(file)
  let budget = tokens * 4, tail = []
  for (let i = turns.length - 1; i >= 0 && budget > 0; i--) {
    const t = turns[i], body = `**${t.role === 'user' ? 'User' : 'Assistant'}:** ${t.text}\n`
    const piece = body.length > budget ? body.slice(0, budget) : body
    tail.unshift(piece); budget -= body.length
  }
  return tail.join('\n')
}

// One line per human turn so recall can grep instead of read
export function buildTurnIndex(file) {
  const { turns } = scan(file)
  return turns.map((t, i) => `${i + 1} ${t.role === 'user' ? 'U' : 'A'}: ${clip(t.text.replace(/\s+/g, ' '), 110)}`).join('\n') + '\n'
}
