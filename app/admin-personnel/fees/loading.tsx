export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="space-y-2 flex-1">
            <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>

        {/* Search Card Skeleton */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg space-y-4">
          <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg space-y-4">
          <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
