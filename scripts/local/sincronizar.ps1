# Sincroniza tu copia local con la rama de trabajo. Uso: .\scripts\local\sincronizar.ps1 [-SinInstall] [-Hermes]
param([switch]$SinInstall, [switch]$Hermes)
$ErrorActionPreference = "Stop"
$rama = "claude/focused-mendel-es4xcv"
Set-Location (git rev-parse --show-toplevel)
if (git status --porcelain) { Write-Host "Tienes cambios locales sin guardar. Haz commit o git stash push -u -m local."; exit 1 }
git fetch origin $rama
git checkout $rama 2>$null; if ($LASTEXITCODE -ne 0) { git checkout -b $rama "origin/$rama" }
$antes = git rev-parse "HEAD:package-lock.json"
git pull --ff-only origin $rama
Write-Host "Rama $rama en $(git rev-parse --short HEAD)"
if (-not $SinInstall) {
  if (-not (Test-Path node_modules) -or $antes -ne (git rev-parse "HEAD:package-lock.json")) { npm ci }
}
if (-not (Test-Path .env.local) -and (Test-Path .env.example)) {
  Copy-Item .env.example .env.local
  Write-Host "Cree .env.local desde .env.example: completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (solo la clave anon)."
}
if ($Hermes) { node scripts/hermes/cola.mjs recoger; node scripts/hermes/cola.mjs estado }
Write-Host "Listo. Arranca con: npm run dev -- --host 127.0.0.1   (http://127.0.0.1:8080)"
