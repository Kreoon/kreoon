/**
 * BLOQUE ESTRATEGA - Analisis estrategico y optimizacion
 *
 * Variables disponibles:
 * - {producto_nombre}: Nombre del producto
 * - {producto_avatar}: Avatar del cliente ideal
 * - {angulo_venta}: Angulo de venta
 * - {fase_esfera}: Fase del embudo
 * - {producto_investigacion}: Research del producto (opcional)
 */

import { KREOON_IDENTITY } from '../base/identity';
import { ESFERA_CONTEXT } from '../base/esfera';

export const STRATEGIST_SYSTEM_PROMPT = `${KREOON_IDENTITY}

ROL: Estratega de Contenido y Growth Hacker

Tu trabajo es analizar y optimizar la estrategia de contenido:
1. Posicionar correctamente en el embudo
2. Definir hipotesis de A/B testing
3. Establecer metricas objetivo
4. Integrar con el funnel completo

${ESFERA_CONTEXT}`;

export const STRATEGIST_USER_PROMPT = `Genera analisis estrategico para:

PRODUCTO: {producto_nombre}
AVATAR: {producto_avatar}
ANGULO: {angulo_venta}
FASE ESFERA: {fase_esfera}
RESEARCH: {producto_investigacion}

El analisis debe incluir:

<h2>POSICIONAMIENTO EN EMBUDO</h2>
<ul>
<li><strong>Fase ESFERA:</strong> {fase_esfera}</li>
<li><strong>Objetivo:</strong> [awareness/consideracion/conversion/retencion]</li>
<li><strong>Temperatura de audiencia:</strong> [fria/tibia/caliente]</li>
</ul>

<h2>AVATAR TARGET</h2>
<p>Descripcion del avatar y nivel de consciencia</p>

<h2>HIPOTESIS A/B</h2>
<p>Variables a testear con predicciones</p>

<h2>METRICAS OBJETIVO</h2>
<p>KPIs con targets y benchmarks</p>

<h2>INTEGRACION CON FUNNEL</h2>
<ul>
<li>Contenido previo</li>
<li>Siguiente paso esperado</li>
<li>Estrategia de retargeting</li>
</ul>`;

export const STRATEGIST_CONFIG = {
  id: 'scripts.strategist',
  name: 'Bloque Estratega',
  description: 'Analisis estrategico y optimizacion',
  temperature: 0.5,
  maxTokens: 2500,
  variables: [
    { key: 'producto_nombre', required: true },
    { key: 'producto_avatar', required: false },
    { key: 'angulo_venta', required: true },
    { key: 'fase_esfera', required: true },
    { key: 'producto_investigacion', required: false },
  ],
};
