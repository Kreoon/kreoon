# Script para monitorear los 10 agentes de implementacion Sprint 1
# Ejecutar con: powershell -ExecutionPolicy Bypass -File watch-impl-agents.ps1

$basePath = "C:\Users\SICOMM~1\AppData\Local\Temp\claude\F--Users-SICOMMER-SAS-Documents-GitHub-kreoon\71346e16-d1d6-4ca6-b211-c6caf684de7e\tasks"

$agents = @(
    @{ Name = "Types-Fixer"; File = "a021cd79af97115fc.output" },
    @{ Name = "Prompts-V2"; File = "a837245afe21ec608.output" },
    @{ Name = "ADN-Lazy"; File = "a66b8aa77b2824d04.output" },
    @{ Name = "TipTap-Lazy"; File = "adfd25fcb7d8ba092.output" },
    @{ Name = "Charts-Lazy"; File = "abe7df70bc11859e5.output" },
    @{ Name = "CreateContent-UX"; File = "a9498dd6b7ec6970d.output" },
    @{ Name = "Error-Standard"; File = "ac9050f00fffa21b3.output" },
    @{ Name = "Queries-Parallel"; File = "a14ba751b9931a3c3.output" },
    @{ Name = "Logger-Creator"; File = "a61875d22e28b3197.output" },
    @{ Name = "QA-Validator"; File = "a32934b8ce821789e.output" }
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   KREOON Implementation Agents" -ForegroundColor Cyan
Write-Host "   Sprint 1: Quick Wins" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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
            $wtCommand += " --title `"$title`" powershell -NoExit -Command `"Write-Host '=== $title ===' -ForegroundColor Cyan; Get-Content '$filePath' -Wait -Tail 50`""
            $first = $false
        } else {
            $wtCommand += " `; new-tab --title `"$title`" powershell -NoExit -Command `"Write-Host '=== $title ===' -ForegroundColor Cyan; Get-Content '$filePath' -Wait -Tail 50`""
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
            Write-Host '=== $title ===' -ForegroundColor Cyan;
            Get-Content '$filePath' -Wait -Tail 50
        "
        Start-Sleep -Milliseconds 200
    }
}

Write-Host ""
Write-Host "Agentes de implementacion:" -ForegroundColor Green
foreach ($agent in $agents) {
    Write-Host "  - $($agent.Name)" -ForegroundColor White
}
Write-Host ""
Write-Host "Impacto esperado:" -ForegroundColor Yellow
Write-Host "  - Bundle: -1015KB (TipTap + Recharts + ADN)" -ForegroundColor White
Write-Host "  - Latencia: -40% queries marketplace" -ForegroundColor White
Write-Host "  - Calidad scripts: +27%" -ForegroundColor White
Write-Host "  - UX: Borrador + Confirm dialog" -ForegroundColor White
