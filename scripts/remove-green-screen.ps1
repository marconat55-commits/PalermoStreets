param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
)

Add-Type -AssemblyName System.Drawing
if (-not ('GreenScreenRemoval' -as [type])) {
$drawingDir = Split-Path ([System.Drawing.Bitmap].Assembly.Location)
$drawingRefs = @(
    (Join-Path $drawingDir 'System.Drawing.Common.dll'),
    (Join-Path $drawingDir 'System.Drawing.Primitives.dll'),
    (Join-Path $drawingDir 'System.Private.Windows.Core.dll'),
    (Join-Path $drawingDir 'System.Private.Windows.GdiPlus.dll')
)
Add-Type -ReferencedAssemblies $drawingRefs -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class GreenScreenRemoval {
    public static void Convert(string source, string destination) {
        using (var input = new Bitmap(source))
        using (var output = new Bitmap(input.Width, input.Height, PixelFormat.Format32bppArgb)) {
            var rect = new Rectangle(0, 0, input.Width, input.Height);
            var src = input.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
            var dst = output.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            try {
                var srcBytes = new byte[Math.Abs(src.Stride) * input.Height];
                var dstBytes = new byte[Math.Abs(dst.Stride) * output.Height];
                Marshal.Copy(src.Scan0, srcBytes, 0, srcBytes.Length);
                for (var y = 0; y < input.Height; y++) {
                    for (var x = 0; x < input.Width; x++) {
                        var si = y * src.Stride + x * 3;
                        var di = y * dst.Stride + x * 4;
                        var b = srcBytes[si];
                        var g = srcBytes[si + 1];
                        var r = srcBytes[si + 2];
                        var other = Math.Max(r, b);
                        var greenExcess = g - other;
                        var alpha = 255;
                        if (g > 45 && greenExcess > 10 && g > other * 1.10) {
                            var removal = Math.Min(1.0, Math.Max(0.0, (greenExcess - 10.0) / 90.0));
                            removal *= Math.Min(1.0, Math.Max(0.0, (g - 35.0) / 80.0));
                            alpha = (int)Math.Round(255.0 * (1.0 - removal));
                            var cleanGreen = Math.Min(g, (int)Math.Round(other * 1.01));
                            g = (byte)Math.Round(g * (1.0 - removal) + cleanGreen * removal);
                        }
                        if (alpha < 5) alpha = 0;
                        dstBytes[di] = b;
                        dstBytes[di + 1] = g;
                        dstBytes[di + 2] = r;
                        dstBytes[di + 3] = (byte)alpha;
                    }
                }
                Marshal.Copy(dstBytes, 0, dst.Scan0, dstBytes.Length);
            } finally {
                input.UnlockBits(src);
                output.UnlockBits(dst);
            }
            output.Save(destination, ImageFormat.Png);
        }
    }
}
'@
}

$parent = Split-Path -Parent $Destination
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
[GreenScreenRemoval]::Convert($Source, $Destination)
