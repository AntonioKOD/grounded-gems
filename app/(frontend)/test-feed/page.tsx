import { getFeedPosts } from "@/app/actions"
import ResponsiveFeed from "@/components/feed/responsive-feed"

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

export default async function TestFeedPage() {
  try {
    const posts = await getFeedPosts("all", "recent", 1)

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Test Feed Page</h1>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
              <p><strong>Posts fetched:</strong> {posts?.length || 0}</p>
              <p><strong>Feed type:</strong> all</p>
              <p><strong>Sort by:</strong> recent</p>
              <p><strong>Page:</strong> 1</p>
              
              {posts && posts.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Sample Post Data:</h3>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(posts[0], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Feed Component</h2>
            </div>
            <ResponsiveFeed 
              initialPosts={posts || []}
              feedType="all"
              sortBy="recent"
              showPostForm={false}
            />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("TestFeedPage - Error fetching posts:", error)
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h1 className="text-xl font-bold text-red-800 mb-2">Error Loading Test Feed</h1>
            <p className="text-red-700">
              Failed to fetch posts: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      </div>
    )
  }
} 