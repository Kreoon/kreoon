import type { Config } from "@measured/puck";
import { useEditorMedia } from "./editorContext";

/**
 * Campo de imagen: URL + botón para elegir de la biblioteca de Kreoon (Bunny),
 * cuando hay sesión disponible vía contexto.
 */
function ImageField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const { openPicker, userId } = useEditorMedia();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        type="text"
        value={value ?? ""}
        placeholder="Pega la URL de la imagen"
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: 6,
          border: "1px solid var(--puck-color-grey-09, #ccc)",
          fontSize: 13,
        }}
      />
      {userId && openPicker && (
        <button
          type="button"
          onClick={() => openPicker((item) => onChange(item.url))}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #8b5cf6",
            color: "#7c3aed",
            background: "#f5f3ff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Elegir de mi biblioteca
        </button>
      )}
    </div>
  );
}

const imageField = {
  type: "custom" as const,
  label: "Imagen",
  render: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange: (v: string) => void;
  }) => <ImageField value={value} onChange={onChange} />,
};

const accent = "var(--c-primary, #8b5cf6)";

// Tipos de props por bloque (laxos; Puck infiere en runtime).
type Props = Record<string, unknown>;

// Si el bloque fue editado en modo avanzado (GrapesJS), se guarda su HTML en
// _html y se renderiza tal cual (autosuficiente con estilos inline).
function advancedHtml(props: Props): React.ReactNode | null {
  return props._html ? (
    <div dangerouslySetInnerHTML={{ __html: String(props._html) }} />
  ) : null;
}

export const puckConfig: Config = {
  root: {
    render: ({ children }: { children: React.ReactNode }) => (
      <div
        style={{ background: "#0f0d15", minHeight: "100%", color: "#e7e0ed" }}
      >
        {children}
      </div>
    ),
  },
  categories: {
    basicos: {
      title: "Básicos",
      components: ["Texto", "Imagen", "Boton", "Separador", "Espaciado"],
    },
    estructura: {
      title: "Estructura",
      components: ["Columnas2", "Columnas3", "Seccion"],
    },
    creadores: {
      title: "Creadores",
      components: [
        "Hero",
        "Servicios",
        "Testimonio",
        "Precios",
        "CTA",
        "Portafolio",
      ],
    },
  },
  components: {
    // ── Básicos ──────────────────────────────────────────────────────────
    Texto: {
      label: "Texto",
      fields: { text: { type: "textarea", label: "Texto" } },
      defaultProps: { text: "Escribe aquí tu texto. Haz clic para editarlo." },
      render: (props: Props) =>
        advancedHtml(props) ?? (
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              margin: "12px 24px",
              color: "#cbc3d7",
            }}
          >
            {String(props.text)}
          </p>
        ),
    },
    Imagen: {
      label: "Imagen",
      fields: { src: imageField, alt: { type: "text", label: "Descripción" } },
      defaultProps: {
        src: "https://placehold.co/800x500/15121b/d0bcff?text=Imagen",
        alt: "",
      },
      render: (props: Props) =>
        advancedHtml(props) ?? (
          <img
            src={String(props.src)}
            alt={String(props.alt ?? "")}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              margin: "12px 0",
            }}
          />
        ),
    },
    Boton: {
      label: "Botón",
      fields: {
        label: { type: "text", label: "Texto del botón" },
        href: { type: "text", label: "Enlace" },
      },
      defaultProps: { label: "Contrátame", href: "#" },
      render: ({ label, href }: Props) => (
        <div style={{ margin: "12px 24px" }}>
          <a
            href={String(href)}
            style={{
              display: "inline-block",
              background: accent,
              color: "#0f0d15",
              padding: "12px 28px",
              borderRadius: 999,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {String(label)}
          </a>
        </div>
      ),
    },
    Separador: {
      label: "Separador",
      fields: {},
      defaultProps: {},
      render: () => (
        <hr
          style={{
            border: "none",
            borderTop: "1px solid rgba(255,255,255,.15)",
            margin: "32px 24px",
          }}
        />
      ),
    },
    Espaciado: {
      label: "Espaciado",
      fields: {
        alto: {
          type: "select",
          label: "Tamaño",
          options: [
            { label: "Pequeño", value: "24px" },
            { label: "Medio", value: "48px" },
            { label: "Grande", value: "96px" },
          ],
        },
      },
      defaultProps: { alto: "48px" },
      render: ({ alto }: Props) => <div style={{ height: String(alto) }} />,
    },

    // ── Estructura ───────────────────────────────────────────────────────
    Columnas2: {
      label: "Columnas 2",
      fields: {
        izquierda: { type: "textarea", label: "Columna 1" },
        derecha: { type: "textarea", label: "Columna 2" },
      },
      defaultProps: {
        izquierda: "Columna izquierda",
        derecha: "Columna derecha",
      },
      render: ({ izquierda, derecha }: Props) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            margin: "16px 24px",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,.05)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            {String(izquierda)}
          </div>
          <div
            style={{
              background: "rgba(255,255,255,.05)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            {String(derecha)}
          </div>
        </div>
      ),
    },
    Columnas3: {
      label: "Columnas 3",
      fields: {
        a: { type: "textarea", label: "Columna 1" },
        b: { type: "textarea", label: "Columna 2" },
        c: { type: "textarea", label: "Columna 3" },
      },
      defaultProps: { a: "Columna 1", b: "Columna 2", c: "Columna 3" },
      render: ({ a, b, c }: Props) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 24,
            margin: "16px 24px",
          }}
        >
          {[a, b, c].map((col, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,.05)",
                borderRadius: 16,
                padding: 24,
              }}
            >
              {String(col)}
            </div>
          ))}
        </div>
      ),
    },
    Seccion: {
      label: "Sección completa",
      fields: {
        titulo: { type: "text", label: "Título" },
        texto: { type: "textarea", label: "Texto" },
      },
      defaultProps: {
        titulo: "Nueva sección",
        texto: "Edita este contenido a tu gusto.",
      },
      render: ({ titulo, texto }: Props) => (
        <section
          style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}
        >
          <h2
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 16,
            }}
          >
            {String(titulo)}
          </h2>
          <p style={{ fontSize: 18, color: "#cbc3d7" }}>{String(texto)}</p>
        </section>
      ),
    },

    // ── Creadores ────────────────────────────────────────────────────────
    Hero: {
      label: "Hero",
      fields: {
        titulo: { type: "text", label: "Título" },
        subtitulo: { type: "textarea", label: "Subtítulo" },
        botonTexto: { type: "text", label: "Texto del botón" },
        botonHref: { type: "text", label: "Enlace del botón" },
      },
      defaultProps: {
        titulo: "Crea contenido que convierte",
        subtitulo:
          "Una frase corta que explique lo que ofreces a tus clientes.",
        botonTexto: "Contrátame",
        botonHref: "#",
      },
      render: (props: Props) =>
        advancedHtml(props) ?? (
          <section style={{ padding: "96px 24px", textAlign: "center" }}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <h1
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: 24,
                  lineHeight: 1.1,
                }}
              >
                {String(props.titulo)}
              </h1>
              <p style={{ fontSize: 20, color: "#cbc3d7", marginBottom: 32 }}>
                {String(props.subtitulo)}
              </p>
              <a
                href={String(props.botonHref)}
                style={{
                  background: accent,
                  color: "#0f0d15",
                  padding: "16px 36px",
                  borderRadius: 999,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {String(props.botonTexto)}
              </a>
            </div>
          </section>
        ),
    },
    Servicios: {
      label: "Sección de servicios",
      fields: {
        titulo: { type: "text", label: "Título" },
        items: {
          type: "array",
          label: "Servicios",
          arrayFields: {
            titulo: { type: "text", label: "Título" },
            descripcion: { type: "textarea", label: "Descripción" },
          },
          defaultItemProps: {
            titulo: "Servicio",
            descripcion: "Describe este servicio.",
          },
        },
      },
      defaultProps: {
        titulo: "Mis servicios",
        items: [
          {
            titulo: "Servicio 1",
            descripcion: "Describe este servicio y su beneficio.",
          },
          {
            titulo: "Servicio 2",
            descripcion: "Describe este servicio y su beneficio.",
          },
          {
            titulo: "Servicio 3",
            descripcion: "Describe este servicio y su beneficio.",
          },
        ],
      },
      render: ({ titulo, items }: Props) => (
        <section style={{ padding: "80px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
                marginBottom: 48,
              }}
            >
              {String(titulo)}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 24,
              }}
            >
              {(Array.isArray(items) ? items : []).map(
                (s: Props, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,.05)",
                      borderRadius: 16,
                      padding: 32,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#fff",
                        marginBottom: 8,
                      }}
                    >
                      {String(s.titulo)}
                    </h3>
                    <p style={{ color: "#9d96a8" }}>{String(s.descripcion)}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      ),
    },
    Testimonio: {
      label: "Testimonio",
      fields: {
        cita: { type: "textarea", label: "Cita" },
        autor: { type: "text", label: "Autor" },
        cargo: { type: "text", label: "Cargo / Empresa" },
      },
      defaultProps: {
        cita: "Trabajar con esta persona cambió por completo nuestros resultados.",
        autor: "Nombre del cliente",
        cargo: "Cargo, Empresa",
      },
      render: ({ cita, autor, cargo }: Props) => (
        <section style={{ padding: "80px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <p
              style={{
                fontSize: 24,
                fontStyle: "italic",
                color: "#fff",
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              "{String(cita)}"
            </p>
            <p style={{ color: "#fff", fontWeight: 700 }}>{String(autor)}</p>
            <p style={{ color: "#9d96a8", fontSize: 14 }}>{String(cargo)}</p>
          </div>
        </section>
      ),
    },
    Precios: {
      label: "Precios",
      fields: {
        titulo: { type: "text", label: "Título" },
        items: {
          type: "array",
          label: "Planes",
          arrayFields: {
            nombre: { type: "text", label: "Nombre" },
            precio: { type: "text", label: "Precio" },
          },
          defaultItemProps: { nombre: "Plan", precio: "$0" },
        },
      },
      defaultProps: {
        titulo: "Planes",
        items: [
          { nombre: "Básico", precio: "$299" },
          { nombre: "Pro", precio: "$749" },
          { nombre: "Premium", precio: "$1499" },
        ],
      },
      render: ({ titulo, items }: Props) => (
        <section style={{ padding: "80px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
                marginBottom: 48,
              }}
            >
              {String(titulo)}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 24,
              }}
            >
              {(Array.isArray(items) ? items : []).map(
                (p: Props, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,.05)",
                      borderRadius: 16,
                      padding: 32,
                      textAlign: "center",
                    }}
                  >
                    <h3 style={{ color: "#fff", marginBottom: 8 }}>
                      {String(p.nombre)}
                    </h3>
                    <p style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>
                      {String(p.precio)}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      ),
    },
    CTA: {
      label: "Llamado a la acción",
      fields: {
        titulo: { type: "text", label: "Título" },
        texto: { type: "textarea", label: "Texto" },
        botonTexto: { type: "text", label: "Texto del botón" },
        botonHref: { type: "text", label: "Enlace" },
      },
      defaultProps: {
        titulo: "¿Listo para empezar?",
        texto: "Escríbeme hoy y trabajemos juntos en tu próximo proyecto.",
        botonTexto: "Contactar ahora",
        botonHref: "#",
      },
      render: (props: Props) =>
        advancedHtml(props) ?? (
          <section style={{ padding: "80px 24px" }}>
            <div
              style={{
                maxWidth: 760,
                margin: "0 auto",
                background: accent,
                borderRadius: 28,
                padding: 48,
                textAlign: "center",
              }}
            >
              <h2
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#0f0d15",
                  marginBottom: 16,
                }}
              >
                {String(props.titulo)}
              </h2>
              <p
                style={{
                  color: "rgba(15,13,21,.8)",
                  fontSize: 18,
                  marginBottom: 32,
                }}
              >
                {String(props.texto)}
              </p>
              <a
                href={String(props.botonHref)}
                style={{
                  background: "rgba(0,0,0,.85)",
                  color: "#fff",
                  padding: "16px 36px",
                  borderRadius: 999,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {String(props.botonTexto)}
              </a>
            </div>
          </section>
        ),
    },
    Portafolio: {
      label: "Portafolio",
      fields: {
        titulo: { type: "text", label: "Título" },
        items: {
          type: "array",
          label: "Imágenes",
          arrayFields: { src: imageField },
          defaultItemProps: {
            src: "https://placehold.co/600x600/15121b/d0bcff?text=Trabajo",
          },
        },
      },
      defaultProps: {
        titulo: "Mi trabajo",
        items: [
          { src: "https://placehold.co/600x600/15121b/d0bcff?text=1" },
          { src: "https://placehold.co/600x600/15121b/d0bcff?text=2" },
          { src: "https://placehold.co/600x600/15121b/d0bcff?text=3" },
        ],
      },
      render: ({ titulo, items }: Props) => (
        <section style={{ padding: "80px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
                marginBottom: 48,
              }}
            >
              {String(titulo)}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 16,
              }}
            >
              {(Array.isArray(items) ? items : []).map(
                (it: Props, i: number) => (
                  <img
                    key={i}
                    src={String(it.src)}
                    alt=""
                    style={{
                      width: "100%",
                      height: "auto",
                      borderRadius: 16,
                      display: "block",
                    }}
                  />
                ),
              )}
            </div>
          </div>
        </section>
      ),
    },
  },
};

export const PUCK_STORAGE_PREFIX = "kreoon-puck-";
