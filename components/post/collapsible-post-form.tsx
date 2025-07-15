
"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Edit, ImageIcon, Plus, Camera, Video, Sparkles, MapPin, Hash, X, Send } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import EnhancedPostForm from "./enhanced-post-form"

interface CollapsiblePostFormProps {
  user: {
    id: string
    name: string
    avatar?: string
    profileImage?: {
      url: string
    }
  }
  className?: string
  onSuccess?: () => void
}

export default function CollapsiblePostForm({ user, className = "", onSuccess }: CollapsiblePostFormProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [quickText, setQuickText] = useState("")

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const handleExpandForm = () => {
    setIsExpanded(true)
  }

  const handleCollapseForm = () => {
    setIsExpanded(false)
    setQuickText("")
  }

  const handlePostCreated = () => {
    onSuccess?.()
    handleCollapseForm()
  }

  return (
    <div className={className}>
      {!isExpanded ? (
        // Collapsed State - TikTok/Instagram Style
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-black via-purple-900/20 to-pink-900/20 backdrop-blur-xl border border-white/10 shadow-2xl"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 opacity-80" />
          
          <div className="relative p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="relative">
                <Avatar className="h-12 w-12 md:h-14 md:w-14 ring-2 ring-white/20 shadow-xl">
                  <AvatarImage 
                    src={user.profileImage?.url || user.avatar || "/placeholder.svg"} 
                    alt={user.name} 
                    className="object-cover" 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-black shadow-lg" />
              </div>
              
              <div
                className="flex-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 md:px-6 md:py-4 text-white/60 cursor-pointer transition-all duration-300 hover:scale-105 border border-white/10"
                onClick={handleExpandForm}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-sm md:text-base font-medium">What's inspiring you today, {user.name.split(" ")[0]}?</span>
                </div>
              </div>
            </div>

            {/* Action buttons - More mobile-friendly */}
            <div className="flex gap-2 md:gap-3 justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 backdrop-blur-sm rounded-2xl px-3 py-2 md:px-4 md:py-3 text-white border border-blue-500/20 transition-all duration-300 min-h-[44px]"
                onClick={handleExpandForm}
              >
                <div className="flex items-center justify-center gap-2">
                  <Edit className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                  <span className="font-medium text-xs md:text-sm">Story</span>
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm rounded-2xl px-3 py-2 md:px-4 md:py-3 text-white border border-purple-500/20 transition-all duration-300 min-h-[44px]"
                onClick={handleExpandForm}
              >
                <div className="flex items-center justify-center gap-2">
                  <Camera className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                  <span className="font-medium text-xs md:text-sm">Photo</span>
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from-pink-500/20 to-red-500/20 hover:from-pink-500/30 hover:to-red-500/30 backdrop-blur-sm rounded-2xl px-3 py-2 md:px-4 md:py-3 text-white border border-pink-500/20 transition-all duration-300 min-h-[44px]"
                onClick={handleExpandForm}
              >
                <div className="flex items-center justify-center gap-2">
                  <Video className="h-4 w-4 md:h-5 md:w-5 text-pink-400" />
                  <span className="font-medium text-xs md:text-sm">Video</span>
                </div>
              </motion.button>
            </div>
          </div>
        </motion.div>
      ) : (
        // Expanded State - Mobile-Optimized Creator Studio
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-black via-purple-900/20 to-pink-900/20 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            {/* Header - Mobile optimized */}
            <div className="relative p-4 md:p-6 border-b border-white/10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 md:h-12 md:w-12 ring-2 ring-white/20 shadow-xl">
                      <AvatarImage 
                        src={user.profileImage?.url || user.avatar || "/placeholder.svg"} 
                        alt={user.name} 
                        className="object-cover" 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg md:text-xl text-white">{user.name}</h3>
                    <p className="text-white/60 text-xs md:text-sm">Create your story</p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  onClick={handleCollapseForm}
                >
                  <X className="h-5 w-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Content Area - Better mobile layout */}
            <div className="p-4 md:p-6">
              <EnhancedPostForm 
                user={{
                  id: user.id,
                  name: user.name,
                  avatar: user.profileImage?.url || user.avatar
                }}
                onClose={handleCollapseForm}
                onPostCreated={handlePostCreated}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
