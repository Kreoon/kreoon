export function OrgProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Cover skeleton */}
      <div className="h-48 md:h-64 bg-white/5" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="flex items-end gap-4">
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/10 border-4 border-[#0a0a0f]" />
          <div className="flex-1 pb-1 space-y-2">
            <div className="h-7 w-48 bg-white/5 rounded" />
            <div className="h-4 w-80 bg-white/5 rounded" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="flex gap-6 mt-4 pb-4">
          <div className="h-5 w-24 bg-white/5 rounded" />
          <div className="h-5 w-20 bg-white/5 rounded" />
          <div className="h-5 w-28 bg-white/5 rounded" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex gap-4 border-b border-white/5 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 w-20 bg-white/5 rounded" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          <div className="h-4 w-full bg-white/5 rounded" />
          <div className="h-4 w-3/4 bg-white/5 rounded" />
          <div className="h-4 w-1/2 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}
