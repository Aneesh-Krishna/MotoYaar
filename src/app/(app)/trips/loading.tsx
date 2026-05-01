export default function TripsLoading() {
  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto lg:px-8 space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-56 bg-gray-200 rounded" />
              <div className="h-4 w-36 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
