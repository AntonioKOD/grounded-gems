import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function ExploreSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Filters sidebar skeleton */}
      <div className="hidden md:block md:col-span-3 lg:col-span-2">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />

          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-8 w-full" />
          </div>

          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="col-span-12 md:col-span-9 lg:col-span-10">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0 overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}
