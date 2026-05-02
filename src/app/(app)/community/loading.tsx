export default function CommunityLoading() {
  return (
    <div className="px-4 py-4 max-w-screen-xl mx-auto lg:px-8">
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-100 rounded" />
                <div className="h-4 w-4/5 bg-gray-100 rounded" />
              </div>
              <div className="flex gap-4 pt-1">
                <div className="h-4 w-12 bg-gray-100 rounded" />
                <div className="h-4 w-12 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
