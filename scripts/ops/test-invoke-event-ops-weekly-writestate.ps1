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

$requiredFunctions = @("Get-UtcNow", "Get-StateObject", "Assert-State", "Write-StateObject")
$definitions = @($ast.FindAll({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $requiredFunctions -ccontains $node.Name
}, $true))
if ($definitions.Count -ne $requiredFunctions.Count) {
  throw "Expected exactly one definition for each required state function."
}

$functionText = ($definitions | Sort-Object {
  [Array]::IndexOf($requiredFunctions, $_.Name)
} | ForEach-Object { $_.Extent.Text }) -join [Environment]::NewLine
# Model the Windows PowerShell host behavior that triggered the production false negative.
$coercingConvertFromJson = @'
function ConvertFrom-Json {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
    [string]$InputObject
  )
  process {
    $parsed = Microsoft.PowerShell.Utility\ConvertFrom-Json -InputObject $InputObject
    if ($null -ne $parsed.PSObject.Properties["updated_at"] -and $parsed.updated_at -is [string]) {
      $parsed.updated_at = [DateTime]::Parse(
        $parsed.updated_at,
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::RoundtripKind
      )
    }
    return $parsed
  }
}
'@
$moduleText = $functionText + [Environment]::NewLine + $coercingConvertFromJson
$stateModule = New-Module -ScriptBlock ([scriptblock]::Create($moduleText))

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ("memorips-writestate-regression-" + [Guid]::NewGuid().ToString("N"))
$statePath = Join-Path $testRoot "state.json"
New-Item -ItemType Directory -Path $testRoot | Out-Null

try {
  $state = [pscustomobject][ordered]@{
    schema_version = 1
    operation = "MEM-EVT-OPS"
    updated_at = "2000-01-01T00:00:00.0000000Z"
    rotation = [pscustomobject][ordered]@{
      order = @("A", "B", "C")
      current_due_group = "A"
      last_completed_week = $null
      last_completed_group = $null
      history = @()
    }
    dispatch = [pscustomobject][ordered]@{
      current = $null
      history = @()
    }
  }

  $persisted = & $stateModule {
    param([string]$Path, [object]$InitialState)

    Write-StateObject -Path $Path -State $InitialState

    $dispatchState = Get-StateObject -Path $Path
    $dispatchState.dispatch.current = [pscustomobject][ordered]@{
      mission_id = "MEM-EVT-OPS-TEST"
      status = "in_progress"
    }
    Write-StateObject -Path $Path -State $dispatchState

    $completeState = Get-StateObject -Path $Path
    $completeState.dispatch.history = @($completeState.dispatch.history) + $completeState.dispatch.current
    $completeState.dispatch.current = $null
    $completeState.rotation.last_completed_week = "2099-W01"
    $completeState.rotation.last_completed_group = "A"
    $completeState.rotation.current_due_group = "B"
    Write-StateObject -Path $Path -State $completeState

    return Get-StateObject -Path $Path
  } $statePath $state

  if ([string]$persisted.rotation.current_due_group -cne "B") {
    throw "Completed state did not persist the expected A-to-B rotation."
  }
  if ($null -ne $persisted.dispatch.current -or @($persisted.dispatch.history).Count -ne 1) {
    throw "Completed state did not persist the expected dispatch transition."
  }

  Write-Output "PASS Write-StateObject persisted and re-read initial, dispatch, and complete states with updated_at coerced to DateTime."
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
