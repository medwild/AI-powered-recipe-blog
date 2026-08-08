#!/usr/bin/env bash
# Hook PostToolUse — lance le ping sitemap + soumission GSC après chaque git push.
# Reçoit le JSON du tool via stdin : {tool_name, tool_input:{command}, ...}
set -euo pipefail

INPUT=$(cat)
# Ne réagir qu'aux push git
if ! echo "$INPUT" | grep -q '"command".*git push'; then
  exit 0
fi

# Le ping attend que le deploy Hostinger ait rebuildé (délai raisonnable)
sleep 30
LOG_DIR="${HOME}/.claude/logs"
mkdir -p "$LOG_DIR"
VENV_PY="${HOME}/.local/share/claude-seo/.venv/bin/python"
if [ -x "$VENV_PY" ] && [ -f "${PWD}/scripts/ping-sitemap.py" ]; then
  "$VENV_PY" "${PWD}/scripts/ping-sitemap.py" >> "$LOG_DIR/ping-sitemap.log" 2>&1
  echo "sitemap ping → $LOG_DIR/ping-sitemap.log"
fi
exit 0
