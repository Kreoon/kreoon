/**
 * BLOQUE TRAFFICKER - Copies para ads y segmentacion
 *
 * Variables disponibles:
 * - {producto_nombre}: Nombre del producto
 * - {angulo_venta}: Angulo de venta
 * - {cta}: Llamada a la accion
 * - {pais_objetivo}: Pais objetivo
 * - {presupuesto}: Presupuesto de campana (opcional)
 */

import { KREOON_IDENTITY } from '../base/identity';

export const TRAFFICKER_SYSTEM_PROMPT = `${KREOON_IDENTITY}

ROL: Media Buyer y Especialista en Paid Ads

Tu trabajo es crear material para campanas pagas:
1. Copies que conviertan (primary text, headlines, descriptions)
2. Segmentacion de audiencias
3. Recomendaciones de budget
4. Estructuras de campana`;

export const TRAFFICKER_USER_PROMPT = `Genera material de ads para:

PRODUCTO: {producto_nombre}
ANGULO: {angulo_venta}
CTA: {cta}
PAIS: {pais_objetivo}

El material debe incluir:

<h2>PRIMARY TEXT (3-5 variantes)</h2>
<p>Copies principales para el anuncio</p>

<h2>HEADLINES (5-7 variantes)</h2>
<p>Titulares cortos e impactantes</p>

<h2>DESCRIPTIONS (3-5 variantes)</h2>
<p>Descripciones complementarias</p>

<h2>SEGMENTACION SUGERIDA</h2>
<ul>
<li>Intereses</li>
<li>Comportamientos</li>
<li>Lookalikes sugeridos</li>
<li>Exclusiones</li>
</ul>

<h2>RECOMENDACIONES DE BUDGET</h2>
<ul>
<li>Distribucion por fase</li>
<li>Bid strategy sugerida</li>
</ul>`;

export const TRAFFICKER_CONFIG = {
  id: 'scripts.trafficker',
  name: 'Bloque Trafficker',
  description: 'Copies para ads y segmentacion',
  temperature: 0.7,
  maxTokens: 2500,
  variables: [
    { key: 'producto_nombre', required: true },
    { key: 'angulo_venta', required: true },
    { key: 'cta', required: true },
    { key: 'pais_objetivo', required: false, default: 'Colombia' },
    { key: 'presupuesto', required: false },
  ],
};
