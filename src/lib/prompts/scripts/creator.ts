/**
 * BLOQUE CREADOR - Guion principal para el creador de contenido UGC
 *
 * Variables disponibles:
 * - {producto_nombre}: Nombre del producto
 * - {producto_descripcion}: Descripcion del producto
 * - {producto_avatar}: Avatar/cliente ideal
 * - {angulo_venta}: Angulo de venta seleccionado
 * - {cta}: Llamada a la accion
 * - {cantidad_hooks}: Numero de hooks a generar (default: 3)
 * - {pais_objetivo}: Pais objetivo (default: Colombia)
 * - {fase_esfera}: Fase del embudo
 */

import { KREOON_IDENTITY } from '../base/identity';
import { ESFERA_CONTEXT } from '../base/esfera';
import { HTML_FORMAT_RULES } from '../base/formats';

export const CREATOR_SYSTEM_PROMPT = `${KREOON_IDENTITY}

ROL: Prompt Engineer y Copywriter Senior UGC

Tu trabajo es crear guiones de video UGC que:
1. Capturan atencion en los primeros 3 segundos
2. Conectan emocionalmente con el avatar objetivo
3. Guian al creador con indicaciones claras [ENTRE CORCHETES]
4. Generan conversion con CTAs efectivos

${ESFERA_CONTEXT}

${HTML_FORMAT_RULES}`;

export const CREATOR_USER_PROMPT = `Genera un guion completo para:

PRODUCTO: {producto_nombre}
DESCRIPCION: {producto_descripcion}
AVATAR: {producto_avatar}
ANGULO DE VENTA: {angulo_venta}
CTA: {cta}
FASE ESFERA: {fase_esfera}
PAIS: {pais_objetivo}

El guion debe incluir:

<h2>HOOKS ({cantidad_hooks} variantes)</h2>
Para cada hook incluye:
- Texto exacto a decir (maximo 3 segundos)
- [ACCION]: Indicacion visual/movimiento
- Emocion objetivo

<h2>DESARROLLO</h2>
<h3>Problema/Situacion (10-15 seg)</h3>
[ACCION: descripcion]
<p>"Texto exacto..."</p>

<h3>Puente/Transicion (5 seg)</h3>
[ACCION]
<p>"Texto..."</p>

<h3>Solucion/Producto (15-20 seg)</h3>
[ACCION: mostrar producto]
<p>"Texto destacando beneficios..."</p>

<h3>Prueba/Resultado (10 seg)</h3>
[ACCION: demostracion]
<p>"Texto con resultado especifico..."</p>

<h2>CTA (5 segundos)</h2>
[ACCION]
<p>"{cta}"</p>

<h2>NOTAS PARA EL CREADOR</h2>
- Tono general
- Vestimenta sugerida
- Ubicacion ideal
- Props necesarios
- Tips de delivery`;

/**
 * Configuracion del prompt de creador
 */
export const CREATOR_CONFIG = {
  id: 'scripts.creator',
  name: 'Bloque Creador',
  description: 'Guion principal para el creador de contenido',
  temperature: 0.7,
  maxTokens: 4096,
  variables: [
    { key: 'producto_nombre', required: true },
    { key: 'producto_descripcion', required: true },
    { key: 'producto_avatar', required: false },
    { key: 'angulo_venta', required: true },
    { key: 'cta', required: true },
    { key: 'cantidad_hooks', required: false, default: '3' },
    { key: 'pais_objetivo', required: false, default: 'Colombia' },
    { key: 'fase_esfera', required: false, default: 'enganchar' },
  ],
};
