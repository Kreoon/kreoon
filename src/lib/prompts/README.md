# KREOON Prompts Library

Esta carpeta contiene **todos los prompts de AI** de la plataforma KREOON.

## Estructura

```
src/lib/prompts/
├── base/                 # Identidad y contextos base
│   ├── identity.ts       # KREOON_IDENTITY
│   ├── esfera.ts         # Metodologia ESFERA
│   └── formats.ts        # Reglas de formato (HTML, JSON)
│
├── scripts/              # Generacion de guiones UGC
│   ├── creator.ts        # Bloque Creador
│   ├── editor.ts         # Bloque Editor
│   ├── strategist.ts     # Bloque Estratega
│   ├── trafficker.ts     # Bloque Trafficker
│   ├── designer.ts       # Bloque Disenador
│   └── admin.ts          # Bloque Admin/PM
│
├── research/             # Investigacion de productos
│   ├── product.ts        # Product research steps
│   └── market.ts         # Market analysis
│
├── content/              # Analisis de contenido
│   ├── video-analysis.ts # Analisis de video
│   └── thumbnail.ts      # Generacion de thumbnails
│
├── dna/                  # DNA de clientes/productos
│   ├── client.ts         # Client DNA extraction
│   └── product.ts        # Product DNA extraction
│
├── social/               # Redes sociales
│   ├── metrics.ts        # Social metrics analysis
│   └── scraper.ts        # Social scraping prompts
│
├── marketing/            # Marketing y ads
│   ├── campaigns.ts      # Campaign generation
│   └── ads.ts            # Ad copy generation
│
└── assistant/            # AI Assistant general
    └── copilot.ts        # Copilot prompts
```

## Como editar un prompt

1. Abre el archivo correspondiente (ej: `scripts/creator.ts`)
2. Modifica el texto del prompt
3. Guarda el archivo
4. Los cambios se aplican automaticamente al recompilar

## Sincronizacion con Edge Functions

Los prompts de edge functions estan en `supabase/functions/_shared/prompts/`.
Cuando modifiques un prompt base, asegurate de actualizar ambos lugares o usa el script de sincronizacion:

```bash
npm run sync-prompts
```

## Variables disponibles

Los prompts pueden usar variables con formato `{variable_nombre}`:

- `{producto_nombre}` - Nombre del producto
- `{producto_descripcion}` - Descripcion del producto
- `{producto_avatar}` - Avatar/cliente ideal
- `{angulo_venta}` - Angulo de venta
- `{cta}` - Llamada a la accion
- `{fase_esfera}` - Fase del embudo (enganchar/solucion/remarketing/fidelizar)
- `{pais_objetivo}` - Pais objetivo
- `{cantidad_hooks}` - Numero de hooks a generar

## Buenas practicas

1. **Mantener prompts concisos** - Prompts mas cortos = respuestas mas rapidas
2. **Usar variables** - Permite reutilizar prompts con diferentes datos
3. **Documentar cambios** - Agregar comentarios cuando se modifiquen prompts
4. **Testear antes de prod** - Probar cambios en desarrollo primero
