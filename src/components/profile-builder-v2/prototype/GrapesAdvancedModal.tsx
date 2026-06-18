import { useEffect, useRef } from "react";
import grapesjs, { type Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import esLocale from "grapesjs/locale/es";
import { Check, TriangleAlert, X } from "lucide-react";
import { STYLE_SECTORS } from "./grapesSetup";
import {
  installGjsThemeStyles,
  setGjsTheme,
  type EditorTheme,
} from "./editorTheme";

interface Props {
  blockLabel: string;
  html: string;
  css: string;
  theme: EditorTheme;
  onApply: (html: string, css: string) => void;
  onClose: () => void;
}

// GrapesJS en modo reducido: SOLO panel de estilos + canvas (sin agregar
// bloques). Se monta lazy (solo cuando el usuario abre la edición avanzada).
export function GrapesAdvancedModal({
  blockLabel,
  html,
  css,
  theme,
  onApply,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    installGjsThemeStyles();
    setGjsTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!canvasRef.current || !stylesRef.current) return;
    const hidden = () => document.createElement("div");

    const editor = grapesjs.init({
      container: canvasRef.current,
      height: "100%",
      width: "100%",
      fromElement: false,
      storageManager: false,
      // Conserva estilos inline -> el HTML de salida es autosuficiente y se
      // puede renderizar tal cual en Puck sin CSS aparte.
      avoidInlineStyle: false,
      // Sin paneles superiores ni gestor de bloques/capas/selectores.
      panels: { defaults: [] },
      blockManager: { appendTo: hidden() },
      layerManager: { appendTo: hidden() },
      selectorManager: { appendTo: hidden(), componentFirst: true },
      traitManager: { appendTo: hidden() },
      styleManager: { sectors: STYLE_SECTORS, appendTo: stylesRef.current },
      i18n: {
        locale: "es",
        localeFallback: "es",
        messages: { es: esLocale as Record<string, unknown> },
      },
    });
    editorRef.current = editor;

    editor.on("load", () => {
      if (css) editor.setStyle(css);
      editor.setComponents(html);
      const first = editor.getComponents().at(0);
      if (first) editor.select(first);
    });

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onApply(editor.getHtml(), editor.getCss());
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#161a22]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-[#1f2430] px-4 py-3">
        <span className="text-sm font-semibold text-white">
          Edición avanzada · {blockLabel}
        </span>
        <span className="flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
          <TriangleAlert className="h-3.5 w-3.5" />
          Los cambios avanzados pueden afectar la apariencia en móvil
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            <Check className="h-4 w-4" /> Aplicar cambios
          </button>
        </div>
      </div>

      {/* Cuerpo: canvas + panel de estilos */}
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 bg-black">
          <div ref={canvasRef} className="h-full" />
        </div>
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-[#1f2430]">
          <p className="border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Estilos
          </p>
          <div ref={stylesRef} />
        </aside>
      </div>
    </div>
  );
}
