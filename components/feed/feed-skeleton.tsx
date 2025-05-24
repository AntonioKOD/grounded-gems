import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function FeedSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="ml-3">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Post title (for some cards) */}
            {index % 2 === 0 && (
              <Skeleton className="h-6 w-3/4 mb-3" />
            )}
            
            {/* Content skeleton */}
            <div className="space-y-2 mb-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
            
            {/* Image skeleton (for some cards) */}
            {index % 2 === 0 && (
              <Skeleton className="w-full aspect-video rounded-lg mt-4" />
            )}
          </CardContent>
          
          <CardFooter className="border-t flex justify-between py-3">
            <div className="flex space-x-6">
              <Skeleton className="h-10 w-20 rounded-full" />
              <Skeleton className="h-10 w-20 rounded-full" />
            </div>
            <div className="flex space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
