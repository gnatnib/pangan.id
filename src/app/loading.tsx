export default function Loading() {
  return (
    <div className="container-page py-8">
      <div className="mb-6 overflow-hidden rounded-full bg-warm-100">
        <div className="h-1 w-1/3 animate-pulse rounded-full bg-brand-orange" />
      </div>

      <div className="mb-6">
        <div className="skeleton h-10 w-80 max-w-full mb-3" />
        <div className="skeleton h-4 w-64 max-w-full" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-3">
            <div className="skeleton h-3 w-20 mb-3" />
            <div className="skeleton h-7 w-12 mb-2" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-5 w-14 rounded-full" />
            </div>
            <div className="skeleton h-4 w-3/4 mb-5" />
            <div className="flex items-end justify-between">
              <div>
                <div className="skeleton h-7 w-24 mb-2" />
                <div className="skeleton h-3 w-14" />
              </div>
              <div className="skeleton h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
