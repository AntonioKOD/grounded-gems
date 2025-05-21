import { Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import FeedContainer from "@/components/feed/feed-container"

export const dynamic = 'force-dynamic'
export const metadata = {
  title: "Local Buzz| Grounded Gems",
  description: "Dive into the buzz at Grounded Gems! Uncover fresh finds, genuine reviews, and hidden gems recommended by fellow explorers. Join the conversation and discover what everyone’s loving right now!",
}

export default async function FeedPage() {
  return (
    <main className="container py-6 md:py-10">
      <div className="mb-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Local Buzz</h1>
        <p className="text-muted-foreground mt-2">
          Discover the latest posts, reviews, and recommendations from the community.
        </p>
      </div>

      <Tabs defaultValue="for-you" className="max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="for-you">For You</TabsTrigger>
          <TabsTrigger value="all">Everyone&apos;s Talking</TabsTrigger>
        </TabsList>
        
        <TabsContent value="for-you">
          <Suspense fallback={<FeedSkeleton />}>
            <FeedContainer feedType="personalized" showPostForm={true} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="all">
          <Suspense fallback={<FeedSkeleton />}>
            <FeedContainer feedType="all" sortBy="recent" showPostForm={true} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="w-full h-[300px] rounded-lg" />
      ))}
    </div>
  )
}
