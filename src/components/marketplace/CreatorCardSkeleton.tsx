export function CreatorCardSkeleton() {
  return (
    /*
     * CLS fix: width + aspect-ratio juntos garantizan que el navegador
     * reserve el espacio vertical antes de que haya contenido real.
     * contain: layout style paint evita que el shimmer afecte al resto del DOM.
     */
    <div
      className="animate-pulse w-full"
      role="status"
      aria-label="Cargando perfil de creador"
      aria-busy="true"
      style={{
        aspectRatio: '9 / 16',
        contain: 'layout style paint',
      }}
    >
      {/* Marco principal — 9:16 para coincidir con CreatorCard */}
      <div className="h-full w-full rounded-xl bg-muted/40 dark:bg-[#1a1a35] relative overflow-hidden">
        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite]" />

        {/* Footer simulado — estructura idéntica a la card real para evitar reflow */}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-3 pt-6 space-y-2">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-muted/60 dark:bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 rounded bg-muted/60 dark:bg-white/10 w-3/4" />
              <div className="h-2.5 rounded bg-muted/40 dark:bg-white/5 w-1/2" />
            </div>
          </div>
          {/* Categoria + precio */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-5 rounded bg-muted/40 dark:bg-white/5 w-2/5" />
            <div className="h-5 rounded bg-purple-500/10 w-1/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
