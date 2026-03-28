# Script para monitorear los 10 agentes de Sprint 2 (Nova + Responsive + RBAC)
# Ejecutar con: powershell -ExecutionPolicy Bypass -File watch-sprint2-agents.ps1

$basePath = "C:\Users\SICOMM~1\AppData\Local\Temp\claude\F--Users-SICOMMER-SAS-Documents-GitHub-kreoon\71346e16-d1d6-4ca6-b211-c6caf684de7e\tasks"

$agents = @(
    @{ Name = "Sprint1-Validator"; File = "a116847c861cb60f3.output" },
    @{ Name = "Nova-Dashboard"; File = "a2e7a87fd1379c8bb.output" },
    @{ Name = "Nova-Marketplace"; File = "ad2c0e3a6f1232401.output" },
    @{ Name = "Nova-Board"; File = "a708d3d269e35fdfa.output" },
    @{ Name = "Nova-Content"; File = "ac6a868cf787bc89d.output" },
    @{ Name = "Responsive-Grids"; File = "aa73bbd794370ceca.output" },
    @{ Name = "Responsive-Modals"; File = "afd925eb74c50e2c1.output" },
    @{ Name = "DarkLight-Auditor"; File = "a9911ae6424c12821.output" },
    @{ Name = "RBAC-Auditor"; File = "a6875f2278247958b.output" },
    @{ Name = "QA-Final"; File = "aadff4049694f429d.output" }
)

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   KREOON Sprint 2 Agents" -ForegroundColor Magenta
Write-Host "   Nova + Responsive + RBAC" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$wtInstalled = Get-Command wt -ErrorAction SilentlyContinue

if ($wtInstalled) {
    Write-Host "Abriendo Windows Terminal con 10 pestanas..." -ForegroundColor Green
    $wtCommand = "wt"
    $first = $true

    foreach ($agent in $agents) {
        $filePath = "$basePath\$($agent.File)"
        $title = $agent.Name

        if ($first) {
            $wtCommand += " --title `"$title`" powershell -NoExit -Command `"Write-Host '=== $title ===' -ForegroundColor Magenta; Get-Content '$filePath' -Wait -Tail 50`""
            $first = $false
        } else {
            $wtCommand += " `; new-tab --title `"$title`" powershell -NoExit -Command `"Write-Host '=== $title ===' -ForegroundColor Magenta; Get-Content '$filePath' -Wait -Tail 50`""
        }
    }

    Invoke-Expression $wtCommand
} else {
    Write-Host "Abriendo ventanas PowerShell separadas..." -ForegroundColor Yellow
    foreach ($agent in $agents) {
        $filePath = "$basePath\$($agent.File)"
        $title = $agent.Name
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "
            `$host.UI.RawUI.WindowTitle = '$title';
            Write-Host '=== $title ===' -ForegroundColor Magenta;
            Get-Content '$filePath' -Wait -Tail 50
        "
        Start-Sleep -Milliseconds 200
    }
}

Write-Host ""
Write-Host "Sprint 2 - Objetivos:" -ForegroundColor Cyan
Write-Host "  - Componentes Nova: 11 -> 50+" -ForegroundColor White
Write-Host "  - Grillas responsive: 40% -> 95%" -ForegroundColor White
Write-Host "  - Colores hardcodeados: 200+ -> <20" -ForegroundColor White
Write-Host "  - RBAC documentado: 0% -> 100%" -ForegroundColor White
Write-Host ""
Write-Host "Reportes en: docs/audits/" -ForegroundColor Yellow
