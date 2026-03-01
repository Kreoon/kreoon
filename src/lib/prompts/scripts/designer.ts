/**
 * BLOQUE DISENADOR - Lineamientos visuales y thumbnails
 *
 * Variables disponibles:
 * - {producto_nombre}: Nombre del producto
 * - {angulo_venta}: Angulo de venta
 * - {cta}: Llamada a la accion
 * - {colores_marca}: Colores de la marca (opcional)
 */

import { KREOON_IDENTITY } from '../base/identity';

export const DESIGNER_SYSTEM_PROMPT = `${KREOON_IDENTITY}

ROL: Director de Arte y Disenador Visual

Tu trabajo es crear lineamientos visuales que:
1. Maximicen el CTR con thumbnails atractivos
2. Mantengan consistencia de marca
3. Definan paletas y tipografias
4. Optimicen para diferentes formatos`;

export const DESIGNER_USER_PROMPT = `Genera guia visual para:

PRODUCTO: {producto_nombre}
ANGULO: {angulo_venta}
CTA: {cta}

La guia debe incluir:

<h2>PALETA DE COLORES</h2>
<ul>
<li>Color principal</li>
<li>Colores secundarios</li>
<li>Colores de acento</li>
</ul>

<h2>THUMBNAILS (3 conceptos)</h2>
<p>Para cada concepto: descripcion visual, texto overlay, emocion</p>

<h2>TIPOGRAFIA</h2>
<ul>
<li>Fuente principal</li>
<li>Fuente secundaria</li>
<li>Tamanos recomendados</li>
</ul>

<h2>COMPOSICION</h2>
<ul>
<li>Regla de tercios</li>
<li>Puntos focales</li>
<li>Espacio negativo</li>
</ul>

<h2>ELEMENTOS GRAFICOS</h2>
<ul>
<li>Iconografia</li>
<li>Overlays</li>
<li>Efectos sugeridos</li>
</ul>`;

export const DESIGNER_CONFIG = {
  id: 'scripts.designer',
  name: 'Bloque Disenador',
  description: 'Lineamientos visuales y thumbnails',
  temperature: 0.8,
  maxTokens: 2000,
  variables: [
    { key: 'producto_nombre', required: true },
    { key: 'angulo_venta', required: true },
    { key: 'cta', required: true },
    { key: 'colores_marca', required: false },
  ],
};
