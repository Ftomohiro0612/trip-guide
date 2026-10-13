#!/usr/bin/env bash
# mission-watch.sh — read-only Mission-lane tracker for the Memorips PM shorthand contract.
#
# Purpose: while a Memorips session is in EXTERNAL_WAIT on an independent
# Codex CLI Mission process, give the PM a live, session-independent view of
# whether that Mission is still running and whether its terminal handoff has
# landed — WITHOUT the PM re-deriving this by hand each session, and WITHOUT
# writing to Product, Git, Production, agmsg, Session Memory, or hot memory.
#
# Contract (see scripts/session-monitor/README.md for the full writeup):
#   - Read-only: only reads process state (PowerShell CIM query), worktree
#     git state (rev-parse/status --porcelain), log file size/mtime, and
#     SELECTs from the agmsg messages.db. Never writes to any of those.
#   - Never acknowledges or marks agmsg messages read; never calls send.sh.
#   - Never starts/stops/modifies the Mission process or its worktree.
#   - Never takes a next action automatically and never substitutes for
#     Owner judgment — it only reports observed state as event lines.
#   - Exactly one poller per mission-id: if a poller for this mission-id is
#     already alive, this invocation attaches read-only to its shared log
#     via `tail -f` instead of starting a second poller.
#
# Usage:
#   mission-watch.sh --mission-id <id> \
#     --pid <pid> --pid-cmdline-substr <substr> \
#     --worktree <path> --branch <branch> \
#     --out-log <path> --err-log <path> \
#     --agmsg-db <path> --agmsg-team <team> \
#     --agmsg-from <agent> --agmsg-to <agent> \
#     --handoff-prefix <prefix> \
#     [--poll-interval <seconds>] [--stop-grace-polls <n>] \
#     [--max-runtime-seconds <seconds>] [--heartbeat-polls <n>]
#
# Intended invocation: via the Monitor tool, as the literal command line the
# PM composes from the current fixed Session Memory's EXTERNAL_WAIT fields.
# Runs until a terminal condition (handoff found / confirmed stop without a
# handoff / worktree gone / max runtime) or until killed by session teardown.

set -u

MISSION_ID=""
PID=""
PID_CMDLINE_SUBSTR=""
WORKTREE=""
BRANCH=""
OUT_LOG=""
ERR_LOG=""
AGMSG_DB=""
AGMSG_TEAM=""
AGMSG_FROM=""
AGMSG_TO=""
HANDOFF_PREFIX=""
POLL_INTERVAL=20
STOP_GRACE_POLLS=15
MAX_RUNTIME_SECONDS=86400
HEARTBEAT_POLLS=20

while [ $# -gt 0 ]; do
  case "$1" in
    --mission-id) MISSION_ID="$2"; shift 2 ;;
    --pid) PID="$2"; shift 2 ;;
    --pid-cmdline-substr) PID_CMDLINE_SUBSTR="$2"; shift 2 ;;
    --worktree) WORKTREE="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --out-log) OUT_LOG="$2"; shift 2 ;;
    --err-log) ERR_LOG="$2"; shift 2 ;;
    --agmsg-db) AGMSG_DB="$2"; shift 2 ;;
    --agmsg-team) AGMSG_TEAM="$2"; shift 2 ;;
    --agmsg-from) AGMSG_FROM="$2"; shift 2 ;;
    --agmsg-to) AGMSG_TO="$2"; shift 2 ;;
    --handoff-prefix) HANDOFF_PREFIX="$2"; shift 2 ;;
    --poll-interval) POLL_INTERVAL="$2"; shift 2 ;;
    --stop-grace-polls) STOP_GRACE_POLLS="$2"; shift 2 ;;
    --max-runtime-seconds) MAX_RUNTIME_SECONDS="$2"; shift 2 ;;
    --heartbeat-polls) HEARTBEAT_POLLS="$2"; shift 2 ;;
    *) echo "mission-watch: unknown argument: $1" >&2; exit 2 ;;
  esac
done

for req in MISSION_ID PID PID_CMDLINE_SUBSTR WORKTREE BRANCH OUT_LOG ERR_LOG AGMSG_DB AGMSG_TEAM AGMSG_FROM AGMSG_TO HANDOFF_PREFIX; do
  if [ -z "${!req}" ]; then
    echo "mission-watch: missing required --${req,,} (fail-closed: no guessing)" >&2
    exit 2
  fi
done

case "$MISSION_ID" in
  *[!A-Za-z0-9_-]*|"")
    echo "mission-watch: --mission-id must be [A-Za-z0-9_-]+" >&2
    exit 2
    ;;
esac

RUN_DIR="$HOME/.agents/agmsg/run/mission-monitor"
mkdir -p "$RUN_DIR" 2>/dev/null || true
LOCKFILE="$RUN_DIR/mission-watch.$MISSION_ID.pid"
LOGFILE="$RUN_DIR/mission-watch.$MISSION_ID.log"

# MSYS bash's own PID space is distinct from the Windows PID Get-CimInstance
# understands (compare the PID and WINPID columns of `ps`), and this MSYS
# ps build doesn't support `-o args=` to read a command line directly. So
# identity confirmation goes: MSYS pid -> WINPID (via `ps -p`) -> Windows
# CommandLine (via CIM) -> substring check. `kill -0` alone stays MSYS-pid
# native and needs no translation.
is_poller_alive() {
  [ -f "$LOCKFILE" ] || return 1
  local pid; pid=$(cat "$LOCKFILE" 2>/dev/null || true)
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  local winpid
  winpid=$(ps -p "$pid" 2>/dev/null | awk 'NR==2 {print $4}')
  [ -n "$winpid" ] || return 1
  local cmdline
  cmdline=$(powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=$winpid' -ErrorAction SilentlyContinue).CommandLine" 2>/dev/null)
  [[ "$cmdline" == *mission-watch.sh* && "$cmdline" == *"$MISSION_ID"* ]]
}

if is_poller_alive; then
  existing_pid=$(cat "$LOCKFILE" 2>/dev/null || true)
  echo "mission-watch: poller already running (pid=$existing_pid) for mission-id=$MISSION_ID; attaching read-only to its log" >&2
  touch "$LOGFILE" 2>/dev/null || true
  exec tail -f -n 0 "$LOGFILE"
fi

echo $$ > "$LOCKFILE"
cleanup() {
  if [ "$(cat "$LOCKFILE" 2>/dev/null)" = "$$" ]; then
    rm -f "$LOCKFILE"
  fi
}
trap cleanup EXIT
trap 'exit 0' INT TERM HUP

emit() {
  local line
  line="$(date -u +%Y-%m-%dT%H:%M:%SZ) mission=$MISSION_ID $1"
  printf '%s\n' "$line" | tee -a "$LOGFILE"
}

# Read-only PowerShell CIM probe. Prints "ALIVE\t<creation-filetime>\t<cmdline>" or "DEAD".
probe_pid() {
  local target_pid="$1"
  powershell -NoProfile -Command "
    \$p = Get-CimInstance Win32_Process -Filter 'ProcessId=$target_pid' -ErrorAction SilentlyContinue
    if (\$p) {
      \$ms = ([datetime]\$p.CreationDate).ToFileTimeUtc()
      Write-Output (\"ALIVE\`t\$ms\`t\$(\$p.CommandLine)\")
    } else {
      Write-Output 'DEAD'
    }
  " 2>/dev/null
}

baseline_epoch=""
baseline_captured=0
process_alive=""
worktree_exists=""
last_head=""
last_branch_ok=""
last_out_size=-1
last_err_size=-1
stall_polls=0
stop_confirmed_polls=0
last_handoff_id=0
terminal_reached=0
poll_count=0

start_epoch=$(date -u +%s)

emit "poller started pid=$PID cmdline-substr='$PID_CMDLINE_SUBSTR' worktree='$WORKTREE' branch='$BRANCH' agmsg-team=$AGMSG_TEAM handoff-prefix='$HANDOFF_PREFIX'"

while true; do
  now_epoch=$(date -u +%s)
  if [ $((now_epoch - start_epoch)) -ge "$MAX_RUNTIME_SECONDS" ]; then
    emit "TERMINAL: max-runtime-seconds ($MAX_RUNTIME_SECONDS) reached without a confirmed outcome; PM should re-verify manually"
    terminal_reached=1
    break
  fi

  probe_result="$(probe_pid "$PID")"
  IFS=$'\t' read -r p_status p_epoch p_cmdline <<< "$probe_result"

  if [ "$p_status" = "ALIVE" ]; then
    case "$p_cmdline" in
      *"$PID_CMDLINE_SUBSTR"*)
        if [ "$baseline_captured" -eq 0 ]; then
          baseline_epoch="$p_epoch"
          baseline_captured=1
          emit "process confirmed alive pid=$PID (baseline creation-time captured)"
        fi
        if [ "$p_epoch" = "$baseline_epoch" ]; then
          if [ "$process_alive" != "1" ]; then
            emit "process alive pid=$PID (identity matches baseline)"
          fi
          process_alive=1
        else
          if [ "$process_alive" != "0" ]; then
            emit "process pid=$PID no longer matches baseline creation-time (likely PID reuse by an unrelated process) — treating original Mission process as stopped"
          fi
          process_alive=0
        fi
        ;;
      *)
        if [ "$process_alive" != "0" ]; then
          emit "process pid=$PID is alive but its command line no longer contains the expected worktree marker — treating original Mission process as stopped"
        fi
        process_alive=0
        ;;
    esac
  else
    if [ "$baseline_captured" -eq 0 ]; then
      baseline_captured=1
      emit "process pid=$PID was not found on first probe (already exited or never matched)"
    elif [ "$process_alive" != "0" ]; then
      emit "process pid=$PID no longer present (exited)"
    fi
    process_alive=0
  fi

  if [ -d "$WORKTREE" ]; then
    if [ "$worktree_exists" != "1" ]; then
      emit "worktree exists: $WORKTREE"
    fi
    worktree_exists=1

    cur_branch="$(git -C "$WORKTREE" rev-parse --abbrev-ref HEAD 2>/dev/null)"
    cur_head="$(git -C "$WORKTREE" rev-parse HEAD 2>/dev/null)"
    cur_porcelain_count="$(git -C "$WORKTREE" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"

    if [ -n "$cur_branch" ] && [ "$cur_branch" != "$BRANCH" ]; then
      if [ "$last_branch_ok" != "0" ]; then
        emit "WARNING: worktree branch is '$cur_branch', expected '$BRANCH'"
      fi
      last_branch_ok=0
    else
      last_branch_ok=1
    fi

    if [ -n "$cur_head" ] && [ "$cur_head" != "$last_head" ]; then
      emit "HEAD advanced to $cur_head (branch=$cur_branch, uncommitted-changed-files=$cur_porcelain_count)"
      last_head="$cur_head"
    fi
  else
    if [ "$worktree_exists" != "0" ]; then
      emit "TERMINAL: worktree no longer exists: $WORKTREE"
    fi
    worktree_exists=0
    terminal_reached=1
  fi

  # Log sizes are tracked on every poll but not emitted per-change — an
  # actively-writing Mission touches its logs on nearly every poll, which
  # would turn this into a firehose. Growth/stall feeds the heartbeat below
  # instead; only genuinely rare transitions (process/worktree/branch/HEAD/
  # handoff) get their own line.
  for pair in "OUT:$OUT_LOG:last_out_size" "ERR:$ERR_LOG:last_err_size"; do
    rest="${pair#*:}"
    logpath="${rest%%:*}"
    varname="${rest##*:}"
    if [ -f "$logpath" ]; then
      size=$(wc -c < "$logpath" 2>/dev/null | tr -d ' ')
      eval "$varname=$size"
    fi
  done

  if [ "$process_alive" = "1" ]; then
    cur_total=$((${last_out_size:-0} + ${last_err_size:-0}))
    if [ "${prev_total:-}" = "$cur_total" ]; then
      stall_polls=$((stall_polls + 1))
    else
      stall_polls=0
    fi
    prev_total="$cur_total"
  fi

  poll_count=$((poll_count + 1))
  if [ "$((poll_count % HEARTBEAT_POLLS))" -eq 0 ]; then
    emit "heartbeat #$poll_count: process_alive=$process_alive worktree_exists=$worktree_exists branch_ok=${last_branch_ok:-unknown} out=${last_out_size:-0}B err=${last_err_size:-0}B stall_polls=$stall_polls"
  fi

  handoff_row="$(sqlite3 -cmd ".timeout 3000" "$AGMSG_DB" \
    "SELECT id, created_at, substr(body,1,2000) FROM messages WHERE team='$AGMSG_TEAM' AND from_agent='$AGMSG_FROM' AND to_agent='$AGMSG_TO' AND body LIKE '%handoff_id=$HANDOFF_PREFIX%' ORDER BY id DESC LIMIT 1;" 2>/dev/null)"

  if [ -n "$handoff_row" ]; then
    handoff_id="${handoff_row%%|*}"
    if [ "$handoff_id" -gt "$last_handoff_id" ] 2>/dev/null; then
      last_handoff_id="$handoff_id"
      emit "TERMINAL HANDOFF DETECTED (agmsg id=$handoff_id): $handoff_row"
      terminal_reached=1
    fi
  fi

  if [ "$terminal_reached" -eq 1 ]; then
    break
  fi

  if [ "$process_alive" = "0" ]; then
    stop_confirmed_polls=$((stop_confirmed_polls + 1))
    if [ "$stop_confirmed_polls" -ge "$STOP_GRACE_POLLS" ]; then
      emit "TERMINAL: process confirmed stopped and no terminal handoff arrived within grace window ($STOP_GRACE_POLLS polls) — possible cannot-continue block; PM should diagnose from out/err logs"
      terminal_reached=1
      break
    fi
  else
    stop_confirmed_polls=0
  fi

  sleep "$POLL_INTERVAL" &
  wait $! 2>/dev/null
done

emit "poller exiting (terminal condition reached)"
exit 0
