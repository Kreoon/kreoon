import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, Star, Ban, MapPin, Check, ArrowLeft, Plus, Minus, X } from 'lucide-react';
import { useCreatorCatalog, type CreatorCatalogEntry } from '@/hooks/useCreatorCatalog';
import type { CreatorShortlistCandidate } from '@/hooks/useClientPipeline';

/** Cuántos creadores se pintan de golpe. Con ~300 en catálogo, pintarlos todos
 *  cuelga el móvil; el resto entra con "Ver más". */
const POR_TANDA = 12;

interface ElegirCreadorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  /** Los que el sistema propone, con su porqué ya escrito en castellano. */
  recomendados: CreatorShortlistCandidate[];
  /** Cuántos videos hay que repartir en total (run.scripts_target). */
  totalGuiones: number;
  /** Selección ya guardada, para reabrir el diálogo en modo "Cambiar" sin partir de cero. */
  seleccionInicial?: string[];
  /** Reparto ya guardado (id de usuario → cantidad), idem. */
  repartoInicial?: Record<string, number>;
  onConfirmar: (creatorIds: string[], allocation: Record<string, number>) => Promise<unknown>;
}

/** Reparte `total` entre `ids` lo más parejo posible, sin que nadie quede en 0. */
function repartoParejo(ids: string[], total: number): Record<string, number> {
  const n = ids.length;
  if (n === 0) return {};

  const base = Math.max(1, Math.floor(total / n));
  const resultado: Record<string, number> = {};
  ids.forEach((id) => { resultado[id] = base; });

  // El resto (o el faltante, si `total` alcanzaba menos que 1 por persona) se
  // va repartiendo de a uno, empezando por los primeros de la lista.
  let diferencia = total - base * n;
  let vuelta = 0;
  while (diferencia !== 0 && vuelta < n * 2) {
    const id = ids[vuelta % n];
    if (diferencia > 0) {
      resultado[id] += 1;
      diferencia -= 1;
    } else if (resultado[id] > 1) {
      resultado[id] -= 1;
      diferencia += 1;
    }
    vuelta += 1;
  }
  return resultado;
}

/**
 * Reparte manteniendo lo que ya estaba asignado y solo completa a quien
 * entra nuevo — así, al volver al paso 1 y agregar a alguien, no se pierde
 * lo que el cliente ya había ajustado a mano para los demás.
 */
function repartoConNuevos(
  ids: string[],
  previo: Record<string, number>,
  total: number,
): Record<string, number> {
  const conocidos = ids.filter((id) => typeof previo[id] === 'number' && previo[id] > 0);
  const nuevos = ids.filter((id) => !conocidos.includes(id));

  const resultado: Record<string, number> = {};
  conocidos.forEach((id) => { resultado[id] = previo[id]; });
  if (nuevos.length === 0) return resultado;

  const usados = conocidos.reduce((suma, id) => suma + resultado[id], 0);
  const nuevoReparto = repartoParejo(nuevos, total - usados);
  nuevos.forEach((id) => { resultado[id] = nuevoReparto[id]; });
  return resultado;
}

export function ElegirCreadorDialog({
  open,
  onOpenChange,
  clientId,
  recomendados,
  totalGuiones,
  seleccionInicial,
  repartoInicial,
  onConfirmar,
}: ElegirCreadorDialogProps) {
  const catalogo = useCreatorCatalog(open ? clientId : null);
  // Se puede elegir a varias personas: repartir los videos entre dos o tres
  // creadores es lo normal cuando la marca quiere caras distintas.
  const [elegidos, setElegidos] = useState<string[]>([]);
  // Paso 1: a quién. Paso 2: cuántos videos le tocan a cada quien.
  const [paso, setPaso] = useState<1 | 2>(1);
  const [reparto, setReparto] = useState<Record<string, number>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [visibles, setVisibles] = useState(POR_TANDA);

  // Cada vez que se abre el diálogo se parte de la selección/reparto ya
  // guardados (si los hay) y siempre desde el paso 1: así "Cambiar" deja ver
  // de nuevo a quién se eligió antes de tocar los números.
  useEffect(() => {
    if (open) {
      setElegidos(seleccionInicial ?? []);
      setReparto(repartoInicial ?? {});
      setPaso(1);
      setErrorGuardado(null);
      setVisibles(POR_TANDA);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const alternar = (userId: string) =>
    setElegidos((previos) =>
      previos.includes(userId)
        ? previos.filter((id) => id !== userId)
        : [...previos, userId],
    );

  const idsRecomendados = useMemo(
    () => new Set(recomendados.map((r) => r.user_id)),
    [recomendados],
  );

  // Los recomendados van arriba y no se repiten abajo.
  const resto = useMemo(
    () => catalogo.filtered.filter((c) => !idsRecomendados.has(c.user_id)),
    [catalogo.filtered, idsRecomendados],
  );

  const nombreDe = (userId: string) =>
    catalogo.byId.get(userId)?.nombre ??
    recomendados.find((r) => r.user_id === userId)?.nombre ??
    'Creador';

  const avatarDe = (userId: string) => catalogo.byId.get(userId)?.avatar_url ?? undefined;

  // Con una sola persona se dice su nombre; con varias, cuántas son.
  const textoContinuar =
    elegidos.length === 0
      ? 'Elige a alguien'
      : elegidos.length === 1
        ? `Continuar con ${nombreDe(elegidos[0])}`
        : `Repartir los videos entre ${elegidos.length}`;

  const avanzarAReparto = () => {
    if (elegidos.length === 0) return;
    setReparto((previo) => repartoConNuevos(elegidos, previo, totalGuiones));
    setPaso(2);
  };

  const quitarDelReparto = (userId: string) => {
    setElegidos((previos) => previos.filter((id) => id !== userId));
    setReparto((previo) => {
      const { [userId]: _quitado, ...resto } = previo;
      return resto;
    });
  };

  const cambiarCantidad = (userId: string, delta: number) =>
    setReparto((previo) => ({
      ...previo,
      [userId]: Math.max(1, (previo[userId] ?? 1) + delta),
    }));

  const sumaActual = elegidos.reduce((suma, id) => suma + (reparto[id] ?? 0), 0);
  const diferencia = totalGuiones - sumaActual;
  const repartoCuadra = elegidos.length > 0 && diferencia === 0;

  const confirmar = async () => {
    if (!repartoCuadra) return;
    setGuardando(true);
    setErrorGuardado(null);
    try {
      await onConfirmar(elegidos, reparto);
      onOpenChange(false);
    } catch (err) {
      // Defensa: el botón ya está deshabilitado si el reparto no cuadra, pero
      // si el backend igual lo rechaza (por ejemplo por una carrera con otra
      // pestaña), el cliente necesita ver por qué no se guardó.
      setErrorGuardado(err instanceof Error ? err.message : 'No pudimos guardar el reparto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0">
        {paso === 1 ? (
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 shrink-0">
            <DialogTitle>¿Quién va a grabar tus videos?</DialogTitle>
            <DialogDescription>
              Elige a quienes mejor representen a tu marca. Puedes marcar a más de una
              persona y repartir los videos entre ellas. Vas a ver su trabajo antes de decidir.
            </DialogDescription>
          </DialogHeader>
        ) : (
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 shrink-0">
            <DialogTitle>¿Cuántos videos graba cada uno?</DialogTitle>
            <DialogDescription>
              Reparte tus {totalGuiones} videos entre las personas que elegiste. Puedes
              cambiar los números o volver atrás para agregar o quitar a alguien.
            </DialogDescription>
          </DialogHeader>
        )}

        {paso === 1 ? (
          <>
            {/* Con el catálogo paginado es fácil perder de vista a quién llevas
                marcado. Esta fila lo recuerda y permite quitar a alguien de un clic. */}
            {elegidos.length > 0 && (
              <div className="px-4 sm:px-6 pb-3 shrink-0 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Tu elección:</span>
                {elegidos.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => alternar(id)}
                  >
                    {nombreDe(id)} ✕
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 space-y-6">
              {/* Los que proponemos, con el motivo */}
              {recomendados.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">Los que te recomendamos</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {recomendados.map((r) => (
                      <TarjetaCreador
                        key={r.user_id}
                        creador={catalogo.byId.get(r.user_id)}
                        nombreRespaldo={r.nombre}
                        motivos={r.motivos}
                        elegido={elegidos.includes(r.user_id)}
                        onElegir={() => alternar(r.user_id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Todo el catálogo */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">O busca entre todos</h3>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={catalogo.search}
                    onChange={(e) => {
                      catalogo.setSearch(e.target.value);
                      setVisibles(POR_TANDA);
                    }}
                    placeholder="Buscar por nombre…"
                    className="pl-9"
                  />
                </div>

                {(catalogo.ciudades.length > 0 || catalogo.nichos.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {catalogo.ciudad && (
                      <Badge
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => catalogo.setCiudad(null)}
                      >
                        {catalogo.ciudad} ✕
                      </Badge>
                    )}
                    {!catalogo.ciudad &&
                      catalogo.ciudades.slice(0, 6).map((c) => (
                        <Badge
                          key={c}
                          variant="outline"
                          className="cursor-pointer gap-1"
                          onClick={() => {
                            catalogo.setCiudad(c);
                            setVisibles(POR_TANDA);
                          }}
                        >
                          <MapPin className="h-3 w-3" />
                          {c}
                        </Badge>
                      ))}
                  </div>
                )}

                {catalogo.loading ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-40 w-full rounded-lg" />
                    ))}
                  </div>
                ) : catalogo.error ? (
                  <p className="text-sm text-muted-foreground">{catalogo.error}</p>
                ) : resto.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No encontramos a nadie con esa búsqueda. Prueba con otro nombre.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {resto.slice(0, visibles).map((c) => (
                        <TarjetaCreador
                          key={c.user_id}
                          creador={c}
                          elegido={elegidos.includes(c.user_id)}
                          onElegir={() => alternar(c.user_id)}
                        />
                      ))}
                    </div>
                    {resto.length > visibles && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setVisibles((v) => v + POR_TANDA)}
                      >
                        Ver más ({resto.length - visibles} restantes)
                      </Button>
                    )}
                  </>
                )}
              </section>
            </div>

            <DialogFooter className="px-4 sm:px-6 py-4 border-t shrink-0 gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Ahora no
              </Button>
              <Button onClick={avanzarAReparto} disabled={elegidos.length === 0}>
                {textoContinuar}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Contador bien visible: es lo primero que hay que ver en este paso. */}
            <div className="px-4 sm:px-6 pb-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  Repartidos {sumaActual} de {totalGuiones}
                </p>
                {diferencia !== 0 && (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {diferencia > 0 ? `Faltan ${diferencia}` : `Sobran ${Math.abs(diferencia)}`}
                  </span>
                )}
              </div>
              <Progress
                value={totalGuiones > 0 ? Math.min(100, (sumaActual / totalGuiones) * 100) : 0}
                className="h-1.5 mt-2"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 space-y-2">
              {elegidos.map((id) => (
                <FilaReparto
                  key={id}
                  nombre={nombreDe(id)}
                  avatarUrl={avatarDe(id)}
                  cantidad={reparto[id] ?? 1}
                  onSumar={() => cambiarCantidad(id, 1)}
                  onRestar={() => cambiarCantidad(id, -1)}
                  onQuitar={() => quitarDelReparto(id)}
                />
              ))}

              {errorGuardado && (
                <p className="text-sm text-destructive">{errorGuardado}</p>
              )}
            </div>

            <DialogFooter className="px-4 sm:px-6 py-4 border-t shrink-0 gap-2 sm:gap-0 flex-wrap">
              <Button variant="outline" className="gap-1.5" onClick={() => setPaso(1)}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setReparto(repartoParejo(elegidos, totalGuiones))}
              >
                Repartir parejo
              </Button>
              <Button onClick={confirmar} disabled={!repartoCuadra || guardando} className="gap-2">
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar reparto
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Tarjeta de un creador (paso 1) ───────────────────────────────────────

function TarjetaCreador({
  creador,
  nombreRespaldo,
  motivos,
  elegido,
  onElegir,
}: {
  creador?: CreatorCatalogEntry;
  /** Si el catálogo aún no cargó, al menos se ve el nombre del recomendado. */
  nombreRespaldo?: string;
  motivos?: string[];
  elegido: boolean;
  onElegir: () => void;
}) {
  const nombre = creador?.nombre ?? nombreRespaldo ?? 'Creador';
  const iniciales = nombre.slice(0, 2).toUpperCase();
  const muestras = creador?.muestras ?? [];

  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={elegido}
      className={`text-left rounded-lg border p-3 transition-all hover:border-primary/50 ${
        elegido ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={creador?.avatar_url ?? undefined} alt={nombre} />
          <AvatarFallback>{iniciales}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm leading-tight truncate">{nombre}</p>
          {creador?.ciudad && (
            <p className="text-xs text-muted-foreground truncate">{creador.ciudad}</p>
          )}
        </div>
        {/* La casilla se ve siempre, marcada o no: es lo que le dice al cliente
            que puede elegir a varias personas y no solo a una. */}
        <span
          aria-hidden
          className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center transition-colors ${
            elegido ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
          }`}
        >
          {elegido && <Check className="h-3.5 w-3.5" />}
        </span>
      </div>

      {/* Por qué lo proponemos (solo los recomendados) */}
      {!!motivos?.length && (
        <ul className="mt-2 space-y-0.5">
          {motivos.slice(0, 2).map((m, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-snug">
              · {m}
            </li>
          ))}
        </ul>
      )}

      {/* Lo que se le da bien */}
      {!!creador?.formatos_fuertes?.length && (
        <div className="mt-2 flex flex-wrap gap-1">
          {creador.formatos_fuertes.slice(0, 3).map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">
              {f}
            </Badge>
          ))}
        </div>
      )}

      {/* Trabajos suyos: se juzga por lo que se ve, no por la ficha */}
      {muestras.length > 0 && (
        <div className="mt-2 flex gap-1">
          {muestras.slice(0, 3).map((m, i) => (
            <div key={i} className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
              {m.thumbnail_url && (
                <img
                  src={m.thumbnail_url}
                  alt={m.titulo ?? 'Trabajo del creador'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lo que no graba: es información útil, no un defecto */}
      {!!creador?.restricciones?.length && (
        <p className="mt-2 text-[11px] text-muted-foreground flex items-start gap-1">
          <Ban className="h-3 w-3 mt-0.5 shrink-0" />
          <span>No graba: {creador.restricciones.slice(0, 2).join(', ')}</span>
        </p>
      )}
    </button>
  );
}

// ── Fila de reparto (paso 2) ─────────────────────────────────────────────

function FilaReparto({
  nombre,
  avatarUrl,
  cantidad,
  onSumar,
  onRestar,
  onQuitar,
}: {
  nombre: string;
  avatarUrl?: string;
  cantidad: number;
  onSumar: () => void;
  onRestar: () => void;
  onQuitar: () => void;
}) {
  const iniciales = nombre.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={avatarUrl} alt={nombre} />
        <AvatarFallback>{iniciales}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{nombre}</p>
        <p className="text-xs text-muted-foreground">
          {cantidad} {cantidad === 1 ? 'video' : 'videos'}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onRestar}
          disabled={cantidad <= 1}
          aria-label={`Quitarle un video a ${nombre}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-6 text-center text-sm font-medium tabular-nums">{cantidad}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onSumar}
          aria-label={`Darle un video más a ${nombre}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onQuitar}
        aria-label={`Quitar a ${nombre} de la lista`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
