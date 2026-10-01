# Tareas acotadas para delegar a Hermes (se ejecutan desde tu PC)

Esta sesión en la nube **no llega** a `servidor-casa` (no hay cliente SSH, ni claves, y el nombre no resuelve), así que estas
tareas se pegan desde tu PC. Todas son redacción o estrategia acotada: **no** hay arquitectura, seguridad, secretos ni
acceso al repositorio. Los textos van sin comillas dobles ni apóstrofes para no romper el comando de SSH.

Después, trae el resultado y yo lo reviso antes de usarlo. Para seguirlas:
`ssh servidor-casa 'docker exec -u hermes hermes hermes kanban show <id>'`

Hechos que las tareas pueden usar (verificados en el producto): el registro público es solo para creadores; se puede entrar
con Google o con correo; el perfil NO se publica solo; crear la cuenta no garantiza proyectos ni encargos; la organización
donde hoy está abierto el ingreso es UGC Colombia; la marca es Kreoon (kreoon.com).

## Scripts para correrlas (recomendado)

En `scripts/hermes/`. Se ejecutan desde tu PC; envían `delegar.sh` al servidor por SSH (sin problemas de comillas ni de
acentos). Haz siempre primero un ensayo.

**Windows (PowerShell):**

```powershell
cd scripts\hermes
.\delegar.ps1 -Ensayo            # muestra lo que haría, no crea nada
.\delegar.ps1                    # crea las 4 tareas
.\delegar.ps1 -Tareas 2          # solo la tarea 2 (autorización de imagen)
.\ver.ps1 -Id <id>               # estado y resultado de una tarea
```

Si PowerShell bloquea el script: `powershell -ExecutionPolicy Bypass -File .\delegar.ps1 -Ensayo`.

**Mac / Linux / WSL / Git Bash:**

```bash
cd scripts/hermes
DRY=1 ./delegar-local.sh          # ensayo
./delegar-local.sh                # las 4 tareas
./delegar-local.sh 2 4            # solo la 2 y la 4
```

Cada tarea imprime el JSON con su `id`. Verificado: la sintaxis de bash y el ensayo local de `delegar.sh`. **No** se probó
`delegar.ps1` (no hay PowerShell en la sesión) ni la llamada real a Hermes: por eso el `-Ensayo` primero.

## 1 · estratega · comunicado de relanzamiento

```bash
ssh servidor-casa 'docker exec -u hermes hermes hermes kanban create "Comunicado de relanzamiento de Kreoon" --assignee estratega --workspace dir:/opt/data/workspace/proyectos/kreoon --body "Redacta un comunicado breve (180 a 220 palabras, español de Colombia, tono cálido y profesional) para anunciar la nueva etapa de Kreoon, la plataforma para creadores de contenido. Hechos permitidos: el registro es solo para creadores; se entra con Google o con correo; el perfil no se publica solo y cada persona decide cuando mostrar su portafolio; crear la cuenta no garantiza proyectos ni encargos; hoy el ingreso esta abierto en UGC Colombia. Prohibido: prometer ingresos o trabajo, inventar cifras, nombres de personas o testimonios, y mencionar precios. Entrega 3 variantes de titular y el comunicado en una version final. Cierra con una llamada a la accion hacia kreoon.com." --max-runtime 900 --json'
```

## 2 · ventas · mensaje de autorización de uso de foto y nombre

```bash
ssh servidor-casa 'docker exec -u hermes hermes hermes kanban create "Mensaje de autorizacion de imagen para creadores" --assignee ventas --workspace dir:/opt/data/workspace/proyectos/kreoon --body "Redacta un mensaje corto de WhatsApp (maximo 120 palabras) y una version en correo (maximo 200 palabras) para pedir a un creador de UGC Colombia su autorizacion por escrito para mostrar su foto de perfil y su nombre en la pagina de inicio de Kreoon. Debe decir con claridad: para que se usara (solo la pagina de inicio de Kreoon), durante cuanto tiempo (propon 12 meses renovables), que puede retirar la autorizacion cuando quiera escribiendo al mismo contacto y que no recibe ni se le promete pago, trabajo ni proyectos por aparecer. Pide que responda con la frase exacta de aceptacion que tu propongas. Tono cercano, sin presion. Marca al final con una nota: este texto requiere revision juridica antes de enviarse." --max-runtime 900 --json'
```

## 3 · redes · calendario de piezas de anuncio

```bash
ssh servidor-casa 'docker exec -u hermes hermes hermes kanban create "Calendario de 7 piezas para anunciar Kreoon" --assignee redes --workspace dir:/opt/data/workspace/proyectos/kreoon --body "Disena un calendario de 7 dias de contenido para Instagram y TikTok que anuncie la nueva etapa de Kreoon para creadores. Para cada dia entrega: formato (reel, carrusel, historia), gancho de los primeros 3 segundos, guion o estructura en 4 a 6 lineas, texto en pantalla y llamada a la accion sutil. Usa la secuencia Gancho, Valor, Prueba, CTA sutil. Reglas: no prometer ingresos ni trabajo, no inventar cifras ni testimonios, no mostrar personas como si fueran miembros reales; si propones imagenes de personas generadas con IA, indicalo como ilustrativas. Tono calido y paisa moderado, sin groserias." --max-runtime 900 --json'
```

## 4 · anuncios · variantes de copy para captar creadores

```bash
ssh servidor-casa 'docker exec -u hermes hermes hermes kanban create "Copys de anuncio para captar creadores" --assignee anuncios --workspace dir:/opt/data/workspace/proyectos/kreoon --body "Escribe 6 variantes de copy para anuncios de Meta (texto principal de maximo 125 caracteres visibles, titular de maximo 40 caracteres y descripcion de maximo 30) cuyo objetivo es que creadores de contenido de Colombia creen su cuenta en Kreoon. Mensaje central: Tu talento merece ser visto. Cada variante con un angulo distinto: portafolio, comunidad, claridad del siguiente paso, empezar sin presion, estilo propio, aprender con otros. Reglas estrictas: no prometer ingresos, trabajo ni resultados; no afirmar que no se necesitan seguidores; no inventar cifras ni testimonios; CTA unico: Crear mi cuenta. Para cada variante indica el nivel de conciencia de la audiencia al que apunta." --max-runtime 900 --json'
```

## Qué NO delegar

El parche de seguridad, las migraciones, las RPC, el plan de migración de datos, cualquier cosa con claves o tokens, y la
revisión final de texto legal. Eso lo hago yo o lo revisa tu asesor.
