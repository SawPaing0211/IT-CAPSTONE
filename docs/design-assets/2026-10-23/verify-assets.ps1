# Read-only PNG metadata/alpha inspection. Does not alter artwork or application state.
# Run with Windows PowerShell 5.1: powershell.exe -NoProfile -File <this script>
param([string]$AssetRoot = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
if (-not ('ForgeAssetInspection' -as [type])) {
Add-Type -ReferencedAssemblies @([System.Drawing.Bitmap].Assembly.Location, [System.Drawing.Color].Assembly.Location) -TypeDefinition @'
using System;
using System.Drawing;
public static class ForgeAssetInspection {
  public static object Inspect(string path) {
    using (var b = new Bitmap(path)) {
      long transparent=0, partial=0, opaque=0, border=0, meaningfulBorder=0;
      int x0=b.Width, y0=b.Height, x1=-1, y1=-1;
      for(int y=0;y<b.Height;y++) for(int x=0;x<b.Width;x++) {
        int a=b.GetPixel(x,y).A;
        if(a==0) transparent++; else {
          if(a==255) opaque++; else partial++;
          if(a>8) { x0=Math.Min(x0,x); y0=Math.Min(y0,y); x1=Math.Max(x1,x); y1=Math.Max(y1,y); }
          if(x==0 || y==0 || x==b.Width-1 || y==b.Height-1) { border++; if(a>8) meaningfulBorder++; }
        }
      }
      return new { width=b.Width, height=b.Height, transparentPixels=transparent,
        partialAlphaPixels=partial, opaquePixels=opaque, nontransparentBorderPixels=border,
        meaningfulBorderPixels=meaningfulBorder,
        visibleBounds=new int[]{x0,y0,x1,y1} };
    }
  }
}
'@
}
Get-ChildItem -LiteralPath $AssetRoot -Recurse -File -Filter '*.png' | ForEach-Object {
    [pscustomobject]@{
        file = $_.FullName.Substring($AssetRoot.Length).TrimStart('\','/')
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        image = [ForgeAssetInspection]::Inspect($_.FullName)
    }
} | ConvertTo-Json -Depth 6
