import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  EyeOff,
  GripVertical,
  Palette,
  Layers,
  Sparkles,
  Type,
} from "lucide-react";
import { prepareTemplate } from "./prepareTemplate";
import {
  TEMPLATE_TOKENS,
  FONT_OPTIONS,
  type TemplateToken,
} from "./sampleTemplate";

interface SectionItem {
  id: string;
  label: string;
  hidden: boolean;
}

function deriveLabel(section: Element, index: number): string {
  if (section.querySelector("h1")) return "Portada";
  if (section.querySelector(".marquee-container")) return "Marcas";
  const heading = section.querySelector("h2, h3");
  if (heading?.textContent) {
    const text = heading.textContent.trim();
    return text.length > 28 ? `${text.slice(0, 28)}…` : text;
  }
  if (section.querySelector(".font-stats-lg")) return "Estadísticas";
  return `Sección ${index + 1}`;
}

function SortableSectionRow({
  section,
  onToggle,
  onFocus,
}: {
  section: SectionItem;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "flex items-center gap-2 rounded-lg border px-2 py-2 text-sm",
        isDragging
          ? "border-violet-400 bg-violet-50 shadow-lg"
          : "border-slate-200 bg-white hover:border-slate-300",
      ].join(" ")}
    >
      <button
        type="button"
        className="cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFocus(section.id)}
        className={[
          "min-w-0 flex-1 truncate text-left",
          section.hidden ? "text-slate-400 line-through" : "text-slate-800",
        ].join(" ")}
      >
        {section.label}
      </button>
      <button
        type="button"
        onClick={() => onToggle(section.id)}
        className="text-slate-400 hover:text-slate-700"
        aria-label={section.hidden ? "Mostrar" : "Ocultar"}
      >
        {section.hidden ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export function TemplateEditorPrototype() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [tokens, setTokens] = useState<TemplateToken[]>(() =>
    TEMPLATE_TOKENS.map((token) => ({ ...token })),
  );
  const [sections, setSections] = useState<SectionItem[]>([]);

  // El srcDoc se genera UNA vez con los defaults; los cambios de token se
  // aplican en vivo por setProperty (sin recargar el iframe).
  const srcDoc = useMemo(() => prepareTemplate(TEMPLATE_TOKENS), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getDoc = () => iframeRef.current?.contentDocument ?? null;

  const enableInlineEditing = useCallback((doc: Document) => {
    const candidates = doc.querySelectorAll<HTMLElement>(
      "h1, h2, h3, h4, p, span, a, button, label, li",
    );
    candidates.forEach((el) => {
      if (el.children.length > 0) return; // solo hojas de texto
      if (!el.textContent || !el.textContent.trim()) return;
      if (el.classList.contains("material-symbols-outlined")) return;
      el.setAttribute("data-ke-edit", "");
      el.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        el.setAttribute("contenteditable", "true");
        el.setAttribute("data-ke-editing", "");
        el.focus();
      });
      el.addEventListener("blur", () => {
        el.removeAttribute("contenteditable");
        el.removeAttribute("data-ke-editing");
      });
    });
  }, []);

  const applyTokensToDoc = useCallback(
    (doc: Document, list: TemplateToken[]) => {
      list.forEach((token) => {
        const value = token.type === "font" ? `'${token.value}'` : token.value;
        doc.documentElement.style.setProperty(token.key, value);
      });
    },
    [],
  );

  const handleIframeLoad = useCallback(() => {
    const doc = getDoc();
    if (!doc) return;

    // Detectar secciones reordenables (solo <section>).
    const sectionEls = Array.from(
      doc.body.querySelectorAll(":scope > section"),
    );
    const detected: SectionItem[] = sectionEls.map((el, index) => {
      const id = `ke-s${index}`;
      el.setAttribute("data-ke-section", id);
      return { id, label: deriveLabel(el, index), hidden: false };
    });
    setSections(detected);

    enableInlineEditing(doc);
    applyTokensToDoc(doc, tokens);
  }, [applyTokensToDoc, enableInlineEditing, tokens]);

  const handleTokenChange = useCallback(
    (key: string, value: string) => {
      setTokens((current) => {
        const next = current.map((token) =>
          token.key === key ? { ...token, value } : token,
        );
        return next;
      });
      const doc = getDoc();
      if (doc) {
        const token = tokens.find((item) => item.key === key);
        const cssValue = token?.type === "font" ? `'${value}'` : value;
        doc.documentElement.style.setProperty(key, cssValue);
      }
    },
    [tokens],
  );

  const handleToggleSection = useCallback((id: string) => {
    const doc = getDoc();
    const el = doc?.querySelector(`[data-ke-section="${id}"]`);
    setSections((current) =>
      current.map((section) => {
        if (section.id !== id) return section;
        const hidden = !section.hidden;
        el?.classList.toggle("ke-hidden", hidden);
        return { ...section, hidden };
      }),
    );
  }, []);

  const handleFocusSection = useCallback((id: string) => {
    const doc = getDoc();
    const el = doc?.querySelector(`[data-ke-section="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ke-highlight");
    window.setTimeout(() => el.classList.remove("ke-highlight"), 1200);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSections((current) => {
      const oldIndex = current.findIndex((s) => s.id === active.id);
      const newIndex = current.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      const next = arrayMove(current, oldIndex, newIndex);

      // Reordenar los nodos reales dentro del iframe.
      const doc = getDoc();
      if (doc) {
        const anchor = doc.querySelector(`[data-ke-section="${next[0].id}"]`);
        let prev = anchor;
        for (let i = 1; i < next.length; i += 1) {
          const node = doc.querySelector(`[data-ke-section="${next[i].id}"]`);
          if (node && prev) {
            prev.after(node);
            prev = node;
          }
        }
      }
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      {/* Panel de edición */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Editor de plantilla
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Prototipo · diseño fiel + edición tipo Canva
          </p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {/* Tokens de color */}
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Palette className="h-3.5 w-3.5" />
              Colores
            </p>
            <div className="space-y-2">
              {tokens
                .filter((token) => token.type === "color")
                .map((token) => (
                  <label
                    key={token.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">
                      {token.label}
                    </span>
                    <input
                      type="color"
                      value={token.value}
                      onChange={(event) =>
                        handleTokenChange(token.key, event.target.value)
                      }
                      className="h-7 w-10 cursor-pointer rounded border border-slate-200 bg-white"
                    />
                  </label>
                ))}
            </div>
          </section>

          {/* Tokens de fuente */}
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Type className="h-3.5 w-3.5" />
              Tipografía
            </p>
            <div className="space-y-2">
              {tokens
                .filter((token) => token.type === "font")
                .map((token) => (
                  <label key={token.key} className="block">
                    <span className="mb-1 block text-xs text-slate-500">
                      {token.label}
                    </span>
                    <select
                      value={token.value}
                      onChange={(event) =>
                        handleTokenChange(token.key, event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
            </div>
          </section>

          {/* Secciones */}
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Layers className="h-3.5 w-3.5" />
              Secciones (arrastra para reordenar)
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {sections.map((section) => (
                    <SortableSectionRow
                      key={section.id}
                      section={section}
                      onToggle={handleToggleSection}
                      onFocus={handleFocusSection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        </div>

        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          Haz clic en cualquier texto del lienzo para editarlo.
        </div>
      </aside>

      {/* Lienzo (iframe con la plantilla real) */}
      <main className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-hidden rounded-xl border border-slate-300 bg-black shadow-xl">
          <iframe
            ref={iframeRef}
            title="Vista de plantilla"
            className="h-full w-full"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin"
            onLoad={handleIframeLoad}
          />
        </div>
      </main>
    </div>
  );
}
