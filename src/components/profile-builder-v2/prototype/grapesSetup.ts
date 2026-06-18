import type { Editor } from "grapesjs";

// ─── Panel de estilos simplificado (español, sin propiedades técnicas) ──────
// Solo lo esencial para un creador: texto, fondo, espaciado, bordes, tamaño.
export const STYLE_SECTORS = [
  {
    name: "Texto",
    open: true,
    properties: [
      { property: "color", label: "Color del texto", type: "color" },
      { property: "font-size", label: "Tamaño de letra" },
      { property: "font-weight", label: "Grosor" },
      { property: "text-align", label: "Alineación" },
      { property: "line-height", label: "Interlineado" },
    ],
  },
  {
    name: "Fondo",
    open: false,
    properties: [
      { property: "background-color", label: "Color de fondo", type: "color" },
    ],
  },
  {
    name: "Espaciado",
    open: false,
    properties: [
      { property: "padding", label: "Espacio interno" },
      { property: "margin", label: "Espacio externo" },
    ],
  },
  {
    name: "Bordes",
    open: false,
    properties: [
      { property: "border-radius", label: "Bordes redondeados" },
      { property: "border", label: "Borde" },
    ],
  },
  {
    name: "Tamaño",
    open: false,
    properties: [
      { property: "width", label: "Ancho" },
      { property: "height", label: "Alto" },
    ],
  },
];

// ─── Bloques en español (lenguaje simple, no nombres de clases) ─────────────
interface BlockDef {
  id: string;
  label: string;
  category: string;
  content: string;
  media?: string;
}

const ICON = (path: string) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

const BASICOS: BlockDef[] = [
  {
    id: "kre-texto",
    label: "Texto",
    category: "Básicos",
    media: ICON(
      '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/>',
    ),
    content: `<p data-gjs-name="Texto" class="text-white/80 text-lg my-3 max-w-2xl">Escribe aquí tu texto. Haz doble clic para editarlo.</p>`,
  },
  {
    id: "kre-titulo",
    label: "Título",
    category: "Básicos",
    media: ICON('<path d="M6 4v16M18 4v16M6 12h12"/>'),
    content: `<h2 data-gjs-name="Título" class="text-white text-4xl font-bold my-4">Tu título aquí</h2>`,
  },
  {
    id: "kre-imagen",
    label: "Imagen",
    category: "Básicos",
    media: ICON(
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    ),
    content: { type: "image" } as unknown as string,
  },
  {
    id: "kre-boton",
    label: "Botón",
    category: "Básicos",
    media: ICON('<rect x="3" y="8" width="18" height="8" rx="4"/>'),
    content: `<a data-gjs-name="Botón" href="#" style="background:var(--c-primary,#8b5cf6);color:#0f0d15" class="inline-block px-7 py-3 rounded-full font-bold my-3 no-underline">Botón</a>`,
  },
  {
    id: "kre-separador",
    label: "Separador",
    category: "Básicos",
    media: ICON('<line x1="3" y1="12" x2="21" y2="12"/>'),
    content: `<hr data-gjs-name="Separador" class="border-white/15 my-8"/>`,
  },
  {
    id: "kre-espacio",
    label: "Espacio",
    category: "Básicos",
    media: ICON('<path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5"/>'),
    content: `<div data-gjs-name="Espacio" style="height:48px"></div>`,
  },
];

const ESTRUCTURA: BlockDef[] = [
  {
    id: "kre-seccion",
    label: "Sección",
    category: "Estructura",
    media: ICON(
      '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>',
    ),
    content: `<section data-gjs-name="Sección" class="py-20 px-6"><div class="max-w-5xl mx-auto"><h2 class="text-white text-3xl font-bold mb-4">Nueva sección</h2><p class="text-white/70 text-lg">Edita este contenido o arrastra elementos aquí.</p></div></section>`,
  },
  {
    id: "kre-cols-2",
    label: "Columnas 2",
    category: "Estructura",
    media: ICON(
      '<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/>',
    ),
    content: `<div data-gjs-name="2 columnas" class="grid md:grid-cols-2 gap-6 my-4"><div class="min-h-[80px] rounded-xl bg-white/5 p-4"></div><div class="min-h-[80px] rounded-xl bg-white/5 p-4"></div></div>`,
  },
  {
    id: "kre-cols-3",
    label: "Columnas 3",
    category: "Estructura",
    media: ICON(
      '<rect x="2" y="4" width="6" height="16" rx="1"/><rect x="9" y="4" width="6" height="16" rx="1"/><rect x="16" y="4" width="6" height="16" rx="1"/>',
    ),
    content: `<div data-gjs-name="3 columnas" class="grid md:grid-cols-3 gap-6 my-4"><div class="min-h-[80px] rounded-xl bg-white/5 p-4"></div><div class="min-h-[80px] rounded-xl bg-white/5 p-4"></div><div class="min-h-[80px] rounded-xl bg-white/5 p-4"></div></div>`,
  },
  {
    id: "kre-video",
    label: "Video",
    category: "Estructura",
    media: ICON(
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
    ),
    content: `<div data-gjs-name="Video" class="my-4 rounded-2xl overflow-hidden" style="position:relative;width:100%;aspect-ratio:16/9;background:#000"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`,
  },
];

// ─── Bloques prediseñados para creadores de contenido ───────────────────────
const PREDISENADOS: BlockDef[] = [
  {
    id: "kre-hero",
    label: "Portada con título",
    category: "Prediseñados",
    media: ICON(
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 14h6M7 10h10"/>',
    ),
    content: `<section data-gjs-name="Portada" class="py-24 px-6 text-center"><div class="max-w-3xl mx-auto"><h1 class="text-white text-5xl md:text-6xl font-extrabold mb-6">Crea contenido que convierte</h1><p class="text-white/70 text-xl mb-8">Una frase corta que explique lo que ofreces a tus clientes.</p><a href="#" style="background:var(--c-primary,#8b5cf6);color:#0f0d15" class="inline-block px-8 py-4 rounded-full font-bold no-underline">Contrátame</a></div></section>`,
  },
  {
    id: "kre-servicios",
    label: "Servicios",
    category: "Prediseñados",
    media: ICON(
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    ),
    content: `<section data-gjs-name="Servicios" class="py-20 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-white text-3xl font-bold text-center mb-12">Mis servicios</h2><div class="grid md:grid-cols-3 gap-6">
      <div class="rounded-2xl bg-white/5 p-8"><h3 class="text-white text-xl font-bold mb-2">Servicio 1</h3><p class="text-white/60">Describe brevemente este servicio y su beneficio.</p></div>
      <div class="rounded-2xl bg-white/5 p-8"><h3 class="text-white text-xl font-bold mb-2">Servicio 2</h3><p class="text-white/60">Describe brevemente este servicio y su beneficio.</p></div>
      <div class="rounded-2xl bg-white/5 p-8"><h3 class="text-white text-xl font-bold mb-2">Servicio 3</h3><p class="text-white/60">Describe brevemente este servicio y su beneficio.</p></div>
    </div></div></section>`,
  },
  {
    id: "kre-testimonio",
    label: "Testimonio",
    category: "Prediseñados",
    media: ICON(
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    ),
    content: `<section data-gjs-name="Testimonio" class="py-20 px-6"><div class="max-w-2xl mx-auto text-center"><p class="text-white text-2xl italic leading-relaxed mb-6">"Trabajar con esta persona cambió por completo nuestros resultados. 100% recomendado."</p><div class="flex items-center justify-center gap-3"><div class="w-12 h-12 rounded-full bg-white/10"></div><div class="text-left"><p class="text-white font-bold">Nombre del cliente</p><p class="text-white/50 text-sm">Cargo, Empresa</p></div></div></div></section>`,
  },
  {
    id: "kre-precios",
    label: "Precios",
    category: "Prediseñados",
    media: ICON(
      '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    ),
    content: `<section data-gjs-name="Precios" class="py-20 px-6"><div class="max-w-5xl mx-auto"><h2 class="text-white text-3xl font-bold text-center mb-12">Planes</h2><div class="grid md:grid-cols-3 gap-6">
      <div class="rounded-2xl bg-white/5 p-8 text-center"><h3 class="text-white text-lg mb-2">Básico</h3><p class="text-white text-4xl font-extrabold mb-6">$299</p><a href="#" class="block rounded-full border border-white/20 py-3 text-white no-underline">Elegir</a></div>
      <div class="rounded-2xl p-8 text-center" style="background:var(--c-primary,#8b5cf6)"><h3 class="text-black text-lg mb-2">Pro</h3><p class="text-black text-4xl font-extrabold mb-6">$749</p><a href="#" class="block rounded-full bg-black/80 py-3 text-white no-underline">Elegir</a></div>
      <div class="rounded-2xl bg-white/5 p-8 text-center"><h3 class="text-white text-lg mb-2">Premium</h3><p class="text-white text-4xl font-extrabold mb-6">$1499</p><a href="#" class="block rounded-full border border-white/20 py-3 text-white no-underline">Elegir</a></div>
    </div></div></section>`,
  },
  {
    id: "kre-cta",
    label: "Llamado a la acción",
    category: "Prediseñados",
    media: ICON('<path d="M3 11l19-9-9 19-2-8-8-2z"/>'),
    content: `<section data-gjs-name="Llamado a la acción" class="py-20 px-6"><div class="max-w-3xl mx-auto rounded-3xl p-12 text-center" style="background:var(--c-primary,#8b5cf6)"><h2 class="text-black text-3xl font-extrabold mb-4">¿Listo para empezar?</h2><p class="text-black/80 text-lg mb-8">Escríbeme hoy y trabajemos juntos en tu próximo proyecto.</p><a href="#" class="inline-block bg-black/85 text-white px-8 py-4 rounded-full font-bold no-underline">Contactar ahora</a></div></section>`,
  },
];

/** Registra todos los bloques en español, reemplazando los del preset. */
export function registerBlocks(editor: Editor) {
  const bm = editor.BlockManager;
  // Quitar bloques que vengan en inglés del preset/plugins.
  bm.getAll()
    .map((b) => b.id as string)
    .forEach((id) => bm.remove(id));

  [...BASICOS, ...ESTRUCTURA, ...PREDISENADOS].forEach((b) => {
    bm.add(b.id, {
      label: b.label,
      category: b.category,
      media: b.media,
      content: b.content,
      select: true,
    });
  });
}

// Textos extra en español neutro LATAM que complementan el locale del paquete.
export const I18N_ES_EXTRA = {
  assetManager: {
    addButton: "Agregar imagen",
    inputPlh: "Pega la URL de la imagen",
    modalTitle: "Selecciona una imagen",
    uploadTitle: "Arrastra una imagen o haz clic para subir",
  },
  blockManager: {
    labels: {},
    categories: {
      Básicos: "Básicos",
      Estructura: "Estructura",
      Prediseñados: "Prediseñados",
    },
  },
};
