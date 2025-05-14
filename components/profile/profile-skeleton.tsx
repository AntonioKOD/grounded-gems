import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Cover image skeleton */}
      <Skeleton className="h-48 w-full rounded-xl" />

      {/* Profile info skeleton */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 md:-mt-20 px-4">
        <Skeleton className="h-32 w-32 rounded-full border-4 border-white" />

        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>

        <Skeleton className="h-10 w-28" />
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
