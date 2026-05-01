export default function VehicleDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Vehicle header skeleton */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-4 max-w-screen-xl mx-auto">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-1 px-4 max-w-screen-xl mx-auto">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-20 bg-gray-100 rounded animate-pulse my-2"
            />
          ))}
        </div>
      </div>

      {/* Content area skeleton */}
      <div className="px-4 py-5 space-y-4 max-w-screen-xl mx-auto">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* List items skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="w-4 h-4 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
