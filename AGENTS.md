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

## Memorips PM fixed Session Memory shorthands

Apply this section only when the entire user message is exactly `セッション開始` or exactly `セッション終了`. Do not activate it for a substring, quoted example, longer request, or another scope.

- Role: Memorips PM
- Expected scope: `memorips`
- Fixed Session Memory: `C:\Users\tomo-\Documents\ai-session-memory\memorips\current-session.md`

### `セッション開始`

1. Read only the fixed `current-session.md` above. Record its `updated_at`, `session`, and SHA-256 at read time as the write base.
2. Confirm that the frontmatter `scope` is `memorips`, and use only the frontmatter and `# Current State` as the initial resume pointer.
3. Briefly report the recorded current position, exact stop point/state, and next major direction.
4. Before the initial report, do not read an archive, this Product repository, Git/GitHub, Issues, Production, another memory, or another scope. Do not start investigation, implementation, verification, or a Monitor. This restriction does not reach the standing Session Monitor already started by the SessionStart hook before this shorthand ran (see "Session Monitor" below) — that Monitor is hook-managed lifecycle infrastructure, not something the PM starts under this contract.
5. After the initial report, safely fetch the private Memory and Product repositories without overwriting, cleaning, stashing, resetting, deleting, or altering another worktree's local/untracked files.
6. Read the private autonomous sources listed at the top of this file and reconcile the local fixed Session Memory against current GitHub/Product/Production facts. The fixed file is a fast pointer, not superior canon; mark stale statements as superseded rather than following an obsolete stop point.
7. Continue only within a valid authorization envelope. Re-check the current Mission, Owner decisions, active Issues/PRs, exact Product baseline, relevant Production/aggregate evidence, and external-action ledger before changing anything.
8. Perform the highest expected-value permitted Mission action, verify the real result, update the private ledgers/frontier, and continue. When a changed-risk review reaches its first formal `GREEN / blocking 0`, end that review lane only and select the next permitted Mission action.
9. Stop only in one of the private contract states: `MEASUREMENT_WAIT`, `EXTERNAL_WAIT`, `OWNER_REQUIRED`, `BUDGET_LIMITED`, `POLICY_STOP`, `STUCK`, `ACHIEVED`, or `KILLED`. A wait must include a dependency, next trigger/time, exact continuation action, and why no other higher-value permitted action can proceed.
10. Preserve exact Owner boundaries. An existing Mission does not authorize a new/increased spend, new-prefecture expansion, unauthorized main integration/Production deploy/publication/database migration, destructive action, permission expansion, analytics/privacy expansion, price/root monetization change, or weakened guardrail.
11. If the fixed file is missing, its scope does not match, or `# Current State` is missing, report that fact. After the initial report, the private GitHub Memory may still be used as the canonical recovery route if it is safely accessible; do not invent or infer missing local facts.

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
2. If no write base was recorded earlier this session, read the fixed file
   once now and record its `updated_at`, `session`, and SHA-256 as the write
   base.
3. Compare the new frontmatter + `# Current State` this session would write
   against what the fixed file currently holds. If there is no difference,
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
   this session. Keep frontmatter and one `# Current State` containing only
   what is needed to restore the current position, fixed decisions, HOLD,
   out-of-scope boundaries, stop point, and next major direction. Do not
   append or retain past history. If this write fails, emit
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

Do not create a dedicated workspace, agmsg destination, Monitor, binding, Owner Pack, ZIP, or additional infrastructure for these shorthands unless it can change an Owner decision and is separately justified. The standing, hook-managed Session Monitor defined above is a narrow, pre-authorized exception to this clause — it does not need separate per-session justification, and it does not license any other Monitor or infrastructure under this clause.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
