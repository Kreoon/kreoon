# Despliega las Edge Functions del módulo Red social a Kreoon
# interest-extractor, feed-recommendations

$KREOON_PROJECT_REF = "wjkbqcrxwsmvtxmqgiqc"

Write-Host "Desplegando Edge Functions del módulo Red social a Kreoon ($KREOON_PROJECT_REF)..." -ForegroundColor Cyan

$functions = @("interest-extractor", "feed-recommendations")
foreach ($fn in $functions) {
    Write-Host "`nDesplegando $fn..." -ForegroundColor Yellow
    npx supabase functions deploy $fn --project-ref $KREOON_PROJECT_REF
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error desplegando $fn" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nDespliegue exitoso." -ForegroundColor Green
Write-Host "`nLas funciones no requieren secrets adicionales (usan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY automáticos)." -ForegroundColor Gray
Write-Host "Si usas tablas user_feed_events o user_interest_profile, asegúrate de que existan en tu BD." -ForegroundColor Gray
