import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TIPOS_OFERTA,
  type OnboardingFormData,
} from '@/components/client-onboarding/schemas';

interface OnboardingResponseViewProps {
  formData: OnboardingFormData;
  submittedAt?: string | null;
}

/**
 * Vista de solo lectura de lo que el cliente respondió en el wizard público
 * de onboarding (`src/components/client-onboarding/`). Se usa dentro del
 * detalle del cliente cuando el formulario está en status 'submitted' o
 * 'processed'.
 *
 * SEGURIDAD: el contenido lo escribió un usuario anónimo por un formulario
 * público. Todo se renderiza como texto plano vía interpolación de JSX
 * ({valor}) — nunca dangerouslySetInnerHTML ni HTML inyectado. Los saltos de
 * línea se respetan solo con la clase `whitespace-pre-wrap`, jamás
 * convirtiéndolos a <br>.
 */
export function OnboardingResponseView({
  formData,
  submittedAt,
}: OnboardingResponseViewProps) {
  const { legal, equipo, marca, producto, contenido, logistica } = formData;

  let fechaEnvio: string | null = null;
  if (submittedAt) {
    try {
      fechaEnvio = format(new Date(submittedAt), "d MMM yyyy, h:mm a", { locale: es });
    } catch {
      fechaEnvio = null;
    }
  }

  return (
    <div className="space-y-3">
      {fechaEnvio && (
        <p className="text-sm text-kreoon-text-muted">
          Enviado el <span className="text-kreoon-text-primary">{fechaEnvio}</span>
        </p>
      )}

      <Tabs defaultValue="legal">
        <TabsList className="flex w-full overflow-x-auto gap-0.5 h-auto flex-wrap">
          <TabsTrigger value="legal" className="flex-none gap-1">
            <span aria-hidden="true">🏢</span> Legal
          </TabsTrigger>
          <TabsTrigger value="equipo" className="flex-none gap-1">
            <span aria-hidden="true">👥</span> Equipo
          </TabsTrigger>
          <TabsTrigger value="marca" className="flex-none gap-1">
            <span aria-hidden="true">✨</span> Marca
          </TabsTrigger>
          <TabsTrigger value="producto" className="flex-none gap-1">
            <span aria-hidden="true">📦</span> Producto
          </TabsTrigger>
          <TabsTrigger value="contenido" className="flex-none gap-1">
            <span aria-hidden="true">🎬</span> Contenido
          </TabsTrigger>
          <TabsTrigger value="logistica" className="flex-none gap-1">
            <span aria-hidden="true">🚚</span> Logística
          </TabsTrigger>
        </TabsList>

        <TabsContent value="legal" className="mt-4">
          <Seccion titulo="Datos de la empresa" emoji="🏢">
            <Campo etiqueta="Razón social" valor={legal?.razon_social} />
            <Campo etiqueta="NIT o identificación fiscal" valor={legal?.nit} />
            <Campo etiqueta="Representante legal" valor={legal?.representante} />
            <Campo etiqueta="Correo del representante" valor={legal?.correo_representante} />
            <Campo etiqueta="Dirección fiscal" valor={legal?.direccion_fiscal} />
            <Campo etiqueta="Ciudad" valor={legal?.ciudad} />
            <Campo etiqueta="País" valor={legal?.pais} />
            <Campo etiqueta="Correo para facturas" valor={legal?.correo_facturacion} />
          </Seccion>
        </TabsContent>

        <TabsContent value="equipo" className="mt-4">
          <Seccion titulo="Quién aprueba" emoji="👥">
            <Campo etiqueta="Nombre" valor={equipo?.aprobador?.nombre} />
            <Campo etiqueta="Cargo" valor={equipo?.aprobador?.cargo} />
            <Campo etiqueta="Correo" valor={equipo?.aprobador?.correo} />
            <Campo etiqueta="Celular" valor={equipo?.aprobador?.celular} />
          </Seccion>
          <Seccion titulo="Portal y avisos" emoji="👥">
            <Campo etiqueta="Correo para entrar al portal" valor={equipo?.correo_portal} />
            <Campo
              etiqueta="Miembros del grupo de WhatsApp"
              valor={equipo?.miembros_whatsapp}
              multilinea
            />
          </Seccion>
        </TabsContent>

        <TabsContent value="marca" className="mt-4">
          <Seccion titulo="Redes y presencia" emoji="✨">
            <Campo etiqueta="Instagram" valor={marca?.instagram} />
            <Campo etiqueta="TikTok" valor={marca?.tiktok} />
            <Campo etiqueta="Página web" valor={marca?.website} />
          </Seccion>
          <Seccion titulo="Historia y tono" emoji="✨">
            <Campo etiqueta="Historia de la marca" valor={marca?.historia} multilinea />
            <Campo etiqueta="Cómo quiere que le hablen" valor={marca?.tono_deseado} multilinea />
            <Campo etiqueta="Cómo NO quiere que le hablen" valor={marca?.tono_evitar} multilinea />
          </Seccion>
          <Seccion titulo="Referencias" emoji="✨">
            <CampoLista etiqueta="Competidores" valores={marca?.competidores} />
            <CampoLista etiqueta="Referentes" valores={marca?.referentes} />
            <Campo etiqueta="Restricciones legales" valor={marca?.restricciones_legales} multilinea />
          </Seccion>
        </TabsContent>

        <TabsContent value="producto" className="mt-4">
          <Seccion titulo="El producto" emoji="📦">
            <Campo
              etiqueta="Tipo de oferta"
              valor={
                TIPOS_OFERTA.find((t) => t.value === producto?.tipo_oferta)?.label
              }
            />
            <Campo etiqueta="Nombre" valor={producto?.nombre} />
            <Campo etiqueta="Presentaciones / planes" valor={producto?.presentaciones} />
            <Campo etiqueta="Qué incluye" valor={producto?.componentes} multilinea />
            <Campo etiqueta="Beneficios principales" valor={producto?.beneficios} multilinea />
            <Campo etiqueta="Qué lo hace distinto" valor={producto?.diferenciales} multilinea />
            <Campo etiqueta="Precio" valor={producto?.precio} />
            <Campo etiqueta="Promociones activas" valor={producto?.promociones} />
            <Campo etiqueta="Garantías" valor={producto?.garantias} />
            <Campo etiqueta="Dónde se compra o contrata" valor={producto?.link_tienda} />
          </Seccion>
          <Seccion titulo="Cliente ideal" emoji="📦">
            <Campo etiqueta="Edad" valor={producto?.audiencia?.edad} />
            <Campo etiqueta="Género" valor={producto?.audiencia?.genero} />
            <Campo etiqueta="País del cliente" valor={producto?.audiencia?.pais} />
            <Campo etiqueta="Qué problema le resuelve" valor={producto?.audiencia?.dolor} multilinea />
          </Seccion>
          <Seccion titulo="Objeciones y testimonios" emoji="📦">
            <CampoLista etiqueta="Objeciones" valores={producto?.objeciones} />
            <Campo etiqueta="Testimonios o casos de éxito" valor={producto?.testimonios} multilinea />
          </Seccion>
        </TabsContent>

        <TabsContent value="contenido" className="mt-4">
          <Seccion titulo="Objetivo y plataformas" emoji="🎬">
            <Campo etiqueta="Objetivo" valor={contenido?.objetivo} />
            <CampoLista etiqueta="Plataformas" valores={contenido?.plataformas} />
            <Campo
              etiqueta="Qué ha probado antes y cómo le fue"
              valor={contenido?.historial_contenido}
              multilinea
            />
          </Seccion>
        </TabsContent>

        <TabsContent value="logistica" className="mt-4">
          <Seccion titulo="Envíos" emoji="🚚">
            <Campo etiqueta="Unidades para los creadores" valor={logistica?.unidades_disponibles} />
            <Campo etiqueta="Desde dónde despacha" valor={logistica?.direccion_despacho} multilinea />
            <Campo etiqueta="Quién coordina los envíos" valor={logistica?.responsable_despacho} />
          </Seccion>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas de presentación
// ---------------------------------------------------------------------------

function Seccion({
  titulo,
  emoji,
  children,
}: {
  titulo: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/60 p-3">
      <p className="mb-1 text-sm font-medium text-kreoon-text-primary">
        <span aria-hidden="true">{emoji}</span> {titulo}
      </p>
      <div className="divide-y divide-kreoon-border/50">{children}</div>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  multilinea = false,
}: {
  etiqueta: string;
  valor?: string;
  multilinea?: boolean;
}) {
  const texto = valor?.trim();
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-kreoon-text-muted">
        {etiqueta}
      </span>
      {texto ? (
        <span
          className={`break-words text-sm text-kreoon-text-primary ${
            multilinea ? 'whitespace-pre-wrap' : ''
          }`}
        >
          {texto}
        </span>
      ) : (
        <span className="text-sm text-kreoon-text-muted/60">—</span>
      )}
    </div>
  );
}

function CampoLista({
  etiqueta,
  valores,
}: {
  etiqueta: string;
  valores?: Array<string | undefined>;
}) {
  const items = (valores ?? []).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );

  return (
    <div className="flex flex-col gap-1 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-kreoon-text-muted">
        {etiqueta}
      </span>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, index) => (
            <span
              key={`${etiqueta}-${index}`}
              className="rounded-sm border border-kreoon-border bg-kreoon-bg-secondary px-2 py-0.5 text-xs text-kreoon-text-primary"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-sm text-kreoon-text-muted/60">—</span>
      )}
    </div>
  );
}
