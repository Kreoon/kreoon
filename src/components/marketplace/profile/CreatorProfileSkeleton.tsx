export function CreatorProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-4">
        <div className="h-4 w-60 rounded bg-white/5" />
      </div>

      {/* Gallery skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[450px]">
          <div className="col-span-2 row-span-2 bg-white/5" />
          <div className="bg-white/5" />
          <div className="bg-white/5" />
          <div className="bg-white/5" />
          <div className="bg-white/5" />
        </div>
        <div className="md:hidden aspect-[4/5] rounded-2xl bg-white/5" />
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex gap-12">
          {/* Main content */}
          <div className="flex-1 space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5" />
              <div className="space-y-2 flex-1">
                <div className="h-7 w-48 rounded bg-white/5" />
                <div className="h-4 w-36 rounded bg-white/5" />
                <div className="h-4 w-28 rounded bg-white/5" />
                <div className="h-4 w-40 rounded bg-white/5" />
              </div>
            </div>

            {/* About */}
            <div className="space-y-3">
              <div className="h-6 w-32 rounded bg-white/5" />
              <div className="h-4 w-full rounded bg-white/5" />
              <div className="h-4 w-full rounded bg-white/5" />
              <div className="h-4 w-3/4 rounded bg-white/5" />
            </div>

            {/* Services */}
            <div className="space-y-3">
              <div className="h-6 w-48 rounded bg-white/5" />
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-xl bg-white/5" />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-white/5" />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-[380px] flex-shrink-0">
            <div className="h-[500px] rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
