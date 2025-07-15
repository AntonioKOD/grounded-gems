"use client"

import React, { useState } from "react"
import { 
  Crown, 
  Users, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Share2,
  Target,
  Trophy,
  Copy,
  Check,
  ChevronLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { getImageUrl } from "@/lib/image-utils"

interface BucketListItem {
  id: string
  location?: {
    id: string
    name: string
    address?: string
  }
  goal?: string
  priority: 'low' | 'medium' | 'high'
  status: 'not_started' | 'planned' | 'completed'
  completedAt?: string
  addedAt: string
  notes?: string
}

interface BucketList {
  id: string
  name: string
  description?: string
  type: 'personal' | 'shared'
  owner: {
    id: string
    name: string
    profileImage?: { url?: string }
  }
  collaborators?: Array<{
    id: string
    name: string
    profileImage?: { url?: string }
  }>
  isPublic: boolean
  coverImage?: { url?: string }
  items: BucketListItem[]
  stats: {
    totalItems: number
    completedItems: number
    progressPercentage: number
    lastActivity?: string
  }
  createdAt: string
  updatedAt: string
}

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-[#ffe66d]/20 text-[#b8860b]',
  high: 'bg-[#ff6b6b]/20 text-[#cc5555]'
}

const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-700',
  planned: 'bg-[#4ecdc4]/20 text-[#3a9d96]',
  completed: 'bg-green-100 text-green-700'
}

const STATUS_ICONS = {
  not_started: Clock,
  planned: Calendar,
  completed: CheckCircle2
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'personal': return Target
    case 'shared': return Users
    default: return Target
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'personal': return 'bg-[#4ecdc4]/20 text-[#4ecdc4]'
    case 'shared': return 'bg-[#ffe66d]/20 text-[#b8860b]'
    default: return 'bg-gray-100 text-gray-700'
  }
}

interface PublicBucketListViewProps {
  bucketList: BucketList
}

export default function PublicBucketListView({ bucketList }: PublicBucketListViewProps) {
  const router = useRouter()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const TypeIcon = getTypeIcon(bucketList.type)

  const handleCopyUrl = async () => {
    try {
      if (typeof window === 'undefined') return
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Failed to copy link')
    }
  }

  const handleNativeShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Check out this bucket list: ${bucketList.name}`,
          text: bucketList.description || 'Discover amazing local experiences!',
          url: window.location.href,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    }
  }

  const getItemDisplayText = (item: BucketListItem): string => {
    if (item.location?.name) {
      return item.location.name
    }
    
    if (item.goal) {
      return item.goal
    }
    
    return 'Bucket list item'
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdecd7] via-white to-[#fdecd7]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#ff6b6b] via-[#4ecdc4] to-[#ffe66d] pb-32">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              className="bg-white/90 hover:bg-white text-gray-700 border-0 backdrop-blur-md shadow-lg"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <Button
              onClick={() => setIsShareModalOpen(true)}
              className="bg-white/90 hover:bg-white text-gray-700 border-0 backdrop-blur-md shadow-lg"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* List Info Card */}
          <Card className="bg-white/95 backdrop-blur-md shadow-xl border-0 overflow-hidden">
            <div className="relative">
              {bucketList.coverImage?.url ? (
                <div className="h-48 bg-gray-200 relative">
                  <Image
                    src={bucketList.coverImage.url}
                    alt={bucketList.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-[#ff6b6b]/20 to-[#4ecdc4]/20 flex items-center justify-center">
                  <Crown className="h-16 w-16 text-[#ff6b6b]/60" />
                </div>
              )}
              
              {/* Type Badge */}
              <div className="absolute top-4 left-4">
                <Badge className={`${getTypeColor(bucketList.type)} border-0 shadow-sm px-3 py-1`}>
                  <TypeIcon className="h-4 w-4 mr-1.5" />
                  {bucketList.type.charAt(0).toUpperCase() + bucketList.type.slice(1)}
                </Badge>
              </div>

              {/* Stats Overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-gray-900">Progress</span>
                    <span className="font-bold text-[#ff6b6b]">{bucketList.stats.progressPercentage}%</span>
                  </div>
                  <Progress value={bucketList.stats.progressPercentage} className="h-2" />
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Owner Info */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar>
                                          <AvatarImage src={getImageUrl(bucketList.owner.profileImage?.url)} />
                  <AvatarFallback className="bg-[#4ecdc4]/20 text-[#4ecdc4]">
                    {bucketList.owner.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{bucketList.owner.name || 'Anonymous'}</p>
                  <p className="text-sm text-gray-600">Created {getRelativeTime(bucketList.createdAt)}</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">{bucketList.name}</h1>
              
              {bucketList.description && (
                <p className="text-gray-600 mb-4 leading-relaxed">{bucketList.description}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-[#4ecdc4]/10 rounded-lg">
                  <div className="text-2xl font-bold text-[#4ecdc4]">{bucketList.stats.totalItems}</div>
                  <div className="text-sm text-gray-600">Total Items</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{bucketList.stats.completedItems}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-[#ffe66d]/10 rounded-lg">
                  <div className="text-2xl font-bold text-[#b8860b]">{bucketList.stats.progressPercentage}%</div>
                  <div className="text-sm text-gray-600">Progress</div>
                </div>
              </div>

              {/* Collaborators */}
              {bucketList.collaborators && bucketList.collaborators.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Collaborators</h3>
                  <div className="flex -space-x-2">
                    {bucketList.collaborators.slice(0, 5).map((collaborator) => (
                      <Avatar key={collaborator.id} className="border-2 border-white">
                                                      <AvatarImage src={getImageUrl(collaborator.profileImage?.url)} />
                        <AvatarFallback className="bg-[#4ecdc4]/20 text-[#4ecdc4]">
                          {collaborator.name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {bucketList.collaborators.length > 5 && (
                      <div className="w-10 h-10 rounded-full bg-[#ffe66d]/20 border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-medium text-[#b8860b]">
                          +{bucketList.collaborators.length - 5}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Items List */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 pb-8">
        <Card className="shadow-xl border-0">
          <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-[#fdecd7] to-white">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Trophy className="h-5 w-5 text-[#ffe66d]" />
              Bucket List Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bucketList.items.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {bucketList.items.map((item) => {
                  const StatusIcon = STATUS_ICONS[item.status]
                  
                  return (
                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {getItemDisplayText(item)}
                            </h3>
                            
                            {/* Status Badge */}
                            <Badge className={`${STATUS_COLORS[item.status]} border-0 text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>

                            {/* Priority Badge */}
                            <Badge className={`${PRIORITY_COLORS[item.priority]} border-0 text-xs`}>
                              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </Badge>
                          </div>

                          {item.goal && (
                            <p className="text-gray-600 mb-2">{item.goal}</p>
                          )}

                          {item.location?.address && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                              <MapPin className="h-3 w-3" />
                              {item.location.address}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Added {getRelativeTime(item.addedAt)}</span>
                            {item.completedAt && (
                              <span>Completed {getRelativeTime(item.completedAt)}</span>
                            )}

                          </div>
                        </div>

                        {item.status === 'completed' && (
                          <div className="ml-4">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Items Yet</h3>
                <p className="text-gray-600">This bucket list is waiting for adventures to be added!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="mt-8 text-center">
          <Card className="bg-gradient-to-r from-[#ff6b6b]/10 to-[#4ecdc4]/10 border-[#4ecdc4]/20">
            <CardContent className="p-6">
              <Crown className="h-12 w-12 text-[#ff6b6b] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Create Your Own Bucket List</h3>
              <p className="text-gray-600 mb-4">Start tracking your own local adventures and experiences!</p>
              <Link href="/bucket-list">
                <Button className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg">
                  <Crown className="h-4 w-4 mr-2" />
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="max-w-md border-[#4ecdc4]/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#ff6b6b]">
              <Share2 className="h-5 w-5" />
              Share Bucket List
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="share-url" className="text-gray-700">Share this link</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="share-url"
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  readOnly
                  className="border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
                />
                <Button
                  onClick={handleCopyUrl}
                  variant="outline"
                  className={cn(
                    "border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/10",
                    copied && "bg-green-50 border-green-300 text-green-600"
                  )}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <Button
                onClick={handleNativeShare}
                className="w-full bg-[#4ecdc4] hover:bg-[#3dbdb4] text-white"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share via...
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 