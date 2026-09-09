param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [int]$MinimumLuminance = 185,
  [int]$MaximumChannelSpread = 12
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not ('PalermoStreets.CheckerboardRemoval' -as [type])) {
  $drawingDirectory = Split-Path ([System.Drawing.Bitmap].Assembly.Location)
  $drawingAssemblies = @(
    [System.Drawing.Bitmap].Assembly.Location,
    [System.Drawing.Color].Assembly.Location,
    (Join-Path $drawingDirectory 'System.Private.Windows.GdiPlus.dll'),
    (Join-Path $drawingDirectory 'System.Private.Windows.Core.dll')
  )
  Add-Type -ReferencedAssemblies $drawingAssemblies -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;

namespace PalermoStreets {
  public static class CheckerboardRemoval {
    private static bool IsBackdrop(Color c, int minimumLuminance, int maximumSpread) {
      int min = Math.Min(c.R, Math.Min(c.G, c.B));
      int max = Math.Max(c.R, Math.Max(c.G, c.B));
      int luminance = (c.R + c.G + c.B) / 3;
      return luminance >= minimumLuminance && max - min <= maximumSpread;
    }

    private static void Enqueue(Bitmap bitmap, bool[] removed, int[] queue, ref int tail, int x, int y, int minimumLuminance, int maximumSpread) {
      int key = y * bitmap.Width + x;
      if (removed[key] || !IsBackdrop(bitmap.GetPixel(x, y), minimumLuminance, maximumSpread)) return;
      removed[key] = true;
      queue[tail++] = key;
    }

    public static void Run(string input, string output, int minimumLuminance, int maximumSpread) {
      using (var source = new Bitmap(input))
      using (var result = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
        using (var graphics = Graphics.FromImage(result)) graphics.DrawImageUnscaled(source, 0, 0);
        int width = result.Width;
        int height = result.Height;
        var removed = new bool[width * height];
        var queue = new int[width * height];
        int head = 0;
        int tail = 0;
        for (int x = 0; x < width; x++) { Enqueue(result, removed, queue, ref tail, x, 0, minimumLuminance, maximumSpread); Enqueue(result, removed, queue, ref tail, x, height - 1, minimumLuminance, maximumSpread); }
        for (int y = 0; y < height; y++) { Enqueue(result, removed, queue, ref tail, 0, y, minimumLuminance, maximumSpread); Enqueue(result, removed, queue, ref tail, width - 1, y, minimumLuminance, maximumSpread); }
        while (head < tail) {
          int key = queue[head++];
          int x = key % width;
          int y = key / width;
          if (x > 0) Enqueue(result, removed, queue, ref tail, x - 1, y, minimumLuminance, maximumSpread);
          if (x + 1 < width) Enqueue(result, removed, queue, ref tail, x + 1, y, minimumLuminance, maximumSpread);
          if (y > 0) Enqueue(result, removed, queue, ref tail, x, y - 1, minimumLuminance, maximumSpread);
          if (y + 1 < height) Enqueue(result, removed, queue, ref tail, x, y + 1, minimumLuminance, maximumSpread);
        }
        for (int y = 0; y < height; y++) {
          for (int x = 0; x < width; x++) {
            if (removed[y * width + x] || IsBackdrop(result.GetPixel(x, y), minimumLuminance, maximumSpread)) {
              result.SetPixel(x, y, Color.Transparent);
            }
          }
        }
        string directory = System.IO.Path.GetDirectoryName(output);
        if (!String.IsNullOrEmpty(directory)) System.IO.Directory.CreateDirectory(directory);
        result.Save(output, ImageFormat.Png);
      }
    }
  }
}
'@
}

$input = (Resolve-Path -LiteralPath $InputPath).Path
$output = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
[PalermoStreets.CheckerboardRemoval]::Run($input, $output, $MinimumLuminance, $MaximumChannelSpread)
Write-Output $output
