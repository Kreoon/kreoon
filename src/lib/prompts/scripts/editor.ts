/**
 * BLOQUE EDITOR - Guia de postproduccion para el editor
 *
 * Variables disponibles:
 * - {producto_nombre}: Nombre del producto
 * - {angulo_venta}: Angulo de venta
 * - {cta}: Llamada a la accion
 * - {duracion_total}: Duracion estimada del video
 */

import { KREOON_IDENTITY } from '../base/identity';

export const EDITOR_SYSTEM_PROMPT = `${KREOON_IDENTITY}

ROL: Director de Postproduccion especializado en contenido UGC

Tu trabajo es crear guias de edicion detalladas que:
1. Optimicen el ritmo y engagement del video
2. Definan claramente la estructura visual
3. Especifiquen audio, musica y efectos
4. Indiquen formatos de exportacion`;

export const EDITOR_USER_PROMPT = `Genera una guia de edicion para:

PRODUCTO: {producto_nombre}
ANGULO: {angulo_venta}
CTA: {cta}

La guia debe incluir:

<h2>STORYBOARD</h2>
<p>Tabla de escenas con: #, Tiempo, Visual, Audio, Texto en pantalla, Transicion</p>

<h2>AUDIO</h2>
<ul>
<li><strong>Musica sugerida:</strong> [genero/mood/BPM]</li>
<li><strong>Momentos de silencio:</strong> [timestamps]</li>
<li><strong>Efectos de sonido:</strong> [lista]</li>
<li><strong>Mezcla:</strong> Voz 80% / Musica 20%</li>
</ul>

<h2>RITMO Y CORTES</h2>
<ul>
<li>Estilo de edicion</li>
<li>Frecuencia de cortes</li>
<li>Momentos de aceleracion</li>
</ul>

<h2>SUBTITULOS</h2>
<ul>
<li>Estilo y fuente</li>
<li>Colores</li>
<li>Palabras a destacar</li>
</ul>

<h2>CORRECCION DE COLOR</h2>
<ul>
<li>LUT sugerido</li>
<li>Temperatura</li>
<li>Contraste</li>
</ul>

<h2>FORMATOS DE EXPORTACION</h2>
<ul>
<li>Vertical 9:16 (TikTok/Reels)</li>
<li>Cuadrado 1:1 (Feed)</li>
<li>Horizontal 16:9 (YouTube)</li>
</ul>`;

export const EDITOR_CONFIG = {
  id: 'scripts.editor',
  name: 'Bloque Editor',
  description: 'Guia de postproduccion para el editor',
  temperature: 0.5,
  maxTokens: 3000,
  variables: [
    { key: 'producto_nombre', required: true },
    { key: 'angulo_venta', required: true },
    { key: 'cta', required: true },
    { key: 'duracion_total', required: false, default: '60 segundos' },
  ],
};
