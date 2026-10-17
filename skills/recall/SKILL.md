---
name: recall
description: Search archived pre-compaction conversation history. Use after a compaction when a detail (path, error, decision, code) is missing from the summary.
---
Archives live in `.claude/handoffs/<session-id>/` (`index.md` lists them; each `*-conversation.md` is verbatim).

1. Search: `node "${CLAUDE_PLUGIN_ROOT}/scripts/recall.mjs" "<regex>"`
2. Read the matching region of the file with Read (use offset/limit).
3. Quote only what you need; do not reload whole archives into context.
