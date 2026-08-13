import { ReactNode, useRef, useState } from 'react';
import {
  Paperclip,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ACCEPT_DOCUMENTOS,
  type ClientDocument,
  type DocumentoAlcance,
  type UseClientDocumentsReturn,
} from '@/hooks/useClientDocuments';

/**
 * Adjuntar documentos (PDF, Word, Excel, texto) para que entendamos mejor la
 * marca del cliente. Se suben antes de generar "Así entendimos tu marca" y se
 * resumen solos: por eso cada uno muestra su resumen apenas está listo — es
 * la prueba de que sirvió de algo.
 *
 * Se usa en dos sitios con el MISMO estado (`documentos`, de
 * `useClientDocuments`, instanciado una sola vez en `ClientPipelineChecklist`):
 *  · el acceso del paso 1 del checklist
 *  · dentro de `OnboardingSheet`, visible tanto al escribir como al hablar
 */

const OPCIONES_ALCANCE: { value: DocumentoAlcance; label: string }[] = [
  { value: 'todo', label: 'Para todo' },
  { value: 'marca', label: 'Para entender mi marca' },
  { value: 'estrategia', label: 'Para la estrategia' },
  { value: 'guiones', label: 'Para los guiones' },
];

function formatearPeso(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentosUploaderProps {
  documentos: UseClientDocumentsReturn;
  /** Reemplaza el botón por defecto (para integrarlo distinto en cada sitio). */
  trigger?: ReactNode;
}

export function DocumentosUploader({ documentos, trigger }: DocumentosUploaderProps) {
  const [open, setOpen] = useState(false);
  const { documents } = documentos;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            <Paperclip className="h-4 w-4 mr-2" />
            {documents.length > 0
              ? `Adjuntar documentos · ${documents.length}`
              : 'Adjuntar documentos'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tus documentos</DialogTitle>
          <DialogDescription>
            Súbelos y los leemos por ti. Así entendemos mejor tu marca antes de empezar.
          </DialogDescription>
        </DialogHeader>
        <DocumentosContenido documentos={documentos} />
      </DialogContent>
    </Dialog>
  );
}

/** El contenido en sí, sin el diálogo — por si algún día hace falta embeberlo suelto. */
function DocumentosContenido({ documentos }: { documentos: UseClientDocumentsReturn }) {
  const { toast } = useToast();
  const { documents, loading, uploading, subir, cambiarAlcance, eliminar } = documentos;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await subir(file);
      } catch (err) {
        toast({
          title: 'No pudimos subir ese archivo',
          description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleBorrar = async (doc: ClientDocument) => {
    setBorrandoId(doc.id);
    try {
      await eliminar(doc.id);
    } catch (err) {
      toast({
        title: 'No pudimos borrarlo',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
    } finally {
      setBorrandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Zona para soltar o elegir archivos */}
      <div
        className={cn(
          'rounded-xl border-2 border-dashed p-5 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        )}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={e => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3 hidden sm:block">
          Arrastra tus archivos aquí, o
        </p>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Subiendo…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Elegir archivos
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_DOCUMENTOS}
          className="hidden"
          onChange={e => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="text-xs text-muted-foreground mt-3">
          PDF, Word, Excel o texto · hasta 10MB cada uno
        </p>
      </div>

      {/* Lista de documentos ya subidos */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          Todavía no has subido nada. No pasa nada si prefieres saltarte esto.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">{formatearPeso(doc.file_size)}</p>

                  {(doc.estado === 'pendiente' || doc.estado === 'procesando') && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      Leyendo tu documento…
                    </p>
                  )}

                  {doc.estado === 'listo' && (
                    <div className="mt-1.5 flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      {/* `whitespace-pre-line` respeta los saltos que trae el
                          resumen: sin esto el HTML los colapsa y las secciones
                          (QUÉ ES, CÓMO HABLA…) salen como un solo ladrillo. */}
                      <p className="whitespace-pre-line text-xs text-muted-foreground leading-relaxed">
                        {doc.resumen ?? 'Ya lo leímos.'}
                      </p>
                    </div>
                  )}

                  {doc.estado === 'error' && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {doc.error_detalle ?? 'No pudimos leer este documento. Bórralo y sube otro.'}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleBorrar(doc)}
                  disabled={borrandoId === doc.id}
                  aria-label={`Borrar ${doc.file_name}`}
                >
                  {borrandoId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Select
                value={doc.alcance}
                onValueChange={value =>
                  cambiarAlcance(doc.id, value as DocumentoAlcance).catch(err => {
                    toast({
                      title: 'No pudimos guardar ese cambio',
                      description: err instanceof Error ? err.message : undefined,
                      variant: 'destructive',
                    });
                  })
                }
                disabled={borrandoId === doc.id}
              >
                <SelectTrigger className="h-8 text-xs w-full sm:w-56" aria-label={`Para qué sirve ${doc.file_name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCIONES_ALCANCE.map(opcion => (
                    <SelectItem key={opcion.value} value={opcion.value} className="text-xs">
                      {opcion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
