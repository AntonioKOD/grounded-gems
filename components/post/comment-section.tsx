"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { formatDistanceToNow } from "date-fns"
import { Heart, AlertCircle } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getCommentsByPostId, addComment, likeComment } from "@/app/actions"
import type { Comment } from "@/types/feed"

interface CommentSectionProps {
  postId: string
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; profileImage?: { url: string } } | null>(
    null,
  )

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true)
      try {
        const fetchedComments = await getCommentsByPostId(postId)
        setComments(fetchedComments)
      } catch (error) {
        console.error("Error fetching comments:", error)
        toast.error("Failed to load comments")
      } finally {
        setIsLoading(false)
      }
    }

    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })
        const data = await response.json()
        if (data?.user) {
          setCurrentUser(data.user)
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }

    fetchComments()
    fetchCurrentUser()
  }, [postId])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commentText.trim()) {
      toast.error("Comment cannot be empty")
      return
    }
    
    if (!currentUser) {
      toast.error("You must be logged in to comment")
      router.push("/login")
      return
    }

    setIsSubmitting(true)
    try {
      const newComment = await addComment(postId, commentText, currentUser.id)
      
      // Add the new comment to the list
      setComments((prev) => [
        {
          id: newComment.id as string,
          author: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.profileImage?.url,
          },
          content: commentText,
          createdAt: new Date().toISOString(),
          likeCount: 0,
          isLiked: false,
        },
        ...prev,
      ])
      
      // Clear the input
      setCommentText("")
      toast.success("Comment added successfully")
    } catch (error) {
      console.error("Error adding comment:", error)
      toast.error("Failed to add comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!currentUser) {
      toast.error("You must be logged in to like comments")
      router.push("/login")
      return
    }

    try {
      // Optimistically update UI
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: !isLiked,
              likeCount: isLiked ? (comment.likeCount || 1) - 1 : (comment.likeCount || 0) + 1,
            }
          }
          return comment
        }),
      )

      // Call the server action
      await likeComment(commentId, !isLiked, currentUser.id)

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error liking comment:", error)
      toast.error("Failed to update like status")

      // Revert optimistic update on error
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: isLiked,
              likeCount: isLiked ? (comment.likeCount || 0) + 1 : (comment.likeCount || 1) - 1,
            }
          }
          return comment
        }),
      )
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Comments ({comments.length})</h2>

      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mb-8">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            {currentUser?.profileImage?.url ? (
              <AvatarImage src={currentUser.profileImage.url || "/placeholder.svg"} alt={currentUser.name} />
            ) : (
              <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                {currentUser?.name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isSubmitting || !currentUser}
            />
            <div className="flex justify-end mt-2">
              <Button type="submit" disabled={isSubmitting || !commentText.trim() || !currentUser}>
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : null}
                Post Comment
              </Button>
            </div>
          </div>
        </div>
        {!currentUser && (
          <div className="mt-2 text-sm text-amber-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            You need to be logged in to comment
          </div>
        )}
      </form>

      <Separator className="my-6" />

      {/* Comments list */}
      <div className="space-y-6">
        {isLoading ? (
          // Loading state
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-full bg-gray-200 rounded"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-10 w-10">
                {comment.author.avatar ? (
                  <AvatarImage src={comment.author.avatar || "/placeholder.svg"} alt={comment.author.name} />
                ) : (
                  <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{comment.author.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLikeComment(comment.id, comment.isLiked || false)}
                    className={cn("flex items-center gap-1 px-2", comment.isLiked && "text-red-500")}
                    disabled={!currentUser}
                  >
                    <Heart className={cn("h-4 w-4", comment.isLiked && "fill-red-500")} />
                    <span>{comment.likeCount || ""}</span>
                  </Button>
                </div>
                <p className="text-gray-700 mt-1">{comment.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  )
}
