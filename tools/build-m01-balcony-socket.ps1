param([string]$Root = ".")

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$sourceRoot = Join-Path $rootPath "public/assets/backgrounds/stage1_zen/final_v1/M01"
$conceptPath = Join-Path $rootPath "art_source/stages/stage1_zen/M01/ambient_socket_v1/concept/BALCONY_RESIDENT_01_opening.png"
$outputRoot = Join-Path $rootPath "public/assets/backgrounds/stage1_zen/final_v2/M01"
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

Copy-Item -LiteralPath (Join-Path $sourceRoot "M01_FAR.png") -Destination (Join-Path $outputRoot "M01_FAR.png") -Force

$main = New-Object System.Drawing.Bitmap (Join-Path $sourceRoot "M01_MAIN.png")
$concept = New-Object System.Drawing.Bitmap $conceptPath
$scaled = New-Object System.Drawing.Bitmap 300, 234
$scaledGraphics = [System.Drawing.Graphics]::FromImage($scaled)
$scaledGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$scaledGraphics.DrawImage($concept, 0, 0, 300, 234)
$scaledGraphics.Dispose()

try {
  # The concept was authored from source rectangle [500,100,300,234].
  # Blend only the lower opening; the rest of M01 remains byte-for-byte visual source.
  $left = 600
  $top = 188
  $right = 676
  $bottom = 270
  $feather = 5
  for ($y = $top; $y -lt $bottom; $y++) {
    for ($x = $left; $x -lt $right; $x++) {
      $edge = [Math]::Min([Math]::Min($x - $left, $right - 1 - $x), [Math]::Min($y - $top, $bottom - 1 - $y))
      $alpha = [Math]::Min(1.0, $edge / $feather)
      $old = $main.GetPixel($x, $y)
      $new = $scaled.GetPixel($x - 500, $y - 100)
      $r = [int][Math]::Round($old.R * (1 - $alpha) + $new.R * $alpha)
      $g = [int][Math]::Round($old.G * (1 - $alpha) + $new.G * $alpha)
      $b = [int][Math]::Round($old.B * (1 - $alpha) + $new.B * $alpha)
      $main.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $g, $b))
    }
  }
  $main.Save((Join-Path $outputRoot "M01_MAIN.png"), [System.Drawing.Imaging.ImageFormat]::Png)

  # Exact MAIN pixels form a fixed occluder in front of the animated resident.
  $foreground = [System.Drawing.Bitmap]::new(2560, 720, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    for ($y = 252; $y -lt 326; $y++) {
      for ($x = 594; $x -lt 704; $x++) {
        $foreground.SetPixel($x, $y, $main.GetPixel($x, $y))
      }
    }
    $foreground.Save((Join-Path $outputRoot "M01_FOREGROUND.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $foreground.Dispose()
  }
}
finally {
  $scaled.Dispose()
  $concept.Dispose()
  $main.Dispose()
}

Write-Output "M01 balcony socket layers built: $outputRoot"
