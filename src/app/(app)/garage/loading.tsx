export default function GarageLoading() {
  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto lg:px-8 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="flex gap-6 pt-1">
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
