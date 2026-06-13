#!/bin/bash
# ai-dashboard queue retry worker
# Polls queue status and retries queued messages when rate limits clear.
# Designed to run as a background watchdog via cron/scheduler.
# Usage: ./retry_queue.sh [server_url] [poll_interval_sec]

set -euo pipefail

SERVER_URL="${1:-http://localhost:3000}"
POLL_INTERVAL="${2:-60}"
# Use localhost origin so CORS doesn't block local health-check calls
ORIGIN_HEADER="Origin: http://localhost:3000"
QUEUE_STATUS_URL="${SERVER_URL}/api/queue/status"
QUEUE_RETRY_URL="${SERVER_URL}/api/queue/retry"
HEALTH_URL="${SERVER_URL}/health"

log() {
  echo "[$(date '+%Y-%m-%dT%H:%M:%S')] [queue-worker] $*"
}

check_health() {
  curl -sf -H "$ORIGIN_HEADER" "${SERVER_URL}/health" > /dev/null 2>&1
}

# Wait for server to be ready
log "Connecting to ${SERVER_URL}..."
for i in $(seq 1 30); do
  if check_health; then
    log "Server is up."
    break
  fi
  if [ $i -eq 30 ]; then
    log "ERROR: Server not reachable after 30 attempts. Exiting."
    exit 1
  fi
  sleep 2
done

log "Queue worker started. Polling every ${POLL_INTERVAL}s."
log "Status endpoint: ${QUEUE_STATUS_URL}"

while true; do
  status=$(curl -sf -H "$ORIGIN_HEADER" "${QUEUE_STATUS_URL}" 2>/dev/null || echo '{"error": "failed"}')
  
  queue_len=$(echo "$status" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('queueLength', 0))" 2>/dev/null || echo "0")
  keys_rl=$(echo "$status" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('keysRateLimited', [])))" 2>/dev/null || echo "0")
  
  if [ "$queue_len" -eq 0 ]; then
    log "Queue empty — nothing to do."
  elif [ "$keys_rl" -gt 0 ]; then
    oldest=$(echo "$status" | python3 -c "import sys,json; d=json.load(sys.stdin); at=d.get('oldestQueuedAt'); print(at)" 2>/dev/null || echo "unknown")
    log "Queue has ${queue_len} message(s) queued, ${keys_rl} key(s) still rate limited. Oldest queued at: ${oldest}"
  else
    log "Queue has ${queue_len} message(s), all keys available — triggering retry."
    retry_response=$(curl -sf -X POST -H "$ORIGIN_HEADER" -H "Content-Type: application/json" -m 65 --nodelay "${QUEUE_RETRY_URL}" 2>/dev/null || echo '{"error": "timeout"}')
    retry_error=$(echo "$retry_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error', {}).get('type', '') or d.get('message', ''))" 2>/dev/null || echo "unknown")
    retry_status=$(echo "$retry_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('queueLength', d.get('retry', 0)) is not None or 'error' not in d else 'ok')" 2>/dev/null || echo "unknown")
    
    if echo "$retry_response" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('error',{}).get('type')=='rate_limit_exceeded' else 1)" 2>/dev/null; then
      log "Retry returned 429 (key still rate limited). Will retry next cycle."
    elif [ "$retry_error" = "0" ] || [ "$retry_error" = "Queue is empty" ]; then
      log "Queue drained — all messages processed."
    elif echo "$retry_response" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('error') else 1)" 2>/dev/null; then
      log "Retry failed: ${retry_error}. Will retry next cycle."
    else
      log "Retry triggered successfully — response received."
    fi
  fi
  
  sleep "$POLL_INTERVAL"
done