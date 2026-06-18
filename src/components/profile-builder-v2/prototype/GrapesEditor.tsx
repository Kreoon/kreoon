import { useCallback, useEffect, useRef, useState } from "react";
import grapesjs, { type Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import presetWebpage from "grapesjs-preset-webpage";
import { ArrowLeft, ImageIcon, Save, Sparkles } from "lucide-react";
import { MediaLibraryPicker } from "@/components/profile-builder/media/MediaLibraryPicker";
import type { MediaItem } from "@/components/profile-builder/media/types";
import { isBunnyUrl } from "@/components/profile-builder/blocks/BunnyStreamPlayer";
import { prepareTemplate } from "./prepareTemplate";
import type { PortfolioTemplate } from "./registry";
import type { TemplateToken } from "./sampleTemplate";

// ─── Helpers de media (idénticos al motor anterior) ───────────────────────
function normalizeBunnyUrl(url: string): string {
  const m = url.match(
    /^https?:\/\/[a-z0-9-]+\.storage\.bunnycdn\.com\/([^/]+)\/(.+)$/i,
  );
  return m ? `https://${m[1]}.b-cdn.net/${m[2]}` : url;
}

function ratioFromAspect(aspect?: string): string | null {
  if (!aspect) return null;
  const m = aspect.match(/(\d+)\s*[:/x]\s*(\d+)/);
  return m ? `${m[1]} / ${m[2]}` : null;
}

function bunnyEmbedSrc(url: string): string {
  const embed = url.match(
    /iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-f0-9-]+)/i,
  );
  if (embed)
    return `https://iframe.mediadelivery.net/embed/${embed[1]}/${embed[2]}?responsive=true`;
  const cdn = url.match(/vz-[a-f0-9-]+\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdn)
    return `https://iframe.mediadelivery.net/embed/568434/${cdn[1]}?responsive=true`;
  return url;
}

function mediaHtml(item: MediaItem): string {
  const ratio = ratioFromAspect(item.aspectRatio);
  const url = normalizeBunnyUrl(item.url);
  if (item.type === "video") {
    if (isBunnyUrl(url)) {
      return `<div class="rounded-2xl overflow-hidden my-2" style="position:relative;width:100%;aspect-ratio:${ratio ?? "16 / 9"};background:#000"><iframe src="${bunnyEmbedSrc(url)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowfullscreen></iframe></div>`;
    }
    return `<video src="${url}" controls playsinline class="rounded-2xl my-2" style="display:block;width:100%;height:auto;${ratio ? `aspect-ratio:${ratio};` : ""}background:#000"></video>`;
  }
  return `<img src="${url}" class="rounded-2xl my-2" style="display:block;width:100%;height:auto;max-width:100%"/>`;
}

/**
 * Inyecta el <head> de la plantilla (Tailwind CDN + config + fuentes + estilos)
 * en el documento del canvas de GrapesJS, respetando el orden de ejecución para
 * que Tailwind aplique correctamente.
 */
function injectTemplateHead(doc: Document, head: HTMLHeadElement) {
  // 1. links / styles / meta inmediatos (fuentes, CSS custom, tokens).
  head.querySelectorAll("link, style, meta").forEach((node) => {
    doc.head.appendChild(node.cloneNode(true));
  });

  const cdn = head.querySelector<HTMLScriptElement>(
    'script[src*="cdn.tailwindcss.com"]',
  );
  const cfg = head.querySelector<HTMLScriptElement>("script#tailwind-config");
  const cfgText = cfg?.textContent ?? "";

  // 2. Un único bootstrap inline que corre en el contexto del canvas: carga el
  //    CDN de Tailwind y, en su onload, aplica el config (patrón oficial del
  //    Play CDN: <script src> y luego tailwind.config = {...}).
  if (cdn) {
    const boot = doc.createElement("script");
    boot.textContent = `(function(){
      var s=document.createElement('script');
      s.src=${JSON.stringify(cdn.getAttribute("src") ?? "")};
      s.onload=function(){ try{ ${cfgText} }catch(e){ console.error('[kreoon] tailwind config', e); } };
      document.head.appendChild(s);
    })();`;
    doc.head.appendChild(boot);
  } else if (cfgText) {
    const c = doc.createElement("script");
    c.textContent = cfgText;
    doc.head.appendChild(c);
  }
}

export function GrapesEditor({
  template,
  onBack,
  userId,
  creatorProfileId,
}: {
  template: PortfolioTemplate;
  onBack: () => void;
  userId?: string;
  creatorProfileId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [tokens, setTokens] = useState<TemplateToken[]>(() =>
    template.tokens.map((t) => ({ ...t })),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const hasMediaLibrary = !!userId;

  const applyTokens = useCallback((doc: Document, list: TemplateToken[]) => {
    list.forEach((t) =>
      doc.documentElement.style.setProperty(
        t.key,
        t.type === "font" ? `'${t.value}'` : t.value,
      ),
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const prepared = prepareTemplate(template, template.tokens);
    const parsed = new DOMParser().parseFromString(prepared, "text/html");
    const bodyHtml = parsed.body.innerHTML;

    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      width: "100%",
      fromElement: false,
      storageManager: false,
      plugins: [presetWebpage],
      pluginsOpts: {
        "grapesjs-preset-webpage": {
          modalImportTitle: "Importar",
          showStylesOnChange: true,
        },
      },
      deviceManager: {
        devices: [
          { name: "Escritorio", width: "" },
          { name: "Tablet", width: "768px", widthMedia: "992px" },
          { name: "Móvil", width: "375px", widthMedia: "575px" },
        ],
      },
      assetManager: { custom: true },
    });

    editorRef.current = editor;

    editor.on("load", () => {
      const doc = editor.Canvas.getDocument();
      if (doc) {
        injectTemplateHead(doc, parsed.head as HTMLHeadElement);
        applyTokens(doc, tokens);
      }
    });

    editor.setComponents(bodyHtml);

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const handleTokenChange = useCallback(
    (key: string, value: string) => {
      setTokens((current) =>
        current.map((t) => (t.key === key ? { ...t, value } : t)),
      );
      const doc = editorRef.current?.Canvas.getDocument();
      const token = tokens.find((t) => t.key === key);
      if (doc) {
        doc.documentElement.style.setProperty(
          key,
          token?.type === "font" ? `'${value}'` : value,
        );
      }
    },
    [tokens],
  );

  const handleMediaSelect = useCallback((item: MediaItem) => {
    setPickerOpen(false);
    const editor = editorRef.current;
    if (!editor) return;
    const selected = editor.getSelected();
    const url = normalizeBunnyUrl(item.url);

    // Si hay una imagen seleccionada y el medio es imagen -> cambiar src.
    if (selected && selected.get("type") === "image" && item.type === "image") {
      selected.addAttributes({ src: url });
      selected.removeAttributes?.(["srcset"]);
      return;
    }
    // Si no, insertar el medio adaptativo después de lo seleccionado (o al final).
    const html = mediaHtml(item);
    if (selected) {
      const parent = selected.parent();
      const at = parent ? parent.components().indexOf(selected) + 1 : undefined;
      (parent ?? editor.getWrapper())?.append(html, { at });
    } else {
      editor.getWrapper()?.append(html);
    }
  }, []);

  const handleSave = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.getHtml();
    const css = editor.getCss();
    // Persistencia real (BD) es la siguiente fase; por ahora guardamos local
    // para validar el round-trip.
    const payload = JSON.stringify({ html, css, tokens });
    window.localStorage.setItem(`kreoon-template-${template.id}`, payload);
    setSaved(new Date().toLocaleTimeString());
  }, [template.id, tokens]);

  return (
    <div className="flex h-screen w-full flex-col bg-slate-100">
      {/* Barra superior propia */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Volver a plantillas"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-violet-500" />
          {template.name}
        </div>

        {/* Tokens de color */}
        <div className="ml-2 flex items-center gap-1.5">
          {tokens
            .filter((t) => t.type === "color")
            .map((t) => (
              <input
                key={t.key}
                type="color"
                value={t.value}
                title={t.label}
                onChange={(e) => handleTokenChange(t.key, e.target.value)}
                className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white"
              />
            ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {hasMediaLibrary && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              <ImageIcon className="h-4 w-4" /> Imagen / Video (Bunny)
            </button>
          )}
          {saved && (
            <span className="text-xs text-slate-400">Guardado {saved}</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Save className="h-4 w-4" /> Guardar
          </button>
        </div>
      </div>

      {/* Editor GrapesJS (su propia UI de paneles, bloques, estilos, capas) */}
      <div className="min-h-0 flex-1">
        <div ref={containerRef} className="h-full" />
      </div>

      {hasMediaLibrary && (
        <MediaLibraryPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={handleMediaSelect}
          allowedTypes={["image", "video"]}
          userId={userId!}
          creatorProfileId={creatorProfileId}
        />
      )}
    </div>
  );
}
