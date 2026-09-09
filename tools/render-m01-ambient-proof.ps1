param([string]$Root = ".")

Add-Type -AssemblyName System.Drawing

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$farPath = Join-Path $rootPath "public/assets/backgrounds/stage1_zen/final_v2/M01/M01_FAR.png"
$mainPath = Join-Path $rootPath "public/assets/backgrounds/stage1_zen/final_v2/M01/M01_MAIN.png"
$foregroundPath = Join-Path $rootPath "public/assets/backgrounds/stage1_zen/final_v2/M01/M01_FOREGROUND.png"
$womanPath = Join-Path $rootPath "public/assets/ambient/stage1_zen/M01/signora_balcone/idle_01.png"
$vendorPath = Join-Path $rootPath "public/assets/ambient/stage1_zen/M01/venditore_frutta/idle_01.png"
$outputPath = Join-Path $rootPath "production-preview/M01/final_v1/M01_AMBIENT_CAMERA_PROOF.jpg"

$world = New-Object System.Drawing.Bitmap 2560, 720
$graphics = [System.Drawing.Graphics]::FromImage($world)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::Black)

$far = [System.Drawing.Image]::FromFile($farPath)
$main = [System.Drawing.Image]::FromFile($mainPath)
$foreground = [System.Drawing.Image]::FromFile($foregroundPath)
$woman = [System.Drawing.Image]::FromFile($womanPath)
$vendor = [System.Drawing.Image]::FromFile($vendorPath)

try {
  $layerRect = New-Object System.Drawing.Rectangle -128, -72, 2816, 792
  $graphics.DrawImage($far, $layerRect)
  $graphics.DrawImage($main, $layerRect)

  # Runtime contract: actor coordinates are bottom-centre anchors.
  $graphics.DrawImage($woman, (New-Object System.Drawing.Rectangle 539, 150, 70, 64))
  $graphics.DrawImage($vendor, (New-Object System.Drawing.Rectangle 980, 387, 280, 205))
  $graphics.DrawImage($foreground, $layerRect)

  $proof = New-Object System.Drawing.Bitmap 1920, 360
  $proofGraphics = [System.Drawing.Graphics]::FromImage($proof)
  try {
    $proofGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    foreach ($index in 0..2) {
      $cameraX = $index * 640
      $source = New-Object System.Drawing.Rectangle $cameraX, 0, 1280, 720
      $target = New-Object System.Drawing.Rectangle ($index * 640), 0, 640, 360
      $proofGraphics.DrawImage($world, $target, $source, [System.Drawing.GraphicsUnit]::Pixel)
    }
    $proof.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  }
  finally {
    $proofGraphics.Dispose()
    $proof.Dispose()
  }
}
finally {
  $vendor.Dispose()
  $woman.Dispose()
  $foreground.Dispose()
  $main.Dispose()
  $far.Dispose()
  $graphics.Dispose()
  $world.Dispose()
}

Write-Output "M01 ambient camera proof written: $outputPath"
