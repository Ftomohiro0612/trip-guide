# Mission Monitor (session operation infrastructure)

This directory holds **session-operation infrastructure only** — it is not
part of the trip-guide.net product. It exists to let the Memorips PM
(Claude Code) track an independent Mission-lane Codex CLI process (e.g.
MEM-EVT-C1) across `EXTERNAL_WAIT`, without re-deriving process/worktree/log
state by hand every session and without polluting the fixed-Session-Memory
first report.

## What it is

`mission-watch.sh` is a read-only poller. Given identifying details for one
Mission (PID, worktree, branch, log paths, agmsg routing), it repeatedly
checks:

- Whether the Mission's OS process is still alive **and** still the same
  process (PID + Windows process creation-time + command-line substring —
  not PID alone, since PIDs get reused).
- Whether the worktree still exists, and its current branch / HEAD /
  `git status --porcelain` count.
- Whether its stdout/stderr log files are growing.
- Whether a terminal role-routed agmsg handoff (`memorips-codex` →
  `memorips-pm`, body containing `handoff_id=<prefix>...`) has arrived.

Each observed *state change* (process alive/stopped, worktree gone, branch
drift, HEAD advancing, a terminal handoff) is printed as one line and
appended to a shared per-mission log — the shape the Monitor tool turns
into a chat notification. Log-file size is tracked every poll but is
deliberately **not** emitted on every change (an actively-writing Mission
touches its logs on nearly every poll, which would turn this into a
notification firehose); instead it feeds a periodic `heartbeat` line every
`--heartbeat-polls` polls (default 20) summarizing process/worktree/branch
status and log growth since the last heartbeat.

## What it is not

- **Not** a replacement for the generic agmsg inbox-stream Monitor
  (`~/.agents/skills/agmsg/scripts/watch.sh`). That one is broad (all
  messages, any team) and stays out of scope for the `セッション開始` /
  `セッション終了` shorthand contract in `AGENTS.md`. This one is narrow:
  one Mission, a fixed set of read-only checks, nothing else.
- **Not** integrated with the Product Health Sentinel or any other agent
  role. It does not read or write Sentinel state.
- **Not** an actor. It never writes to Product, Git, Production, agmsg, the
  fixed Session Memory, or hot memory. It never acknowledges or marks agmsg
  messages read (it only `SELECT`s). It never starts, stops, or sends input
  to the Mission process. It never edits the worktree. It never decides
  the next action or substitutes for Owner judgment — `AGENTS.md` still
  requires diagnosing from the logs and following the pre-defined
  escalation triggers before acting on anything this script reports.
- The only things it writes are its own runtime files under
  `~/.agents/agmsg/run/mission-monitor/` (a lockfile and a log file per
  mission-id) — ephemeral local state, not tracked, not product data.

## Exactly-one-poller guarantee

Multiple Claude Code sessions (or repeated invocations within one session)
may want to observe the same Mission. Only one poller actually runs:

1. On invocation, the script checks `~/.agents/agmsg/run/mission-monitor/mission-watch.<mission-id>.pid`.
2. If a live process is recorded there **and** its real Windows command
   line (resolved via `ps -p <pid>`'s WINPID column, then a PowerShell
   `Get-CimInstance` lookup — MSYS bash's own PID space is not the Windows
   PID space, and this MSYS `ps` build has no `-o args=`) still contains
   both `mission-watch.sh` and this `--mission-id`, the invocation does
   **not** start a second poller. It attaches read-only via
   `tail -f -n 0` on the shared log instead — safe to run from any number
   of sessions concurrently, since multiple `tail -f` readers never
   conflict.
3. Otherwise, this invocation becomes the poller: it claims the lockfile,
   and removes it on exit (normal exit or signal) via an EXIT trap.

## Invocation

The PM composes the exact command from the current fixed Session Memory's
`Exact Stop Point` fields each time (mirrors the existing "PM's dispatch =
paste-able text" convention) — nothing here is hardcoded to one Mission:

```
scripts/session-monitor/mission-watch.sh \
  --mission-id mem-evt-c1 \
  --pid 5432 --pid-cmdline-substr "Memorip-event-freshness-cycle1" \
  --worktree "/c/Users/tomo-/Documents/Memorip-event-freshness-cycle1" \
  --branch "codex/event-freshness-cycle1-l2-20260804" \
  --out-log "/c/Users/tomo-/.agents/agmsg/mem-evt-c1-mission-20260805.out.log" \
  --err-log "/c/Users/tomo-/.agents/agmsg/mem-evt-c1-mission-20260805.err.log" \
  --agmsg-db "/c/Users/tomo-/.agents/skills/agmsg/db/messages.db" \
  --agmsg-team memorips-role --agmsg-from memorips-codex --agmsg-to memorips-pm \
  --handoff-prefix "mem-evt-c1-terminal-" \
  --poll-interval 20
```

Run it via the Monitor tool with `persistent: true`. It terminates itself
(the poller instance only — an attached `tail -f` instance just stops
receiving lines) once a terminal condition is reached:

- a matching terminal handoff is found,
- the worktree disappears,
- the process is confirmed stopped and no terminal handoff arrives within
  the grace window (`--stop-grace-polls`, default 15 polls), or
- `--max-runtime-seconds` (default 86400) is reached without a confirmed
  outcome.

In every case the PM still verifies against real Git/production evidence
before acting — this script only shortens how long that verification takes
to notice, per `AGENTS.md`'s "セッション開始" Mission Monitor exception.

## Where the exception is defined

The narrow permission to run this Monitor — and the rule that its output
must never be folded into the fixed-Session-Memory first report — lives in
`AGENTS.md`, under `Memorips PM fixed Session Memory shorthands`.
