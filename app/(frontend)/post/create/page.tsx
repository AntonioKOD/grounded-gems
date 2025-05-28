import { Suspense } from "react"
import { Metadata } from "next"
import CreatePostForm from "@/components/post/create-post-form"
import { Loader2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Create Post | Grounded Gems",
  description: "Share your experience with the community",
}

export default function CreatePostPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#FF6B6B]" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CreatePostForm />
    </Suspense>
  )
} 