import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreatorSelection, type CreatorCreativeProfile } from "@/hooks/useCreatorSelection";
import { useOrgAssignableUsers } from "@/hooks/useOrgAssignableUsers";
import { cn } from "@/lib/utils";

interface CandidatoManual {
  user_id: string;
  nombre: string;
  avatar_url: string | null;
}

interface CandidatoTarjeta {
  user_id: string;
  nombre: string;
  avatar_url: string | null;
  motivos: string[];
  ficha: CreatorCreativeProfile | null;
  /** true si viene de la propuesta del sistema; false si el equipo lo agregó a mano. */
  esPropuesto: boolean;
  posicion: number | null;
}

interface CreatorSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  clientName: string;
  /** true si el run ya tenía creadores confirmados al abrir el diálogo: cambia
   *  el copy y la acción de "Confirmar" a "Cambiar de creador" (readaptar guiones). */
  yaHayCreadorElegido: boolean;
  onDone?: () => void;
}

const FICHA_LABELS: Array<{ key: keyof CreatorCreativeProfile; prefix?: string }> = [
  { key: "rango_edad" },
  { key: "genero" },
  { key: "estilo_energia" },
  { key: "registro" },
];

function formatUbicacion(ficha: CreatorCreativeProfile): string | null {
  const partes = [ficha.ciudad, ficha.pais_acento].filter(Boolean);
  return partes.length ? partes.join(", ") : null;
}

export function CreatorSelectionDialog({
  open,
  onOpenChange,
  runId,
  clientName,
  yaHayCreadorElegido,
  onDone,
}: CreatorSelectionDialogProps) {
  const { toast } = useToast();
  const {
    organizationId,
    shortlist,
    selectedCreatorIds,
    loading,
    acting,
    error,
    confirmar,
    readaptar,
    refresh,
    scriptsTarget,
    videosDelPaquete,
    cambiarCantidadDeGuiones,
  } = useCreatorSelection(open ? runId : null);
  const { creators: creadoresOrg } = useOrgAssignableUsers(organizationId);

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  /** Cuántos guiones se van a generar. Se edita aquí, antes de generarlos. */
  const [cantidadGuiones, setCantidadGuiones] = useState<string>("5");
  useEffect(() => {
    if (scriptsTarget) setCantidadGuiones(String(scriptsTarget));
  }, [scriptsTarget]);

  const [manualExtra, setManualExtra] = useState<CandidatoManual[]>([]);
  const [fichasManual, setFichasManual] = useState<Record<string, CreatorCreativeProfile | null>>({});
  const [busqueda, setBusqueda] = useState("");
  const fichaSolicitada = useRef<Set<string>>(new Set());
  const inicializado = useRef(false);

  // Reinicia todo cada vez que el diálogo se abre para un run distinto.
  useEffect(() => {
    if (!open) {
      inicializado.current = false;
      return;
    }
    setBusqueda("");
    setManualExtra([]);
    fichaSolicitada.current = new Set();
  }, [open, runId]);

  // Precarga la selección actual (si ya había creadores confirmados) en cuanto
  // termina de cargar, sin pisar lo que el equipo ya esté marcando después.
  useEffect(() => {
    if (open && !loading && !inicializado.current) {
      setSeleccionados([...selectedCreatorIds]);
      inicializado.current = true;
    }
  }, [open, loading, selectedCreatorIds]);

  // Ficha creativa de los creadores agregados a mano (los del shortlist ya
  // traen la suya desde el hook).
  useEffect(() => {
    const faltantes = manualExtra.map((m) => m.user_id).filter((id) => !fichaSolicitada.current.has(id));
    if (faltantes.length === 0) return;
    faltantes.forEach((id) => fichaSolicitada.current.add(id));

    (async () => {
      const { data } = await supabase.from("creator_creative_profile").select("*").in("user_id", faltantes);
      setFichasManual((prev) => {
        const next = { ...prev };
        for (const id of faltantes) next[id] = null;
        for (const row of data ?? []) next[row.user_id] = row;
        return next;
      });
    })();
  }, [manualExtra]);

  const candidatos: CandidatoTarjeta[] = useMemo(() => {
    const deShortlist = shortlist.map((c, idx) => ({
      user_id: c.user_id,
      nombre: c.nombre,
      avatar_url: null,
      motivos: c.motivos,
      ficha: c.ficha,
      esPropuesto: true,
      posicion: idx + 1,
    }));
    const deMano = manualExtra.map((m) => ({
      user_id: m.user_id,
      nombre: m.nombre,
      avatar_url: m.avatar_url,
      motivos: [],
      ficha: fichasManual[m.user_id] ?? null,
      esPropuesto: false,
      posicion: null,
    }));
    return [...deShortlist, ...deMano];
  }, [shortlist, manualExtra, fichasManual]);

  const resultadosBusqueda = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q.length < 2) return [];
    const yaListados = new Set(candidatos.map((c) => c.user_id));
    return creadoresOrg
      .filter((u) => !yaListados.has(u.id))
      .filter((u) => (u.full_name ?? "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [busqueda, creadoresOrg, candidatos]);

  function alternarSeleccion(userId: string) {
    setSeleccionados((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function agregarAMano(u: { id: string; full_name: string | null; avatar_url: string | null }) {
    setManualExtra((prev) => [...prev, { user_id: u.id, nombre: u.full_name ?? "Sin nombre", avatar_url: u.avatar_url }]);
    setSeleccionados((prev) => (prev.includes(u.id) ? prev : [...prev, u.id]));
    setBusqueda("");
  }

  function quitarAgregadoAMano(userId: string) {
    setManualExtra((prev) => prev.filter((m) => m.user_id !== userId));
    setSeleccionados((prev) => prev.filter((id) => id !== userId));
  }

  async function handleConfirmar() {
    try {
      if (yaHayCreadorElegido) {
        const res = await readaptar(seleccionados);
        toast({
          title: "Creador cambiado",
          description:
            res.readaptados || res.nuevos
              ? `Se reescribieron ${res.readaptados} guiones con la nueva voz${
                  res.nuevos ? ` y se dejaron ${res.nuevos} pendientes de generar` : ""
                }${res.fallos ? `. ${res.fallos} no se pudieron reescribir — revísalos.` : "."}`
              : "El cambio quedó registrado.",
        });
      } else {
        await confirmar(seleccionados);
        toast({
          title: "Creador confirmado",
          description: `${clientName} ya tiene quién graba. El proceso sigue solo desde aquí.`,
        });
      }
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast({
        title: "No se pudo guardar",
        description: err instanceof Error ? err.message : "Inténtalo de nuevo en un momento.",
        variant: "destructive",
      });
    }
  }

  const sinNadaQueMostrar = !loading && !error && candidatos.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-1rem)] sm:w-full sm:max-w-4xl max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {yaHayCreadorElegido ? <RefreshCw className="h-5 w-5 text-violet-500" /> : <Sparkles className="h-5 w-5 text-violet-500" />}
            {yaHayCreadorElegido ? "Cambiar de creador" : "¿Quién va a grabar?"}
          </DialogTitle>
          <DialogDescription>
            {yaHayCreadorElegido
              ? `Proceso de ${clientName}. Elige a quién quieres que grabe ahora en vez del creador actual.`
              : `Estas son nuestras propuestas para ${clientName}. Elige a quién quieres que grabe — puedes elegir a más de uno, o buscar a otra persona de tu equipo que no esté en esta lista.`}
          </DialogDescription>
        </DialogHeader>

        {yaHayCreadorElegido && (
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Esto es lo que va a pasar</AlertTitle>
            <AlertDescription>
              Se reescribe la voz de los guiones que el cliente todavía no aprobó, para que suenen como el nuevo
              creador. Los guiones que el cliente ya aprobó no se tocan.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>No pudimos cargar la propuesta</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => refresh()}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-sm" />
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {sinNadaQueMostrar && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todavía no tenemos una propuesta automática lista. Busca abajo y elige a la persona que va a grabar.
              </p>
            )}

            {candidatos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {candidatos.map((candidato) => (
                  <CreatorCandidateCard
                    key={candidato.user_id}
                    candidato={candidato}
                    seleccionado={seleccionados.includes(candidato.user_id)}
                    onToggle={() => alternarSeleccion(candidato.user_id)}
                    onQuitar={!candidato.esPropuesto ? () => quitarAgregadoAMano(candidato.user_id) : undefined}
                  />
                ))}
              </div>
            )}

            {/* Elegir a mano a otra persona de la organización */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                ¿Prefieres a otra persona? Búscala aquí
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="pl-9"
                  aria-label="Buscar otro creador de la organización"
                />
              </div>
              {busqueda.trim().length >= 2 && (
                <div className="rounded-sm border border-border divide-y max-h-48 overflow-y-auto">
                  {resultadosBusqueda.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No encontramos a nadie con ese nombre.</p>
                  ) : (
                    resultadosBusqueda.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => agregarAMano(u)}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/60 transition-colors"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10">
                            {(u.full_name ?? "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{u.full_name ?? "Sin nombre"}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Cuántos guiones se generan. Nace de lo que el cliente pagó, pero
            el equipo decide: es el último momento para ajustarlo antes de que
            se escriban. */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">¿Cuántos guiones le hacemos?</p>
              <p className="text-xs text-muted-foreground">
                {videosDelPaquete
                  ? `Su paquete tiene ${videosDelPaquete} ${videosDelPaquete === 1 ? "video" : "videos"} contratados.`
                  : "Este cliente no tiene un paquete activo cargado."}
              </p>
            </div>
            <Input
              type="number"
              min={1}
              max={20}
              value={cantidadGuiones}
              onChange={(e) => setCantidadGuiones(e.target.value)}
              className="w-20"
              disabled={acting}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={acting || Number(cantidadGuiones) === scriptsTarget}
              onClick={async () => {
                try {
                  await cambiarCantidadDeGuiones(Number(cantidadGuiones));
                  toast({ title: `Se generarán ${cantidadGuiones} guiones` });
                } catch (e) {
                  toast({
                    title: "No se pudo cambiar la cantidad",
                    description: e instanceof Error ? e.message : undefined,
                    variant: "destructive",
                  });
                }
              }}
            >
              Guardar
            </Button>
          </div>
          {videosDelPaquete != null && Number(cantidadGuiones) > videosDelPaquete && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Ojo: vas a generar más guiones de los que el cliente pagó.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={acting || loading || seleccionados.length === 0} className="gap-2">
            {acting && <Loader2 className="h-4 w-4 animate-spin" />}
            {yaHayCreadorElegido
              ? "Cambiar de creador"
              : seleccionados.length > 1
                ? "Confirmar creadores"
                : "Confirmar creador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tarjeta comparable de un candidato ──────────────────────────────────

function CreatorCandidateCard({
  candidato,
  seleccionado,
  onToggle,
  onQuitar,
}: {
  candidato: CandidatoTarjeta;
  seleccionado: boolean;
  onToggle: () => void;
  onQuitar?: () => void;
}) {
  const { ficha } = candidato;
  const ubicacion = ficha ? formatUbicacion(ficha) : null;
  const detalles = ficha
    ? FICHA_LABELS.map(({ key }) => ficha[key]).filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];

  return (
    <div
      className={cn(
        "rounded-sm border p-3 flex flex-col gap-2.5 transition-colors",
        seleccionado ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          id={`candidato-${candidato.user_id}`}
          checked={seleccionado}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <label htmlFor={`candidato-${candidato.user_id}`} className="flex-1 min-w-0 cursor-pointer">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{candidato.nombre}</span>
            {candidato.posicion === 1 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 gap-0.5">
                <Sparkles className="h-2.5 w-2.5" /> Nuestra mejor opción
              </Badge>
            )}
            {!candidato.esPropuesto && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Elegido a mano
              </Badge>
            )}
          </div>
          {ubicacion && <p className="text-xs text-muted-foreground mt-0.5">{ubicacion}</p>}
        </label>
        {onQuitar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onQuitar();
            }}
            aria-label={`Quitar a ${candidato.nombre} de la selección`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!ficha && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Todavía no tiene su ficha creativa completa — sabemos poco de su estilo.
        </p>
      )}

      {ficha && (
        <>
          <div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span>Ficha creativa</span>
              <span>{ficha.completitud}% completa</span>
            </div>
            <Progress value={ficha.completitud} className="h-1.5" />
          </div>

          {detalles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {detalles.map((d) => (
                <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                  {d}
                </Badge>
              ))}
            </div>
          )}

          {ficha.nichos_afines.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ficha.nichos_afines.slice(0, 4).map((n) => (
                <Badge key={n} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                  {n}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}

      {candidato.motivos.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" /> Por qué lo proponemos
          </p>
          <ul className="text-xs space-y-0.5 pl-1">
            {candidato.motivos.map((m, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-muted-foreground">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ficha && ficha.restricciones.length > 0 ? (
        <Alert variant="destructive" className="py-2 px-2.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs pl-5">
            <span className="font-medium">No graba: </span>
            {ficha.restricciones.join(", ")}
          </AlertDescription>
        </Alert>
      ) : ficha ? (
        <p className="text-[11px] text-muted-foreground">Sin restricciones registradas.</p>
      ) : null}
    </div>
  );
}
