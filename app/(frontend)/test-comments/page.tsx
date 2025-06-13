// Force dynamic rendering to prevent SSR issues with auth cookies
export const dynamic = 'force-dynamic'

import { TestCommentSystem } from "@/components/post/test-comment-system"

export default function TestCommentsPage() {
  return (
    <div>
      <TestCommentSystem postId="test-post-1" variant="light" />
    </div>
  )
} 