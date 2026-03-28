# Script para monitorear los 6 agentes en ventanas separadas
# Ejecutar con: powershell -ExecutionPolicy Bypass -File watch-agents.ps1

$basePath = "C:\Users\SICOMM~1\AppData\Local\Temp\claude\F--Users-SICOMMER-SAS-Documents-GitHub-kreoon\71346e16-d1d6-4ca6-b211-c6caf684de7e\tasks"

$agents = @(
    @{ Name = "Backend-Security"; File = "a4454b83a681ccb17.output" },
    @{ Name = "Skill-Writer"; File = "a72120d4c16824303.output" },
    @{ Name = "Marketing-Integrator"; File = "af415801cfdda26f0.output" },
    @{ Name = "AI-Enhancer"; File = "a439bdc9ef4aca8be.output" },
    @{ Name = "Automation-Builder"; File = "ab08180ba5c9f8791.output" },
    @{ Name = "Marketplace-Growth"; File = "a7fd564f7ea15c4be.output" }
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   KREOON Agent Monitor Dashboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Windows Terminal esta instalado
$wtInstalled = Get-Command wt -ErrorAction SilentlyContinue

if ($wtInstalled) {
    Write-Host "Abriendo Windows Terminal con 6 pestanas..." -ForegroundColor Green

    # Construir comando para Windows Terminal con splits
    $wtCommand = "wt"
    $first = $true

    foreach ($agent in $agents) {
        $filePath = "$basePath\$($agent.File)"
        $title = $agent.Name

        if ($first) {
            $wtCommand += " --title `"$title`" powershell -NoExit -Command `"Write-Host '=== $title ===' -ForegroundColor Cyan; Get-Content '$filePath' -Wait -Tail 50`""
            $first = $false
        } else {
            $wtCommand += " `; new-tab --title `"$title`" powershell -NoExit -Command `"Write-Host '=== $title ===' -ForegroundColor Cyan; Get-Content '$filePath' -Wait -Tail 50`""
        }
    }

    Invoke-Expression $wtCommand

} else {
    Write-Host "Windows Terminal no encontrado. Abriendo ventanas PowerShell separadas..." -ForegroundColor Yellow

    foreach ($agent in $agents) {
        $filePath = "$basePath\$($agent.File)"
        $title = $agent.Name

        Start-Process powershell -ArgumentList "-NoExit", "-Command", "
            `$host.UI.RawUI.WindowTitle = '$title';
            Write-Host '========================================' -ForegroundColor Cyan;
            Write-Host '   $title' -ForegroundColor Cyan;
            Write-Host '========================================' -ForegroundColor Cyan;
            Write-Host '';
            Get-Content '$filePath' -Wait -Tail 50
        "

        Start-Sleep -Milliseconds 500
    }
}

Write-Host ""
Write-Host "Agentes monitoreados:" -ForegroundColor Green
foreach ($agent in $agents) {
    Write-Host "  - $($agent.Name)" -ForegroundColor White
}
Write-Host ""
Write-Host "Presiona Ctrl+C en cada ventana para cerrar el monitoreo" -ForegroundColor Yellow
