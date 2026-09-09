param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [Parameter(Mandatory = $true)][string]$Prefix,
  [int]$Columns = 4,
  [int]$TargetWidth = 256,
  [int]$TargetHeight = 256,
  [int]$Padding = 4,
  [int]$AlphaThreshold = 8
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Find-AlphaBounds([System.Drawing.Bitmap]$Bitmap, [System.Drawing.Rectangle]$Cell, [int]$Threshold) {
  $left = $Cell.Right
  $top = $Cell.Bottom
  $right = $Cell.Left - 1
  $bottom = $Cell.Top - 1
  for ($y = $Cell.Top; $y -lt $Cell.Bottom; $y++) {
    for ($x = $Cell.Left; $x -lt $Cell.Right; $x++) {
      if ($Bitmap.GetPixel($x, $y).A -lt $Threshold) { continue }
      if ($x -lt $left) { $left = $x }
      if ($x -gt $right) { $right = $x }
      if ($y -lt $top) { $top = $y }
      if ($y -gt $bottom) { $bottom = $y }
    }
  }
  if ($right -lt $left -or $bottom -lt $top) { throw "Nessun pixel visibile nella cella $Cell" }
  return [System.Drawing.Rectangle]::FromLTRB($left, $top, $right + 1, $bottom + 1)
}

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$source = [System.Drawing.Bitmap]::FromFile($resolvedInput)
try {
  if ($source.Width % $Columns -ne 0) { throw "La larghezza $($source.Width) non e divisibile per $Columns" }
  $cellWidth = [int]($source.Width / $Columns)
  for ($index = 0; $index -lt $Columns; $index++) {
    $cell = [System.Drawing.Rectangle]::new($index * $cellWidth, 0, $cellWidth, $source.Height)
    $bounds = Find-AlphaBounds $source $cell $AlphaThreshold
    $availableWidth = [Math]::Max(1, $TargetWidth - 2 * $Padding)
    $availableHeight = [Math]::Max(1, $TargetHeight - 2 * $Padding)
    $scale = [Math]::Min($availableWidth / $bounds.Width, $availableHeight / $bounds.Height)
    $drawWidth = [int][Math]::Round($bounds.Width * $scale)
    $drawHeight = [int][Math]::Round($bounds.Height * $scale)
    $drawX = [int][Math]::Round(($TargetWidth - $drawWidth) / 2)
    $drawY = $TargetHeight - $Padding - $drawHeight

    $frame = [System.Drawing.Bitmap]::new($TargetWidth, $TargetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($frame)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $destination = [System.Drawing.Rectangle]::new($drawX, $drawY, $drawWidth, $drawHeight)
        $graphics.DrawImage($source, $destination, $bounds, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $graphics.Dispose()
      }
      $name = '{0}_{1:d2}.png' -f $Prefix, ($index + 1)
      $frame.Save((Join-Path $OutputDirectory $name), [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output "$name source=$bounds draw=$drawX,$drawY,$drawWidth,$drawHeight"
    } finally {
      $frame.Dispose()
    }
  }
} finally {
  $source.Dispose()
}
