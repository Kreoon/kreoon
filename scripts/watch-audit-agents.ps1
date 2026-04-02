# Script para monitorear los 10 agentes de auditoria
# Ejecutar con: powershell -ExecutionPolicy Bypass -File watch-audit-agents.ps1

$basePath = "C:\Users\SICOMM~1\AppData\Local\Temp\claude\F--Users-SICOMMER-SAS-Documents-GitHub-kreoon\71346e16-d1d6-4ca6-b211-c6caf684de7e\tasks"

$agents = @(
    @{ Name = "Backend-Auditor"; File = "a1445fbb795aa55de.output" },
    @{ Name = "Frontend-Auditor"; File = "ae8659ca04c7f0745.output" },
    @{ Name = "Flow-Tester"; File = "a9dfd5a60fdd9bc69.output" },
    @{ Name = "Prompts-Optimizer"; File = "a85f63e8f44e50ab2.output" },
    @{ Name = "Strategy-Advisor"; File = "a4ff22749a848a17e.output" },
    @{ Name = "Performance-Analyzer"; File = "a861f6034dc5b9862.output" },
    @{ Name = "UI-Reviewer"; File = "a67d0e86f76cd90ea.output" },
    @{ Name = "UX-Researcher"; File = "aefee8e941ecc7e2c.output" },
    @{ Name = "AI-Modules-Auditor"; File = "aa3e26eaee31fb878.output" },
    @{ Name = "QA-Integration"; File = "a850ff6a04db27773.output" }
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   KREOON Audit Agents Monitor" -ForegroundColor Cyan
Write-Host "   Phase 2: Module Optimization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Windows Terminal esta instalado
$wtInstalled = Get-Command wt -ErrorAction SilentlyContinue

if ($wtInstalled) {
    Write-Host "Abriendo Windows Terminal con 10 pestanas..." -ForegroundColor Green

    # Construir comando para Windows Terminal con tabs
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

        Start-Sleep -Milliseconds 300
    }
}

Write-Host ""
Write-Host "Agentes de auditoria monitoreados:" -ForegroundColor Green
foreach ($agent in $agents) {
    Write-Host "  - $($agent.Name)" -ForegroundColor White
}
Write-Host ""
Write-Host "Reportes se guardaran en: docs/audits/" -ForegroundColor Yellow
Write-Host "Presiona Ctrl+C en cada ventana para cerrar el monitoreo" -ForegroundColor Yellow
