export function CreatorCardSkeleton() {
  return (
    <div
      className="animate-pulse"
      role="status"
      aria-label="Cargando perfil de creador"
      aria-busy="true"
    >
      {/* Marco principal — 9:16 para coincidir con CreatorCard */}
      <div className="aspect-[9/16] rounded-xl bg-muted/40 relative overflow-hidden">
        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite]" />

        {/* Footer simulado */}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-3 pt-6 space-y-2">
          {/* Nombre */}
          <div className="h-3.5 rounded bg-muted/60 w-3/4" />
          {/* Ubicacion */}
          <div className="h-2.5 rounded bg-muted/40 w-1/2" />
          {/* Precio */}
          <div className="h-2.5 rounded bg-purple-500/10 w-2/5" />
        </div>
      </div>
    </div>
  );
}
