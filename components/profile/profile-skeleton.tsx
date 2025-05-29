import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header Section Skeleton */}
      <div className="relative bg-gradient-to-r from-[#FF6B6B] via-[#FF8E53] to-[#FFD93D] pb-32">
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <Skeleton className="h-8 w-20 bg-white/20" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 bg-white/20" />
            <Skeleton className="h-8 w-8 bg-white/20" />
          </div>
        </div>
      </div>

      {/* Profile Content Skeleton */}
      <div className="relative -mt-24 z-10 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Profile Card Skeleton */}
          <Card className="mb-6 overflow-hidden shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-0">
              {/* Profile Header Skeleton */}
              <div className="p-6 pb-4">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Avatar Skeleton */}
                  <div className="relative">
                    <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-full" />
                  </div>

                  {/* Profile Info Skeleton */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-3">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-full max-w-md" />
                        <Skeleton className="h-4 w-full max-w-sm" />
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Section Skeleton */}
              <div className="px-6 py-4 bg-gray-50/50 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-12 mx-auto" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-12 mx-auto" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-12 mx-auto" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs Skeleton */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
            <div className="p-6">
              {/* Tabs Skeleton */}
              <div className="w-full h-12 bg-gray-100/50 p-1 rounded-lg mb-6 flex gap-1">
                <Skeleton className="flex-1 h-10 rounded-md" />
                <Skeleton className="flex-1 h-10 rounded-md" />
                <Skeleton className="flex-1 h-10 rounded-md" />
              </div>

              {/* Content Skeleton */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-gray-200">
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                  <Card className="border-gray-200">
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </Card>
                </div>

                <Card className="border-gray-200">
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-32" />
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </Card>

                <Card className="border-gray-200">
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-18" />
                      <Skeleton className="h-6 w-22" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
