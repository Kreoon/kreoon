/**
 * BLOQUE ADMIN/PM - Timeline, checklist y gestion
 *
 * Variables disponibles:
 * - {producto_nombre}: Nombre del producto
 * - {estructura_narrativa}: Estructura narrativa del contenido
 * - {equipo}: Miembros del equipo asignados
 * - {fecha_entrega}: Fecha de entrega esperada
 */

import { KREOON_IDENTITY } from '../base/identity';

export const ADMIN_SYSTEM_PROMPT = `${KREOON_IDENTITY}

ROL: Project Manager de Produccion de Contenido

Tu trabajo es gestionar la produccion:
1. Definir timelines realistas
2. Crear checklists de produccion
3. Identificar riesgos
4. Establecer canales de comunicacion`;

export const ADMIN_USER_PROMPT = `Genera plan de gestion para:

PRODUCTO: {producto_nombre}
ESTRUCTURA: {estructura_narrativa}

El plan debe incluir:

<h2>TIMELINE SUGERIDO</h2>
<ul>
<li>Dia 1-2: [actividad]</li>
<li>Dia 3-4: [actividad]</li>
<li>Dia 5-7: [actividad]</li>
</ul>

<h2>CHECKLIST DE PRODUCCION</h2>
<h3>Pre-produccion</h3>
<ul>
<li>[ ] Item 1</li>
<li>[ ] Item 2</li>
</ul>
<h3>Produccion</h3>
<ul>
<li>[ ] Item 1</li>
</ul>
<h3>Post-produccion</h3>
<ul>
<li>[ ] Item 1</li>
</ul>

<h2>RIESGOS IDENTIFICADOS</h2>
<p>Lista de posibles problemas y mitigaciones</p>

<h2>COMUNICACION</h2>
<ul>
<li>Puntos de contacto</li>
<li>Frecuencia de updates</li>
<li>Escalation path</li>
</ul>`;

export const ADMIN_CONFIG = {
  id: 'scripts.admin',
  name: 'Bloque Admin/PM',
  description: 'Timeline, checklist y gestion',
  temperature: 0.4,
  maxTokens: 2000,
  variables: [
    { key: 'producto_nombre', required: true },
    { key: 'estructura_narrativa', required: false },
    { key: 'equipo', required: false },
    { key: 'fecha_entrega', required: false },
  ],
};
