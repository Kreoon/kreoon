import { useMemo, useState } from 'react';
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
import { Loader2, Search, Star, Ban, MapPin, Check } from 'lucide-react';
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
  onConfirmar: (creatorIds: string[]) => Promise<unknown>;
}

export function ElegirCreadorDialog({
  open,
  onOpenChange,
  clientId,
  recomendados,
  onConfirmar,
}: ElegirCreadorDialogProps) {
  const catalogo = useCreatorCatalog(open ? clientId : null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [visibles, setVisibles] = useState(POR_TANDA);

  const idsRecomendados = useMemo(
    () => new Set(recomendados.map((r) => r.user_id)),
    [recomendados],
  );

  // Los recomendados van arriba y no se repiten abajo.
  const resto = useMemo(
    () => catalogo.filtered.filter((c) => !idsRecomendados.has(c.user_id)),
    [catalogo.filtered, idsRecomendados],
  );

  const confirmar = async () => {
    if (!elegido) return;
    setGuardando(true);
    try {
      await onConfirmar([elegido]);
      onOpenChange(false);
    } finally {
      setGuardando(false);
    }
  };

  const nombreElegido = elegido
    ? catalogo.byId.get(elegido)?.nombre ??
      recomendados.find((r) => r.user_id === elegido)?.nombre
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 shrink-0">
          <DialogTitle>¿Quién va a grabar tus videos?</DialogTitle>
          <DialogDescription>
            Elige a la persona que mejor represente a tu marca. Vas a ver su trabajo antes de decidir.
          </DialogDescription>
        </DialogHeader>

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
                    elegido={elegido === r.user_id}
                    onElegir={() => setElegido(r.user_id)}
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
                      elegido={elegido === c.user_id}
                      onElegir={() => setElegido(c.user_id)}
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
          <Button onClick={confirmar} disabled={!elegido || guardando} className="gap-2">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {nombreElegido ? `Quiero a ${nombreElegido}` : 'Elige a alguien'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tarjeta de un creador ────────────────────────────────────────────────

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
        {elegido && <Check className="h-4 w-4 text-primary shrink-0" />}
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
