#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$ScriptPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSEdition -cne "Desktop" -or $PSVersionTable.PSVersion.Major -ne 5) {
  throw "This regression must run under Windows PowerShell 5.1."
}
if (-not $ScriptPath) {
  $ScriptPath = Join-Path $PSScriptRoot "invoke-event-ops-weekly.ps1"
}

$resolvedScript = (Resolve-Path -LiteralPath $ScriptPath).Path
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($resolvedScript, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) {
  throw "Launcher parse failed: $($parseErrors.Message -join '; ')"
}

$definitions = @($ast.FindAll({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -ceq "Invoke-Git"
}, $true))
if ($definitions.Count -ne 1) {
  throw "Expected exactly one Invoke-Git definition."
}

$gitModule = New-Module -ScriptBlock ([scriptblock]::Create($definitions[0].Extent.Text))

function Invoke-FixtureGit {
  param(
    [Parameter(Mandatory = $true)][string]$Repository,
    [Parameter(Mandatory = $true)][string[]]$GitArguments
  )

  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = @(& git -C $Repository @GitArguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($exitCode -ne 0) {
    throw "Fixture git command failed (exit $exitCode): $($output -join [Environment]::NewLine)"
  }
}

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ("memorips-invokegit-regression-" + [Guid]::NewGuid().ToString("N"))
$remotePath = Join-Path $testRoot "remote.git"
$workPath = Join-Path $testRoot "work"
New-Item -ItemType Directory -Path $testRoot | Out-Null

try {
  Invoke-FixtureGit -Repository $testRoot -GitArguments @("init", "--bare", $remotePath)
  Invoke-FixtureGit -Repository $testRoot -GitArguments @("init", $workPath)
  Invoke-FixtureGit -Repository $workPath -GitArguments @("config", "user.name", "Memorips Regression")
  Invoke-FixtureGit -Repository $workPath -GitArguments @("config", "user.email", "memorips-regression@example.invalid")
  Set-Content -LiteralPath (Join-Path $workPath "fixture.txt") -Value "offline git fixture" -Encoding UTF8
  Invoke-FixtureGit -Repository $workPath -GitArguments @("add", "fixture.txt")
  Invoke-FixtureGit -Repository $workPath -GitArguments @("commit", "-m", "Create offline fixture")
  Invoke-FixtureGit -Repository $workPath -GitArguments @("branch", "-M", "main")
  Invoke-FixtureGit -Repository $workPath -GitArguments @("remote", "add", "origin", $remotePath)

  $successFailure = $null
  try {
    $successResult = & $gitModule {
      param([string]$Repository)
      Invoke-Git -Repository $Repository -GitArguments @("push", "-u", "origin", "main")
    } $workPath

    if ($successResult.ExitCode -ne 0) {
      throw "Successful push returned exit code $($successResult.ExitCode)."
    }
    if ([string]::IsNullOrWhiteSpace([string]$successResult.Output)) {
      throw "Successful push did not preserve its stderr output."
    }
  } catch {
    $successFailure = $_
  }

  $failureFailure = $null
  try {
    try {
      & $gitModule {
        param([string]$Repository)
        Invoke-Git -Repository $Repository -GitArguments @("rev-parse", "--verify", "refs/heads/definitely-missing")
      } $workPath | Out-Null
      throw "A genuinely failing git invocation returned without throwing."
    } catch {
      $message = [string]$_.Exception.Message
      $expectedPrefix = "git rev-parse --verify refs/heads/definitely-missing failed in '$workPath' (exit "
      if (-not $message.StartsWith($expectedPrefix, [StringComparison]::Ordinal)) {
        throw "Fail-closed exception did not use Invoke-Git's diagnostic message. Actual: $message"
      }
      if ($message -notmatch "\(exit [1-9][0-9]*\):" -or $message -notmatch "fatal:") {
        throw "Fail-closed exception omitted the non-zero exit code or captured git output. Actual: $message"
      }
    }
  } catch {
    $failureFailure = $_
  }

  $allowFailureFailure = $null
  try {
    $allowFailureResult = & $gitModule {
      param([string]$Repository)
      Invoke-Git -Repository $Repository -GitArguments @("rev-parse", "--verify", "refs/heads/definitely-missing") -AllowFailure
    } $workPath

    if ($allowFailureResult.ExitCode -eq 0) {
      throw "AllowFailure returned exit code 0 for a genuinely failing git invocation."
    }
    if ([string]$allowFailureResult.Output -notmatch "fatal:") {
      throw "AllowFailure did not preserve the failing git invocation's stderr output."
    }
  } catch {
    $allowFailureFailure = $_
  }

  $failures = @()
  if ($null -ne $successFailure) {
    $failures += "success-with-stderr: $($successFailure.Exception.Message)"
  }
  if ($null -ne $failureFailure) {
    $failures += "non-zero-fail-closed: $($failureFailure.Exception.Message)"
  }
  if ($null -ne $allowFailureFailure) {
    $failures += "non-zero-allow-failure: $($allowFailureFailure.Exception.Message)"
  }
  if ($failures.Count -ne 0) {
    throw "Invoke-Git regression failed:`n$($failures -join "`n")"
  }

  Write-Output "PASS Invoke-Git returned exit 0 with captured stderr for a real local push, preserved diagnostic fail-closed behavior for a real git error, and retained the AllowFailure return shape."
} finally {
  if (Test-Path -LiteralPath $testRoot -PathType Container) {
    $resolvedTestRoot = [IO.Path]::GetFullPath($testRoot)
    $resolvedTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if (-not $resolvedTestRoot.StartsWith($resolvedTempRoot, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove unexpected regression-test path: $resolvedTestRoot"
    }
    Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
  }
}
