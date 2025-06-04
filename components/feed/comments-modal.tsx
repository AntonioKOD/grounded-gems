"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommentSystemDark } from '@/components/post/comment-system-dark'
import { cn } from '@/lib/utils'

interface CommentsModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  user?: {
    id: string
    name: string
    avatar?: string
    profileImage?: {
      url: string
    }
  }
  commentCount?: number
  className?: string
}

export default function CommentsModal({
  isOpen,
  onClose,
  postId,
  user,
  commentCount = 0,
  className
}: CommentsModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      // Re-enable body scroll when modal is closed
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    onClose()
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Prepare user data for comment system
  const commentUser = user ? {
    id: user.id,
    name: user.name,
    avatar: user.profileImage?.url || user.avatar
  } : undefined

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 200,
              duration: 0.3
            }}
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-black/95 backdrop-blur-xl border-b border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-6 w-6 text-white/80" />
                  <div>
                    <h2 className="text-lg font-bold text-white">Comments</h2>
                    <p className="text-sm text-white/60">
                      {commentCount > 0 ? `${commentCount.toLocaleString()} ${commentCount === 1 ? 'comment' : 'comments'}` : 'Be the first to comment'}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-10 w-10 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Drag indicator */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full" />
            </div>

            {/* Comments Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <CommentSystemDark
                postId={postId}
                user={commentUser}
                autoShow={true}
                className="border-none"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 