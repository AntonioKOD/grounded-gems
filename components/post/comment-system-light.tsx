"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  Send, 
  Heart, 
  MoreHorizontal,
  Smile,
  Meh,
  Frown,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RelativeTime } from "@/components/ui/relative-time"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { 
  addCommentAsync, 
  fetchCommentsAsync, 
  likeCommentAsync
} from "@/lib/features/posts/postsSlice"

// Analyze sentiment of comment text
const analyzeSentiment = (text: string): "positive" | "neutral" | "negative" => {
  const positiveWords = ['love', 'great', 'awesome', 'amazing', 'excellent', 'fantastic', 'wonderful', 'good', 'nice', 'beautiful', 'perfect', 'best']
  const negativeWords = ['hate', 'terrible', 'awful', 'horrible', 'bad', 'worst', 'disgusting', 'disappointing', 'poor', 'sad', 'angry']
  
  const words = text.toLowerCase().split(/\s+/)
  let score = 0
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1
    if (negativeWords.includes(word)) score -= 1
  })
  
  if (score > 0) return "positive"
  if (score < 0) return "negative"
  return "neutral"
}

interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  sentiment: "positive" | "neutral" | "negative"
  createdAt: string
  reactions: {
    like: number
    love: number
    laugh: number
    userLiked?: boolean
    userLoved?: boolean
    userLaughed?: boolean
  }
  replies: Comment[]
  likeCount?: number
  isLiked?: boolean
  replyCount?: number
  parentCommentId?: string
  isReply?: boolean
}

interface CommentSystemLightProps {
  postId: string
  user?: {
    id: string
    name: string
    avatar?: string
  }
  initialComments?: Comment[]
  className?: string
  autoShow?: boolean // Auto-show comments (for mobile)
}



export function CommentSystemLight({ 
  postId, 
  user, 
  initialComments = [], 
  className,
  autoShow = false 
}: CommentSystemLightProps) {
  const dispatch = useAppDispatch()
  const { 
    loadingComments, 
    commentsData, 
    loadingCommentsData, 
    loadingReplies, 
    loadingCommentLikes,
    likedComments 
  } = useAppSelector((state) => state.posts)
  
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showComments, setShowComments] = useState(autoShow)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [hasLoadedComments, setHasLoadedComments] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if this post is currently having a comment added
  const isAddingComment = loadingComments.includes(postId)
  const isLoadingComments = loadingCommentsData.includes(postId)
  const realComments = commentsData[postId] || []

  // Memoize comment count to prevent unnecessary re-renders
  const commentCount = useMemo(() => {
    return comments.length + comments.reduce((acc, comment) => acc + (comment.replies?.length || 0), 0)
  }, [comments])

  // Auto-show comments if autoShow prop is true
  useEffect(() => {
    if (autoShow) {
      setShowComments(true)
    }
  }, [autoShow])

  // Fetch comments when component mounts or when showComments becomes true (only once)
  useEffect(() => {
    if (showComments && !hasLoadedComments && !isLoadingComments) {
      setHasLoadedComments(true)
      dispatch(fetchCommentsAsync({ postId, currentUserId: user?.id }))
    }
  }, [showComments, hasLoadedComments, isLoadingComments, dispatch, postId, user?.id])

  // Update local comments when real comments are loaded
  useEffect(() => {
    if (realComments.length > 0) {
      // Convert real comments to the Comment interface format
      const formattedComments: Comment[] = realComments.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        author: comment.author,
        sentiment: analyzeSentiment(comment.content),
        createdAt: comment.createdAt,
        reactions: { like: comment.likeCount || 0, love: 0, laugh: 0 },
        replies: comment.replies ? comment.replies.map((reply: any) => ({
          id: reply.id,
          content: reply.content,
          author: reply.author,
          sentiment: analyzeSentiment(reply.content),
          createdAt: reply.createdAt,
          reactions: { like: reply.likeCount || 0, love: 0, laugh: 0 },
          replies: [],
          likeCount: reply.likeCount || 0,
          isLiked: likedComments.includes(reply.id), // Use Redux state for like status
          parentCommentId: comment.id,
          isReply: true,
        })) : [],
        likeCount: comment.likeCount || 0,
        isLiked: likedComments.includes(comment.id), // Use Redux state for like status
        replyCount: comment.replyCount || 0,
      }))
      setComments(formattedComments)
    }
  }, [realComments, likedComments])

  // Get sentiment styling for light theme
  const getSentimentStyling = (sentiment: string) => {
    if (sentiment === "positive") {
      return {
        icon: Smile,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        emoji: '😊'
      }
    } else if (sentiment === "negative") {
      return {
        icon: Frown,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        emoji: '😔'
      }
    } else {
      return {
        icon: Meh,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        emoji: '😐'
      }
    }
  }

  // Handle comment submission
  const handleSubmitComment = useCallback(async () => {
    if (!user || !newComment.trim()) return

    setIsSubmitting(true)
    try {
      const sentiment = analyzeSentiment(newComment)
      
      // Create optimistic comment for immediate UI update
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        content: newComment,
        author: user,
        sentiment: sentiment,
        createdAt: new Date().toISOString(),
        reactions: { like: 0, love: 0, laugh: 0 },
        replies: [],
        likeCount: 0,
        isLiked: false,
        replyCount: 0,
      }

      // Add optimistic comment to UI
      setComments(prev => [optimisticComment, ...prev])
      setNewComment("")

      // Call the actual API through Redux
      await dispatch(addCommentAsync({
        postId,
        content: newComment,
        userId: user.id
      })).unwrap()

      // Refresh comments to get the real comment from the database
      dispatch(fetchCommentsAsync({ postId, currentUserId: user.id }))

      toast.success("Comment added!")

    } catch (error) {
      console.error("Error adding comment:", error)
      toast.error("Failed to add comment")
      
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => !c.id.startsWith('temp-')))
      setNewComment(newComment) // Restore the comment text
    } finally {
      setIsSubmitting(false)
    }
  }, [user, newComment, dispatch, postId])



  // Handle comment/reply like with improved performance
  const handleLikeComment = useCallback(async (commentId: string, isReply: boolean = false, parentCommentId?: string) => {
    if (!user) {
      toast.error("Please log in to like comments")
      return
    }

    // Check if comment is currently liked from Redux state
    const isCurrentlyLiked = likedComments.includes(commentId)

    try {
      // Update local state immediately for better UX
      if (isReply && parentCommentId) {
        setComments(prev => prev.map(comment => {
          if (comment.id === parentCommentId && comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === commentId 
                  ? { 
                      ...reply, 
                      isLiked: !isCurrentlyLiked,
                      likeCount: !isCurrentlyLiked ? (reply.likeCount || 0) + 1 : Math.max((reply.likeCount || 0) - 1, 0)
                    }
                  : reply
              )
            }
          }
          return comment
        }))
      } else {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                isLiked: !isCurrentlyLiked,
                likeCount: !isCurrentlyLiked ? (comment.likeCount || 0) + 1 : Math.max((comment.likeCount || 0) - 1, 0)
              }
            : comment
        ))
      }

      // Call server action
      await dispatch(likeCommentAsync({
        postId,
        commentId,
        shouldLike: !isCurrentlyLiked,
        userId: user.id,
        isReply
      })).unwrap()

      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30)
      }

    } catch (error) {
      console.error("Error liking comment:", error)
      toast.error("Failed to update comment reaction")
      
      // Revert optimistic update on error
      if (isReply && parentCommentId) {
        setComments(prev => prev.map(comment => {
          if (comment.id === parentCommentId && comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === commentId 
                  ? { 
                      ...reply, 
                      isLiked: isCurrentlyLiked || false,
                      likeCount: isCurrentlyLiked ? (reply.likeCount || 0) + 1 : Math.max((reply.likeCount || 0) - 1, 0)
                    }
                  : reply
              )
            }
          }
          return comment
        }))
      } else {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                isLiked: isCurrentlyLiked || false,
                likeCount: isCurrentlyLiked ? (comment.likeCount || 0) + 1 : Math.max((comment.likeCount || 0) - 1, 0)
              }
            : comment
        ))
      }
    }
  }, [user, likedComments, dispatch, postId])

  // Toggle reply expansion
  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }, [])

  // Get initials for avatar
  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }, [])

  // Comment component for light theme
  const CommentItem = useCallback(({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const sentiment = getSentimentStyling(comment.sentiment)
    const SentimentIcon = sentiment.icon
    const hasReplies = comment.replies && comment.replies.length > 0
    const isExpanded = expandedReplies.has(comment.id)
    const isLikingComment = loadingCommentLikes.includes(comment.id)
    const isCommentLiked = likedComments.includes(comment.id)

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "group relative",
          isReply ? "ml-8 mt-3" : "mt-4"
        )}
      >
        <div className={cn(
          "relative p-4 rounded-2xl border-2 transition-all duration-300 hover:shadow-md bg-white",
          sentiment.bgColor,
          sentiment.borderColor,
          "hover:scale-[1.01] hover:border-opacity-60"
        )}>
          {/* Sentiment indicator */}
          <div className="absolute -top-2 -right-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 border-gray-200 shadow-sm bg-white",
              sentiment.bgColor
            )}>
              {sentiment.emoji}
            </div>
          </div>

          {/* Author info */}
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="h-8 w-8 ring-2 ring-gray-200 shadow-sm">
              <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
              <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                {getInitials(comment.author.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">
                  {comment.author.name}
                </span>
                <Badge variant="outline" className="text-xs px-2 py-0 border-gray-200 bg-gray-50 text-white">
                  <SentimentIcon className="w-3 h-3 mr-1" />
                  {comment.sentiment === "positive" ? 'Positive' : comment.sentiment === "negative" ? 'Negative' : 'Neutral'}
                </Badge>
              </div>
              <RelativeTime 
                date={comment.createdAt} 
                className="text-xs text-gray-500"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem className="text-xs">Report</DropdownMenuItem>
                <DropdownMenuItem className="text-xs">Share</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Comment content */}
          <p className="text-gray-800 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Like button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLikeComment(comment.id, isReply, comment.parentCommentId)}
                disabled={isLikingComment}
                className={cn(
                  "h-7 px-2 text-xs transition-all duration-200 flex items-center gap-1",
                  isCommentLiked ? "text-red-600 bg-red-50" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                )}
              >
                <Heart className={cn("w-3 h-3", isCommentLiked && "fill-current")} />
                {comment.likeCount || 0}
              </Button>

              {/* Reply count and toggle */}
              {hasReplies && !isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleReplies(comment.id)}
                  className="h-7 px-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 flex items-center gap-1"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {comment.replyCount || comment.replies?.length || 0} {(comment.replyCount || comment.replies?.length || 0) === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </div>


          </div>


        </div>

        {/* Replies */}
        {hasReplies && !isReply && isExpanded && (
          <div className="relative mt-2">
            {/* Connection line */}
            <div className="absolute left-6 top-0 w-px h-full bg-gradient-to-b from-gray-300 to-transparent" />
            
            <AnimatePresence>
              {comment.replies?.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    )
  }, [expandedReplies, loadingCommentLikes, handleLikeComment, toggleReplies, user, getInitials, isSubmitting])

  return (
    <div className={cn("w-full", className)}>
      {/* Comments toggle button - only show if not auto-showing */}
      {!autoShow && (
        <Button
          variant="ghost"
          onClick={() => setShowComments(!showComments)}
          className="w-full justify-start p-4 h-auto hover:bg-gray-50 transition-colors text-gray-900"
        >
          <MessageCircle className="w-5 h-5 mr-3 text-gray-600" />
          <div className="text-left">
            <div className="font-medium text-gray-900">
              {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
            </div>
            <div className="text-sm text-gray-600">
              {showComments ? 'Hide comments' : 'View all comments'}
            </div>
          </div>
        </Button>
      )}

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn("border-t border-gray-200", !autoShow && "border-t")}
          >
            <div className="p-4">
              {/* New comment form */}
              {user ? (
                <div className="mb-6">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-[#FF6B6B]/20">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        ref={textareaRef}
                        id={`comment-textarea-${postId}`}
                        name={`comment-${postId}`}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="min-h-[80px] resize-none bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/20"
                      />
                      <div className="flex justify-between items-center mt-3">
                        <div className="text-xs text-gray-600">
                          {newComment.length > 0 && (
                            <span>
                              Sentiment: {analyzeSentiment(newComment) === "positive" ? '😊 Positive' : 
                                        analyzeSentiment(newComment) === "negative" ? '😔 Negative' : '😐 Neutral'}
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || isSubmitting || isAddingComment}
                          className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
                        >
                          {isSubmitting || isAddingComment ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Posting...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              Comment
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="mb-2">Join the conversation</p>
                  <Button variant="outline" className="text-[#FF6B6B] border-[#FF6B6B] hover:bg-[#FF6B6B]/5 bg-transparent">
                    Sign in to comment
                  </Button>
                </div>
              )}

              {/* Comments list */}
              <div className="space-y-1">
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-[#FF6B6B] rounded-full animate-spin" />
                      <span className="text-sm text-gray-600">Loading comments...</span>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {comments.map((comment) => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))}
                  </AnimatePresence>
                )}
                
                {!isLoadingComments && comments.length === 0 && user && showComments && (
                  <div className="text-center py-8 text-gray-600">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No comments yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 