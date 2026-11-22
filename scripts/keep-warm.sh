#!/usr/bin/env bash
# scripts/keep-warm.sh — Keep Vercel Hobby serverless functions warm
#
# Problem: Vercel Hobby suspends functions after ~5 min inactivity.
# First request after pause = 20-60s cold start = browser timeout (ERR_CONNECTION_TIMED_OUT).
# This script pings the site every 3min to keep functions alive.
#
# Usage:
#   chmod +x scripts/keep-warm.sh
#   ./scripts/keep-warm.sh              # run once (for testing)
#   ./scripts/keep-warm.sh --loop       # run indefinitely, ping every 3 min
#   ./scripts/keep-warm.sh --once       # single ping + report
#
# Cron (recommended — every 3 min):
#   crontab -e
#   */3 * * * * /home/user/ai-blog-builder/scripts/keep-warm.sh --once >> /home/user/ai-blog-builder/scripts/warm-logs.txt 2>&1
#
# Or with systemd timer for more reliability:
#   See scripts/keep-warm.service + scripts/keep-warm.timer

set -euo pipefail

SITE="${WARM_SITE:-https://www.chefaugustin.com}"
TIMEOUT="${WARM_TIMEOUT:-15}"
LOG_FILE="${WARM_LOG:-/tmp/chefaugustin-warm.log}"
MAX_LOG_LINES="${WARM_MAX_LOG:-5000}"

log() {
  local ts
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "[$ts] $*"
}

ping_site() {
  local http_code start end duration
  start=$(date +%s%N)
  http_code=$(curl -so /dev/null -w '%{http_code}' \
    --connect-timeout "$TIMEOUT" \
    --max-time "$TIMEOUT" \
    "$SITE" 2>/dev/null || echo "000")
  end=$(date +%s%N)
  duration=$(( (end - start) / 1000000 ))  # ms

  if [ "$http_code" = "200" ]; then
    log "OK  HTTP $http_code | ${duration}ms"
    return 0
  else
    log "FAIL HTTP $http_code | ${duration}ms | SITE=$SITE"
    return 1
  fi
}

# Rotate log file if too large
rotate_log() {
  mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
  local lines
  lines=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
  if [ "$lines" -gt "$MAX_LOG_LINES" ]; then
    tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "${LOG_FILE}.tmp"
    mv "${LOG_FILE}.tmp" "$LOG_FILE"
  fi
}

run_once() {
  rotate_log
  ping_site | tee -a "$LOG_FILE"
}

run_loop() {
  log "Starting keep-warm loop — pinging $SITE every 3min"
  log "Log: $LOG_FILE"
  while true; do
    rotate_log
    ping_site >> "$LOG_FILE" 2>&1 || true
    sleep 180  # 3 minutes
  done
}

case "${1:-}" in
  --loop)  run_loop ;;
  --once)  run_once ;;
  *)       run_once ;;
esac
