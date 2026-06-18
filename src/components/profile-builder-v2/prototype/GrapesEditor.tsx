import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Puck, usePuck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import {
  ArrowLeft,
  Eye,
  Moon,
  Redo2,
  Save,
  Settings2,
  Sparkles,
  Sun,
  Undo2,
} from "lucide-react";
import { MediaLibraryPicker } from "@/components/profile-builder/media/MediaLibraryPicker";
import type { MediaItem } from "@/components/profile-builder/media/types";
import { puckConfig, PUCK_STORAGE_PREFIX } from "./puckConfig";
import { EditorMediaContext } from "./editorContext";
import {
  puckBlockToGrapesHTML,
  grapesHTMLToPuckBlock,
  isAdvancedSupported,
} from "./puckGrapesBridge";
import {
  installGjsThemeStyles,
  setGjsTheme,
  clearGjsTheme,
  type EditorTheme,
} from "./editorTheme";
import type { PortfolioTemplate } from "./registry";

const GrapesAdvancedModal = lazy(() =>
  import("./GrapesAdvancedModal").then((m) => ({
    default: m.GrapesAdvancedModal,
  })),
);

const EMPTY_DATA = { content: [], root: {} } as unknown as Data;

function loadData(id: string): Data {
  try {
    const raw = localStorage.getItem(PUCK_STORAGE_PREFIX + id);
    return raw ? (JSON.parse(raw) as Data) : EMPTY_DATA;
  } catch {
    return EMPTY_DATA;
  }
}

interface PuckApi {
  dispatch: (action: Record<string, unknown>) => void;
  appState: {
    data: Data;
    ui: { itemSelector?: { index: number; zone?: string } };
  };
  history?: {
    back: () => void;
    forward: () => void;
    hasPast?: boolean;
    hasFuture?: boolean;
  };
}

interface AdvancedState {
  index: number;
  zone?: string;
  type: string;
  label: string;
  html: string;
}

// ─── Barra superior (override del header de Puck; usePuck disponible aquí) ───
function TopBar({
  isDark,
  template,
  savedAt,
  onBack,
  onSave,
  onToggleTheme,
  onPreview,
  puckApiRef,
}: {
  isDark: boolean;
  template: PortfolioTemplate;
  savedAt: string | null;
  onBack: () => void;
  onSave: () => void;
  onToggleTheme: () => void;
  onPreview: () => void;
  puckApiRef: React.MutableRefObject<PuckApi | null>;
}) {
  const puck = usePuck() as unknown as PuckApi;
  useEffect(() => {
    puckApiRef.current = puck;
  });
  const history = puck.history;

  const btn = isDark
    ? "border-white/10 text-slate-200 hover:bg-white/10"
    : "border-slate-200 text-slate-600 hover:bg-slate-100";

  return (
    <div
      className={`flex items-center gap-3 border-b px-3 py-2 ${
        isDark ? "border-white/10 bg-[#1f2430]" : "border-slate-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onBack}
        className={`rounded-md p-1.5 ${btn} border`}
        aria-label="Volver"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div
        className={`flex items-center gap-1.5 text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}
      >
        <Sparkles className="h-4 w-4 text-violet-500" />
        {template.name}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => history?.back()}
          disabled={!history?.hasPast}
          title="Deshacer"
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium disabled:opacity-40 ${btn}`}
        >
          <Undo2 className="h-4 w-4" />
          <span className="hidden lg:inline">Deshacer</span>
        </button>
        <button
          type="button"
          onClick={() => history?.forward()}
          disabled={!history?.hasFuture}
          title="Rehacer"
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium disabled:opacity-40 ${btn}`}
        >
          <Redo2 className="h-4 w-4" />
          <span className="hidden lg:inline">Rehacer</span>
        </button>
        <button
          type="button"
          onClick={onPreview}
          title="Previsualizar"
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium ${btn}`}
        >
          <Eye className="h-4 w-4" />
          <span className="hidden lg:inline">Previsualizar</span>
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? "Modo claro" : "Modo oscuro"}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium ${btn}`}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? "Claro" : "Oscuro"}
        </button>
        {savedAt && (
          <span
            className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
          >
            Guardado {savedAt}
          </span>
        )}
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Save className="h-4 w-4" /> Guardar
        </button>
      </div>
    </div>
  );
}

// ─── Acción "Avanzado" en la barra del bloque seleccionado ──────────────────
function AdvancedAction({
  children,
  onAdvanced,
}: {
  children?: React.ReactNode;
  onAdvanced: (sel: {
    index: number;
    zone?: string;
    type: string;
    label: string;
    props: Record<string, unknown>;
  }) => void;
}) {
  const puck = usePuck() as unknown as PuckApi;
  const sel = puck.appState.ui.itemSelector;
  let type = "";
  let props: Record<string, unknown> = {};
  if (sel) {
    const zone = sel.zone;
    const dataAny = puck.appState.data as unknown as {
      content: { type: string; props: Record<string, unknown> }[];
      zones?: Record<
        string,
        { type: string; props: Record<string, unknown> }[]
      >;
    };
    const arr =
      zone && dataAny.zones?.[zone] ? dataAny.zones[zone] : dataAny.content;
    const item = arr?.[sel.index];
    type = item?.type ?? "";
    props = item?.props ?? {};
  }
  const supported = !!type && isAdvancedSupported(type);
  const label =
    (puckConfig.components as Record<string, { label?: string }>)[type]
      ?.label ?? type;

  return (
    <>
      {children}
      {sel && (
        <button
          type="button"
          onClick={() =>
            supported &&
            onAdvanced({ index: sel.index, zone: sel.zone, type, label, props })
          }
          disabled={!supported}
          title={
            supported
              ? "Edición avanzada"
              : "Edición avanzada próximamente para este bloque"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            marginLeft: 4,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            background: supported ? "#8b5cf6" : "rgba(255,255,255,.25)",
            cursor: supported ? "pointer" : "not-allowed",
          }}
        >
          ⚙ {supported ? "✦ Avanzado" : "Próximamente"}
        </button>
      )}
    </>
  );
}

export function GrapesEditor({
  template,
  onBack,
  userId,
  creatorProfileId,
  theme,
  onToggleTheme,
}: {
  template: PortfolioTemplate;
  onBack: () => void;
  userId?: string;
  creatorProfileId?: string;
  theme: EditorTheme;
  onToggleTheme: () => void;
}) {
  const isDark = theme === "dark";
  const [data, setData] = useState<Data>(() => loadData(template.id));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedState | null>(null);
  const pickCbRef = useRef<((item: MediaItem) => void) | null>(null);
  const puckApiRef = useRef<PuckApi | null>(null);
  const primary =
    template.tokens.find((t) => t.key === "--c-primary")?.value ?? "#8b5cf6";

  useEffect(() => {
    installGjsThemeStyles();
    setGjsTheme(theme);
    return () => clearGjsTheme();
  }, [theme]);

  const handleSave = useCallback(() => {
    const current = puckApiRef.current?.appState.data ?? data;
    localStorage.setItem(
      PUCK_STORAGE_PREFIX + template.id,
      JSON.stringify(current),
    );
    setSavedAt(new Date().toLocaleTimeString());
  }, [data, template.id]);

  const handlePreview = useCallback(() => {
    handleSave();
    window.open(
      `/plantilla-demo?ver=${template.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [handleSave, template.id]);

  const openPicker = useCallback((cb: (item: MediaItem) => void) => {
    pickCbRef.current = cb;
    setPickerOpen(true);
  }, []);

  const onMediaSelect = useCallback((item: MediaItem) => {
    pickCbRef.current?.(item);
    pickCbRef.current = null;
    setPickerOpen(false);
  }, []);

  const openAdvanced = useCallback(
    (sel: {
      index: number;
      zone?: string;
      type: string;
      label: string;
      props: Record<string, unknown>;
    }) => {
      const html = puckBlockToGrapesHTML(sel.type, sel.props);
      if (!html) return;
      setAdvanced({
        index: sel.index,
        zone: sel.zone,
        type: sel.type,
        label: sel.label,
        html,
      });
    },
    [],
  );

  const applyAdvanced = useCallback(
    (html: string) => {
      const api = puckApiRef.current;
      if (!api || !advanced) {
        setAdvanced(null);
        return;
      }
      const { index, zone, type } = advanced;
      const dataAny = api.appState.data as unknown as {
        content: { type: string; props: Record<string, unknown> }[];
        zones?: Record<
          string,
          { type: string; props: Record<string, unknown> }[]
        >;
      };
      const arr =
        zone && dataAny.zones?.[zone] ? dataAny.zones[zone] : dataAny.content;
      const item = arr?.[index];
      if (!item) {
        setAdvanced(null);
        return;
      }
      const parsed = grapesHTMLToPuckBlock(type, html) ?? {};
      const newItem = {
        ...item,
        props: { ...item.props, ...parsed, _html: html },
      };
      api.dispatch({
        type: "replace",
        destinationIndex: index,
        destinationZone: zone,
        data: newItem,
      });
      setAdvanced(null);
    },
    [advanced],
  );

  const mediaCtx = useMemo(
    () => ({ userId, creatorProfileId, openPicker, theme }),
    [userId, creatorProfileId, openPicker, theme],
  );

  const overrides = useMemo(
    () => ({
      header: () => (
        <TopBar
          isDark={isDark}
          template={template}
          savedAt={savedAt}
          onBack={onBack}
          onSave={handleSave}
          onToggleTheme={onToggleTheme}
          onPreview={handlePreview}
          puckApiRef={puckApiRef}
        />
      ),
      actionBar: ({ children }: { children?: React.ReactNode }) => (
        <AdvancedAction onAdvanced={openAdvanced}>{children}</AdvancedAction>
      ),
    }),
    [
      isDark,
      template,
      savedAt,
      onBack,
      handleSave,
      onToggleTheme,
      handlePreview,
      openAdvanced,
    ],
  );

  return (
    <EditorMediaContext.Provider value={mediaCtx}>
      <div
        className="h-screen w-full"
        style={{ ["--c-primary" as string]: primary }}
      >
        <Puck
          config={puckConfig}
          data={data}
          onChange={setData}
          overrides={overrides}
          iframe={{ enabled: false }}
        />
      </div>

      {pickerOpen && userId && (
        <MediaLibraryPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={onMediaSelect}
          allowedTypes={["image", "video"]}
          userId={userId}
          creatorProfileId={creatorProfileId}
        />
      )}

      {advanced && (
        <Suspense fallback={null}>
          <GrapesAdvancedModal
            blockLabel={advanced.label}
            html={advanced.html}
            css=""
            theme={theme}
            onApply={applyAdvanced}
            onClose={() => setAdvanced(null)}
          />
        </Suspense>
      )}
    </EditorMediaContext.Provider>
  );
}
