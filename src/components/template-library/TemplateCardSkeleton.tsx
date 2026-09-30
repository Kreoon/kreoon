import { Skeleton } from '@/components/ui/skeleton';

export function TemplateCardSkeleton() {
  return (
    <article className="rounded-xl overflow-hidden bg-card border border-border">
      {/* Thumbnail */}
      <Skeleton className="w-full aspect-[4/3] rounded-none bg-muted" />

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Badge categoria */}
        <Skeleton className="h-5 w-20 rounded-full bg-muted" />

        {/* Nombre */}
        <Skeleton className="h-4 w-3/4 rounded bg-muted" />

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-5 rounded-full bg-muted" />
            <Skeleton className="h-3 w-20 rounded bg-muted" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-3 w-8 rounded bg-muted" />
            <Skeleton className="h-3 w-8 rounded bg-muted" />
          </div>
        </div>
      </div>
    </article>
  );
}
