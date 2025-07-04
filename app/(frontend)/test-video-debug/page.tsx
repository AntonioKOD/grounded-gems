import { Suspense } from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Loader2 } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

async function VideoDebugContent() {
  const payload = await getPayload({ config })
  
  // Get recent posts with videos
  const postsWithVideos = await payload.find({
    collection: 'posts',
    where: {
      video: { exists: true }
    },
    limit: 5,
    depth: 2,
    sort: '-createdAt'
  })

  // Get recent media items that are videos
  const videoMedia = await payload.find({
    collection: 'media',
    where: {
      mimeType: { contains: 'video/' }
    },
    limit: 10,
    sort: '-createdAt'
  })

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Video Debug Page</h1>
      
      <div className="space-y-8">
        {/* Video Media Debug */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Video Media Items ({videoMedia.docs.length})</h2>
          {videoMedia.docs.length === 0 ? (
            <p className="text-gray-500">No video media items found</p>
          ) : (
            <div className="space-y-4">
              {videoMedia.docs.map((media: any) => (
                <div key={media.id} className="border p-4 rounded">
                  <div className="mb-2">
                    <strong>ID:</strong> {media.id}
                  </div>
                  <div className="mb-2">
                    <strong>Filename:</strong> {media.filename}
                  </div>
                  <div className="mb-2">
                    <strong>MIME Type:</strong> {media.mimeType}
                  </div>
                  <div className="mb-2">
                    <strong>Size:</strong> {media.filesize ? `${(media.filesize / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                  </div>
                  <div className="mb-2">
                    <strong>URL:</strong> {media.url || 'No URL'}
                  </div>
                  <div className="mb-2">
                    <strong>Created:</strong> {new Date(media.createdAt).toLocaleString()}
                  </div>
                  
                  {/* Test video display */}
                  {media.url && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Video Test:</p>
                      <video 
                        src={media.url} 
                        controls 
                        className="w-full max-w-md"
                        style={{ maxHeight: '200px' }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Posts with Videos Debug */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Posts with Videos ({postsWithVideos.docs.length})</h2>
          {postsWithVideos.docs.length === 0 ? (
            <p className="text-gray-500">No posts with videos found</p>
          ) : (
            <div className="space-y-4">
              {postsWithVideos.docs.map((post: any) => (
                <div key={post.id} className="border p-4 rounded">
                  <div className="mb-2">
                    <strong>Post ID:</strong> {post.id}
                  </div>
                  <div className="mb-2">
                    <strong>Content:</strong> {post.content?.substring(0, 100)}...
                  </div>
                  <div className="mb-2">
                    <strong>Author:</strong> {post.author?.name || 'Unknown'}
                  </div>
                  <div className="mb-2">
                    <strong>Video Object:</strong> {JSON.stringify(post.video, null, 2)}
                  </div>
                  <div className="mb-2">
                    <strong>Image Object:</strong> {JSON.stringify(post.image, null, 2)}
                  </div>
                  <div className="mb-2">
                    <strong>Photos:</strong> {Array.isArray(post.photos) ? post.photos.length : 0} items
                  </div>
                  
                  {/* API Media Array Construction Test */}
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium mb-2">API Media Array Construction:</p>
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify((() => {
                        const media: any[] = []
                        
                        // Add main image
                        if (post.image) {
                          const imageUrl = typeof post.image === 'object' ? post.image.url : post.image
                          if (imageUrl) {
                            media.push({
                              type: 'image',
                              url: imageUrl,
                              alt: typeof post.image === 'object' ? post.image.alt : undefined
                            })
                          }
                        }

                        // Add video if exists
                        if (post.video) {
                          const videoUrl = typeof post.video === 'object' ? post.video.url : post.video
                          if (videoUrl) {
                            media.push({
                              type: 'video',
                              url: videoUrl,
                              thumbnail: post.videoThumbnail 
                                ? (typeof post.videoThumbnail === 'object' ? post.videoThumbnail.url : post.videoThumbnail)
                                : (typeof post.image === 'object' ? post.image.url : post.image),
                              alt: 'Post video'
                            })
                          }
                        }

                        // Add photos array if exists
                        if (post.photos && Array.isArray(post.photos)) {
                          const validPhotos = post.photos
                            .map((photo: any) => ({
                              type: 'image',
                              url: typeof photo === 'object' ? photo.url : photo,
                              alt: typeof photo === 'object' ? photo.alt : undefined
                            }))
                            .filter(photo => photo.url)

                          media.push(...validPhotos)
                        }

                        return media
                      })(), null, 2)}
                    </pre>
                  </div>
                  
                  {/* Test video display if URL exists */}
                  {post.video && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Video Test:</p>
                      <video 
                        src={typeof post.video === 'object' ? post.video.url : post.video} 
                        controls 
                        className="w-full max-w-md"
                        style={{ maxHeight: '200px' }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          <p className="text-gray-600 mb-4">
            Test the mobile feed API to see how videos are being processed:
          </p>
          <div className="space-y-2">
            <a 
              href="/api/v1/mobile/posts/feed?limit=5" 
              target="_blank"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test Mobile Feed API
            </a>
            <a 
              href="/api/v1/mobile/posts?limit=5" 
              target="_blank"
              className="inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-2"
            >
              Test Mobile Posts API
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VideoDebugPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading video debug information...</p>
        </div>
      </div>
    }>
      <VideoDebugContent />
    </Suspense>
  )
} 