import { Suspense } from "react"
import { Metadata } from "next"
import { 
  getDiscoverFeed, 
  getPopularFeed, 
  getLatestFeed, 
  getSavedPostsFeed 
} from "@/app/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Flame, Clock, BookmarkIcon } from "lucide-react"
import type { Post } from "@/types/feed"

export const metadata: Metadata = {
  title: "Feed Algorithms Test | Grounded Gems",
  description: "Test page for different feed algorithms",
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface FeedSectionProps {
  title: string
  icon: React.ReactNode
  posts: Post[]
  description: string
}

function FeedSection({ title, icon, posts, description }: FeedSectionProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="outline">{posts.length} posts</Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-gray-500 italic">No posts found</p>
          ) : (
            posts.slice(0, 3).map((post) => (
              <div key={post.id} className="border-l-4 border-[#FF6B6B] pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{post.author.name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  {post.type !== "post" && (
                    <Badge variant="outline" className="text-xs">
                      {post.type}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {post.content.substring(0, 100)}
                  {post.content.length > 100 && "..."}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>❤️ {post.likeCount}</span>
                  <span>💬 {post.commentCount}</span>
                  <span>🔗 {post.shareCount}</span>
                  <span>🔖 {post.saveCount}</span>
                  {post.location && (
                    <span>📍 {typeof post.location === 'string' ? post.location : post.location.name}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function TestFeedAlgorithmsPage() {
  // Test with a sample user ID (you can change this to test with different users)
  const testUserId = "sample-user-id"
  
  // Fetch posts using different algorithms
  let discoverPosts: Post[] = []
  let popularPosts: Post[] = []
  let latestPosts: Post[] = []
  let savedPosts: Post[] = []

  try {
    console.log("Testing feed algorithms...")
    
    // Test Discover Algorithm
    discoverPosts = await getDiscoverFeed(testUserId, 1, 10)
    console.log(`Discover feed: ${discoverPosts.length} posts`)
    
    // Test Popular Algorithm (7 days)
    popularPosts = await getPopularFeed(testUserId, 1, 10, '7d')
    console.log(`Popular feed: ${popularPosts.length} posts`)
    
    // Test Latest Algorithm
    latestPosts = await getLatestFeed(testUserId, 1, 10)
    console.log(`Latest feed: ${latestPosts.length} posts`)
    
    // Test Saved Posts Algorithm
    savedPosts = await getSavedPostsFeed(testUserId, 1, 10)
    console.log(`Saved feed: ${savedPosts.length} posts`)
    
  } catch (error) {
    console.error("Error testing feed algorithms:", error)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Feed Algorithms Test
          </h1>
          <p className="text-gray-600">
            Testing different feed algorithms with current data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FeedSection
            title="Discover Feed"
            icon={<Sparkles className="h-5 w-5 text-purple-500" />}
            posts={discoverPosts}
            description="Personalized discovery algorithm that balances engagement, freshness, diversity, and quality. Favors posts from new authors and trending content."
          />

          <FeedSection
            title="Popular Feed"
            icon={<Flame className="h-5 w-5 text-red-500" />}
            posts={popularPosts}
            description="Weighted engagement scoring with time decay. Prioritizes posts with high likes, comments, shares, and saves from the last 7 days."
          />

          <FeedSection
            title="Latest Feed"
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            posts={latestPosts}
            description="Chronological feed with minimal quality filtering. Shows the most recent posts with basic content and engagement requirements."
          />

          <FeedSection
            title="Saved Posts"
            icon={<BookmarkIcon className="h-5 w-5 text-yellow-500" />}
            posts={savedPosts}
            description="User's saved posts ordered by when they were saved (most recent first). Only shows posts that are still published."
          />
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Algorithm Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-purple-600 mb-2">🔍 Discover Algorithm</h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• 40% Engagement Score (likes × 3 + comments × 5 + shares × 7 + saves × 4)</li>
                <li>• 25% Freshness Score (sweet spot: 2-24 hours old)</li>
                <li>• 20% Diversity Score (boost posts from unfollowed authors)</li>
                <li>• 15% Quality Indicators (images, locations, reviews, content length)</li>
                <li>• Bonus for trending momentum and location relevance</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-red-600 mb-2">🔥 Popular Algorithm</h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Weighted scoring: likes × 1.0 + comments × 3.0 + shares × 5.0 + saves × 2.5</li>
                <li>• Exponential time decay over 48 hours</li>
                <li>• Viral bonus for high engagement rate (&gt;10 interactions/hour)</li>
                <li>• Configurable timeframe (24h, 7d, 30d)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">⏰ Latest Algorithm</h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Simple chronological sort (newest first)</li>
                <li>• Quality filter: content length &gt; 10 characters</li>
                <li>• Engagement filter: has likes/comments OR is less than 24h old</li>
                <li>• Optional category filtering</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-yellow-600 mb-2">🔖 Saved Posts Algorithm</h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Fetches user's saved post IDs from profile</li>
                <li>• Sorts by save order (most recently saved first)</li>
                <li>• Filters out unpublished posts</li>
                <li>• Supports pagination for large saved collections</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
} 