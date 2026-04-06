import { Skeleton } from '@/components/ui/skeleton';

export function TemplateCardSkeleton() {
  return (
    <article className="rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
      {/* Thumbnail */}
      <Skeleton className="w-full aspect-[4/3] rounded-none bg-gray-800" />

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Badge categoria */}
        <Skeleton className="h-5 w-20 rounded-full bg-gray-800" />

        {/* Nombre */}
        <Skeleton className="h-4 w-3/4 rounded bg-gray-800" />

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-5 rounded-full bg-gray-800" />
            <Skeleton className="h-3 w-20 rounded bg-gray-800" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-3 w-8 rounded bg-gray-800" />
            <Skeleton className="h-3 w-8 rounded bg-gray-800" />
          </div>
        </div>
      </div>
    </article>
  );
}
