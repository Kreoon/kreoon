<#
.SYNOPSIS
  Muestra el estado y el resultado de una tarea de Hermes.
.EXAMPLE
  .\ver.ps1 -Id abc123
#>
param(
  [Parameter(Mandatory = $true)][string]$Id,
  [string]$Servidor = 'servidor-casa'
)
$ErrorActionPreference = 'Stop'
if ($Id -notmatch '^[A-Za-z0-9_-]+$') { throw 'El id solo puede tener letras, números, guion y guion bajo.' }
ssh $Servidor "docker exec -u hermes hermes hermes kanban show $Id"
