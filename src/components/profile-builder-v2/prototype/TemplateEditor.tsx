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
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  SquarePlus,
  Trash2,
  Type,
} from "lucide-react";
import { MediaLibraryPicker } from "@/components/profile-builder/media/MediaLibraryPicker";
import type { MediaItem } from "@/components/profile-builder/media/types";
import { isBunnyUrl } from "@/components/profile-builder/blocks/BunnyStreamPlayer";
import { prepareTemplate } from "./prepareTemplate";
import type { PortfolioTemplate } from "./registry";
import type { TemplateToken } from "./sampleTemplate";

interface SectionItem {
  id: string;
  label: string;
  hidden: boolean;
}

// ─── Helpers de media adaptativa ──────────────────────────────────────────
// El endpoint de Storage de Bunny (*.storage.bunnycdn.com) no sirve GET público;
// hay que usar el pull zone CDN ({zona}.b-cdn.net). Normaliza por si la URL
// guardada/devuelta apunta al Storage.
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
  const m = url.match(
    /(?:iframe\.mediadelivery\.net\/(?:embed|play)|(\d+)\.mediadelivery\.net|vz-[a-f0-9-]+\.b-cdn\.net|cdn\.kreoon\.com)\/?(\d+)?\/?([a-f0-9-]{8,})/i,
  );
  // Reconstrucción simple: extrae library/video cuando es URL embed estándar.
  const embed = url.match(
    /iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-f0-9-]+)/i,
  );
  if (embed) {
    return `https://iframe.mediadelivery.net/embed/${embed[1]}/${embed[2]}?responsive=true`;
  }
  const cdn = url.match(/vz-[a-f0-9-]+\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdn) {
    return `https://iframe.mediadelivery.net/embed/568434/${cdn[1]}?responsive=true`;
  }
  void m;
  return url;
}

/** Construye el HTML de un medio que se adapta a su aspecto (vertical/horizontal). */
function mediaHtml(item: MediaItem): string {
  const ratio = ratioFromAspect(item.aspectRatio);
  const url = normalizeBunnyUrl(item.url);
  if (item.type === "video") {
    if (isBunnyUrl(url)) {
      const src = bunnyEmbedSrc(url);
      return `<div data-ke-media class="rounded-2xl overflow-hidden my-2" style="position:relative;width:100%;aspect-ratio:${ratio ?? "16 / 9"};background:#000"><iframe src="${src}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowfullscreen></iframe></div>`;
    }
    return `<video data-ke-media src="${url}" controls playsinline class="rounded-2xl my-2" style="display:block;width:100%;height:auto;${ratio ? `aspect-ratio:${ratio};` : ""}background:#000"></video>`;
  }
  // Imagen: width 100% + height auto => conserva su proporción real (adaptativo).
  return `<img data-ke-media src="${url}" class="rounded-2xl my-2" style="display:block;width:100%;height:auto;max-width:100%"/>`;
}

type SelectionKind = "image" | "text" | "other";
interface Selection {
  kind: SelectionKind;
  tag: string;
}

// Elementos nuevos: usan utilidades estándar de Tailwind + tokens via var()
// para que funcionen en cualquier plantilla.
const NEW_ELEMENTS: { key: string; label: string; html: string }[] = [
  {
    key: "heading",
    label: "Título",
    html: `<h2 class="text-white text-3xl font-bold my-4">Nuevo título</h2>`,
  },
  {
    key: "text",
    label: "Texto",
    html: `<p class="text-white/70 text-lg my-3 max-w-2xl">Texto editable. Haz clic para cambiarlo.</p>`,
  },
  {
    key: "image",
    label: "Imagen",
    html: `<img class="rounded-2xl my-4 w-full max-w-md" src="https://placehold.co/600x400/15121b/d0bcff?text=Imagen"/>`,
  },
  {
    key: "button",
    label: "Botón",
    html: `<button style="background:var(--c-primary);color:#0f0d15" class="px-6 py-3 rounded-full font-bold my-3">Botón</button>`,
  },
  {
    key: "divider",
    label: "Separador",
    html: `<hr class="border-white/10 my-8"/>`,
  },
];

function newSectionHtml(id: string): string {
  return `<section data-ke-section="${id}" class="py-24 px-8 max-w-6xl mx-auto"><h2 class="text-white text-3xl font-bold mb-4">Nueva sección</h2><p class="text-white/70 text-lg">Edita este texto o agrega elementos desde el panel.</p></section>`;
}

function deriveLabel(section: Element, index: number): string {
  if (section.querySelector("h1")) return "Portada";
  if (section.querySelector(".marquee-container")) return "Marcas";
  const heading = section.querySelector("h2, h3");
  if (heading?.textContent) {
    const text = heading.textContent.trim();
    return text.length > 26 ? `${text.slice(0, 26)}…` : text;
  }
  if (section.querySelector(".font-stats-lg")) return "Estadísticas";
  return `Sección ${index + 1}`;
}

function SortableSectionRow({
  section,
  onToggle,
  onFocus,
  onDelete,
}: {
  section: SectionItem;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
  onDelete: (id: string) => void;
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
        "flex items-center gap-1.5 rounded-lg border px-2 py-2 text-sm",
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
      <button
        type="button"
        onClick={() => onDelete(section.id)}
        className="text-rose-400 hover:text-rose-600"
        aria-label="Eliminar sección"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TemplateEditor({
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const selectedNodeRef = useRef<HTMLElement | null>(null);
  const sectionSeq = useRef(0);

  const [tokens, setTokens] = useState<TemplateToken[]>(() =>
    template.tokens.map((token) => ({ ...token })),
  );
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // 'replace' = cambia el medio seleccionado; 'insert' = inserta uno nuevo.
  const [pickerMode, setPickerMode] = useState<"replace" | "insert">("replace");
  const hasMediaLibrary = !!userId;

  const srcDoc = useMemo(
    () => prepareTemplate(template, template.tokens),
    [template],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getDoc = () => iframeRef.current?.contentDocument ?? null;

  const refreshSections = useCallback((doc: Document) => {
    const els = Array.from(doc.body.querySelectorAll(":scope > section"));
    const list: SectionItem[] = els.map((el, index) => {
      let id = el.getAttribute("data-ke-section");
      if (!id) {
        id = `ke-s${sectionSeq.current++}`;
        el.setAttribute("data-ke-section", id);
      }
      return {
        id,
        label: deriveLabel(el, index),
        hidden: el.classList.contains("ke-hidden"),
      };
    });
    setSections(list);
  }, []);

  const clearSelection = useCallback(() => {
    const prev = selectedNodeRef.current;
    if (prev) prev.removeAttribute("data-ke-selected");
    selectedNodeRef.current = null;
    setSelection(null);
    setShowImageInput(false);
  }, []);

  const selectElement = useCallback((el: HTMLElement) => {
    const prev = selectedNodeRef.current;
    if (prev) prev.removeAttribute("data-ke-selected");
    el.setAttribute("data-ke-selected", "");
    selectedNodeRef.current = el;

    const tag = el.tagName.toLowerCase();
    const kind: SelectionKind =
      tag === "img"
        ? "image"
        : el.children.length === 0 && !!el.textContent?.trim()
          ? "text"
          : "other";
    setSelection({ kind, tag });
    setShowImageInput(false);
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

    refreshSections(doc);
    applyTokensToDoc(doc, tokens);

    // Selección universal: clic en cualquier elemento.
    doc.addEventListener(
      "click",
      (event) => {
        const el = event.target as HTMLElement | null;
        if (!el || el === doc.body || el === doc.documentElement) {
          clearSelection();
          return;
        }
        if (el.getAttribute("contenteditable") === "true") return;
        event.preventDefault();
        event.stopPropagation();
        selectElement(el);
      },
      true,
    );

    // Doble clic en texto -> edición inline directa.
    doc.addEventListener("dblclick", (event) => {
      const el = event.target as HTMLElement | null;
      if (!el || el.children.length > 0) return;
      event.preventDefault();
      el.setAttribute("contenteditable", "true");
      el.setAttribute("data-ke-editing", "");
      el.focus();
      el.addEventListener(
        "blur",
        () => {
          el.removeAttribute("contenteditable");
          el.removeAttribute("data-ke-editing");
        },
        { once: true },
      );
    });
  }, [
    applyTokensToDoc,
    clearSelection,
    refreshSections,
    selectElement,
    tokens,
  ]);

  // ─── Acciones sobre el elemento seleccionado ──────────────────────────────
  const editText = useCallback(() => {
    const el = selectedNodeRef.current;
    if (!el) return;
    el.setAttribute("contenteditable", "true");
    el.setAttribute("data-ke-editing", "");
    el.focus();
    el.addEventListener(
      "blur",
      () => {
        el.removeAttribute("contenteditable");
        el.removeAttribute("data-ke-editing");
      },
      { once: true },
    );
  }, []);

  const applyImage = useCallback(() => {
    const el = selectedNodeRef.current;
    if (el && el.tagName === "IMG" && imageUrl.trim()) {
      (el as HTMLImageElement).src = imageUrl.trim();
    }
    setShowImageInput(false);
    setImageUrl("");
  }, [imageUrl]);

  // Abrir la biblioteca de medios (Bunny + portafolio).
  const openMediaPicker = useCallback((mode: "replace" | "insert") => {
    setPickerMode(mode);
    setPickerOpen(true);
  }, []);

  // Coloca un medio (imagen o video) de forma adaptativa al aspecto real.
  const handleMediaSelect = useCallback(
    (item: MediaItem) => {
      setPickerOpen(false);
      const doc = getDoc();
      if (!doc) return;
      const html = mediaHtml(item);
      const target = selectedNodeRef.current;

      if (pickerMode === "replace" && target) {
        // Si es imagen y el destino ya es <img>, basta cambiar el src (adaptativo).
        if (item.type === "image" && target.tagName === "IMG") {
          (target as HTMLImageElement).src = normalizeBunnyUrl(item.url);
          (target as HTMLImageElement).removeAttribute("srcset");
          target.style.height = "auto";
          return;
        }
        // Si no, reemplazar el nodo por el medio adaptativo.
        target.insertAdjacentHTML("afterend", html);
        const added = target.nextElementSibling as HTMLElement | null;
        target.remove();
        if (added) selectElement(added);
        return;
      }

      // Insertar nuevo medio debajo de la selección o al final.
      if (target) {
        target.insertAdjacentHTML("afterend", html);
        const added = target.nextElementSibling as HTMLElement | null;
        if (added) selectElement(added);
      } else {
        const last = doc.body.querySelector(":scope > section:last-of-type");
        (last ?? doc.body).insertAdjacentHTML("beforeend", html);
      }
    },
    [pickerMode, selectElement],
  );

  const duplicateSelected = useCallback(() => {
    const el = selectedNodeRef.current;
    if (!el) return;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-ke-selected");
    el.after(clone);
    const doc = getDoc();
    if (doc && el.tagName === "SECTION") refreshSections(doc);
  }, [refreshSections]);

  const deleteSelected = useCallback(() => {
    const el = selectedNodeRef.current;
    if (!el) return;
    const wasSection = el.tagName === "SECTION";
    el.remove();
    clearSelection();
    const doc = getDoc();
    if (doc && wasSection) refreshSections(doc);
  }, [clearSelection, refreshSections]);

  const moveSelected = useCallback(
    (direction: -1 | 1) => {
      const el = selectedNodeRef.current;
      if (!el) return;
      if (direction === -1 && el.previousElementSibling) {
        el.previousElementSibling.before(el);
      } else if (direction === 1 && el.nextElementSibling) {
        el.nextElementSibling.after(el);
      }
      const doc = getDoc();
      if (doc && el.tagName === "SECTION") refreshSections(doc);
    },
    [refreshSections],
  );

  const addElement = useCallback(
    (html: string) => {
      const doc = getDoc();
      if (!doc) return;
      const target = selectedNodeRef.current;
      if (target) {
        target.insertAdjacentHTML("afterend", html);
        const added = target.nextElementSibling as HTMLElement | null;
        if (added) selectElement(added);
      } else {
        const lastSection = doc.body.querySelector(
          ":scope > section:last-of-type",
        );
        (lastSection ?? doc.body).insertAdjacentHTML("beforeend", html);
      }
    },
    [selectElement],
  );

  const addSection = useCallback(() => {
    const doc = getDoc();
    if (!doc) return;
    const id = `ke-s${sectionSeq.current++}`;
    const lastSection = doc.body.querySelector(":scope > section:last-of-type");
    const html = newSectionHtml(id);
    if (lastSection) lastSection.insertAdjacentHTML("afterend", html);
    else doc.body.insertAdjacentHTML("beforeend", html);
    refreshSections(doc);
    const el = doc.querySelector<HTMLElement>(`[data-ke-section="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [refreshSections]);

  // ─── Tokens ───────────────────────────────────────────────────────────────
  const handleTokenChange = useCallback(
    (key: string, value: string) => {
      setTokens((current) =>
        current.map((token) =>
          token.key === key ? { ...token, value } : token,
        ),
      );
      const doc = getDoc();
      if (doc) {
        const token = tokens.find((item) => item.key === key);
        const cssValue = token?.type === "font" ? `'${value}'` : value;
        doc.documentElement.style.setProperty(key, cssValue);
      }
    },
    [tokens],
  );

  // ─── Secciones (lista lateral) ────────────────────────────────────────────
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

  const handleDeleteSection = useCallback(
    (id: string) => {
      const doc = getDoc();
      const el = doc?.querySelector(`[data-ke-section="${id}"]`);
      el?.remove();
      if (selectedNodeRef.current === el) clearSelection();
      setSections((current) => current.filter((section) => section.id !== id));
    },
    [clearSelection],
  );

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
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        let prev = doc.querySelector(`[data-ke-section="${next[0].id}"]`);
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
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Volver a plantillas"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-violet-500" />
              {template.name}
            </div>
            <p className="text-xs text-slate-500">Personalízalo a tu gusto</p>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Palette className="h-3.5 w-3.5" /> Colores
            </p>
            <div className="space-y-2">
              {tokens
                .filter((t) => t.type === "color")
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
                      onChange={(e) =>
                        handleTokenChange(token.key, e.target.value)
                      }
                      className="h-7 w-10 cursor-pointer rounded border border-slate-200 bg-white"
                    />
                  </label>
                ))}
            </div>
          </section>

          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Type className="h-3.5 w-3.5" /> Tipografía
            </p>
            <div className="space-y-2">
              {tokens
                .filter((t) => t.type === "font")
                .map((token) => (
                  <label key={token.key} className="block">
                    <span className="mb-1 block text-xs text-slate-500">
                      {token.label}
                    </span>
                    <select
                      value={token.value}
                      onChange={(e) =>
                        handleTokenChange(token.key, e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    >
                      {template.fonts.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
            </div>
          </section>

          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Plus className="h-3.5 w-3.5" /> Agregar elemento
            </p>
            <div className="grid grid-cols-2 gap-2">
              {NEW_ELEMENTS.map((el) => (
                <button
                  key={el.key}
                  type="button"
                  onClick={() => addElement(el.html)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                >
                  {el.label}
                </button>
              ))}
            </div>
            {hasMediaLibrary && (
              <button
                type="button"
                onClick={() => openMediaPicker("insert")}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
              >
                <ImageIcon className="h-4 w-4" /> Imagen / Video (Bunny)
              </button>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Se inserta debajo del elemento seleccionado. El medio se adapta a
              su tamaño (vertical u horizontal).
            </p>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Layers className="h-3.5 w-3.5" /> Secciones
              </p>
              <button
                type="button"
                onClick={addSection}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50"
              >
                <SquarePlus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
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
                      onDelete={handleDeleteSection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Barra contextual del elemento seleccionado */}
        <div className="flex min-h-[52px] items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
          {selection ? (
            <>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium uppercase text-slate-500">
                {selection.tag}
              </span>
              {selection.kind === "text" && (
                <button type="button" onClick={editText} className="ke-action">
                  <Pencil className="h-4 w-4" /> Editar
                </button>
              )}
              {selection.kind === "image" &&
                (hasMediaLibrary ? (
                  <button
                    type="button"
                    onClick={() => openMediaPicker("replace")}
                    className="ke-action"
                  >
                    <ImageIcon className="h-4 w-4" /> Cambiar imagen/video
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowImageInput((v) => !v)}
                    className="ke-action"
                  >
                    <ImageIcon className="h-4 w-4" /> Cambiar imagen (URL)
                  </button>
                ))}
              <button
                type="button"
                onClick={duplicateSelected}
                className="ke-action"
              >
                <Copy className="h-4 w-4" /> Duplicar
              </button>
              <button
                type="button"
                onClick={() => moveSelected(-1)}
                className="ke-action"
              >
                <ChevronUp className="h-4 w-4" /> Subir
              </button>
              <button
                type="button"
                onClick={() => moveSelected(1)}
                className="ke-action"
              >
                <ChevronDown className="h-4 w-4" /> Bajar
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                className="ke-action text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
              {showImageInput && (
                <div className="ml-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Pega la URL de la imagen…"
                    className="w-64 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={applyImage}
                    className="rounded-md bg-violet-600 px-3 py-1 text-sm font-medium text-white"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Haz clic en cualquier elemento del lienzo para seleccionarlo y
              editarlo.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-hidden p-4">
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
        </div>
      </main>

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

      <style>{`.ke-action{display:inline-flex;align-items:center;gap:.35rem;border-radius:.375rem;padding:.35rem .6rem;font-size:.8rem;font-weight:500;color:#334155}.ke-action:hover{background:#f1f5f9}`}</style>
    </div>
  );
}
