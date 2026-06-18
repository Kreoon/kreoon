import type { Data } from "@measured/puck";

// Adaptación de cada plantilla HTML a bloques de Puck (contenido + marca).
// Cuando el usuario elige una plantilla y no tiene un diseño guardado, el
// canvas de Puck arranca con estos bloques (editables, movibles, etc.).

const cyberNeon: Data = {
  root: {},
  content: [
    {
      type: "Hero",
      props: {
        id: "seed-hero",
        titulo: "Mateo Kreoon",
        subtitulo:
          "Creador de contenido premium · Elevo marcas a través de narrativas digitales que convierten.",
        botonTexto: "Ver portafolio",
        botonHref: "#portafolio",
      },
    },
    {
      type: "Servicios",
      props: {
        id: "seed-servicios",
        titulo: "Especialidades",
        items: [
          {
            titulo: "UGC Video Ads",
            descripcion: "Direct response, hooks ganchos y CTA optimizado.",
          },
          {
            titulo: "Product Reviews",
            descripcion:
              "Demo en uso, unboxing premium y voiceover profesional.",
          },
          {
            titulo: "Reels & TikTok",
            descripcion: "Edición dinámica, tendencias y enganche viral.",
          },
        ],
      },
    },
    {
      type: "Portafolio",
      props: {
        id: "seed-portafolio",
        titulo: "Mi trabajo",
        items: [
          { src: "https://placehold.co/600x600/15121b/d0bcff?text=Trabajo+1" },
          { src: "https://placehold.co/600x600/15121b/00d9ff?text=Trabajo+2" },
          { src: "https://placehold.co/600x600/15121b/ff24e4?text=Trabajo+3" },
        ],
      },
    },
    {
      type: "Precios",
      props: {
        id: "seed-precios",
        titulo: "Planes de contenido",
        items: [
          { nombre: "Starter Pack", precio: "$299" },
          { nombre: "Pro Growth", precio: "$749" },
          { nombre: "Elite Scale", precio: "$1499" },
        ],
      },
    },
    {
      type: "Testimonio",
      props: {
        id: "seed-testimonio",
        cita: "Trabajar con Mateo cambió nuestra forma de ver los Ads. Los resultados fueron inmediatos.",
        autor: "Carlos Ruiz",
        cargo: "CEO, TechStore",
      },
    },
    {
      type: "CTA",
      props: {
        id: "seed-cta",
        titulo: "¿Listo para crear contenido que convierte?",
        texto: "Transformemos tu marca hoy. Te respondo en menos de 24 horas.",
        botonTexto: "Contratar ahora",
        botonHref: "#contacto",
      },
    },
  ],
};

const SEEDS: Record<string, Data> = {
  "cyber-neon": cyberNeon,
};

/** Devuelve el diseño inicial (en bloques de Puck) para una plantilla. */
export function getTemplateSeed(templateId: string): Data | null {
  const seed = SEEDS[templateId];
  return seed ? (JSON.parse(JSON.stringify(seed)) as Data) : null;
}
