import { Suspense } from "react"
import type { Metadata } from "next"
import ExploreContainer from "@/components/explore/explore-container"
import ExploreSkeleton from "@/components/explore/explore-skeleton"

export const metadata: Metadata = {
  title: "Explore | Local Explorer",
  description: "Discover new places, reviews, and recommendations in your area",
}

export default function ExplorePage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Explore</h1>
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreContainer />
      </Suspense>
    </div>
  )
}
