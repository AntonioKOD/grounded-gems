import { Skeleton } from "@/components/ui/skeleton"

export default function PostsGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square" style={{ animationDelay: `${i * 50}ms` }}>
          <Skeleton className="w-full h-full rounded-md animate-pulse" />
        </div>
      ))}
    </div>
  )
} 