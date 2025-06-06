import { Suspense } from "react"
import { Metadata } from "next"
import CreatePostForm from "@/components/post/create-post-form"
import { Loader2 } from "lucide-react"

// Force dynamic rendering for this page since it requires authentication
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Share Your Story | Sacavia",
  description: "Share your discoveries and experiences with the community. Help others find their path to authentic places.",
}

export default function CreatePostPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Create Post</h1>
          <p className="text-sm text-gray-500 mt-1">Share your thoughts with the community</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Suspense 
          fallback={
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          }
        >
          <CreatePostForm className="bg-white rounded-lg shadow-sm" />
        </Suspense>
      </div>
    </div>
  )
} 