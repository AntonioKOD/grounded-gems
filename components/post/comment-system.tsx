"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  Send, 
  Heart, 
  Laugh, 
  ThumbsUp, 
  Reply, 
  MoreHorizontal,
  Smile,
  Meh,
  Frown
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
import { addCommentAsync, fetchCommentsAsync } from "@/lib/features/posts/postsSlice"

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
  replies: Comment[]
  reactions: {
    like: number
    love: number
    laugh: number
    userLiked?: boolean
    userLoved?: boolean
    userLaughed?: boolean
  }
}

interface CommentSystemProps {
  postId: string
  user?: {
    id: string
    name: string
    avatar?: string
  }
  initialComments?: Comment[]
  className?: string
}

const REACTIONS = [
  { type: 'like', icon: ThumbsUp, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  { type: 'love', icon: Heart, color: 'text-red-500', bgColor: 'bg-red-50' },
  { type: 'laugh', icon: Laugh, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
] as const

export function CommentSystem({ postId, user, initialComments = [], className }: CommentSystemProps) {
  const dispatch = useAppDispatch()
  const { loadingComments, commentsData, loadingCommentsData } = useAppSelector((state) => state.posts)
  
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if this post is currently having a comment added
  const isAddingComment = loadingComments.includes(postId)
  const isLoadingComments = loadingCommentsData.includes(postId)
  const realComments = commentsData[postId] || []

  // Fetch comments when component mounts or when showComments becomes true
  useEffect(() => {
    if (showComments && !commentsData[postId] && !isLoadingComments) {
      dispatch(fetchCommentsAsync({ postId }))
    }
  }, [showComments, postId, commentsData, isLoadingComments, dispatch])

  // Update local comments when real comments are loaded
  useEffect(() => {
    if (realComments.length > 0) {
      // Convert real comments to the Comment interface format
      const formattedComments: Comment[] = realComments.map((comment: {
        id: string
        content: string
        author: { id: string; name: string; avatar?: string }
        createdAt: string
      }) => ({
        id: comment.id,
        content: comment.content,
        author: comment.author,
        sentiment: analyzeSentiment(comment.content),
        createdAt: comment.createdAt,
        reactions: { like: 0, love: 0, laugh: 0 }, // Default reactions for now
        replies: [], // TODO: Handle replies if needed
        userLiked: false,
        userLoved: false,
        userLaughed: false
      }))
      setComments(formattedComments)
    }
  }, [realComments])

  // Get sentiment styling
  const getSentimentStyling = (sentiment: "positive" | "neutral" | "negative") => {
    if (sentiment === "positive") {
      return {
        icon: Smile,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        emoji: '😊'
      }
    } else if (sentiment === "negative") {
      return {
        icon: Frown,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        emoji: '😔'
      }
    } else {
      return {
        icon: Meh,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        emoji: '😐'
      }
    }
  }

  // Handle comment submission
  const handleSubmitComment = async () => {
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
        replies: []
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
      dispatch(fetchCommentsAsync({ postId }))

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
  }

  // Handle reply submission
  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyText.trim()) return

    setIsSubmitting(true)
    try {
      const sentiment = analyzeSentiment(replyText)
      const reply: Comment = {
        id: Date.now().toString(),
        content: replyText,
        author: user,
        sentiment: sentiment,
        createdAt: new Date().toISOString(),
        reactions: { like: 0, love: 0, laugh: 0 },
        replies: []
      }

      setComments(prev => prev.map(comment => 
        comment.id === parentId 
          ? { ...comment, replies: [reply, ...(comment.replies || [])] }
          : comment
      ))
      
      setReplyText("")
      setReplyingTo(null)
      toast.success("Reply added!")

    } catch (error) {
      console.error("Error adding reply:", error)
      toast.error("Failed to add reply")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle reaction
  const handleReaction = (commentId: string, reactionType: 'like' | 'love' | 'laugh') => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const currentReaction = comment.reactions[reactionType]
        const newReactions = { ...comment.reactions }
        
        // Remove previous reaction
        if (currentReaction) {
          newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1)
        }
        
        // Add new reaction if different
        const newUserReaction = currentReaction === reactionType ? null : reactionType
        if (newUserReaction) {
          newReactions[newUserReaction] += 1
        }
        
        return {
          ...comment,
          reactions: newReactions,
          userLiked: newUserReaction === 'like',
          userLoved: newUserReaction === 'love',
          userLaughed: newUserReaction === 'laugh'
        }
      }
      return comment
    }))
  }

  // Handle comment liking
  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error("Please log in to like comments")
      return
    }

    try {
      // Find the comment and toggle its like status
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          const isCurrentlyLiked = comment.reactions?.userLiked || false
          const currentLikes = comment.reactions?.like || 0
          
          return {
            ...comment,
            reactions: {
              ...comment.reactions,
              like: isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1,
              userLiked: !isCurrentlyLiked
            }
          }
        }
        return comment
      }))

      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30)
      }

      toast.success("Comment reaction updated")
    } catch (error) {
      console.error("Error liking comment:", error)
      toast.error("Failed to update comment reaction")
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Comment component
  const CommentItem = ({ comment }: { comment: Comment }) => {
    const { icon: SentimentIcon, color: sentimentColor, emoji } = getSentimentStyling(comment.sentiment)
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="group relative"
      >
        <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
            <AvatarFallback className="text-xs">
              {getInitials(comment.author.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">{comment.author.name}</span>
              <RelativeTime date={comment.createdAt} className="text-xs text-gray-500" />
              <Badge variant="outline" className="text-xs px-2 py-0">
                <SentimentIcon className="w-3 h-3 mr-1" />
                {comment.sentiment === "positive" ? 'Positive' : comment.sentiment === "negative" ? 'Negative' : 'Neutral'}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
            
            {/* Reactions */}
            <div className="flex items-center gap-1">
              {REACTIONS.map(({ type, icon: Icon, color, bgColor }) => {
                const count = comment.reactions[type]
                const isActive = type === 'like' ? comment.reactions.userLiked : 
                                type === 'love' ? comment.reactions.userLoved : 
                                comment.reactions.userLaughed
                
                return (
                  <button
                    key={type}
                    onClick={() => type === 'like' ? handleLikeComment(comment.id) : handleReaction(comment.id, type)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105 ${
                      isActive ? `${bgColor} ${color}` : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {count > 0 && <span>{count}</span>}
                  </button>
                )
              })}
              
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-gray-500 hover:bg-gray-100 transition-all"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            </div>
          </div>
        </div>
        
        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-8 mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} />
            ))}
          </div>
        )}
        
        {/* Reply form */}
        {replyingTo === comment.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-8 mt-2"
          >
            <div className="flex gap-2">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="text-xs">
                  {user ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px] text-sm resize-none border-gray-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/20 text-gray-900"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyText("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyText.trim()}
                    className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Comments toggle button */}
      <Button
        variant="ghost"
        onClick={() => setShowComments(!showComments)}
        className="w-full justify-start p-4 h-auto hover:bg-gray-50 transition-colors"
      >
        <MessageCircle className="w-5 h-5 mr-3 text-gray-600" />
        <div className="text-left">
          <div className="font-medium text-gray-900">
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </div>
          <div className="text-sm text-gray-500">
            {showComments ? 'Hide comments' : 'View all comments'}
          </div>
        </div>
      </Button>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100"
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
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="min-h-[80px] resize-none border-gray-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/20 text-gray-900"
                      />
                      <div className="flex justify-between items-center mt-3">
                        <div className="text-xs text-gray-500">
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
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="mb-2">Join the conversation</p>
                  <Button variant="outline" className="text-[#FF6B6B] border-[#FF6B6B] hover:bg-[#FF6B6B]/5">
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
                      <span className="text-sm text-gray-500">Loading comments...</span>
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
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
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