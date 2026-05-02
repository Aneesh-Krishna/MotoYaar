export default function AppLoading() {
  return (
    <div className="px-4 py-5 space-y-6 max-w-screen-xl mx-auto lg:px-8">
      {/* Greeting skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
      </div>

      {/* Vehicle carousel skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-40 h-36 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Recent activity skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
