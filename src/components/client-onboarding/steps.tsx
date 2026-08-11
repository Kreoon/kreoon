import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { Form } from '@/components/ui/form';
import { KreoonButton } from '@/components/ui/kreoon';
import {
  CampoLargo,
  CampoMultiple,
  CampoOpciones,
  CampoTexto,
  CampoTriple,
} from './fields';
import {
  contenidoSchema,
  equipoSchema,
  legalSchema,
  logisticaSchema,
  marcaSchema,
  OBJETIVOS,
  PLATAFORMAS,
  productoSchema,
  type ContenidoData,
  type EquipoData,
  type LegalData,
  type LogisticaData,
  type MarcaData,
  type OnboardingFormData,
  type ProductoData,
} from './schemas';

/**
 * Los 6 pasos del wizard. Cada paso es dueño de su propio `useForm` — mismo
 * patrón que `registration-v2` (no hay FormProvider global compartido).
 * El wizard padre solo recibe los datos válidos en `onNext` y los persiste.
 */

interface PasoProps<T> {
  initialData: Partial<T>;
  onNext: (data: T) => void | Promise<void>;
  onBack?: () => void;
  guardando: boolean;
}

const TRES_VACIOS = ['', '', ''];

function Navegacion({
  onBack,
  guardando,
  etiqueta = 'Continuar',
  icono,
}: {
  onBack?: () => void;
  guardando: boolean;
  etiqueta?: string;
  icono?: 'flecha' | 'enviar';
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {onBack && (
        <KreoonButton
          type="button"
          variant="ghost"
          size="lg"
          onClick={onBack}
          disabled={guardando}
          className="min-h-[48px] shrink-0 px-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-2">Atrás</span>
        </KreoonButton>
      )}
      <KreoonButton
        type="submit"
        variant="primary"
        size="lg"
        disabled={guardando}
        className="min-h-[48px] flex-1"
      >
        {guardando ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            {etiqueta}
            {icono === 'enviar' ? (
              <Send className="ml-2 h-4 w-4" />
            ) : (
              <ArrowRight className="ml-2 h-4 w-4" />
            )}
          </>
        )}
      </KreoonButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paso 1 — Legal y facturación
// ---------------------------------------------------------------------------
export function PasoLegal({ initialData, onNext, guardando }: PasoProps<LegalData>) {
  const form = useForm<LegalData>({
    resolver: zodResolver(legalSchema),
    defaultValues: {
      razon_social: initialData.razon_social ?? '',
      nit: initialData.nit ?? '',
      representante: initialData.representante ?? '',
      correo_representante: initialData.correo_representante ?? '',
      direccion_fiscal: initialData.direccion_fiscal ?? '',
      ciudad: initialData.ciudad ?? '',
      pais: initialData.pais ?? '',
      correo_facturacion: initialData.correo_facturacion ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <CampoTexto
          control={form.control}
          name="razon_social"
          label="Razón social"
          ayuda="El nombre legal de tu empresa, como aparece en el RUT"
          placeholder="Comercializadora ACME S.A.S."
        />
        <CampoTexto
          control={form.control}
          name="nit"
          label="NIT o identificación fiscal"
          placeholder="900123456-7"
          inputMode="text"
        />
        <CampoTexto
          control={form.control}
          name="representante"
          label="Representante legal"
          ayuda="Quién firma el contrato"
          placeholder="Ana Ruiz"
        />
        <CampoTexto
          control={form.control}
          name="correo_representante"
          label="Correo del representante"
          type="email"
          inputMode="email"
          placeholder="ana@empresa.com"
        />
        <CampoTexto
          control={form.control}
          name="direccion_fiscal"
          label="Dirección fiscal"
          placeholder="Carrera 1 # 2-3, Oficina 401"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CampoTexto
            control={form.control}
            name="ciudad"
            label="Ciudad"
            placeholder="Bogotá"
          />
          <CampoTexto
            control={form.control}
            name="pais"
            label="País"
            placeholder="Colombia"
          />
        </div>
        <CampoTexto
          control={form.control}
          name="correo_facturacion"
          label="Correo para facturas"
          ayuda="Si las facturas van a otro correo distinto"
          type="email"
          inputMode="email"
          placeholder="contabilidad@empresa.com"
          opcional
        />
        <Navegacion guardando={guardando} />
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Paso 2 — Equipo
// ---------------------------------------------------------------------------
export function PasoEquipo({
  initialData,
  onNext,
  onBack,
  guardando,
}: PasoProps<EquipoData>) {
  const form = useForm<EquipoData>({
    resolver: zodResolver(equipoSchema),
    defaultValues: {
      aprobador: {
        nombre: initialData.aprobador?.nombre ?? '',
        cargo: initialData.aprobador?.cargo ?? '',
        correo: initialData.aprobador?.correo ?? '',
        celular: initialData.aprobador?.celular ?? '',
      },
      correo_portal: initialData.correo_portal ?? '',
      miembros_whatsapp: initialData.miembros_whatsapp ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <div className="rounded-sm border border-kreoon-border bg-kreoon-purple-500/5 p-3">
          <p className="text-xs leading-relaxed text-kreoon-text-secondary">
            👤 <strong className="text-kreoon-text-primary">Quién aprueba</strong>{' '}
            es la persona que revisa los videos y dice "sí, publiquen". Mientras
            menos personas aprueben, más rápido sale tu contenido.
          </p>
        </div>
        <CampoTexto
          control={form.control}
          name="aprobador.nombre"
          label="Nombre de quien aprueba"
          placeholder="Ana Ruiz"
        />
        <CampoTexto
          control={form.control}
          name="aprobador.cargo"
          label="Su cargo"
          placeholder="Directora de Marketing"
        />
        <CampoTexto
          control={form.control}
          name="aprobador.correo"
          label="Su correo"
          type="email"
          inputMode="email"
          placeholder="ana@empresa.com"
        />
        <CampoTexto
          control={form.control}
          name="aprobador.celular"
          label="Su celular"
          type="tel"
          inputMode="tel"
          placeholder="300 123 4567"
        />
        <CampoTexto
          control={form.control}
          name="correo_portal"
          label="Correo para entrar al portal"
          ayuda="Con este correo verás tus videos y aprobarás desde la plataforma"
          type="email"
          inputMode="email"
          placeholder="marketing@empresa.com"
        />
        <CampoLargo
          control={form.control}
          name="miembros_whatsapp"
          label="Quiénes van en el grupo de WhatsApp"
          ayuda="Escribe nombre y celular de cada persona, uno por línea"
          placeholder={'Ana Ruiz - 300 123 4567\nCarlos Pérez - 310 987 6543'}
          rows={4}
        />
        <Navegacion onBack={onBack} guardando={guardando} />
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Paso 3 — Marca
// ---------------------------------------------------------------------------
export function PasoMarca({
  initialData,
  onNext,
  onBack,
  guardando,
}: PasoProps<MarcaData>) {
  const form = useForm<MarcaData>({
    resolver: zodResolver(marcaSchema),
    defaultValues: {
      instagram: initialData.instagram ?? '',
      tiktok: initialData.tiktok ?? '',
      website: initialData.website ?? '',
      historia: initialData.historia ?? '',
      tono_deseado: initialData.tono_deseado ?? '',
      tono_evitar: initialData.tono_evitar ?? '',
      competidores: initialData.competidores ?? TRES_VACIOS,
      referentes: initialData.referentes ?? TRES_VACIOS,
      restricciones_legales: initialData.restricciones_legales ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <div className="rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/50 p-3">
          <p className="text-xs text-kreoon-text-muted">
            Este paso es opcional, pero mientras más nos cuentes, más se parecen
            los videos a tu marca.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CampoTexto
            control={form.control}
            name="instagram"
            label="Instagram"
            placeholder="@tumarca"
            opcional
          />
          <CampoTexto
            control={form.control}
            name="tiktok"
            label="TikTok"
            placeholder="@tumarca"
            opcional
          />
        </div>
        <CampoTexto
          control={form.control}
          name="website"
          label="Página web"
          type="url"
          inputMode="url"
          placeholder="www.tumarca.com"
          opcional
        />
        <CampoLargo
          control={form.control}
          name="historia"
          label="Historia de tu marca"
          ayuda="¿Cómo empezó? ¿Por qué existe? Cuéntalo como se lo contarías a un amigo"
          placeholder="Empezamos en 2019 porque no encontrábamos..."
          rows={4}
          opcional
        />
        <CampoLargo
          control={form.control}
          name="tono_deseado"
          label="Cómo quieres que te hablen"
          ayuda="Cercano, profesional, divertido, elegante..."
          placeholder="Cercano y con humor, sin ser payaso"
          rows={2}
          opcional
        />
        <CampoLargo
          control={form.control}
          name="tono_evitar"
          label="Cómo NO quieres que te hablen"
          placeholder="Nada de lenguaje médico ni promesas exageradas"
          rows={2}
          opcional
        />
        <CampoTriple
          control={form.control}
          name="competidores"
          label="Tus 3 competidores"
          ayuda="Marcas que le venden a la misma gente que tú"
          placeholders={['Marca competidora 1', 'Marca competidora 2', 'Marca competidora 3']}
          opcional
        />
        <CampoTriple
          control={form.control}
          name="referentes"
          label="Tus 3 referentes"
          ayuda="Marcas cuyo contenido te encanta, aunque sean de otro rubro"
          placeholders={['Marca que admiras 1', 'Marca que admiras 2', 'Marca que admiras 3']}
          opcional
        />
        <CampoLargo
          control={form.control}
          name="restricciones_legales"
          label="Restricciones legales"
          ayuda="Cosas que por ley no puedes decir de tu producto"
          placeholder="No podemos decir que cura enfermedades"
          rows={2}
          opcional
        />
        <Navegacion onBack={onBack} guardando={guardando} />
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Paso 4 — Producto
// ---------------------------------------------------------------------------
export function PasoProducto({
  initialData,
  onNext,
  onBack,
  guardando,
}: PasoProps<ProductoData>) {
  const form = useForm<ProductoData>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: initialData.nombre ?? '',
      presentaciones: initialData.presentaciones ?? '',
      componentes: initialData.componentes ?? '',
      beneficios: initialData.beneficios ?? '',
      diferenciales: initialData.diferenciales ?? '',
      precio: initialData.precio ?? '',
      promociones: initialData.promociones ?? '',
      garantias: initialData.garantias ?? '',
      link_tienda: initialData.link_tienda ?? '',
      audiencia: {
        edad: initialData.audiencia?.edad ?? '',
        genero: initialData.audiencia?.genero ?? '',
        pais: initialData.audiencia?.pais ?? '',
        dolor: initialData.audiencia?.dolor ?? '',
      },
      objeciones: initialData.objeciones ?? TRES_VACIOS,
      testimonios: initialData.testimonios ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <CampoTexto
          control={form.control}
          name="nombre"
          label="Nombre del producto"
          placeholder="Crema Hidratante Nocturna"
        />
        <CampoTexto
          control={form.control}
          name="presentaciones"
          label="Presentaciones o tamaños"
          ayuda="Los formatos en que se vende"
          placeholder="Frasco de 50ml y 100ml"
        />
        <CampoLargo
          control={form.control}
          name="componentes"
          label="De qué está hecho o qué incluye"
          placeholder="Ácido hialurónico, vitamina E, aloe vera"
          rows={2}
        />
        <CampoLargo
          control={form.control}
          name="beneficios"
          label="Beneficios principales"
          ayuda="¿Qué gana quien lo compra?"
          placeholder="Hidrata 24 horas, reduce líneas de expresión"
          rows={3}
        />
        <CampoLargo
          control={form.control}
          name="diferenciales"
          label="Qué lo hace distinto"
          ayuda="Por qué te comprarían a ti y no al de al lado"
          placeholder="Somos los únicos con certificación orgánica"
          rows={3}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CampoTexto
            control={form.control}
            name="precio"
            label="Precio"
            placeholder="$89.000 COP"
          />
          <CampoTexto
            control={form.control}
            name="garantias"
            label="Garantías"
            placeholder="30 días de devolución"
          />
        </div>
        <CampoTexto
          control={form.control}
          name="promociones"
          label="Promociones activas"
          placeholder="2x1 los martes"
          opcional
        />
        <CampoTexto
          control={form.control}
          name="link_tienda"
          label="Dónde se compra"
          ayuda="Link de tu tienda, o dinos si solo vendes por WhatsApp"
          placeholder="www.tutienda.com/producto"
        />

        <div className="rounded-sm border border-kreoon-border bg-kreoon-purple-500/5 p-3">
          <p className="text-xs text-kreoon-text-secondary">
            🎯 <strong className="text-kreoon-text-primary">Tu cliente ideal</strong>{' '}
            — mientras más específico, mejores salen los videos.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CampoTexto
            control={form.control}
            name="audiencia.edad"
            label="Edad"
            placeholder="25 a 40 años"
          />
          <CampoTexto
            control={form.control}
            name="audiencia.genero"
            label="Género"
            placeholder="Mujeres"
          />
        </div>
        <CampoTexto
          control={form.control}
          name="audiencia.pais"
          label="País de tu cliente"
          placeholder="Colombia"
        />
        <CampoLargo
          control={form.control}
          name="audiencia.dolor"
          label="Qué problema le resuelves"
          ayuda="El dolor concreto que siente antes de comprarte"
          placeholder="Se levanta con la piel reseca y se ve cansada"
          rows={2}
        />
        <CampoTriple
          control={form.control}
          name="objeciones"
          label="Objeciones que te ponen"
          ayuda="Lo que dice la gente cuando NO compra. Con una basta."
          placeholders={['"Está muy caro"', '"No sé si me va a servir"', '"Ya probé otros y nada"']}
        />
        <CampoLargo
          control={form.control}
          name="testimonios"
          label="Testimonios o casos de éxito"
          placeholder="María bajó 8 kilos en 3 meses..."
          rows={3}
          opcional
        />
        <Navegacion onBack={onBack} guardando={guardando} />
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Paso 5 — Contenido
// ---------------------------------------------------------------------------
export function PasoContenido({
  initialData,
  onNext,
  onBack,
  guardando,
}: PasoProps<ContenidoData>) {
  const form = useForm<ContenidoData>({
    resolver: zodResolver(contenidoSchema),
    defaultValues: {
      objetivo: initialData.objetivo ?? '',
      plataformas: initialData.plataformas ?? [],
      historial_contenido: initialData.historial_contenido ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
        <CampoOpciones
          control={form.control}
          name="objetivo"
          label="¿Para qué quieres los videos?"
          opciones={OBJETIVOS}
          opcional
        />
        <CampoMultiple
          control={form.control}
          name="plataformas"
          label="¿Dónde vas a publicar?"
          ayuda="Puedes elegir varias"
          opciones={PLATAFORMAS}
          opcional
        />
        <CampoLargo
          control={form.control}
          name="historial_contenido"
          label="Qué has probado antes y cómo te fue"
          ayuda="Lo que funcionó y lo que no. Nos ahorra repetir errores."
          placeholder="Hicimos videos con una agencia el año pasado, tuvieron pocas vistas..."
          rows={4}
          opcional
        />
        <Navegacion onBack={onBack} guardando={guardando} />
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Paso 6 — Logística + resumen
// ---------------------------------------------------------------------------
function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
  if (!valor || !valor.trim()) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-kreoon-text-muted">
        {etiqueta}
      </span>
      <span className="break-words text-sm text-kreoon-text-primary">{valor}</span>
    </div>
  );
}

function BloqueResumen({
  titulo,
  emoji,
  children,
}: {
  titulo: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/60 p-3">
      <p className="mb-1 text-sm font-medium text-kreoon-text-primary">
        {emoji} {titulo}
      </p>
      <div className="divide-y divide-kreoon-border/50">{children}</div>
    </div>
  );
}

export function PasoLogistica({
  initialData,
  onNext,
  onBack,
  guardando,
  resumen,
}: PasoProps<LogisticaData> & { resumen: OnboardingFormData }) {
  const form = useForm<LogisticaData>({
    resolver: zodResolver(logisticaSchema),
    defaultValues: {
      unidades_disponibles: initialData.unidades_disponibles ?? '',
      direccion_despacho: initialData.direccion_despacho ?? '',
      responsable_despacho: initialData.responsable_despacho ?? '',
    },
  });

  const { legal, equipo, producto, contenido } = resumen;
  const plataformas = (contenido?.plataformas ?? [])
    .map((p) => PLATAFORMAS.find((o) => o.value === p)?.label ?? p)
    .join(', ');
  const objetivo = OBJETIVOS.find((o) => o.value === contenido?.objetivo)?.label;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
        <div className="space-y-5">
          <CampoTexto
            control={form.control}
            name="unidades_disponibles"
            label="Unidades para los creadores"
            ayuda="Cuántos productos puedes enviar para que graben"
            placeholder="10 unidades"
            opcional
          />
          <CampoLargo
            control={form.control}
            name="direccion_despacho"
            label="Desde dónde despachas"
            placeholder="Bodega Calle 80 # 12-34, Bogotá"
            rows={2}
            opcional
          />
          <CampoTexto
            control={form.control}
            name="responsable_despacho"
            label="Quién coordina los envíos"
            ayuda="Nombre y celular de quien despacha"
            placeholder="Carlos Pérez - 310 987 6543"
            opcional
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-kreoon-border" />
            <span className="text-xs font-medium uppercase tracking-wide text-kreoon-text-muted">
              Revisa antes de enviar
            </span>
            <div className="h-px flex-1 bg-kreoon-border" />
          </div>

          <BloqueResumen titulo="Tu empresa" emoji="🏢">
            <FilaResumen etiqueta="Razón social" valor={legal?.razon_social} />
            <FilaResumen etiqueta="NIT" valor={legal?.nit} />
            <FilaResumen etiqueta="Representante" valor={legal?.representante} />
            <FilaResumen
              etiqueta="Ciudad y país"
              valor={[legal?.ciudad, legal?.pais].filter(Boolean).join(', ')}
            />
          </BloqueResumen>

          <BloqueResumen titulo="Tu equipo" emoji="👥">
            <FilaResumen etiqueta="Aprueba" valor={equipo?.aprobador?.nombre} />
            <FilaResumen etiqueta="Correo del portal" valor={equipo?.correo_portal} />
          </BloqueResumen>

          <BloqueResumen titulo="Tu producto" emoji="📦">
            <FilaResumen etiqueta="Producto" valor={producto?.nombre} />
            <FilaResumen etiqueta="Precio" valor={producto?.precio} />
            <FilaResumen etiqueta="Beneficios" valor={producto?.beneficios} />
            <FilaResumen
              etiqueta="Tu cliente"
              valor={[producto?.audiencia?.edad, producto?.audiencia?.genero]
                .filter(Boolean)
                .join(' · ')}
            />
          </BloqueResumen>

          {(objetivo || plataformas) && (
            <BloqueResumen titulo="Tu contenido" emoji="🎬">
              <FilaResumen etiqueta="Objetivo" valor={objetivo} />
              <FilaResumen etiqueta="Plataformas" valor={plataformas} />
            </BloqueResumen>
          )}
        </div>

        <Navegacion
          onBack={onBack}
          guardando={guardando}
          etiqueta="Enviar información"
          icono="enviar"
        />
      </form>
    </Form>
  );
}
