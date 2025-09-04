import { notFound } from 'next/navigation'

interface PostPageProps {
  params: Promise<{
    username: string
    postId: string
  }>
}

export default async function PostPage({ params }: PostPageProps) {
  const { username, postId } = await params

  // This is a placeholder route - you can implement the actual post detail page here
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Post Detail Page
          </h1>
          <div className="bg-gray-100 rounded-lg p-8">
            <p className="text-gray-600 mb-4">
              This is a placeholder for the post detail page.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p><strong>Username:</strong> {username}</p>
              <p><strong>Post ID:</strong> {postId}</p>
            </div>
            <div className="mt-6">
              <a 
                href={`/test-profile-grid`}
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ← Back to Profile Grid Test
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Generate metadata for the page
export async function generateMetadata({ params }: PostPageProps) {
  const { username, postId } = await params
  
  return {
    title: `@${username} - Post ${postId}`,
    description: `View post by @${username}`,
  }
}
