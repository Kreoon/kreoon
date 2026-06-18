export type EditorTheme = "dark" | "light";

const STORAGE_KEY = "kreoon-builder-theme";
const STYLE_ID = "kre-gjs-theme";

// Redefine las variables de GrapesJS en :root[data-kre-theme]. La especificidad
// de :root[attr] gana sobre el :root del paquete y cubre TODO (incluidos los
// modales/paneles que GrapesJS monta en document.body, fuera del contenedor).
const THEME_CSS = `
:root[data-kre-theme="dark"]{
  --gjs-primary-color:#262b34;
  --gjs-secondary-color:#c7ccd6;
  --gjs-tertiary-color:#0ea5e9;
  --gjs-quaternary-color:#8b5cf6;
  --gjs-font-color:#c7ccd6;
  --gjs-font-color-active:#ffffff;
  --gjs-color-highlight:#8b5cf6;
  --gjs-main-dark-color:rgba(0,0,0,.25);
  --gjs-secondary-dark-color:rgba(0,0,0,.15);
  --gjs-main-light-color:rgba(255,255,255,.08);
  --gjs-secondary-light-color:rgba(255,255,255,.7);
}
:root[data-kre-theme="light"]{
  --gjs-primary-color:#f1f3f6;
  --gjs-secondary-color:#475569;
  --gjs-tertiary-color:#0ea5e9;
  --gjs-quaternary-color:#8b5cf6;
  --gjs-font-color:#334155;
  --gjs-font-color-active:#0f172a;
  --gjs-color-highlight:#8b5cf6;
  --gjs-main-dark-color:rgba(0,0,0,.08);
  --gjs-secondary-dark-color:rgba(0,0,0,.06);
  --gjs-main-light-color:rgba(0,0,0,.03);
  --gjs-secondary-light-color:rgba(0,0,0,.6);
}`;

/** Inyecta (una vez) la hoja de estilos de temas de GrapesJS. */
export function installGjsThemeStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = THEME_CSS;
  document.head.appendChild(style);
}

/** Activa el tema poniendo el atributo en <html>. */
export function setGjsTheme(theme: EditorTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-kre-theme", theme);
}

/** Quita el atributo al salir del builder (no afecta al resto de la app). */
export function clearGjsTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute("data-kre-theme");
}

export function loadEditorTheme(): EditorTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light"
    ? "light"
    : "dark";
}

export function saveEditorTheme(theme: EditorTheme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
