import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export default function PostDetailSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Author info skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>

        {/* Title skeleton */}
        <Skeleton className="h-8 w-3/4 mt-4" />

        {/* Content skeleton */}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>

        {/* Image skeleton */}
        <Skeleton className="h-[400px] w-full mt-6 rounded-md" />
      </CardContent>

      <CardFooter className="px-6 py-4 border-t bg-gray-50 flex justify-between">
        <div className="flex items-center gap-6">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-8 w-10" />
      </CardFooter>
    </Card>
  )
}
