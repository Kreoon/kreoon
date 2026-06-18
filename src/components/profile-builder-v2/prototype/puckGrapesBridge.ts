// Bridge Puck <-> GrapesJS. Convierte un bloque de Puck a HTML/CSS editable en
// GrapesJS y la salida de GrapesJS de vuelta a props de Puck.
//
// Soporta primero los bloques más comunes: Texto, Imagen, Hero, CTA. Para el
// resto, isAdvancedSupported devuelve false y la UI muestra "Próximamente".

const accent = "var(--c-primary, #8b5cf6)";

export const ADVANCED_SUPPORTED = ["Texto", "Imagen", "Hero", "CTA"] as const;

export function isAdvancedSupported(type: string): boolean {
  return (ADVANCED_SUPPORTED as readonly string[]).includes(type);
}

type Props = Record<string, unknown>;
const s = (v: unknown, fallback = "") => (v == null ? fallback : String(v));
const esc = (v: unknown) =>
  s(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Bloque Puck -> HTML que GrapesJS puede editar. */
export function puckBlockToGrapesHTML(
  type: string,
  props: Props,
): string | null {
  switch (type) {
    case "Texto":
      return `<p style="font-size:18px;line-height:1.6;color:#cbc3d7;margin:12px 24px">${esc(props.text)}</p>`;
    case "Imagen":
      return `<img src="${esc(props.src)}" alt="${esc(props.alt)}" style="display:block;width:100%;height:auto"/>`;
    case "Hero":
      return `<section style="padding:96px 24px;text-align:center">
  <div style="max-width:760px;margin:0 auto">
    <h1 style="font-size:56px;font-weight:800;color:#fff;margin-bottom:24px;line-height:1.1">${esc(props.titulo)}</h1>
    <p style="font-size:20px;color:#cbc3d7;margin-bottom:32px">${esc(props.subtitulo)}</p>
    <a href="${esc(props.botonHref)}" style="display:inline-block;background:${accent};color:#0f0d15;padding:16px 36px;border-radius:999px;font-weight:700;text-decoration:none">${esc(props.botonTexto)}</a>
  </div>
</section>`;
    case "CTA":
      return `<section style="padding:80px 24px">
  <div style="max-width:760px;margin:0 auto;background:${accent};border-radius:28px;padding:48px;text-align:center">
    <h2 style="font-size:30px;font-weight:800;color:#0f0d15;margin-bottom:16px">${esc(props.titulo)}</h2>
    <p style="color:rgba(15,13,21,.8);font-size:18px;margin-bottom:32px">${esc(props.texto)}</p>
    <a href="${esc(props.botonHref)}" style="display:inline-block;background:rgba(0,0,0,.85);color:#fff;padding:16px 36px;border-radius:999px;font-weight:700;text-decoration:none">${esc(props.botonTexto)}</a>
  </div>
</section>`;
    default:
      return null;
  }
}

/** Salida HTML de GrapesJS -> props del bloque Puck correspondiente. */
export function grapesHTMLToPuckBlock(
  type: string,
  html: string,
): Props | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = (sel: string) =>
    doc.querySelector(sel)?.textContent?.trim() ?? undefined;
  const attr = (sel: string, a: string) =>
    doc.querySelector(sel)?.getAttribute(a) ?? undefined;

  switch (type) {
    case "Texto":
      return { text: doc.body.textContent?.trim() ?? "" };
    case "Imagen":
      return { src: attr("img", "src") ?? "", alt: attr("img", "alt") ?? "" };
    case "Hero":
      return {
        titulo: text("h1"),
        subtitulo: text("p"),
        botonTexto: text("a"),
        botonHref: attr("a", "href"),
      };
    case "CTA":
      return {
        titulo: text("h2"),
        texto: text("p"),
        botonTexto: text("a"),
        botonHref: attr("a", "href"),
      };
    default:
      return null;
  }
}
