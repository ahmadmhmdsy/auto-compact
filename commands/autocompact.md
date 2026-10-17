---
description: Show or tune auto-compact settings (threshold, warning level, context window)
argument-hint: "[--tokens 120000] [--retain 20000] [--warn 0.85] [--enabled true|false] [--project]"
allowed-tools: Bash(node:*)
---
Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/configure.mjs" $ARGUMENTS` and report the output.
With no arguments it prints the effective config. Remind the user that a changed `--tokens` needs a Claude Code restart.
