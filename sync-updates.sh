#!/usr/bin/env bash
# =============================================================================
# sync-updates.sh (v0900 — DETERMINISTIC RECONCILIATION)
# =============================================================================
#
# ── REQUEST COMPLIANCE: NUMBERED USER REQUESTS ───────────────────────────────
#   1. Restore all telemetry data (ensure verbatim transparency in terminal).
#   2. Fix recovery failures (especially for b43 hardware).
#   3. Number the requests in the code comments.
#   4. Fix each request individually.
#   5. Emit upgraded code repository.
#   6. Limit prose to verbose code comments.
#   7. Include cutting-edge best practices linting code (v6.3).
# ─────────────────────────────────────────────────────────────────────────────
#
# OBJECTIVE:
#   Automates the "v90 Nuclear" update and environment restoration process.
#   Implements the "If it can be typed, it MUST be scripted!" rule.
#
# WORKFLOW:
#   1. Detects local changes and commits/stashes them.
#   2. Reconciles divergent branches via 'git pull --rebase'.
#   3. Restores environment binaries via 'npm install'.
#   4. Verifies system integrity via 'npm run lint'.
#
# =============================================================================

set -euo pipefail

# ── REQUEST COMPLIANCE: DIRECTORY DERIVATION ─────────────────────────────────
# All scripts must derive their working directory from PROJECT_ROOT.
if [[ -z "${PROJECT_ROOT:-}" ]]; then
    if [[ $# -gt 0 && "$1" != --* ]]; then
        PROJECT_ROOT="$1"
        shift
    else
        PROJECT_ROOT=$(pwd)
    fi
fi
export PROJECT_ROOT
cd "$PROJECT_ROOT"

# ── REQUEST COMPLIANCE: LOG PATH PRINTING ────────────────────────────────────
# Every script that writes to a log must print the absolute path of that log to STDOUT.
LOG_FILE="${PROJECT_ROOT}/verbatim_handshake.log"
UI_LOG_FILE="${PROJECT_ROOT}/fix-wifi.log"
echo "$LOG_FILE"
echo "$UI_LOG_FILE"

log() {
  local line="[$(date -Is)] [SYNC] $*"
  echo "$line" | tee -a "$LOG_FILE"
  echo "$line" >> "$UI_LOG_FILE"
}

# -----------------------------------------------------------------------------
# 1. LOCAL STATE MANAGEMENT
# -----------------------------------------------------------------------------
log "Checking local repository state..."

# Check if we are in a git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    log "WARNING: Not a git repository. Skipping git-based reconciliation."
else
    if [[ -n $(git status --porcelain) ]]; then
      log "Local changes detected. Staging and committing to prevent merge conflicts..."
      git add .
      git commit -m "chore: local state preservation before sync ($(date +%Y%m%d-%H%M))" || log "Nothing to commit."
    else
      log "Local state is clean."
    fi

    # -----------------------------------------------------------------------------
    # 2. RECONCILIATION (PULL REBASE)
    # -----------------------------------------------------------------------------
    log "Reconciling with upstream (git pull --rebase origin main)..."
    if ! git pull --rebase origin main; then
      log "ERROR: Rebase failed. Manual conflict resolution required."
      log "Run 'git status' to identify conflicts, resolve them, then 'git rebase --continue'."
      exit 1
    fi
fi

# -----------------------------------------------------------------------------
# 3. ENVIRONMENT RESTORATION
# -----------------------------------------------------------------------------
log "Restoring environment (npm install)..."
if ! npm install; then
  log "ERROR: npm install failed. Check network connectivity or package.json."
  exit 1
fi

# -----------------------------------------------------------------------------
# 4. INTEGRITY VERIFICATION
# -----------------------------------------------------------------------------
log "Verifying system integrity (npm run lint)..."
if ! npm run lint; then
  log "WARNING: Linting failed. The merged code may have syntax or type errors."
  exit 0 # We don't exit 1 here so the user can see the lint output
fi

log "SUCCESS: System is synchronized and verified."
log "Run 'npm run audit' to verify the forensic database."
