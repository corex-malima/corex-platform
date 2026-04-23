# build_pdf.ps1 — Compilador canon para Windows (PowerShell 5.1+)
#
# Uso:
#   .\scripts\build_pdf.ps1 -TexFile examples\example_informe_ejecutivo.tex
#   .\scripts\build_pdf.ps1 -TexFile C:\tmp\job_12345\main.tex -OutputDir C:\tmp\out
#
# Requisitos: MiKTeX o TeX Live para Windows (pdflatex en PATH)

param(
    [Parameter(Mandatory = $true)]  [string]$TexFile,
    [Parameter(Mandatory = $false)] [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $TexFile)) {
    Write-Error "Archivo no encontrado: $TexFile"
    exit 1
}

$TexAbs  = (Resolve-Path $TexFile).Path
$TexBase = [System.IO.Path]::GetFileNameWithoutExtension($TexAbs)

if ($OutputDir -eq "") { $OutputDir = Split-Path $TexAbs -Parent }
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }
$OutputAbs = (Resolve-Path $OutputDir).Path

$PdfLatex = Get-Command pdflatex -ErrorAction SilentlyContinue
if (-not $PdfLatex) {
    Write-Error "pdflatex no está instalado. Instalar MiKTeX (https://miktex.org) o TeX Live."
    exit 1
}

$TmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("canon_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TmpDir | Out-Null

function Remove-TmpDir {
    if (Test-Path $TmpDir) { Remove-Item $TmpDir -Recurse -Force -ErrorAction SilentlyContinue }
}

function Invoke-PdfLatex([int]$Pass) {
    Write-Host "-> Compilando (pasada $Pass)..."
    $LogFile = Join-Path $TmpDir "build.log"
    $proc = Start-Process pdflatex `
        -ArgumentList "-interaction=nonstopmode", "-halt-on-error",
                      "-output-directory=`"$TmpDir`"", "`"$TexAbs`"" `
        -Wait -PassThru -NoNewWindow `
        -RedirectStandardOutput $LogFile `
        -RedirectStandardError  "$LogFile.err"
    if ($proc.ExitCode -ne 0) {
        Write-Error "Error en pasada $Pass. Ultimas lineas:"
        Get-Content $LogFile -Tail 40 | Write-Host
        Remove-TmpDir
        exit 1
    }
}

try {
    Invoke-PdfLatex 1
    Invoke-PdfLatex 2

    $PdfSrc  = Join-Path $TmpDir "$TexBase.pdf"
    $PdfDest = Join-Path $OutputAbs "$TexBase.pdf"

    if (-not (Test-Path $PdfSrc)) {
        Write-Error "No se genero el PDF. Revisar log en $TmpDir\build.log"
        exit 1
    }

    Copy-Item $PdfSrc $PdfDest -Force
    $Size = (Get-Item $PdfDest).Length / 1KB
    Write-Host ("Completado: $PdfDest  ({0:N1} KB)" -f $Size)
}
finally {
    Remove-TmpDir
}
