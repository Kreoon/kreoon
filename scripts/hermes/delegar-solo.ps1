<#
.SYNOPSIS
  Crea en el Kanban de Hermes las tareas acotadas del relanzamiento de Kreoon. UN SOLO ARCHIVO: no necesita nada más.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\delegar-solo.ps1 -Ensayo     # muestra lo que haría, no crea nada
  powershell -ExecutionPolicy Bypass -File .\delegar-solo.ps1             # crea las 4 tareas
  powershell -ExecutionPolicy Bypass -File .\delegar-solo.ps1 -Tareas 2   # solo la tarea 2
  powershell -ExecutionPolicy Bypass -File .\delegar-solo.ps1 -Ver ABC123 # estado de una tarea (usa el id real)
#>
param(
  [int[]]$Tareas = @(1, 2, 3, 4),
  [switch]$Ensayo,
  [string]$Ver,
  [string]$Servidor = 'servidor-casa'
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) { throw 'No hay cliente ssh. En Windows: Configuración > Aplicaciones > Características opcionales > Cliente de OpenSSH.' }

if ($Ver) {
  if ($Ver -notmatch '^[A-Za-z0-9_-]+$') { throw 'El id solo puede tener letras, números, guion y guion bajo.' }
  ssh $Servidor "docker exec -u hermes hermes hermes kanban show $Ver"
  return
}

$script = @'
#!/usr/bin/env bash
# Se ejecuta EN el servidor (lo envían delegar.ps1 / delegar-local.sh por SSH).
# Crea tareas acotadas en el tablero Kanban de Hermes. Sin seguridad, secretos ni acceso al repositorio.
#
#   bash -s -- 1 3        → solo las tareas 1 y 3 (sin argumentos: las 4)
#   DRY=1 bash -s -- 2    → ensayo: imprime el comando y NO crea nada
set -u

WORKSPACE="dir:/opt/data/workspace/proyectos/kreoon"
H=(docker exec -u hermes hermes hermes)

crear() { # $1 título · $2 perfil · $3 cuerpo
  if [ "${DRY:-0}" = "1" ]; then
    printf '[ENSAYO] kanban create "%s" --assignee %s --workspace %s --max-runtime 900 --json\n         cuerpo (%s caracteres): %.90s...\n' "$1" "$2" "$WORKSPACE" "${#3}" "$3"
    return 0
  fi
  echo "→ $1 ($2)"
  "${H[@]}" kanban create "$1" --assignee "$2" --workspace "$WORKSPACE" --body "$3" --max-runtime 900 --json
  echo
}

tarea_1() {
  crear 'Comunicado de relanzamiento de Kreoon' estratega 'Redacta un comunicado breve (180 a 220 palabras, español de Colombia, tono cálido y profesional) para anunciar la nueva etapa de Kreoon, la plataforma para creadores de contenido. Hechos permitidos: el registro es solo para creadores; se entra con Google o con correo; el perfil no se publica solo y cada persona decide cuándo mostrar su portafolio; crear la cuenta no garantiza proyectos ni encargos; hoy el ingreso está abierto en UGC Colombia. Prohibido: prometer ingresos o trabajo, inventar cifras, nombres de personas o testimonios, y mencionar precios. Entrega 3 variantes de titular y el comunicado en una versión final. Cierra con una llamada a la acción hacia kreoon.com.'
}

tarea_2() {
  crear 'Mensaje de autorización de imagen para creadores' ventas 'Redacta un mensaje corto de WhatsApp (máximo 120 palabras) y una versión en correo (máximo 200 palabras) para pedir a un creador de UGC Colombia su autorización por escrito para mostrar su foto de perfil y su nombre en la página de inicio de Kreoon. Debe decir con claridad: para qué se usaría (solo la página de inicio de Kreoon), durante cuánto tiempo (propón 12 meses renovables), que puede retirar la autorización cuando quiera escribiendo al mismo contacto y que no recibe ni se le promete pago, trabajo ni proyectos por aparecer. Pide que responda con la frase exacta de aceptación que tú propongas. Tono cercano, sin presión. Marca al final con una nota: este texto requiere revisión jurídica antes de enviarse.'
}

tarea_3() {
  crear 'Calendario de 7 piezas para anunciar Kreoon' redes 'Diseña un calendario de 7 días de contenido para Instagram y TikTok que anuncie la nueva etapa de Kreoon para creadores. Para cada día entrega: formato (reel, carrusel, historia), gancho de los primeros 3 segundos, guion o estructura en 4 a 6 líneas, texto en pantalla y llamada a la acción sutil. Usa la secuencia Gancho, Valor, Prueba, CTA sutil. Reglas: no prometer ingresos ni trabajo, no inventar cifras ni testimonios, no mostrar personas como si fueran miembros reales; si propones imágenes de personas generadas con IA, indícalo como ilustrativas. Tono cálido y paisa moderado, sin groserías.'
}

tarea_4() {
  crear 'Copys de anuncio para captar creadores' anuncios 'Escribe 6 variantes de copy para anuncios de Meta (texto principal de máximo 125 caracteres visibles, titular de máximo 40 caracteres y descripción de máximo 30) cuyo objetivo es que creadores de contenido de Colombia creen su cuenta en Kreoon. Mensaje central: Tu talento merece ser visto. Cada variante con un ángulo distinto: portafolio, comunidad, claridad del siguiente paso, empezar sin presión, estilo propio, aprender con otros. Reglas estrictas: no prometer ingresos, trabajo ni resultados; no afirmar que no se necesitan seguidores; no inventar cifras ni testimonios; CTA único: Crear mi cuenta. Para cada variante indica el nivel de conciencia de la audiencia al que apunta.'
}

if [ "$#" -eq 0 ]; then set -- 1 2 3 4; fi
for n in "$@"; do
  case "$n" in
    1|2|3|4) "tarea_$n" ;;
    *) echo "Tarea desconocida: $n (usa 1, 2, 3 o 4)" >&2 ;;
  esac
done
echo "Listo. Sigue una tarea con:  ssh <servidor> 'docker exec -u hermes hermes hermes kanban show <id>'"

'@

# bash en el servidor necesita LF y UTF-8 (sin esto los acentos llegan rotos).
$contenido = $script -replace "`r`n", "`n"
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
$lista = ($Tareas | ForEach-Object { [string][int]$_ }) -join ' '
$prefijo = if ($Ensayo) { 'DRY=1 ' } else { '' }
Write-Host ("Enviando a {0}: tareas {1}{2}" -f $Servidor, $lista, $(if ($Ensayo) { ' (ENSAYO)' } else { '' }))
$contenido | ssh $Servidor "${prefijo}bash -s -- $lista"
