# =====================================================================
#  MATHHOOD — Build
#  Baut die fertigen HTML-Seiten aus  src/*.html  +  partials/*.html
#  zusammen und legt sie im Projekt-Stammordner ab.
#
#  Ausfuehren:  Rechtsklick > "Mit PowerShell ausfuehren"
#          oder: powershell -ExecutionPolicy Bypass -File build.ps1
#
#  In den src-Dateien einfach diese Platzhalter verwenden:
#     <!--@include head-common-->
#     <!--@include header-->
#     <!--@include footer-->
# =====================================================================
$ErrorActionPreference = 'Stop'
$root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcDir   = Join-Path $root 'src'
$partDir  = Join-Path $root 'partials'

if (-not (Test-Path $srcDir)) { Write-Error "Ordner 'src' fehlt."; exit 1 }

# Partials einmalig einlesen
$partials = @{}
Get-ChildItem $partDir -Filter *.html | ForEach-Object {
  $partials[$_.BaseName] = (Get-Content $_.FullName -Raw -Encoding UTF8)
}

# Zeitstempel dieses Bauvorgangs — landet als ?v=... an CSS und JS
$script:stamp = Get-Date -Format 'yyyyMMddHHmmss'

$count = 0
Get-ChildItem $srcDir -Filter *.html | ForEach-Object {
  $html = Get-Content $_.FullName -Raw -Encoding UTF8

  # Platzhalter ersetzen (auch mehrfach pro Datei)
  $html = [regex]::Replace($html, '<!--@include\s+([a-zA-Z0-9_-]+)\s*-->', {
    param($m)
    $name = $m.Groups[1].Value
    if ($partials.ContainsKey($name)) { return $partials[$name] }
    Write-Warning "  Unbekanntes Partial: $name (in $($_.Name))"
    return $m.Value
  })

  # Versionsnummer an eigene CSS-/JS-Dateien haengen.
  # Dadurch laedt der Browser nach jedem Bauen garantiert die neue Fassung —
  # kein Strg+F5 noetig (geht auf Tablets ohnehin schlecht).
  $html = [regex]::Replace($html, '(?<=(?:href|src)=")((?:css|js|assets/fonts|assets/vendor)/[^"?]+\.(?:css|js))(?=")', {
    param($m) "$($m.Groups[1].Value)?v=$script:stamp"
  })

  $outFile = Join-Path $root $_.Name
  # UTF-8 ohne BOM schreiben
  [IO.File]::WriteAllText($outFile, $html, (New-Object Text.UTF8Encoding($false)))
  Write-Host ("  + {0}" -f $_.Name)
  $count++
}

Write-Host ""
Write-Host ("Fertig: {0} Seite(n) gebaut." -f $count) -ForegroundColor Green
