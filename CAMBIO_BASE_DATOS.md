# 🔄 Guía de Cambio de Base de Datos

## Resumen

Para cambiar de Lovable Cloud a tu Supabase externo (Kreoon), tienes dos opciones:

---

## OPCIÓN 1: Actualizar Variables de Entorno (RECOMENDADA)

El archivo `.env` en Lovable **NO se puede editar manualmente** porque es auto-generado por Lovable Cloud.

Sin embargo, ya he creado un cliente externo que puedes usar:

### 1. Importar el cliente externo

En cualquier archivo donde necesites usar Kreoon en lugar de Lovable Cloud:

```typescript
// Antes (Lovable Cloud)
import { supabase } from '@/integrations/supabase/client';

// Después (Kreoon)
import { supabaseExternal as supabase } from '@/integrations/supabase/external-client';
```

### 2. O reexportar el cliente

Edita `src/integrations/supabase/client.ts` para reexportar el cliente externo:

```typescript
// Re-export external client as main client
export { supabaseExternal as supabase } from './external-client';
```

⚠️ **IMPORTANTE**: Esto romperá la autenticación actual. Los usuarios tendrán que hacer login de nuevo.

---

## OPCIÓN 2: Desplegar en Vercel/Netlify (Para Producción)

Si quieres desacoplar completamente de Lovable Cloud:

### 1. Exporta el código a GitHub
- Ve a **Settings > GitHub** en Lovable
- Conecta tu repositorio

### 2. Despliega en Vercel
```bash
npm install -g vercel
vercel
```

### 3. Configura las variables de entorno en Vercel
```
VITE_SUPABASE_URL=https://wjkbqcrxwsmvtxmqgiqc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=wjkbqcrxwsmvtxmqgiqc
```

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `src/integrations/supabase/external-client.ts` | Cliente para conectar a Kreoon |
| `MIGRACION_DATOS_KREOON.sql` | Script SQL con dblink para migrar datos |
| `EXPORT_DATA_CSV.md` | Guía para exportar/importar via CSV |

---

## Pasos Siguientes

1. ✅ Scripts de migración creados
2. ⏳ Migrar datos (elige CSV o dblink)
3. ⏳ Migrar usuarios auth (script Node.js)
4. ⏳ Migrar archivos de Storage
5. ⏳ Actualizar el cliente en el código
6. ⏳ Probar la aplicación
7. ⏳ Desplegar versión final

---

## ¿Quieres que proceda?

Si quieres que cambie el cliente **AHORA** para que la app use Kreoon inmediatamente:

**Dime "Sí, cambia a Kreoon"** y haré que todo el código use tu Supabase externo.

⚠️ **ADVERTENCIA**: Los usuarios actuales perderán su sesión y tendrán que volver a iniciar sesión. Asegúrate de haber migrado los usuarios antes.
