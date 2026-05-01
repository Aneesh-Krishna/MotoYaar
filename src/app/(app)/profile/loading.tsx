export default function ProfileLoading() {
  return (
    <div className="px-4 py-5 space-y-5 max-w-screen-xl mx-auto lg:px-8">
      {/* Profile header skeleton */}
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse shrink-0" />
        <div className="flex-1 pt-1 space-y-2">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse shrink-0" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 bg-white rounded-xl border border-gray-200">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center py-4 gap-1.5"
            style={{ borderRight: i < 2 ? "1px solid #e5e7eb" : undefined }}
          >
            <div className="h-7 w-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Action cards skeleton */}
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
            <div className="w-4 h-4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
