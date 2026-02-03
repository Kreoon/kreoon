# Despliega script-chat a Kreoon Supabase
# Proyecto Kreoon: wjkbqcrxwsmvtxmqgiqc

$KREOON_PROJECT_REF = "wjkbqcrxwsmvtxmqgiqc"

Write-Host "Desplegando script-chat a Kreoon ($KREOON_PROJECT_REF)..." -ForegroundColor Cyan
npx supabase functions deploy script-chat --project-ref $KREOON_PROJECT_REF

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDespliegue exitoso." -ForegroundColor Green
    Write-Host "`nConfigura las variables de entorno en Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/$KREOON_PROJECT_REF/settings/functions" -ForegroundColor Gray
    Write-Host "`nSecrets requeridos:" -ForegroundColor Yellow
    Write-Host "  - GOOGLE_AI_API_KEY (obligatorio)" -ForegroundColor Gray
    Write-Host "  - OPENAI_API_KEY (recomendado para fallback)" -ForegroundColor Gray
    Write-Host "  - ANTHROPIC_API_KEY (opcional)" -ForegroundColor Gray
    Write-Host "  - PERPLEXITY_API_KEY (opcional, para investigación en tiempo real)" -ForegroundColor Gray
} else {
    Write-Host "Error en el despliegue. Verifica que estés autenticado: npx supabase login" -ForegroundColor Red
    exit 1
}
