export default function ReportsLoading() {
  return (
    <div className="px-4 py-5 space-y-4 max-w-screen-xl mx-auto lg:px-8">
      <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse"
          >
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-32 w-full bg-gray-100 rounded-lg" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
