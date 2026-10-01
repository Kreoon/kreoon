/**
 * Divide el guión (HTML del editor) en escenas fáciles de grabar.
 *
 * - Cada <h3> abre un bloque (Hooks, Desarrollo, CTA…). Dirección/B-Roll pasan a «Indicaciones de
 *   grabación» y Captions se omite (no se graba).
 * - Dentro de un bloque, una ESCENA es: cada <h4> (p. ej. cada hook) o, si no hay <h4>, cada párrafo
 *   hablado. Las acotaciones sueltas («[PAUSA — tono empático]») se pegan a la escena siguiente y los
 *   textos en pantalla a la escena en curso.
 * - La numeración es continua en todo el guión (1..n) para poder asignar el material crudo.
 */
export interface ScriptScene {
  number: number;
  title: string;
  html: string;
}

export interface SceneGroup {
  title: string;
  /** Texto previo a las escenas del bloque (si lo hay) */
  introHtml: string;
  scenes: ScriptScene[];
}

export interface SceneScript {
  /** Lo que va antes del primer bloque (plataforma, duración, avatar…) */
  introHtml: string;
  groups: SceneGroup[];
  /** Dirección, B-Roll y similares, unidos */
  notesHtml: string;
}

const NOTES_RE = /direcci|b-?roll|locaci|c[aá]mara|m[uú]sica/i;
const SKIP_RE = /caption|copies|copy/i;

/** Quita emojis y espacios sobrantes */
function cleanText(text: string): string {
  return text.replace(/[\p{Extended_Pictographic}️]/gu, '').replace(/\s+/g, ' ').trim();
}

/** Texto hablado de un párrafo, sin etiquetas entre corchetes */
function spokenText(el: Element): string {
  return cleanText((el.textContent || '').replace(/\[[^\]]*\]/g, ''));
}

/** Título corto de una escena hablada: primeras palabras de la línea */
function lineTitle(text: string): string {
  const words = text.replace(/^["“«]+/, '').split(' ');
  return words.length > 7 ? `${words.slice(0, 7).join(' ')}…` : words.join(' ');
}

function splitBlock(nodes: Element[], startAt: number): { introHtml: string; scenes: ScriptScene[] } {
  const scenes: ScriptScene[] = [];
  let introHtml = '';
  const push = (title: string, html: string) => scenes.push({ number: startAt + scenes.length, title, html });

  // Con <h4>: cada uno es una escena
  if (nodes.some((n) => n.tagName === 'H4')) {
    let cur: { title: string; parts: string[] } | null = null;
    for (const n of nodes) {
      if (n.tagName === 'H4') {
        if (cur) push(cur.title, cur.parts.join(''));
        cur = { title: cleanText(n.textContent || ''), parts: [] };
      } else if (n.tagName === 'HR') {
        continue;
      } else if (cur) {
        cur.parts.push(n.outerHTML);
      } else {
        introHtml += n.outerHTML;
      }
    }
    if (cur) push(cur.title, cur.parts.join(''));
    return { introHtml, scenes };
  }

  // Sin <h4>: cada párrafo hablado es una escena
  let pending = '';
  let cur: { title: string; parts: string[] } | null = null;
  for (const n of nodes) {
    if (n.tagName === 'HR') continue;
    const spoken = n.tagName === 'P' ? spokenText(n) : '';
    if (spoken.length > 15) {
      if (cur) push(cur.title, cur.parts.join(''));
      cur = { title: lineTitle(spoken), parts: [pending, n.outerHTML] };
      pending = '';
    } else if (cur && n.tagName !== 'P') {
      // Listas/tablas (textos en pantalla) acompañan a la escena en curso, con su etiqueta delante
      cur.parts.push(pending, n.outerHTML);
      pending = '';
    } else {
      // Acotación o etiqueta suelta: va con la siguiente escena (o con la actual si no hay más)
      pending += n.outerHTML;
    }
  }
  if (cur) {
    cur.parts.push(pending);
    push(cur.title, cur.parts.join(''));
  } else if (pending) {
    introHtml = pending;
  }
  return { introHtml, scenes };
}

export function splitScriptIntoScenes(html: string | null | undefined): SceneScript | null {
  if (!html || typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.children);
  if (!nodes.some((n) => n.tagName === 'H3')) return null;

  let introHtml = '';
  let notesHtml = '';
  const groups: SceneGroup[] = [];
  let next = 1;
  let block: { title: string; kind: 'scene' | 'notes' | 'skip'; nodes: Element[] } | null = null;

  const flush = () => {
    if (!block) return;
    if (block.kind === 'scene') {
      const { introHtml: gi, scenes } = splitBlock(block.nodes, next);
      if (scenes.length === 0) {
        // Bloque sin partes reconocibles: una sola escena con todo
        scenes.push({ number: next, title: block.title, html: block.nodes.map((n) => n.outerHTML).join('') });
      }
      next += scenes.length;
      groups.push({ title: block.title, introHtml: scenes.length ? gi : '', scenes });
    } else if (block.kind === 'notes') {
      notesHtml += `<h4>${block.title}</h4>${block.nodes.map((n) => n.outerHTML).join('')}`;
    }
  };

  for (const node of nodes) {
    if (node.tagName === 'H3') {
      flush();
      const title = cleanText(node.textContent || '');
      const kind = SKIP_RE.test(title) ? 'skip' : NOTES_RE.test(title) ? 'notes' : 'scene';
      block = { title, kind, nodes: [] };
    } else if (block) {
      block.nodes.push(node);
    } else if (node.tagName !== 'H1' && node.tagName !== 'H2' && node.tagName !== 'HR') {
      introHtml += node.outerHTML;
    }
  }
  flush();

  return groups.length > 0 ? { introHtml, groups, notesHtml } : null;
}

/** Lista plana de escenas (para asignar material crudo) */
export function flattenScenes(parsed: SceneScript | null): ScriptScene[] {
  return parsed ? parsed.groups.flatMap((g) => g.scenes) : [];
}
