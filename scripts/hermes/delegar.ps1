<#
.SYNOPSIS
  Crea en el Kanban de Hermes las tareas acotadas del relanzamiento de Kreoon (se ejecuta desde tu PC).
.EXAMPLE
  .\delegar.ps1 -Ensayo            # muestra lo que haría, no crea nada
  .\delegar.ps1                    # crea las 4 tareas
  .\delegar.ps1 -Tareas 2          # solo la tarea 2 (autorización de imagen)
  .\delegar.ps1 -Tareas 1,3 -Servidor otro-host
#>
param(
  [int[]]$Tareas = @(1, 2, 3, 4),
  [switch]$Ensayo,
  [string]$Servidor = 'servidor-casa'
)
$ErrorActionPreference = 'Stop'

$sh = Join-Path $PSScriptRoot 'delegar.sh'
if (-not (Test-Path $sh)) { throw "No encuentro delegar.sh junto a este script ($sh)." }
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) { throw 'No hay cliente ssh en este equipo.' }

# bash en el servidor necesita saltos de línea LF y UTF-8 (sin esto los acentos llegan rotos).
$contenido = (Get-Content -Raw -Encoding UTF8 $sh) -replace "`r`n", "`n"
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

$lista = ($Tareas | ForEach-Object { [string][int]$_ }) -join ' '
$prefijo = if ($Ensayo) { 'DRY=1 ' } else { '' }

Write-Host ("Enviando a {0}: tareas {1}{2}" -f $Servidor, $lista, $(if ($Ensayo) { ' (ENSAYO)' } else { '' }))
$contenido | ssh $Servidor "${prefijo}bash -s -- $lista"
