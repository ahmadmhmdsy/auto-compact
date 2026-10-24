# auto-compact (Claude Code plugin)

Claude Code port of the idea behind `alshahia/dsh-autocompact`. A Claude Code plugin can't replace the compaction engine, so this wraps it with hooks:

| Piece | What it does |
|---|---|
| `PreCompact` hook | Writes the verbatim conversation to `<project>/.claude/handoffs/<session>/<ts>-conversation.md` + `index.md` (git-ignored). |
| `SessionStart` (compact) | Tells the model where the archive is after compaction. |
| `UserPromptSubmit` hook | Warns when context passes `warnRatio` (default 85% of the 120k window). |
| `/auto-compact:autocompact` | Shows/tunes `--tokens` (trigger), `--retain`, `--warn`; sets `CLAUDE_CODE_AUTO_COMPACT_WINDOW`. |
| `recall` skill | Greps archives for details lost in the summary. |

Config: `~/.claude/autocompact.json`, overridden by `<project>/.claude/autocompact.json`.

Install: `claude --plugin-dir ./auto-compact`, or add to a marketplace. Requires Node 18+.
Not ported: session_memory tool, Web UI panel, custom summarizer model.

## Brief-first recall (small context after compaction)

After a compaction only a ~2k-token **brief** is injected inline; everything else is read on demand.

| File (in `.claude/handoffs/<session>/`) | Purpose |
|---|---|
| `brief.md` | Written by the model at 70% of the window (`checkpointRatio`): verbatim user requests, decisions + reasons, verified vs unverified, files, side effects, next step. Used once, then renamed `brief.prev.md`. |
| `brief.auto.md` | Mechanical fallback built from the transcript: user messages, files edited/read, state-changing commands, last assistant message. |
| `latest-tail.md` | ~5k-token digest (`tailTokens`): user + assistant text, tool output dropped. |
| `latest-tail-raw.md` | Full verbatim ~20k-token tail (`retainTokens`), on demand only. |
| `turns.md` | One line per turn, so recall is a grep, not a read. |

Config keys: `tailTokens` (5000), `briefTokens` (2000), `checkpointRatio` (0.70), `warnRatio` (0.85).
