# Memorips Product Agent Entry

Product code and Product Git facts are canonical in this public repository. Operational Mission/state/learning are canonical in the private repository `Ftomohiro0612/ai-memory-memorips`.

For an explicitly authorized autonomous Memorips operation, read the private Memory repository's:

1. `README.md`
2. `AGENTS.md`
3. `docs/ai-memory/memorips/autonomous-operating-contract.md`
4. `docs/ai-memory/memorips/current-mission.md`
5. `docs/ai-memory/memorips/experiment-ledger.md`
6. `docs/ai-memory/memorips/action-ledger.md`
7. active private Memory Issue #1

Then inspect only the Product/Production evidence required by the selected Mission action. A commit, page improvement, content wave, report, post, daily plan, or first formal GREEN is not Mission completion. The first GREEN ends that changed-risk review lane only; update the Mission frontier and continue unless an explicit stop state or Owner boundary applies.

Do not copy private hot memory, secrets, PII, child/family details, row-level Production data, private URLs, or credentials into this public repository.

## Workspace role binding

The role is decided by the workspace (checkout root) the session runs in, never by a guess:

| Workspace | Role | Scope | Fixed Session Memory |
|---|---|---|---|
| `C:\Users\tomo-\Documents\Memorip` | Memorips PM | `memorips` | `C:\Users\tomo-\Documents\ai-session-memory\memorips\current-session.md` |
| `C:\Users\tomo-\Documents\memorips-growth` | Memorips Growth PM | `memorips-growth` | `C:\Users\tomo-\Documents\ai-session-memory\memorips-growth\current-session.md` |

Memorips Growth PM (Owner GO 2026-10-13): finds growth opportunities from real search demand (Google Search Console and similar: queries, positions, CTR, landing pages, coverage gaps) and turns existing facility / event / seasonal data into Organic Search inflow connected to 探す→行く→記録する→好きが分かる→次のおでかけ. Growth decides *where* growth is worth pursuing and returns that to the existing lanes through the Memorips PM; it does not run its own bulk facility/event intake or an SEO article factory, and it does not duplicate FacilityOps / EventOps / Memorips PM work. Organic Search is the current channel. Growth has no merge, deploy, publication, or canon authority. Product semantics changes, large new content systems, auto-generated pages, and paid measures or new paid dependencies return to the Owner. The canonical Owner decision is in the private Memory repository (`active-decisions.md`).

## Memorips PM fixed Session Memory shorthands

Apply this section only when the entire user message is exactly `セッション開始` or exactly `セッション終了`. Do not activate it for a substring, quoted example, longer request, or another scope.

- Role, expected scope, and Fixed Session Memory: the row of the Workspace role binding table above for the current workspace. Every `memorips` in the steps below means that row's scope, and "the fixed file" means that row's Fixed Session Memory. A workspace not in the table has no shorthand; report that and wait.

### `セッション開始`

1. Read only the fixed `current-session.md` above. Record its `updated_at`, `session`, and SHA-256 at read time as the write base.
2. Confirm that the frontmatter `scope` is `memorips`, and use only the frontmatter and the three top-level sections `# Current State`, `# Claude Code Handoff`, `# Codex Handoff` as the initial resume pointer (format aligned to the Cauvix scopes' `current-session.md` layout, Owner decision 2026-09-14).
3. Report the recorded position as a per-section summary of the fixed file (Owner decision 2026-10-14, same granularity as the Cauvix PM start report), in this order: a `セッション開始報告(<Role> / scope <scope>)` heading; a frontmatter line (status / updated_at / session / scope match / write-base sha256 prefix); **Current State** summary (current position with exact identifiers such as PR, commit, Mission ID, Version; key fixed decisions; held items); **Claude Code Handoff** summary (lane status, numbered Resume Point, what not to do); **Owner decisions / Owner operations pending** (count and content, stated even when 0); **Codex Handoff** summary (running Mission identity: PID / worktree / branch; Codex-side pending decisions); **Unverified items**; and a **Continuation judgment**. This report comes only from the fixed file, never from a Monitor's output.
4. Before the initial report, do not read an archive, this Product repository, Git/GitHub, Issues, Production, another memory, or another scope. Do not start investigation, implementation, verification, or a Monitor. This restriction does not reach the standing Session Monitor already started by the SessionStart hook before this shorthand ran (see "Session Monitor" below) — that Monitor is hook-managed lifecycle infrastructure, not something the PM starts under this contract.
   - Mission Monitor exception (Owner decision 2026-08-05): after the initial report, if `# Codex Handoff` › `## Target` records an `EXTERNAL_WAIT` on an independent Mission-lane Codex CLI process with a PID/worktree/branch/log identity, the PM may invoke exactly one read-only Mission Monitor for it, running `scripts/session-monitor/mission-watch.sh` (contract: `scripts/session-monitor/README.md`) with the identity fields taken verbatim from the fixed file. The script performs its own reuse check. It must stay strictly read-only: it never writes to Product, Git, Production, agmsg, Session Memory, or hot memory, never ACKs or marks agmsg messages read, never starts, stops, or modifies the Mission, and never substitutes for Owner judgment. Reconcile what it observes with the canonical facts before treating either as authoritative.
5. After the initial report, safely fetch the private Memory and Product repositories without overwriting, cleaning, stashing, resetting, deleting, or altering another worktree's local/untracked files.
6. Read the private autonomous sources listed at the top of this file and reconcile the local fixed Session Memory against current GitHub/Product/Production facts. The fixed file is a fast pointer, not superior canon; mark stale statements as superseded rather than following an obsolete stop point.
7. Continue only within a valid authorization envelope. Re-check the current Mission, Owner decisions, active Issues/PRs, exact Product baseline, relevant Production/aggregate evidence, and external-action ledger before changing anything.
8. Perform the highest expected-value permitted Mission action, verify the real result, update the private ledgers/frontier, and continue. When a changed-risk review reaches its first formal `GREEN / blocking 0`, end that review lane only and select the next permitted Mission action.
9. Stop only in one of the private contract states: `MEASUREMENT_WAIT`, `EXTERNAL_WAIT`, `OWNER_REQUIRED`, `BUDGET_LIMITED`, `POLICY_STOP`, `STUCK`, `ACHIEVED`, or `KILLED`. A wait must include a dependency, next trigger/time, exact continuation action, and why no other higher-value permitted action can proceed.
10. Preserve exact Owner boundaries. An existing Mission does not authorize a new/increased spend, new-prefecture expansion, unauthorized main integration/Production deploy/publication/database migration, destructive action, permission expansion, analytics/privacy expansion, price/root monetization change, or weakened guardrail.
11. If the fixed file is missing, its scope does not match, or any of `# Current State`, `# Claude Code Handoff`, `# Codex Handoff` is missing, report that fact. After the initial report, the private GitHub Memory may still be used as the canonical recovery route if it is safely accessible; do not invent or infer missing local facts.

### `セッション終了`

The close outcome must be reported using exactly one of these three
machine-checkable labels, emitted only when its own conditions are verified —
never assert `CLOSE_OK` as a default or from a partially-completed sequence.

- `Close: CLOSE_OK` — every check below passed.
- `Close: CLOSE_NO_CHANGE` — the resume point has no change and the update was
  correctly skipped.
- `Close: CLOSE_BLOCKED — <reason>` — any check failed (stale-write, missing
  write base, archive failure, replace failure, read-back mismatch). Never
  phrase a blocked close as a success.

Steps:

1. Do not perform additional investigation, implementation, or verification.
   The pending-ACK sweep below is the one exception, and it runs before step 2.

   **Pending-ACK sweep** (canonical source: `Ftomohiro0612/ai-agent-control-center`
   `docs/session-memory-protocol.md` §6 step 3, PR #116). Take only the
   handoffs that were received this session, read in full this session, and
   addressed to this role. Check each one's state with the installed role
   handoff wrapper's `-Mode Status`, and send `-Mode Ack` only for the ones
   that are `PENDING_ACK`.
   - Skip `COMPLETE` / `WITHDRAWN`.
   - Do not ACK a handoff whose full body was not read this session.
   - Do not search the inbox to find ACK targets.
   - If there is no target, do nothing.
   - An ACK records receipt, not completion. Keep any unfinished follow-up in
     the replacement's Resume Point together with its handoff ID.
   - An ACK failure does not stop the close and does not by itself change the
     Close label. Record the handoff ID and the `REJECTED` reason in the
     replacement, and do not retry through another route.
   - This sweep does not modify the archive, the fixed file, or any external
     record.
   - Why: the wrapper rejects an ACK from a process started after the
     original handoff was created, so a handoff left unACKed at session end
     cannot be ACKed by a later session.
2. If no write base was recorded earlier this session, read the fixed file
   once now and record its `updated_at`, `session`, and SHA-256 as the write
   base.
3. Compare the new frontmatter + `# Current State` + `# Claude Code Handoff`
   + `# Codex Handoff` this session would write against what the fixed file
   currently holds. If there is no difference,
   skip archiving and replacing entirely — emit `Close: CLOSE_NO_CHANGE` and
   end.
4. If there is a change to persist but no write base exists (e.g. resumed
   mid-session with step 2 never reached), do not archive or modify the fixed
   file — emit `Close: CLOSE_BLOCKED — missing write base` and end.
5. Immediately before writing, reread the same fixed file and compare
   `updated_at`, `session`, and SHA-256 against the write base. If any value
   differs, do not create an archive or modify the fixed file — emit
   `Close: CLOSE_BLOCKED — stale-write: <field> changed>` and end.
6. Save the complete pre-close fixed file as a new, non-overwriting file
   under the same scope's `archive/`, following the existing filename
   convention. If this write fails for any reason, do not modify the fixed
   file — emit `Close: CLOSE_BLOCKED — archive failed: <reason>` and end.
7. Replace the whole fixed file with only the latest position confirmed in
   this session. Keep frontmatter and three top-level sections, containing
   only what is needed to restore the current position:
   - `# Current State` — `## Fixed decisions`, `## HOLD / Out of Scope`.
   - `# Claude Code Handoff` — `## PM Lane` (compact status of the active
     track), `## Decision State` (items needing Owner judgment),
     `## Resume Point` (what the next PM session does first).
   - `# Codex Handoff` — `## Target` (any independent Codex CLI dispatch
     identity: PID/worktree/branch/log/state path, or a plain statement that
     none is running), `## Decision State`, `## Resume Point`.
   Do not append or retain past history. If this write fails, emit
   `Close: CLOSE_BLOCKED — replace failed: <reason>` and end — the archive
   from step 6 is already saved and is not rolled back.
8. Immediately after replacing, read the fixed file back and confirm it
   matches exactly what was written. If it does not, emit
   `Close: CLOSE_BLOCKED — read-back mismatch: <detail>` and end without a
   second automatic write attempt.
9. Only once steps 2/4, 5, 6, 7, and 8 have all completed as specified above,
   emit `Close: CLOSE_OK` and briefly report the archive path, then end
   without additional work.
10. Regardless of which Close label was emitted (including
    `CLOSE_BLOCKED`), stop the standing Session Monitor (see "Session
    Monitor" below) as lifecycle cleanup. This is not "additional work"
    under step 1 — it is teardown of hook-managed infrastructure, not
    investigation, implementation, or verification.

### Session Monitor (agmsg inbox — SessionStart/SessionEnd lifecycle)

This is a narrow, standing exception to the Monitor restrictions above. It
governs exactly one Monitor: the read-only agmsg inbox stream that the
SessionStart hook instructs the PM to invoke at the start of every session.
It exists independently of whether the session's first message happens to be
`セッション開始` — the hook fires on every session start.

- **Entry point**: the SessionStart hook is the sole, canonical trigger.
  Invoke the Monitor it specifies, as it specifies, once, at session start.
  On a `/clear` or resume re-fire, follow the hook's own message — if it
  says a prior watcher is being cleaned up and not to relaunch, do not
  relaunch it.
- **Singular instance**: never start a second Session Monitor manually or
  speculatively "just in case," and never fold its invocation into a
  shorthand step (e.g. it is not part of `セッション開始` step 3's report).
- **Read-only**: this Monitor only streams incoming agmsg messages for the
  PM to react to (normal agmsg replies via `send.sh` remain a separate,
  ordinary PM action, not part of the Monitor itself). It must not be used
  to justify additional Monitors, agmsg destinations, or autonomous worker
  invocations — those remain prohibited exactly as before.
- **Session end**: stop this Monitor when the session ends. Under the
  `セッション終了` shorthand, this happens at step 10 above. If the session
  ends without that shorthand, the Monitor lapses with the session.
- **Does not expand scope**: this exception covers only this one
  hook-managed Monitor. It does not permit starting Monitors for
  investigation, verification, or any other purpose during the
  `セッション開始`/`セッション終了` shorthand flows — the restrictions
  above remain in force unchanged for everything else.

Do not create a dedicated workspace, agmsg destination, Monitor, binding, Owner Pack, ZIP, or additional infrastructure for these shorthands unless it can change an Owner decision and is separately justified. The standing, hook-managed Session Monitor defined above and the tracked, read-only Mission Monitor (`scripts/session-monitor/`, under the `セッション開始` exception) are the only narrow, pre-authorized exceptions to this clause — they do not need separate per-session justification, and they do not license any other Monitor or infrastructure under this clause.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
