export function CreatorCardSkeleton() {
  return (
    <div
      className="animate-pulse"
      role="status"
      aria-label="Cargando perfil de creador"
      aria-busy="true"
      // Fixed dimensions to prevent CLS
      style={{
        aspectRatio: '9/16',
        minHeight: '320px', // Matches CARD_HEIGHT from CreatorCard
        contain: 'layout style paint' // CSS containment for performance
      }}
    >
      {/* Marco principal — 9:16 para coincidir con CreatorCard */}
      <div className="h-full w-full rounded-xl bg-muted/40 dark:bg-[#1a1a35] relative overflow-hidden">
        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite]" />

        {/* Footer simulado - fixed positioning to match actual card */}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-3 pt-6 space-y-2">
          {/* Nombre */}
          <div className="h-3.5 rounded bg-muted/60 dark:bg-white/10 w-3/4" />
          {/* Ubicacion */}
          <div className="h-2.5 rounded bg-muted/40 dark:bg-white/5 w-1/2" />
          {/* Precio */}
          <div className="h-2.5 rounded bg-purple-500/10 w-2/5" />
        </div>
      </div>
    </div>
  );
}
