<#
.SYNOPSIS
  Copies the generated Team11_*.docx files to the submission folder and exports each one to PDF
  with Microsoft Word (genuine Word export of the same DOCX file).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/export_pdf.ps1 -SourceDir docs/final -OutDir submission/final

.NOTES
  Windows + Microsoft Word required. The script refuses to run while an interactive Word window is
  open (open documents would be locked and could be affected). It starts its own Word automation
  instance; if an export does not finish within the timeout, only that automation instance is stopped.
#>
param(
  [string]$SourceDir = "docs/final",
  [string]$OutDir = "submission/final",
  [int]$TimeoutSec = 300
)
$ErrorActionPreference = "Stop"
$src = (Resolve-Path $SourceDir).Path
New-Item -ItemType Directory -Force $OutDir | Out-Null
$out = (Resolve-Path $OutDir).Path

$interactive = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { $_.CommandLine -notmatch '/Automation' })
if ($interactive.Count -gt 0) {
  Write-Error "Microsoft Word is open. Close all Word windows and run the script again."
  exit 2
}

$files = @(Get-ChildItem $src -Filter "Team11_*.docx" | Sort-Object Name)
if ($files.Count -eq 0) { Write-Error "No Team11_*.docx files in $src"; exit 3 }
foreach ($f in $files) {
  if ($src -ne $out) { Copy-Item $f.FullName (Join-Path $out $f.Name) -Force }
}

$before = @(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object Id)
$job = Start-Job -ArgumentList $out, ($files | ForEach-Object Name) -ScriptBlock {
  param($out, $names)
  $w = New-Object -ComObject Word.Application
  $w.Visible = $false
  $w.DisplayAlerts = 0
  try {
    foreach ($name in $names) {
      $docx = Join-Path $out $name
      $pdf = [IO.Path]::ChangeExtension($docx, ".pdf")
      $d = $w.Documents.Open($docx, $false, $true, $false)
      $d.Fields.Update() | Out-Null
      $d.ExportAsFixedFormat($pdf, 17)       # 17 = wdExportFormatPDF
      "{0}: {1} pages -> {2}" -f $name, $d.ComputeStatistics(2), [IO.Path]::GetFileName($pdf)
      $d.Close(0)
    }
  } finally { $w.Quit() }
}
if (Wait-Job $job -Timeout $TimeoutSec) {
  Receive-Job $job
  $state = $job.State
  Remove-Job $job -Force
  if ($state -ne "Completed") { exit 4 }
} else {
  Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" |
    Where-Object { $_.CommandLine -match '/Automation' -and ($before -notcontains $_.ProcessId) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Write-Error "PDF export timed out after $TimeoutSec s; the Word automation instance was stopped."
  exit 5
}
