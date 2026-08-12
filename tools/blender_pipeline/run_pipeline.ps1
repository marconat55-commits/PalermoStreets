param(
  [Parameter(Mandatory=$true)][string]$Blender,
  [Parameter(Mandatory=$true)][string]$Manifest,
  [string]$Output = "build/blender_pipeline"
)
$ErrorActionPreference = "Stop"
$project = Resolve-Path (Join-Path $PSScriptRoot "../..")
$manifestPath = Resolve-Path $Manifest
$manifestData = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$blendPath = Join-Path $project $manifestData.blend_file
if (-not (Test-Path -LiteralPath $Blender)) { throw "Blender non trovato: $Blender" }
if (-not (Test-Path -LiteralPath $blendPath)) { throw "Modello .blend non trovato: $blendPath" }
$outputPath = Join-Path $project $Output
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
& $Blender --background $blendPath --python (Join-Path $PSScriptRoot "export_character.py") -- --manifest $manifestPath --output $outputPath
if ($LASTEXITCODE -ne 0) { throw "Render Blender fallito" }
python (Join-Path $PSScriptRoot "normalize_frames.py") --manifest $manifestPath --input $outputPath --output $outputPath
if ($LASTEXITCODE -ne 0) { throw "Normalizzazione fallita" }
Write-Host "CANDIDATI PRONTI: $outputPath\runtime_candidate"
Write-Host "Nessun asset del gioco e stato sovrascritto."
