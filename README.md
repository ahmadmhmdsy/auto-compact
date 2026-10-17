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
