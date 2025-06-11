"use client"

import { useAuth } from "@/hooks/use-auth"
import { CommentSystemDark } from "./comment-system-dark"
import { CommentSystemLight } from "./comment-system-light"

interface TestCommentSystemProps {
  postId?: string
  variant?: 'dark' | 'light'
}

export function TestCommentSystem({ postId = "test-post-id", variant = 'light' }: TestCommentSystemProps) {
  const { user } = useAuth()

  const testUser = user || {
    id: 'test-user',
    name: 'Test User',
    avatar: '/placeholder.svg'
  }

  if (variant === 'dark') {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <h1 className="text-white text-2xl font-bold mb-6">Comment System Test (Dark Theme)</h1>
        <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-6">
          <CommentSystemDark
            postId={postId}
            user={testUser}
            autoShow={true}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-gray-900 text-2xl font-bold mb-6">Comment System Test (Light Theme)</h1>
      <div className="max-w-2xl mx-auto bg-white rounded-lg p-6 shadow-sm border">
        <CommentSystemLight
          postId={postId}
          user={testUser}
          autoShow={true}
        />
      </div>
    </div>
  )
} 