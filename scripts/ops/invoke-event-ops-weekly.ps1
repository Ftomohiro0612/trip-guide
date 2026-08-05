#requires -Version 5.1
[CmdletBinding()]
param(
  [ValidateSet("Dispatch", "Complete", "Escalate", "Inspect", "DryRun", "RegisterTask", "LaunchHelper")]
  [string]$Mode = "Dispatch",
  [string]$ProductRepository = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Memorip"),
  [string]$MemoryRepository = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "ai-memory-memorips"),
  [string]$RuntimeRoot = (Join-Path $env:LOCALAPPDATA "Memorips\EventOps"),
  [string]$StateFile = "",
  [string]$MissionId = "",
  [ValidateSet("Changed", "NoChanges")]
  [string]$Result = "Changed",
  [string]$Note = "",
  [string]$LaunchSpec = "",
  [string]$IsoWeekOverride = "",
  [switch]$EnableTask,
  [switch]$SimulateSuccess,
  [ValidateRange(0, 120)]
  [int]$HoldSeconds = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:TaskName = "Memorips-MEM-EVT-OPS-Weekly"
$script:TaskDescription = "MEM-EVT-OPS single weekly Mission-lane dispatcher (Tier 1 plus one rotating Tier 2 group)."
$script:StateRelativePath = "docs/ai-memory/memorips/event-ops-state.json"
$script:DecisionsRelativePath = "docs/ai-memory/memorips/active-decisions.md"
$script:LedgerRelativePath = "docs/ai-memory/memorips/action-ledger.md"
$script:AgmsgWrapper = Join-Path $env:USERPROFILE ".agents\agmsg\agmsg-role-handoff.ps1"

function Get-UtcNow {
  return [DateTime]::UtcNow.ToString("o")
}

function Get-IsoWeek {
  param([DateTime]$Date = (Get-Date))
  if ($IsoWeekOverride) {
    if ($IsoWeekOverride -notmatch '^[0-9]{4}-W[0-9]{2}$') {
      throw "IsoWeekOverride must have the form YYYY-Www."
    }
    return $IsoWeekOverride
  }
  $isoDay = [int]$Date.DayOfWeek
  if ($isoDay -eq 0) { $isoDay = 7 }
  $thursday = $Date.Date.AddDays(4 - $isoDay)
  $year = $thursday.Year
  $calendar = [Globalization.CultureInfo]::InvariantCulture.Calendar
  $week = $calendar.GetWeekOfYear(
    $thursday,
    [Globalization.CalendarWeekRule]::FirstFourDayWeek,
    [DayOfWeek]::Monday
  )
  return ('{0}-W{1:D2}' -f $year, $week)
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)][string]$Repository,
    [Parameter(Mandatory = $true)][string[]]$GitArguments,
    [switch]$AllowFailure
  )
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = @(& git -C $Repository @GitArguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($exitCode -ne 0 -and -not $AllowFailure) {
    throw "git $($GitArguments -join ' ') failed in '$Repository' (exit $exitCode):`n$($output -join "`n")"
  }
  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = ($output -join "`n").Trim()
  }
}

function Assert-CleanRepository {
  param([string]$Repository)
  $status = Invoke-Git -Repository $Repository -GitArguments @("status", "--porcelain=v1", "--untracked-files=all")
  if ($status.Output) {
    throw "Repository '$Repository' is not clean; refusing to alter or work around existing files:`n$($status.Output)"
  }
}

function Get-MemoryRemoteUrl {
  if (-not (Test-Path -LiteralPath $MemoryRepository -PathType Container)) {
    throw "Memory repository not found: $MemoryRepository"
  }
  return (Invoke-Git -Repository $MemoryRepository -GitArguments @("remote", "get-url", "origin")).Output
}

function Sync-StateClone {
  $clone = Join-Path $RuntimeRoot "memory-control"
  if (-not (Test-Path -LiteralPath (Join-Path $clone ".git") -PathType Container)) {
    if (Test-Path -LiteralPath $clone) {
      throw "State clone path exists but is not a Git clone: $clone"
    }
    $parent = Split-Path -Parent $clone
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    $remote = Get-MemoryRemoteUrl
    $cloneOutput = @(& git clone --branch main --single-branch $remote $clone 2>&1)
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create the dedicated Memory state clone: $($cloneOutput -join "`n")"
    }
  }

  Assert-CleanRepository -Repository $clone
  Invoke-Git -Repository $clone -GitArguments @("fetch", "origin", "main") | Out-Null
  $branch = (Invoke-Git -Repository $clone -GitArguments @("branch", "--show-current")).Output
  if ($branch -cne "main") {
    throw "Dedicated Memory state clone is on '$branch', expected 'main'."
  }
  $localHead = (Invoke-Git -Repository $clone -GitArguments @("rev-parse", "HEAD")).Output
  $remoteHead = (Invoke-Git -Repository $clone -GitArguments @("rev-parse", "origin/main")).Output
  if ($localHead -cne $remoteHead) {
    Invoke-Git -Repository $clone -GitArguments @("merge", "--ff-only", "origin/main") | Out-Null
    $localHead = (Invoke-Git -Repository $clone -GitArguments @("rev-parse", "HEAD")).Output
    if ($localHead -cne $remoteHead) {
      throw "Dedicated Memory state clone could not fast-forward exactly to origin/main (local=$localHead remote=$remoteHead)."
    }
  }
  return $clone
}

function Get-StateObject {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Durable state file not found: $Path"
  }
  try {
    $state = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path | ConvertFrom-Json
  } catch {
    throw "Durable state is not valid JSON: $Path ($($_.Exception.Message))"
  }
  Assert-State -State $state
  return $state
}

function Assert-State {
  param([object]$State)
  if ($State.schema_version -ne 1 -or $State.operation -cne "MEM-EVT-OPS") {
    throw "Unsupported durable state identity/schema."
  }
  if ((@($State.rotation.order) -join ",") -cne "A,B,C") {
    throw "Rotation order differs from the Owner-fixed A,B,C order."
  }
  if (@("A", "B", "C") -cnotcontains [string]$State.rotation.current_due_group) {
    throw "Invalid current_due_group in durable state."
  }
  if ($null -eq $State.dispatch.history -or $null -eq $State.rotation.history) {
    throw "Durable state history fields are missing."
  }
}

function Write-StateObject {
  param([string]$Path, [object]$State)
  $State.updated_at = Get-UtcNow
  $json = $State | ConvertTo-Json -Depth 30
  $expectedBytes = [Text.UTF8Encoding]::new($false).GetBytes($json + [Environment]::NewLine)
  $temporary = "$Path.tmp-$PID"
  [IO.File]::WriteAllBytes($temporary, $expectedBytes)
  Move-Item -LiteralPath $temporary -Destination $Path -Force
  $null = Get-StateObject -Path $Path
  $readBackBytes = [IO.File]::ReadAllBytes($Path)
  if (
    $readBackBytes.Length -ne $expectedBytes.Length -or
    [Convert]::ToBase64String($readBackBytes) -cne [Convert]::ToBase64String($expectedBytes)
  ) {
    throw "Durable state read-back verification failed."
  }
}

function Publish-State {
  param([string]$Clone, [string]$CommitMessage)
  $relative = $script:StateRelativePath.Replace("\", "/")
  Invoke-Git -Repository $Clone -GitArguments @("add", "--", $relative) | Out-Null
  $diff = Invoke-Git -Repository $Clone -GitArguments @("diff", "--cached", "--quiet") -AllowFailure
  if ($diff.ExitCode -eq 0) {
    throw "No durable state change was staged; refusing an empty state publication."
  }
  if ($diff.ExitCode -ne 1) {
    throw "Unable to inspect staged durable state change."
  }
  Invoke-Git -Repository $Clone -GitArguments @("commit", "-m", $CommitMessage) | Out-Null
  $head = (Invoke-Git -Repository $Clone -GitArguments @("rev-parse", "HEAD")).Output
  $push = Invoke-Git -Repository $Clone -GitArguments @("push", "origin", "HEAD:main") -AllowFailure
  if ($push.ExitCode -ne 0) {
    Invoke-Git -Repository $Clone -GitArguments @("fetch", "origin", "main") | Out-Null
    Invoke-Git -Repository $Clone -GitArguments @("merge", "--no-edit", "origin/main") | Out-Null
    Invoke-Git -Repository $Clone -GitArguments @("push", "origin", "HEAD:main") | Out-Null
  }
  $head = (Invoke-Git -Repository $Clone -GitArguments @("rev-parse", "HEAD")).Output
  $remote = (Invoke-Git -Repository $Clone -GitArguments @("ls-remote", "origin", "refs/heads/main")).Output.Split("`t")[0]
  if ($remote -cne $head) {
    throw "Durable state push could not be confirmed (local=$head remote=$remote)."
  }
  return $head
}

function Get-MarkdownSection {
  param(
    [string]$Content,
    [string]$HeadingPattern,
    [ValidateSet(2, 3)][int]$Level
  )
  $boundary = if ($Level -eq 2) { '^##\s' } else { '^#{1,3}\s' }
  $hashes = "#" * $Level
  $pattern = "(?ms)^$hashes\s+$HeadingPattern.*?(?=$boundary|\z)"
  $match = [regex]::Match($Content, $pattern)
  if (-not $match.Success) {
    throw "Canonical section not found: $HeadingPattern"
  }
  return $match.Value.Trim()
}

function Get-CanonicalScope {
  param([string]$MemoryRoot)
  $decisionsPath = Join-Path $MemoryRoot $script:DecisionsRelativePath
  $ledgerPath = Join-Path $MemoryRoot $script:LedgerRelativePath
  $decisions = Get-Content -Raw -Encoding UTF8 -LiteralPath $decisionsPath
  $ledger = Get-Content -Raw -Encoding UTF8 -LiteralPath $ledgerPath

  $priority = Get-MarkdownSection -Content $decisions -HeadingPattern 'Regional Tier priority .*' -Level 2
  $tier1 = Get-MarkdownSection -Content $decisions -HeadingPattern 'Tier 1 event operating cadence .*' -Level 3
  $tier2 = Get-MarkdownSection -Content $decisions -HeadingPattern 'Tier 2 event operating cadence .*' -Level 3
  $recurring = Get-MarkdownSection -Content $decisions -HeadingPattern 'Recurring event operation . MEM-EVT-OPS .*' -Level 3
  $twoLane = Get-MarkdownSection -Content $decisions -HeadingPattern 'Owner decision: two-lane split .* canary worker vs\. Mission execution .*' -Level 3
  $ordering = Get-MarkdownSection -Content $ledger -HeadingPattern 'Vercel auto-deploy ordering rule .*' -Level 2

  $tier1Match = [regex]::Match($priority, '(?m)^Tier 1 = ([^\r\n]+?) \(9 prefectures\)\.')
  if (-not $tier1Match.Success) {
    throw "Could not parse the 9 Tier-1 prefectures from active-decisions.md."
  }
  $tier1Prefectures = @($tier1Match.Groups[1].Value -split ([string][char]0x30FB) | ForEach-Object { $_.Trim() })
  if ($tier1Prefectures.Count -ne 9) {
    throw "Tier-1 prefecture count is $($tier1Prefectures.Count), expected 9."
  }

  $groups = [ordered]@{}
  foreach ($group in @("A", "B", "C")) {
    $match = [regex]::Match($tier2, "(?m)^- \*\*Group $group\*\*.*?: ([a-z, ]+)\r?$")
    if (-not $match.Success) {
      throw "Could not parse Group $group from active-decisions.md."
    }
    $groups[$group] = @($match.Groups[1].Value.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  }
  if ($groups.A.Count -ne 12 -or $groups.B.Count -ne 13 -or $groups.C.Count -ne 13) {
    throw "Tier-2 group sizes differ from the Owner-finalized 12/13/13 split."
  }
  $allTier2 = @($groups.A + $groups.B + $groups.C)
  if (@($allTier2 | Sort-Object -Unique).Count -ne 38) {
    throw "Tier-2 groups are not exactly 38 unique prefectures."
  }

  return [pscustomobject]@{
    Priority = $priority
    Tier1 = $tier1
    Tier2 = $tier2
    Recurring = $recurring
    TwoLane = $twoLane
    Ordering = $ordering
    Tier1Prefectures = $tier1Prefectures
    Groups = $groups
  }
}

function New-DispatchRecord {
  param(
    [string]$Id,
    [string]$Week,
    [string]$Group,
    [string]$StartHead,
    [string]$Worktree,
    [string]$Branch,
    [string]$PromptPath,
    [string]$StdoutPath,
    [string]$StderrPath
  )
  $now = Get-UtcNow
  return [pscustomobject][ordered]@{
    mission_id = $Id
    week = $Week
    group = $Group
    status = "dispatching"
    pid = $null
    process_start_time = $null
    launcher_parent_pid = $null
    independence_verified_at = $null
    start_head = $StartHead
    worktree = $Worktree
    branch = $Branch
    prompt_path = $PromptPath
    logs = [pscustomobject][ordered]@{ stdout = $StdoutPath; stderr = $StderrPath }
    monitor = [pscustomobject][ordered]@{
      pid_command_line_substring = $Worktree
      agmsg_team = "memorips-role"
      agmsg_from = "memorips-codex"
      agmsg_to = "memorips-pm"
      handoff_prefix = "mem-evt-ops-terminal-$Week-"
    }
    created_at = $now
    updated_at = $now
    completed_at = $null
    note = $null
  }
}

function Add-DispatchToHistory {
  param([object]$State, [object]$Record, [switch]$KeepCurrent)
  $State.dispatch.history = @($State.dispatch.history) + $Record
  if ($KeepCurrent) {
    $State.dispatch.current = $Record
  } else {
    $State.dispatch.current = $null
  }
}

function Get-NextGroup {
  param([string]$Group)
  switch ($Group) {
    "A" { return "B" }
    "B" { return "C" }
    "C" { return "A" }
    default { throw "Invalid rotation group: $Group" }
  }
}

function Assert-NoActiveDispatch {
  param([object]$State)
  if ($null -eq $State.dispatch.current) {
    return
  }
  $current = $State.dispatch.current
  if (@("dispatching", "in_progress") -contains [string]$current.status) {
    $alive = $false
    if ($null -ne $current.pid) {
      $alive = $null -ne (Get-Process -Id ([int]$current.pid) -ErrorAction SilentlyContinue)
    }
    $condition = if ($alive) { "is still running" } else { "has no live matching process and requires PM reconciliation" }
    throw "ACTIVE_DISPATCH: $($current.mission_id) ($($current.week), Group $($current.group)) $condition. Rotation was not advanced."
  }
  throw "Durable state contains a non-active current dispatch with status '$($current.status)'; PM reconciliation is required."
}

function Test-DispatchProcessIdentity {
  param([object]$Record)
  if ($null -eq $Record.pid -or $null -eq $Record.worktree) {
    return $false
  }
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($Record.pid)" -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    return $false
  }
  return [string]$process.CommandLine -like "*$($Record.worktree)*"
}

function Resolve-PreviousDispatchForLaunch {
  param([object]$State, [string]$StatePath, [string]$Clone)
  if ($null -eq $State.dispatch.current) {
    return $State
  }

  $current = $State.dispatch.current
  if (Test-DispatchProcessIdentity -Record $current) {
    throw "ACTIVE_DISPATCH: $($current.mission_id) ($($current.week), Group $($current.group)) still has a live matching Codex process."
  }

  if (@("completed", "no_changes") -contains [string]$current.status) {
    $State.dispatch.current = $null
    Write-StateObject -Path $StatePath -State $State
    Publish-State -Clone $Clone -CommitMessage "ops: release exited $($current.mission_id) process guard" | Out-Null
    return $State
  }

  if (@("dispatching", "in_progress") -contains [string]$current.status) {
    $now = Get-UtcNow
    $current.status = "interrupted"
    $current.note = "The recorded Mission process was not alive with the expected worktree identity. Rotation was not advanced; PM reconciliation is required."
    $current.updated_at = $now
    $current.completed_at = $now
    Add-DispatchToHistory -State $State -Record $current -KeepCurrent
    Write-StateObject -Path $StatePath -State $State
    Publish-State -Clone $Clone -CommitMessage "ops: record interrupted $($current.mission_id) without rotation" | Out-Null
    throw "INTERRUPTED_DISPATCH_RECORDED: $($current.mission_id). Rotation remains Group $($State.rotation.current_due_group); PM reconciliation is required."
  }

  throw "Durable state retains terminal failure '$($current.status)' for $($current.mission_id); PM reconciliation is required before another dispatch."
}

function New-WeekLock {
  param([string]$Week, [string]$LockRoot)
  New-Item -ItemType Directory -Path $LockRoot -Force | Out-Null
  $lockPath = Join-Path $LockRoot "$Week.lock.json"
  try {
    $stream = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
  } catch [IO.IOException] {
    [Console]::Out.WriteLine("DUPLICATE_WEEK_REFUSED week=$Week lock=$lockPath")
    return $null
  }
  try {
    $body = [ordered]@{ operation = "MEM-EVT-OPS"; week = $Week; created_at = Get-UtcNow; launcher_pid = $PID } | ConvertTo-Json
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($body + [Environment]::NewLine)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush($true)
  } finally {
    $stream.Dispose()
  }
  return $lockPath
}

function Resolve-CodexPath {
  $command = Get-Command codex.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }
  $root = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin"
  $candidates = @(Get-ChildItem -LiteralPath $root -Recurse -Filter codex.exe -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTimeUtc -Descending)
  if ($candidates.Count -eq 0) {
    throw "codex.exe was not found in PATH or under $root."
  }
  return $candidates[0].FullName
}

function Quote-WindowsArgument {
  param([string]$Value)
  if ($Value -notmatch '[\s"]') {
    return $Value
  }
  return '"' + ($Value -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
}

function Invoke-LaunchHelper {
  param([string]$SpecPath)
  if (-not (Test-Path -LiteralPath $SpecPath -PathType Leaf)) {
    throw "Launch helper spec not found: $SpecPath"
  }
  $spec = Get-Content -Raw -Encoding UTF8 -LiteralPath $SpecPath | ConvertFrom-Json

  if (-not ([System.Management.Automation.PSTypeName]'MemoripsNativeLauncher').Type) {
    Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class MemoripsNativeLauncher
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const uint CREATE_ALWAYS = 2;
    private const uint FILE_ATTRIBUTE_NORMAL = 0x00000080;
    private const uint STARTF_USESTDHANDLES = 0x00000100;
    private const uint CREATE_NEW_PROCESS_GROUP = 0x00000200;
    private const uint CREATE_NO_WINDOW = 0x08000000;
    private static readonly IntPtr INVALID_HANDLE_VALUE = new IntPtr(-1);

    [StructLayout(LayoutKind.Sequential)]
    private struct SECURITY_ATTRIBUTES
    {
        public int nLength;
        public IntPtr lpSecurityDescriptor;
        public int bInheritHandle;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public uint dwX;
        public uint dwY;
        public uint dwXSize;
        public uint dwYSize;
        public uint dwXCountChars;
        public uint dwYCountChars;
        public uint dwFillAttribute;
        public uint dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateFileW(string fileName, uint access, uint share, ref SECURITY_ATTRIBUTES security, uint creation, uint flags, IntPtr template);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcessW(string applicationName, StringBuilder commandLine, IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint creationFlags, IntPtr environment, string currentDirectory, ref STARTUPINFO startupInfo, out PROCESS_INFORMATION processInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    public static int Launch(string executable, string commandLine, string currentDirectory, string stdinPath, string stdoutPath, string stderrPath)
    {
        SECURITY_ATTRIBUTES security = new SECURITY_ATTRIBUTES();
        security.nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
        security.lpSecurityDescriptor = IntPtr.Zero;
        security.bInheritHandle = 1;

        IntPtr input = CreateFileW(stdinPath, GENERIC_READ, FILE_SHARE_READ, ref security, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, IntPtr.Zero);
        if (input == INVALID_HANDLE_VALUE) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateFile stdin failed");
        IntPtr output = CreateFileW(stdoutPath, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, ref security, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, IntPtr.Zero);
        if (output == INVALID_HANDLE_VALUE) { CloseHandle(input); throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateFile stdout failed"); }
        IntPtr error = CreateFileW(stderrPath, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, ref security, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, IntPtr.Zero);
        if (error == INVALID_HANDLE_VALUE) { CloseHandle(input); CloseHandle(output); throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateFile stderr failed"); }

        STARTUPINFO startup = new STARTUPINFO();
        startup.cb = Marshal.SizeOf(typeof(STARTUPINFO));
        startup.dwFlags = STARTF_USESTDHANDLES;
        startup.hStdInput = input;
        startup.hStdOutput = output;
        startup.hStdError = error;
        PROCESS_INFORMATION process;

        try
        {
            bool created = CreateProcessW(executable, new StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, true, CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW, IntPtr.Zero, currentDirectory, ref startup, out process);
            if (!created) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateProcess failed");
            try { return process.dwProcessId; }
            finally { CloseHandle(process.hThread); CloseHandle(process.hProcess); }
        }
        finally
        {
            CloseHandle(input);
            CloseHandle(output);
            CloseHandle(error);
        }
    }
}
'@
  }

  $arguments = @($spec.arguments | ForEach-Object { Quote-WindowsArgument -Value ([string]$_) })
  $commandLine = (Quote-WindowsArgument -Value ([string]$spec.codex_path)) + " " + ($arguments -join " ")
  $childPid = [MemoripsNativeLauncher]::Launch(
    [string]$spec.codex_path,
    $commandLine,
    [string]$spec.worktree,
    [string]$spec.prompt_path,
    [string]$spec.stdout_path,
    [string]$spec.stderr_path
  )
  $resultPath = [string]$spec.result_path
  $resultBody = [ordered]@{ helper_pid = $PID; child_pid = $childPid; started_at = Get-UtcNow } | ConvertTo-Json
  [IO.File]::WriteAllText($resultPath, ($resultBody + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
  return
}

function Start-DetachedCodex {
  param(
    [string]$CodexPath,
    [string]$Worktree,
    [string]$PromptPath,
    [string]$StdoutPath,
    [string]$StderrPath,
    [string]$RunDirectory
  )
  $specPath = Join-Path $RunDirectory "launch-spec.json"
  $resultPath = Join-Path $RunDirectory "launch-result.json"
  $spec = [ordered]@{
    codex_path = $CodexPath
    arguments = @("exec", "-C", $Worktree, "-s", "danger-full-access", "-c", "model_reasoning_effort='high'", "-")
    worktree = $Worktree
    prompt_path = $PromptPath
    stdout_path = $StdoutPath
    stderr_path = $StderrPath
    result_path = $resultPath
  }
  [IO.File]::WriteAllText($specPath, (($spec | ConvertTo-Json -Depth 10) + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))

  $hostExecutable = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $helperArgs = @(
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy", "Bypass",
    "-File", (Quote-WindowsArgument -Value $PSCommandPath),
    "-Mode", "LaunchHelper",
    "-LaunchSpec", (Quote-WindowsArgument -Value $specPath)
  ) -join " "
  $helper = Start-Process -FilePath $hostExecutable -ArgumentList $helperArgs -WindowStyle Hidden -PassThru
  if (-not $helper.WaitForExit(30000)) {
    throw "Detached launch helper PID $($helper.Id) did not exit within 30 seconds."
  }
  $helperPid = $helper.Id
  if ($helper.ExitCode -ne 0) {
    throw "Detached launch helper exited with code $($helper.ExitCode)."
  }
  if (-not (Test-Path -LiteralPath $resultPath -PathType Leaf)) {
    throw "Detached launch helper did not write its result."
  }
  $launch = Get-Content -Raw -Encoding UTF8 -LiteralPath $resultPath | ConvertFrom-Json
  Start-Sleep -Milliseconds 500
  $helperStillExists = $null -ne (Get-Process -Id $helperPid -ErrorAction SilentlyContinue)
  $codexProcess = Get-Process -Id ([int]$launch.child_pid) -ErrorAction SilentlyContinue
  if ($helperStillExists -or $null -eq $codexProcess) {
    throw "OS-detached independence check failed (helper_alive=$helperStillExists child_pid=$($launch.child_pid))."
  }
  $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $($launch.child_pid)" -ErrorAction SilentlyContinue
  if ($null -eq $cim -or [string]$cim.CommandLine -notlike "*$Worktree*") {
    throw "Codex child identity check failed for PID $($launch.child_pid)."
  }
  return [pscustomobject]@{
    Pid = [int]$launch.child_pid
    HelperPid = $helperPid
    StartedAt = $codexProcess.StartTime.ToUniversalTime().ToString("o")
    VerifiedAt = Get-UtcNow
  }
}

function New-MissionPrompt {
  param(
    [object]$Canonical,
    [string]$Group,
    [string]$Week,
    [string]$Id,
    [string]$InstalledLauncher
  )
  $tier1List = $Canonical.Tier1Prefectures -join ", "
  $tier2List = @($Canonical.Groups[$Group]) -join ", "
  $completeChanged = "& '$InstalledLauncher' -Mode Complete -MissionId '$Id' -Result Changed"
  $completeNoChanges = "& '$InstalledLauncher' -Mode Complete -MissionId '$Id' -Result NoChanges"
  $escalate = "& '$InstalledLauncher' -Mode Escalate -MissionId '$Id' -Note '<exact reason>'"
  $handoff = "& 'C:\Users\tomo-\.agents\agmsg\agmsg-role-handoff.ps1' -Mode Send -SenderRole memorips.codex -RoleId memorips.pm -Scope memorips -Project /c/Users/tomo-/Documents/Memorip -Repository Ftomohiro0612/trip-guide -ExpectedTeam memorips-role -ExpectedRecipient memorips-pm -ExpectedType claude -From memorips-codex -HandoffId 'mem-evt-ops-terminal-$Week-<unique-suffix>' -Message '<terminal report>'"
  return @"
You are Codex executing the recurring Memorips Mission MEM-EVT-OPS for ISO week $Week, Group $Group. This is event-freshness execution work, not scheduler-building work. Do not expand scope.

MISSION ID: $Id
WEEKLY SCOPE: all Tier-1 prefectures [$tier1List] plus Tier-2 Group $Group [$tier2List].

Before acting, read in order from the repositories available on this machine:
1. trip-guide AGENTS.md.
2. trip-guide CLAUDE.md.
3. ai-memory-memorips docs/ai-memory/memorips/active-decisions.md, including the full Tier 1 cadence, Tier 2 cadence, Recurring event operation, two-lane split, and MEM-EVT-C1 close-out note.
4. ai-memory-memorips docs/ai-memory/memorips/action-ledger.md, including the full Vercel ordering rule.

Perform only official-primary-source-based updates within existing prefectures, the existing schema, and the existing event domain. Never change facility data or facility descriptions. Never route work through the memorips-role canary worker. Never flip a registry unresolved prefecture to confirmed without a genuine new official primary source.

If there are no confirmed changes, do not merge Product main and do not trigger a Production deployment. After all required checks for that no-change result, run exactly:
$completeNoChanges

If confirmed changes are made, follow the exact 5-step Vercel ordering quoted below. Only after Production READY, Production reflection, and Sentinel blocking 0 are confirmed, run exactly:
$completeChanged

Stop and escalate without proceeding or working around the condition for schema/UI/new-category change, mass deletion/hiding, an official-information conflict, a new paid service/permission, revenue/PII/analytics-contract impact, an unexplained Production anomaly, or any Sentinel blocking finding. First record the stop without rotating by running:
$escalate
Then send a terminal report through C:\Users\tomo-\.agents\agmsg\agmsg-role-handoff.ps1, team memorips-role, from memorips-codex to memorips-pm, with a handoff ID beginning mem-evt-ops-terminal-$Week-. Use the wrapper only; never use send.sh directly.
The wrapper invocation shape is:
$handoff

For either successful outcome, after the Complete command succeeds, send the same role-routed terminal report with exact Product/Memory heads, outcome, deployment status (or explicit no-deploy), Sentinel result when applicable, and the durable state transition. If the Complete command or terminal report cannot be completed, report cannot-continue; do not silently treat the run as successful.

The following canonical text is copied directly from active-decisions.md/action-ledger.md at dispatch time. It is authoritative; do not paraphrase it into a broader scope.

--- CANONICAL REGIONAL PRIORITY ---
$($Canonical.Priority)

--- CANONICAL TIER 1 CADENCE ---
$($Canonical.Tier1)

--- CANONICAL TIER 2 CADENCE ---
$($Canonical.Tier2)

--- CANONICAL RECURRING OPERATION ---
$($Canonical.Recurring)

--- CANONICAL TWO-LANE EXECUTION RULE ---
$($Canonical.TwoLane)

--- CANONICAL VERCEL ORDERING RULE ---
$($Canonical.Ordering)
"@
}

function Complete-Dispatch {
  param([switch]$Escalation)
  if (-not $MissionId) {
    throw "MissionId is required for $Mode."
  }
  $mutex = [Threading.Mutex]::new($false, "Global\MemoripsEventOpsStateMutation")
  if (-not $mutex.WaitOne(0)) {
    throw "Another MEM-EVT-OPS state mutation is in progress."
  }
  try {
    $clone = Sync-StateClone
    $path = Join-Path $clone $script:StateRelativePath
    $state = Get-StateObject -Path $path
    if ($null -eq $state.dispatch.current -or [string]$state.dispatch.current.mission_id -cne $MissionId) {
      throw "Current durable dispatch does not match MissionId '$MissionId'."
    }
    $current = $state.dispatch.current
    if (@("dispatching", "in_progress") -notcontains [string]$current.status) {
      throw "Mission '$MissionId' is not in an active durable state."
    }
    $now = Get-UtcNow
    if ($Escalation) {
      if (-not $Note) { throw "Note is required for Escalate." }
      $current.status = "escalated"
      $current.note = $Note
      $current.updated_at = $now
      $current.completed_at = $now
      Add-DispatchToHistory -State $state -Record $current -KeepCurrent
      Write-StateObject -Path $path -State $state
      $head = Publish-State -Clone $clone -CommitMessage "ops: record $MissionId escalation without rotation"
      Write-Output "ESCALATION_RECORDED mission=$MissionId memory_head=$head rotation_due=$($state.rotation.current_due_group)"
      return
    }

    $status = if ($Result -ceq "NoChanges") { "no_changes" } else { "completed" }
    $current.status = $status
    $current.note = if ($Note) { $Note } else { $null }
    $current.updated_at = $now
    $current.completed_at = $now
    $state.rotation.last_completed_week = [string]$current.week
    $state.rotation.last_completed_group = [string]$current.group
    $state.rotation.current_due_group = Get-NextGroup -Group ([string]$current.group)
    $state.rotation.history = @($state.rotation.history) + [pscustomobject][ordered]@{
      week = [string]$current.week
      group = [string]$current.group
      mission_id = [string]$current.mission_id
      result = $status
      completed_at = $now
    }
    Add-DispatchToHistory -State $state -Record $current -KeepCurrent
    Write-StateObject -Path $path -State $state
    $head = Publish-State -Clone $clone -CommitMessage "ops: complete $MissionId and rotate to Group $($state.rotation.current_due_group)"
    Write-Output "SUCCESS_RECORDED mission=$MissionId result=$status next_group=$($state.rotation.current_due_group) memory_head=$head"
  } finally {
    $mutex.ReleaseMutex() | Out-Null
    $mutex.Dispose()
  }
}

function Invoke-DryRun {
  if (-not $StateFile) {
    throw "DryRun requires -StateFile pointing to an isolated test copy."
  }
  $canonicalState = [IO.Path]::GetFullPath((Join-Path $MemoryRepository $script:StateRelativePath))
  $testState = [IO.Path]::GetFullPath($StateFile)
  if ($testState -ceq $canonicalState) {
    throw "DryRun refuses to use the canonical durable state file."
  }
  $testRoot = Split-Path -Parent $testState
  New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
  if (-not (Test-Path -LiteralPath $testState)) {
    Copy-Item -LiteralPath $canonicalState -Destination $testState
  }
  $week = Get-IsoWeek
  $lock = New-WeekLock -Week $week -LockRoot (Join-Path $RuntimeRoot "dry-run-locks")
  if ($null -eq $lock) { return }
  $state = Get-StateObject -Path $testState
  Assert-NoActiveDispatch -State $state
  $canonical = Get-CanonicalScope -MemoryRoot $MemoryRepository
  $group = [string]$state.rotation.current_due_group
  $id = "MEM-EVT-OPS-DRYRUN-$week-GROUP-$group"
  $record = New-DispatchRecord -Id $id -Week $week -Group $group -StartHead ("0" * 40) -Worktree "DRY_RUN" -Branch "DRY_RUN" -PromptPath "DRY_RUN" -StdoutPath "DRY_RUN" -StderrPath "DRY_RUN"
  $record.status = "in_progress"
  $record.pid = $PID
  $record.process_start_time = Get-UtcNow
  $record.launcher_parent_pid = $PID
  $record.independence_verified_at = Get-UtcNow
  $record.note = "No Codex process, Product main merge, or Production deploy was invoked."
  $state.dispatch.current = $record
  Write-StateObject -Path $testState -State $state
  $readBack = Get-StateObject -Path $testState
  Write-Output "DRY_RUN_DISPATCH_PERSISTED week=$week group=$group mission=$id tier1_count=$($canonical.Tier1Prefectures.Count) tier2_count=$($canonical.Groups[$group].Count)"
  if ($HoldSeconds -gt 0) { Start-Sleep -Seconds $HoldSeconds }
  if ($SimulateSuccess) {
    $now = Get-UtcNow
    $record.status = "no_changes"
    $record.updated_at = $now
    $record.completed_at = $now
    $state.rotation.last_completed_week = $week
    $state.rotation.last_completed_group = $group
    $state.rotation.current_due_group = Get-NextGroup -Group $group
    $state.rotation.history = @($state.rotation.history) + [pscustomobject][ordered]@{ week = $week; group = $group; mission_id = $id; result = "no_changes"; completed_at = $now }
    Add-DispatchToHistory -State $state -Record $record
    Write-StateObject -Path $testState -State $state
    $persisted = Get-StateObject -Path $testState
    Write-Output "DRY_RUN_SUCCESS_PERSISTED old_group=$group next_group=$($persisted.rotation.current_due_group) state=$testState"
  }
}

function Register-WeeklyTask {
  $purposePattern = '(?i)(MEM-EVT-OPS|memorips.{0,40}(event|weekly|ops)|(event|weekly|ops).{0,40}memorips)'
  $similar = @(Get-ScheduledTask | Where-Object {
    $_.TaskName -match $purposePattern -or [string]$_.Description -match $purposePattern
  })
  $unexpected = @($similar | Where-Object { $_.TaskName -cne $script:TaskName })
  if ($unexpected.Count -gt 0) {
    throw "A similar MEM-EVT-OPS scheduled task already exists under another name: $($unexpected.TaskName -join ', '). Refusing a duplicate registration."
  }

  $installDirectory = Join-Path $RuntimeRoot "launcher"
  New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
  $installed = Join-Path $installDirectory "invoke-event-ops-weekly.ps1"
  Copy-Item -LiteralPath $PSCommandPath -Destination $installed -Force
  $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $PSCommandPath).Hash
  $installedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $installed).Hash
  if ($sourceHash -cne $installedHash) {
    throw "Installed launcher hash does not match the tracked source."
  }

  $argument = @(
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy", "Bypass",
    "-File", (Quote-WindowsArgument -Value $installed),
    "-Mode", "Dispatch",
    "-ProductRepository", (Quote-WindowsArgument -Value $ProductRepository),
    "-MemoryRepository", (Quote-WindowsArgument -Value $MemoryRepository),
    "-RuntimeRoot", (Quote-WindowsArgument -Value $RuntimeRoot)
  ) -join " "
  $action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument $argument
  $trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek Monday -At "05:00"
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
  $task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $script:TaskDescription
  Register-ScheduledTask -TaskName $script:TaskName -InputObject $task -Force | Out-Null
  if ($EnableTask) {
    Enable-ScheduledTask -TaskName $script:TaskName | Out-Null
  } else {
    Disable-ScheduledTask -TaskName $script:TaskName | Out-Null
  }
  $registered = Get-ScheduledTask -TaskName $script:TaskName
  Write-Output "TASK_REGISTERED name=$($registered.TaskName) state=$($registered.State) schedule=Monday_05:00_local_JST start_when_available=true source_sha256=$sourceHash installed=$installed"
}

function Invoke-Dispatch {
  $mutex = [Threading.Mutex]::new($false, "Global\MemoripsEventOpsDispatch")
  if (-not $mutex.WaitOne(0)) {
    Write-Output "CONCURRENT_INVOCATION_REFUSED named_mutex=Global\MemoripsEventOpsDispatch"
    return
  }
  try {
    $week = Get-IsoWeek
    $lock = New-WeekLock -Week $week -LockRoot (Join-Path $RuntimeRoot "locks")
    if ($null -eq $lock) { return }

    $clone = Sync-StateClone
    $statePath = Join-Path $clone $script:StateRelativePath
    $state = Get-StateObject -Path $statePath
    $state = Resolve-PreviousDispatchForLaunch -State $state -StatePath $statePath -Clone $clone
    if ([string]$state.rotation.last_completed_week -ceq $week) {
      throw "Durable state already records a completed run for $week."
    }
    $canonical = Get-CanonicalScope -MemoryRoot $clone
    $group = [string]$state.rotation.current_due_group

    if (-not (Test-Path -LiteralPath $ProductRepository -PathType Container)) {
      throw "Product repository not found: $ProductRepository"
    }
    Invoke-Git -Repository $ProductRepository -GitArguments @("fetch", "origin", "main") | Out-Null
    $startHead = (Invoke-Git -Repository $ProductRepository -GitArguments @("rev-parse", "origin/main^{commit}")).Output
    $date = (Get-Date).ToString("yyyyMMdd")
    $groupSlug = "group-$($group.ToLowerInvariant())"
    $branch = "codex/event-ops-$groupSlug-l2-$date"
    $worktree = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Memorip-event-ops-$groupSlug-$date"
    if (Test-Path -LiteralPath $worktree) {
      throw "Planned fresh worktree path already exists: $worktree"
    }
    $branchExists = Invoke-Git -Repository $ProductRepository -GitArguments @("show-ref", "--verify", "--quiet", "refs/heads/$branch") -AllowFailure
    if ($branchExists.ExitCode -eq 0) {
      throw "Planned fresh branch already exists: $branch"
    }

    $id = "MEM-EVT-OPS-$week-GROUP-$group"
    $runDirectory = Join-Path $RuntimeRoot ("runs\" + $id)
    if (Test-Path -LiteralPath $runDirectory) {
      throw "Run directory already exists: $runDirectory"
    }
    New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null
    $promptPath = Join-Path $runDirectory "mission-prompt.md"
    $stdoutPath = Join-Path $runDirectory "codex.out.log"
    $stderrPath = Join-Path $runDirectory "codex.err.log"
    $installedLauncher = Join-Path $RuntimeRoot "launcher\invoke-event-ops-weekly.ps1"
    if (-not (Test-Path -LiteralPath $installedLauncher -PathType Leaf)) {
      throw "Stable installed launcher not found: $installedLauncher. Register the task/control plane first."
    }

    $record = New-DispatchRecord -Id $id -Week $week -Group $group -StartHead $startHead -Worktree $worktree -Branch $branch -PromptPath $promptPath -StdoutPath $stdoutPath -StderrPath $stderrPath
    $state.dispatch.current = $record
    Write-StateObject -Path $statePath -State $state
    Publish-State -Clone $clone -CommitMessage "ops: reserve $id dispatch" | Out-Null

    $launch = $null
    try {
      Invoke-Git -Repository $ProductRepository -GitArguments @("worktree", "add", "-b", $branch, $worktree, $startHead) | Out-Null
      $actualHead = (Invoke-Git -Repository $worktree -GitArguments @("rev-parse", "HEAD")).Output
      $actualBranch = (Invoke-Git -Repository $worktree -GitArguments @("branch", "--show-current")).Output
      if ($actualHead -cne $startHead -or $actualBranch -cne $branch) {
        throw "Fresh worktree identity verification failed."
      }

      $prompt = New-MissionPrompt -Canonical $canonical -Group $group -Week $week -Id $id -InstalledLauncher $installedLauncher
      [IO.File]::WriteAllText($promptPath, ($prompt + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
      $launch = Start-DetachedCodex -CodexPath (Resolve-CodexPath) -Worktree $worktree -PromptPath $promptPath -StdoutPath $stdoutPath -StderrPath $stderrPath -RunDirectory $runDirectory

      $freshState = Get-StateObject -Path $statePath
      if ([string]$freshState.dispatch.current.mission_id -cne $id) {
        throw "Durable dispatch changed unexpectedly before PID publication."
      }
      $freshState.dispatch.current.status = "in_progress"
      $freshState.dispatch.current.pid = $launch.Pid
      $freshState.dispatch.current.process_start_time = $launch.StartedAt
      $freshState.dispatch.current.launcher_parent_pid = $launch.HelperPid
      $freshState.dispatch.current.independence_verified_at = $launch.VerifiedAt
      $freshState.dispatch.current.updated_at = Get-UtcNow
      Write-StateObject -Path $statePath -State $freshState
      $memoryHead = Publish-State -Clone $clone -CommitMessage "ops: record detached PID for $id"
      Write-Output "MISSION_DISPATCHED mission=$id week=$week group=$group pid=$($launch.Pid) helper_pid=$($launch.HelperPid) worktree=$worktree branch=$branch start_head=$startHead memory_head=$memoryHead stdout=$stdoutPath stderr=$stderrPath"
    } catch {
      $failure = $_.Exception.Message
      $failureState = Get-StateObject -Path $statePath
      if ($null -ne $failureState.dispatch.current -and [string]$failureState.dispatch.current.mission_id -ceq $id) {
        $now = Get-UtcNow
        $failureState.dispatch.current.status = "launch_failed"
        $failureState.dispatch.current.note = $failure
        $failureState.dispatch.current.updated_at = $now
        $failureState.dispatch.current.completed_at = $now
        if ($null -ne $launch -and $null -eq $failureState.dispatch.current.pid) {
          $failureState.dispatch.current.pid = $launch.Pid
          $failureState.dispatch.current.process_start_time = $launch.StartedAt
          $failureState.dispatch.current.launcher_parent_pid = $launch.HelperPid
          $failureState.dispatch.current.independence_verified_at = $launch.VerifiedAt
        }
        Add-DispatchToHistory -State $failureState -Record $failureState.dispatch.current -KeepCurrent
        Write-StateObject -Path $statePath -State $failureState
        try { Publish-State -Clone $clone -CommitMessage "ops: record $id launch failure without rotation" | Out-Null } catch { Write-Warning "Could not publish launch failure state: $($_.Exception.Message)" }
      }
      throw
    }
  } finally {
    $mutex.ReleaseMutex() | Out-Null
    $mutex.Dispose()
  }
}

switch ($Mode) {
  "LaunchHelper" { Invoke-LaunchHelper -SpecPath $LaunchSpec; break }
  "RegisterTask" { Register-WeeklyTask; break }
  "Inspect" {
    $path = if ($StateFile) { $StateFile } else { Join-Path $MemoryRepository $script:StateRelativePath }
    Get-StateObject -Path $path | ConvertTo-Json -Depth 30
    break
  }
  "DryRun" { Invoke-DryRun; break }
  "Complete" { Complete-Dispatch; break }
  "Escalate" { Complete-Dispatch -Escalation; break }
  "Dispatch" { Invoke-Dispatch; break }
}
