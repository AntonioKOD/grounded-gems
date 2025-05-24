"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import type { Post } from "@/types/feed"

interface MobileCreatePostButtonProps {
  user: any
  onPostCreated?: (post: Post) => void
}

export default function MobileCreatePostButton({ user, onPostCreated }: MobileCreatePostButtonProps) {
  const [open, setOpen] = useState(false)
  const [postText, setPostText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }
  
  const handleCreatePost = async () => {
    if (!postText.trim()) {
      toast.error("Please enter some text for your post")
      return
    }
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30])
    }
    
    setIsSubmitting(true)
    
    try {
      // Mock post creation for now
      // In a real app, this would be a server action
      setTimeout(() => {
        const newPost: Post = {
          id: `temp-${Date.now()}`,
          author: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
          },
          content: postText,
          createdAt: new Date().toISOString(),
          type: "post",
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          isLiked: false,
        }
        
        if (onPostCreated) {
          onPostCreated(newPost)
        }
        
        setPostText("")
        setOpen(false)
        toast.success("Post created successfully")
      }, 1000)
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed bottom-24 right-4 z-40"
          >
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 shadow-lg"
              onClick={() => {
                if (navigator.vibrate) {
                  navigator.vibrate(50)
                }
              }}
            >
              <Plus className="h-6 w-6 text-white" />
            </Button>
          </motion.div>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="h-[80vh] rounded-t-xl pt-6">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>Create post</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-gray-500">Posting publicly</p>
              </div>
            </div>
            
            <Textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[150px] text-base focus-visible:ring-[#FF6B6B]"
              autoFocus
            />
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  setPostText("")
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={isSubmitting || !postText.trim()}
                className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
              >
                {isSubmitting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
} 