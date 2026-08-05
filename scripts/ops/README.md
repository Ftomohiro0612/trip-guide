# MEM-EVT-OPS weekly control plane

`invoke-event-ops-weekly.ps1` is the single tracked launcher for the recurring event operation. It dispatches one fresh Mission-lane Codex process for all nine Tier-1 prefectures plus the currently due Tier-2 group. It does not perform event-content work itself.

## Registered schedule

- Task name: `Memorips-MEM-EVT-OPS-Weekly`
- Trigger: every Monday at 05:00 local Windows time (JST on this machine)
- Catch-up: `StartWhenAvailable` is enabled
- Task overlap: Task Scheduler uses `IgnoreNew`
- Initial state: registered **disabled**, because `active-decisions.md` requires the PM's focused control-plane audit to reach `blocking 0` before activation
- Stable action path: `%LOCALAPPDATA%\Memorips\EventOps\launcher\invoke-event-ops-weekly.ps1`; registration installs a SHA-256-verified copy of this tracked source, so the task does not depend on the scheduler-build worktree remaining present

Registration scans all scheduled-task names and descriptions for `MEM-EVT-OPS` and close `Memorips` + event/weekly/ops purpose matches. If another task with a different name already serves this purpose, it fails instead of registering a duplicate. Re-running registration updates the one exact task; it never creates one task per Tier-2 group.

After the PM audit passes, enable the already-registered task (do not register another):

```powershell
Enable-ScheduledTask -TaskName 'Memorips-MEM-EVT-OPS-Weekly'
```

## Overlap and same-week lock

Three fail-closed layers are used:

1. `Global\MemoripsEventOpsDispatch` refuses simultaneous launcher processes on this Windows host.
2. `%LOCALAPPDATA%\Memorips\EventOps\locks\YYYY-Www.lock.json` is created with `FileMode.CreateNew`. It is deliberately retained after both success and failure. Any second invocation in the same ISO week exits before state mutation, worktree creation, or Codex launch.
3. The private Memory state is pushed as `dispatching` before worktree creation and Codex launch. A remote non-fast-forward or conflicting state change fails closed. An existing `dispatching`/`in_progress` record blocks a later week as well. A successful terminal record remains in `dispatch.current` until a later launcher confirms its Codex PID is gone; this also prevents overlap during terminal-report delivery.

A crash never advances rotation. A missing active PID is durably changed to `interrupted`; `interrupted`, `escalated`, and `launch_failed` records remain current and the next invocation refuses to work around them until PM reconciliation.

## Durable state and schema

Canonical files in `Ftomohiro0612/ai-memory-memorips`:

- `docs/ai-memory/memorips/event-ops-state.json`
- `docs/ai-memory/memorips/event-ops-state.schema.json`

The launcher uses a dedicated operational clone at `%LOCALAPPDATA%\Memorips\EventOps\memory-control`, fast-forwards it to `origin/main`, and commits/pushes every dispatch and rotation transition. It never cleans, stashes, resets, or overwrites another worktree.

State schema, version 1:

- `rotation.order`: fixed `A, B, C`
- `rotation.current_due_group`: group reserved by the next successful dispatch
- `rotation.last_completed_week` / `last_completed_group`: most recent successful run
- `rotation.history[]`: successful completion records (`week`, `group`, `mission_id`, `result`, `completed_at`)
- `dispatch.current`: `null`, or the process-guard record with `mission_id`, PID, process start time, detached-launch parent PID and verification time, start HEAD, worktree, branch, prompt/log paths, ISO week, group, status, monitor routing, timestamps, and note. A successful terminal record is cleared automatically only after its matching process has exited; a failed terminal record requires PM reconciliation.
- `dispatch.history[]`: terminal dispatch records. Status is one of `completed`, `no_changes`, `escalated`, `interrupted`, or `launch_failed`; active status is `dispatching` or `in_progress`.

Only the launched Mission may call `-Mode Complete` after confirming its own successful outcome. Both `Changed` and `NoChanges` advance A → B → C → A. `-Mode Escalate` records the stop and does not rotate.

## Scope composition and execution

At every firing the launcher reads, extracts, and validates the exact Tier-1 list, Group A/B/C lists, Tier-1 cadence, Tier-2 cadence, recurring authorization, two-lane rule, and Vercel ordering rule from current private Memory `origin/main`. Those canonical sections are copied directly into the dedicated Mission prompt.

The Product repository is fetched, an exact current `origin/main` commit is resolved, and a fresh worktree/branch is created as `codex/event-ops-group-<a|b|c>-l2-YYYYMMDD`. A short helper invocation of this same script uses native `CreateProcessW` with the prompt file as stdin and dedicated stdout/stderr files. The helper exits; the launcher then verifies the helper PID is gone while the direct `codex.exe` PID remains and has the expected worktree in its command line. PID, start time, paths, branch, HEAD, and independence proof are then committed and pushed to durable state.

The `memorips-role` canary worker is never involved.

## No-op and deploy ordering

If the weekly Mission finds no confirmed changes, it records `NoChanges`, rotates normally, and must not merge Product `main` or trigger a Production deploy.

For a genuine Production reflection, the embedded canonical rule requires exactly: push and remotely confirm the unique `REQUESTED` ledger row for the candidate HEAD; merge Product `main`; confirm Vercel `READY`, Production reflection, and Sentinel `blocking 0`; then update that same row to `SUCCEEDED`.

## Mandatory escalation stops

The Mission stops, records `escalated` without rotation, and reports through the role-routed `agmsg-role-handoff.ps1` wrapper to `memorips-pm` for:

- schema, UI, or new-category change;
- mass deletion or mass hiding;
- official-information conflict;
- new paid service or permission;
- revenue, PII, or analytics-contract impact;
- unexplained Production anomaly;
- any Sentinel `blocking` finding.

It may only make official-primary-source-based changes in existing prefectures, the existing schema, and the existing event domain. It may not flip a registry `unresolved` prefecture to `confirmed` without a genuine new official primary source.

## Read-only inspection

Inspect the registered task without running it:

```powershell
Get-ScheduledTask -TaskName 'Memorips-MEM-EVT-OPS-Weekly' |
  Select-Object TaskName, State, Description
Get-ScheduledTaskInfo -TaskName 'Memorips-MEM-EVT-OPS-Weekly'
```

Inspect the currently checked-out private Memory state without changing it:

```powershell
$statePath = 'C:\Users\tomo-\Documents\ai-memory-memorips\docs\ai-memory\memorips\event-ops-state.json'
$state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
$state.rotation
$state.dispatch.current
$state.dispatch.history | Select-Object -Last 5
```

If `dispatch.current` is non-null, inspect its process and logs without disturbing the run:

```powershell
$current = $state.dispatch.current
Get-CimInstance Win32_Process -Filter "ProcessId = $($current.pid)" |
  Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine
Get-Content -LiteralPath $current.logs.stdout -Tail 40
Get-Content -LiteralPath $current.logs.stderr -Tail 40
```

The same fields map directly to `scripts/session-monitor/mission-watch.sh`: mission ID, PID, worktree, branch, stdout/stderr, expected command-line substring, agmsg team/from/to, and terminal handoff prefix are all present in `dispatch.current`.

## Safe dry-run

Dry-run requires an isolated state path and isolated runtime root. It parses the real canonical cadence and exercises lock/state transitions, but never creates a Product worktree, launches `codex.exe`, merges Product `main`, or touches Production:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\ops\invoke-event-ops-weekly.ps1 `
  -Mode DryRun `
  -StateFile "$env:TEMP\memorips-event-ops-test\state.json" `
  -RuntimeRoot "$env:TEMP\memorips-event-ops-test\runtime" `
  -IsoWeekOverride '2099-W01' `
  -SimulateSuccess
```
