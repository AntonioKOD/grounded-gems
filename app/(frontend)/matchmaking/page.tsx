import { Suspense } from "react"
import { MatchmakingContainer } from "@/components/matchmaking/matchmaking-container"
import { MatchmakingSearch } from "@/components/matchmaking/matchmaking-search"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Sports Matchmaking | Find Your Perfect Match",
  description:
    "Join matchmaking sessions and get paired with players of similar skill levels for your favorite sports.",
}

export default function MatchmakingPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-2">Sports Matchmaking</h1>
      <p className="text-muted-foreground mb-6">Find the perfect match for your skill level and preferences</p>

      {/* Search component */}
      <div className="mb-8">
        <MatchmakingSearch />
      </div>

      {/* Main content with suspense */}
      <Suspense fallback={<MatchmakingContainerSkeleton />}>
        <MatchmakingContainer />
      </Suspense>
    </div>
  )
}

function MatchmakingContainerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-[320px] w-full rounded-lg" />
          ))}
      </div>
    </div>
  )
}
