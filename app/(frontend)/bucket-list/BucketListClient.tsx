"use client"

import React, { useState, useEffect } from "react"
import { 
  Crown, 
  Plus, 
  Sparkles, 
  Users, 
  Brain, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Star,
  Share2,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Zap,
  Target,
  Trophy,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  X,
  Edit2,
  Rocket,
  CircleDot,
  CheckCircle,
  Ban
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import ProtectedRoute from '@/components/auth/protected-route'
import BucketListCreateModal from '@/components/bucket-list/bucket-list-create-modal'
import ViewListModal from '@/components/bucket-list/view-list-modal'
import EditListModal from '@/components/bucket-list/edit-list-modal'
import ShareListModal from '@/components/bucket-list/share-list-modal'
import ItemCompletionModal from '@/components/bucket-list/item-completion-modal'
import { cn } from "@/lib/utils"
import { getImageUrl } from "@/lib/image-utils"

interface BucketListItem {
  id: string
  location?: {
    id: string
    name: string
    address?: string
    featuredImage?: { url?: string }
    categories?: Array<{ name: string } | string>
  }
  goal?: string
  dueDate?: string
  priority: 'low' | 'medium' | 'high'
  status: 'not_started' | 'planned' | 'completed'
  completedAt?: string
  completionData?: {
    rating?: number
    memory?: string
    photos?: Array<{ image: { url: string }, caption?: string }>
    xpEarned?: number
  }
  addedAt: string
  // AI-generated item fields
  isAiGenerated?: boolean
  aiLocationText?: string
  notes?: string
}

interface BucketList {
  id: string
  name: string
  description?: string
  type: 'personal' | 'shared' | 'ai-generated'
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

interface BucketListClientProps {
  userId: string
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

// Modal Components
interface ViewListModalProps {
  list: BucketList | null
  isOpen: boolean
  onClose: () => void
  onOpenCompletionModal: (item: BucketListItem, listId: string) => void
  onItemStatusUpdate: (listId: string, itemId: string, newStatus: BucketListItem['status']) => void
  isUpdatingItemStatus: boolean
}

function ViewListModal({ list, isOpen, onClose, onOpenCompletionModal, onItemStatusUpdate, isUpdatingItemStatus }: ViewListModalProps) {
  if (!list) return null

  const TypeIcon = getTypeIcon(list.type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden border-[#4ecdc4]/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] rounded-full flex items-center justify-center shadow-lg">
              <TypeIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{list.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${getTypeColor(list.type)} border-0 shadow-sm text-xs px-2 py-0.5`}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {list.type.charAt(0).toUpperCase() + list.type.slice(1)}
                </Badge>
                <p className="text-sm text-gray-500 font-normal">{list.description}</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(80vh-100px)] space-y-6 p-1 pr-3">
          {/* List Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[#4ecdc4]/10 rounded-lg border border-[#4ecdc4]/20">
              <div className="text-2xl font-bold text-[#4ecdc4]">{list.stats.totalItems}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{list.stats.completedItems}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center p-4 bg-[#ffe66d]/10 rounded-lg border border-[#ffe66d]/30">
              <div className="text-2xl font-bold text-[#b8860b]">{list.stats.progressPercentage}%</div>
              <div className="text-sm text-gray-500">Progress</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Overall Progress</span>
              <span className="text-[#ff6b6b] font-medium">{list.stats.progressPercentage}%</span>
            </div>
            <Progress value={list.stats.progressPercentage} className="h-3 bg-gray-200" />
          </div>

          {/* Bucket List Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-[#ff6b6b]" />
              Bucket List Items
            </h3>
            
            {list.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No items in this list yet</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {list.items.map((item) => {
                  const StatusIcon = STATUS_ICONS[item.status]
                  const displayText = getItemDisplayText(item)
                  const isCompleted = item.status === 'completed'
                  const hasCompletionData = !!(item.completionData?.rating || item.completionData?.memory)
                  
                  return (
                    <li 
                      key={item.id} 
                      className={`flex items-start gap-3 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow ${isCompleted && !hasCompletionData ? 'opacity-80' : isCompleted && hasCompletionData ? 'opacity-60' : '' }`}
                    >
                      <div className="mt-1">
                        <StatusIcon className={`h-5 w-5 ${STATUS_COLORS[item.status].split(' ')[1]}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-medium text-gray-900 truncate ${isCompleted ? 'line-through' : ''}`}>{displayText}</h4>
                          <div className="flex items-center gap-2">
                            {item.isAiGenerated && (
                              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">AI</Badge>
                            )}
                            <Badge className={`text-xs ${PRIORITY_COLORS[item.priority]}`}>
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        {item.goal && item.goal !== displayText && (
                          <p className={`text-sm text-gray-600 ${isCompleted ? 'line-through' : ''}`}>{item.goal}</p>
                        )}
                        
                        {item.notes && (
                          <p className={`text-xs text-gray-500 mt-1 italic ${isCompleted ? 'line-through' : ''}`}>{item.notes}</p>
                        )}
                        
                        {item.aiLocationText && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {item.aiLocationText}
                          </p>
                        )}

                        {item.dueDate && (
                          <div className={`text-xs mt-1 flex items-center ${new Date(item.dueDate) < new Date() && !isCompleted ? 'text-red-500' : 'text-gray-500'}`}>
                            <Calendar className="h-3 w-3 mr-1" />
                            Due: {new Date(item.dueDate).toLocaleDateString()} {isCompleted && "(Completed)"}
                          </div>
                        )}

                        {/* Display Rating and Memory */}
                        {isCompleted && item.completionData && (item.completionData.rating || item.completionData.memory) && (
                          <div className="mt-2 space-y-1 pt-2 border-t border-gray-100">
                            {item.completionData.rating && item.completionData.rating > 0 && (
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < (item.completionData?.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                  />
                                ))}
                                <span className="ml-2 text-xs text-gray-600">({item.completionData.rating}/5)</span>
                              </div>
                            )}
                            {item.completionData.memory && (
                              <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded">
                                {item.completionData.memory}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons: Status Change or Log/Edit Experience */}
                        <div className="mt-3 flex gap-2 items-center">
                          {isCompleted ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onOpenCompletionModal(item, list.id)}
                              className="text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 shadow-sm"
                              disabled={isUpdatingItemStatus}
                            >
                              {isUpdatingItemStatus && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>}
                              <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
                              {hasCompletionData ? 'View/Edit Experience' : 'Log Experience'}
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="text-xs shadow-sm" disabled={isUpdatingItemStatus}>
                                  {isUpdatingItemStatus && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>}
                                  <Edit2 className="h-3.5 w-3.5 mr-1.5" /> 
                                  Change Status
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {item.status === 'not_started' && (
                                  <DropdownMenuItem onClick={() => onItemStatusUpdate(list.id, item.id, 'planned')}>
                                    <Rocket className="h-4 w-4 mr-2" /> Mark as Planned
                                  </DropdownMenuItem>
                                )}
                                {item.status === 'planned' && (
                                  <DropdownMenuItem onClick={() => onItemStatusUpdate(list.id, item.id, 'not_started')}>
                                    <Ban className="h-4 w-4 mr-2" /> Mark as Not Started
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onItemStatusUpdate(list.id, item.id, 'completed')}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Mark as Completed
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right text-xs text-gray-500 flex flex-col items-end space-y-1 flex-shrink-0 w-28">
                        <span>Added {getRelativeTime(item.addedAt)}</span>
                        {isCompleted && item.completedAt && (
                          <span className="text-green-600 flex items-center">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Completed {getRelativeTime(item.completedAt)}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Collaborators */}
          {list.type === 'shared' && list.collaborators && list.collaborators.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-[#FF6B6B]" />
                Collaborators
              </h3>
              <div className="flex flex-wrap gap-3">
                {list.collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2">
                    <Avatar className="h-6 w-6">
                                                    <AvatarImage src={getImageUrl(collaborator.profileImage?.url)} />
                      <AvatarFallback className="text-xs">
                        {collaborator.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{collaborator.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto p-6 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface EditListModalProps {
  list: BucketList | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (data: { name: string; description: string; isPublic: boolean }) => void
  isUpdating: boolean
}

function EditListModal({ list, isOpen, onClose, onUpdate, isUpdating }: EditListModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  // Update form when list changes
  React.useEffect(() => {
    if (list) {
      setName(list.name)
      setDescription(list.description || '')
      setIsPublic(list.isPublic)
    }
  }, [list])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter a list name')
      return
    }
    onUpdate({ name: name.trim(), description: description.trim(), isPublic })
  }

  if (!list) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bucket List</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="edit-list-name">List Name <span className="text-red-500">*</span></Label>
            <Input
              id="edit-list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter list name"
              disabled={isUpdating}
              aria-required="true"
              aria-describedby="edit-list-name-error"
            />
          </div>

          <div>
            <Label htmlFor="edit-list-description">Description</Label>
            <Textarea
              id="edit-list-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Input 
                type="checkbox" 
                id="edit-list-public" 
                checked={isPublic} 
                onChange={(e) => setIsPublic(e.target.checked)} 
                disabled={isUpdating} 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="edit-list-public" className="font-normal text-sm">
              Make this list public
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating} className="bg-gradient-to-r from-[#FFD93D] to-[#FF8E53] hover:from-[#FFEB3B] hover:to-[#FF7043] text-gray-800">
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </> 
              ) : (
                'Update List'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ShareListModalProps {
  list: BucketList | null
  isOpen: boolean
  onClose: () => void
  shareUrl: string
  onCopyUrl: () => void
  copied: boolean
}

function ShareListModal({ list, isOpen, onClose, shareUrl, onCopyUrl, copied }: ShareListModalProps) {
  if (!list) return null

  const handleNativeShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Check out my bucket list: ${list.name}`,
          text: list.description || 'Discover amazing local experiences!',
          url: shareUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Bucket List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg">{list.name}</h3>
            {list.description && (
              <p className="text-gray-600 text-sm">{list.description}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={onCopyUrl}
                variant="outline"
                size="icon"
                className={copied ? 'bg-green-50 border-green-200' : ''}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {typeof window !== 'undefined' && navigator.share && (
            <Button
              onClick={handleNativeShare}
              className="w-full bg-gradient-to-r from-[#FFD93D] to-[#FF8E53] hover:from-[#FFEB3B] hover:to-[#FF7043] text-gray-800"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share with Others
            </Button>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Anyone with this link can view your bucket list
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions (move existing ones here if needed)
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'personal': return Target
    case 'shared': return Users
    case 'ai-generated': return Brain
    default: return Target
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'personal': return 'bg-[#4ecdc4]/20 text-[#3a9d96]'
    case 'shared': return 'bg-[#ffe66d]/20 text-[#b8860b]'
    case 'ai-generated': return 'bg-[#ff6b6b]/20 text-[#cc5555]'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getRelativeTime = (dateString: string) => {
  // Prevent hydration mismatches by returning consistent server-side value
  if (typeof window === 'undefined') {
    return 'Recently'
  }
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  } catch (error) {
    return 'Recently'
  }
}

// Helper function to safely get display text for bucket list items
const getItemDisplayText = (item: BucketListItem): string => {
  // Prioritize location name if available
  if (item.location?.name) {
    return item.location.name
  }
  
  // For AI-generated items, use AI location text or goal
  if (item.isAiGenerated) {
    if (item.aiLocationText) {
      return item.aiLocationText
    }
    if (item.goal) {
      return item.goal
    }
    return 'AI-generated experience'
  }
  
  // Fallback for regular items without location
  if (item.goal) {
    return item.goal
  }
  
  return 'Bucket list item'
}

export default function BucketListClient({ userId }: BucketListClientProps) {
  const [bucketLists, setBucketLists] = useState<BucketList[]>([])
  const [selectedList, setSelectedList] = useState<BucketList | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // New state for additional modals and actions
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedListForAction, setSelectedListForAction] = useState<BucketList | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // New state for ItemCompletionModal
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [selectedItemForCompletion, setSelectedItemForCompletion] = useState<BucketListItem | null>(null)
  const [currentListIdForCompletion, setCurrentListIdForCompletion] = useState<string | null>(null)

  // New state for direct item status updates
  const [isUpdatingItemStatus, setIsUpdatingItemStatus] = useState(false)

  // Debug modal state changes
  React.useEffect(() => {
    console.log('🔍 Create Modal state changed:', isCreateModalOpen)
  }, [isCreateModalOpen])

  // Fetch bucket lists on component mount
  useEffect(() => {
    const fetchBucketLists = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/bucket-lists?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch bucket lists: ${response.status}`)
        }

        const data = await response.json()
        setBucketLists(data.bucketLists || [])
      } catch (error) {
        console.error('Error fetching bucket lists:', error)
        setError('Failed to load bucket lists')
        toast.error('Failed to load bucket lists')
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchBucketLists()
    }
  }, [userId])

  // Handle successful bucket list creation
  const handleBucketListCreated = (newBucketList: BucketList) => {
    setBucketLists(prev => [newBucketList, ...prev])
  }

  // Calculate user stats across all lists
  const userStats = React.useMemo(() => {
    const totalItems = bucketLists.reduce((sum, list) => sum + list.stats.totalItems, 0)
    const completedItems = bucketLists.reduce((sum, list) => sum + list.stats.completedItems, 0)
    const totalXP = bucketLists.reduce((sum, list) => {
      return sum + list.items.reduce((itemSum, item) => {
        return itemSum + (item.completionData?.xpEarned || 0)
      }, 0)
    }, 0)
    
    return {
      totalLists: bucketLists.length,
      totalItems,
      completedItems,
      progressPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      totalXP
    }
  }, [bucketLists])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // View list function
  const handleViewList = (list: BucketList) => {
    setSelectedListForAction(list)
    setIsViewModalOpen(true)
  }

  // Share list function
  const handleShareList = async (list: BucketList) => {
    setSelectedListForAction(list)
    
    // Generate share URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const shareableUrl = `${baseUrl}/bucket-list/${list.id}`
    setShareUrl(shareableUrl)
    
    // Make list public if it's not already
    if (!list.isPublic) {
      try {
        const response = await fetch(`/api/bucket-lists/${list.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({ isPublic: true }),
        })

        const data = await response.json()

        if (response.ok) {
          // Update local state
          setBucketLists(prev => prev.map(bl => 
            bl.id === list.id ? { ...bl, isPublic: true } : bl
          ))
          toast.success('List made public for sharing')
        } else {
          // Handle specific error cases
          let errorMessage = 'Failed to make list public'
          if (response.status === 401) {
            errorMessage = 'Please log in to share this list'
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to share this list'
          } else if (data.error) {
            errorMessage = data.error
          }
          console.error('Error making list public:', errorMessage)
          toast.error(errorMessage)
        }
      } catch (error) {
        console.error('Error making list public:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to make list public')
      }
    }
    
    setIsShareModalOpen(true)
  }

  // Copy share URL to clipboard
  const handleCopyShareUrl = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.clipboard) return
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Share link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Failed to copy share link')
    }
  }

  // Edit list function
  const handleEditList = (list: BucketList) => {
    setSelectedListForAction(list)
    setIsEditModalOpen(true)
  }

  // Delete list function
  const handleDeleteList = (list: BucketList) => {
    setSelectedListForAction(list)
    setIsDeleteDialogOpen(true)
  }

  // Confirm delete function
  const confirmDelete = async () => {
    if (!selectedListForAction) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/bucket-lists/${selectedListForAction.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      })

      const data = await response.json()

      if (response.ok) {
        setBucketLists(prev => prev.filter(list => list.id !== selectedListForAction.id))
        toast.success('Bucket list deleted successfully')
        setIsDeleteDialogOpen(false)
        setSelectedListForAction(null)
      } else {
        // Handle specific error cases
        let errorMessage = 'Failed to delete bucket list'
        if (response.status === 401) {
          errorMessage = 'Please log in to delete this list'
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to delete this list'
        } else if (response.status === 404) {
          errorMessage = 'Bucket list not found'
        } else if (data.error) {
          errorMessage = data.error
        }
        
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting bucket list:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete bucket list')
    } finally {
      setIsDeleting(false)
    }
  }

  // Update list function (for edit modal)
  const handleUpdateList = async (updatedData: { name: string; description: string; isPublic: boolean }) => {
    if (!selectedListForAction) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/bucket-lists/${selectedListForAction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(updatedData),
      })

      const data = await response.json()

      if (response.ok) {
        setBucketLists(prev => prev.map(list => 
          list.id === selectedListForAction.id ? { ...list, ...updatedData } : list
        ))
        toast.success('Bucket list updated successfully')
        setIsEditModalOpen(false)
      } else {
        // Handle specific error cases
        let errorMessage = 'Failed to update bucket list'
        if (response.status === 401) {
          errorMessage = 'Please log in to update this list'
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to update this list'
        } else if (response.status === 404) {
          errorMessage = 'Bucket list not found'
        } else if (data.error) {
          errorMessage = data.error
        }
        
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error updating bucket list:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update bucket list')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handler to open the ItemCompletionModal
  const handleOpenCompletionModal = (item: BucketListItem, listId: string) => {
    setSelectedItemForCompletion(item)
    setCurrentListIdForCompletion(listId)
    setIsCompletionModalOpen(true)
  }

  // Callback for when an item is updated via ItemCompletionModal
  const handleItemCompletionUpdate = (updatedItemData: Partial<BucketListItem>, newStats: BucketList['stats']) => {
    setBucketLists(prevLists => 
      prevLists.map(list => {
        if (list.id === currentListIdForCompletion) {
          return {
            ...list,
            items: list.items.map(item => 
              item.id === updatedItemData.id ? { ...item, ...updatedItemData } : item
            ),
            stats: newStats,
          }
        }
        return list
      })
    )
    if (selectedListForAction && selectedListForAction.id === currentListIdForCompletion) {
      setSelectedListForAction(prevList => prevList ? {
        ...prevList,
        items: prevList.items.map(item => 
            item.id === updatedItemData.id ? { ...item, ...updatedItemData } : item
        ),
        stats: newStats,
      } : null)
    }
  }

  // New handler for direct item status updates
  const handleItemStatusUpdate = async (listId: string, itemId: string, newStatus: BucketListItem['status']) => {
    setIsUpdatingItemStatus(true)
    try {
      const response = await fetch(`/api/bucket-lists/${listId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({ status: newStatus }),
        },
      )
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update item status')
      }

      toast.success(`Item marked as ${newStatus.replace('_', ' ')}`)
      
      // Update local state
      setBucketLists(prevLists => 
        prevLists.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.map(item => 
                item.id === itemId ? { ...item, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : item.completedAt } : item
              ),
              stats: result.listStats, // Use updated stats from API response
            }
          }
          return list
        })
      )

      if (selectedListForAction && selectedListForAction.id === listId) {
        setSelectedListForAction(prevList => prevList ? {
          ...prevList,
          items: prevList.items.map(item => 
            item.id === itemId ? { ...item, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : item.completedAt } : item
          ),
          stats: result.listStats,
        } : null)
      }
      
      // If marked as completed, open completion modal
      if (newStatus === 'completed') {
        const updatedItem = bucketLists.find(l => l.id === listId)?.items.find(i => i.id === itemId);
        if (updatedItem) {
          handleOpenCompletionModal(updatedItem, listId);
        }
      }

    } catch (error) {
      console.error('Error updating item status:', error)
      toast.error(error instanceof Error ? error.message : 'Could not update item status')
    } finally {
      setIsUpdatingItemStatus(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center py-16">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFD93D] to-[#FF8E53] rounded-full opacity-20 animate-pulse" />
                <div className="absolute inset-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <Loader2 className="h-16 w-16 text-[#FFD93D] animate-spin" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading Your Local Legends...</h1>
              <p className="text-gray-600">We're fetching your bucket lists</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Error state
  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-[#fdecd7] via-white to-[#fdecd7]">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center py-16">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b6b]/20 to-[#ff6b6b]/40 rounded-full" />
                <div className="absolute inset-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <Crown className="h-16 w-16 text-[#ff6b6b]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
              <p className="text-gray-600 mb-8">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Empty state
  if (bucketLists.length === 0) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-[#fdecd7] via-white to-[#fdecd7]">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Empty State */}
            <div className="text-center py-16">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b6b] to-[#4ecdc4] rounded-full opacity-20 animate-pulse" />
                <div className="absolute inset-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <Crown className="h-16 w-16 text-[#ff6b6b]" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-[#ffe66d] animate-bounce" />
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Create Your First Bucket List
              </h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Start tracking your dreams and adventures. Whether it's places to visit, 
                experiences to have, or goals to achieve - let's make it happen!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <BucketListCreateModal
                  userId={userId}
                  onBucketListCreated={handleBucketListCreated}
                  trigger={
                    <Button size="lg" className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg px-8 py-3 text-lg rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Create Personal List
                    </Button>
                  }
                />
                <Button size="lg" variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/10">
                  <Brain className="h-5 w-5 mr-2" />
                  AI-Generated List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-[#fdecd7] via-white to-[#fdecd7]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Create Your First List - Empty State */}
          {bucketLists.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="mb-6">
                <div className="w-24 h-24 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Crown className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Bucket List</h2>
                <p className="text-gray-600 max-w-xs mx-auto">
                  Start tracking your dreams and adventures. Whether it's places to visit, 
                  experiences to have, or goals to achieve - let's make it happen!
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <BucketListCreateModal
                  userId={userId}
                  onBucketListCreated={handleBucketListCreated}
                  trigger={
                    <Button size="lg" className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Create Personal List
                    </Button>
                  }
                />
                <Button size="lg" variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/10">
                  <Brain className="h-5 w-5 mr-2" />
                  AI-Generated List
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#fdecd7] to-white border-b border-[#4ecdc4]/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] rounded-full flex items-center justify-center shadow-lg">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Bucket Lists</h1>
                    <p className="text-gray-600">Track your dreams and adventures</p>
                  </div>
                </div>
                
                {/* Create New List Button */}
                <BucketListCreateModal
                  userId={userId}
                  onBucketListCreated={handleBucketListCreated}
                  trigger={
                    <Button className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg transition-all duration-300">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New List
                    </Button>
                  }
                />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="border-0 shadow-lg border border-[#4ecdc4]/20">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-[#4ecdc4]">{userStats.totalLists}</div>
                    <div className="text-sm text-gray-500">Active Lists</div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg border border-[#ffe66d]/30">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-[#b8860b]">{userStats.totalItems}</div>
                    <div className="text-sm text-gray-500">Total Items</div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg border border-green-200">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-600">{userStats.completedItems}</div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg border border-[#ff6b6b]/20">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-[#ff6b6b]">{userStats.totalXP}</div>
                    <div className="text-sm text-gray-500">XP Earned</div>
                  </CardContent>
                </Card>
              </div>

              {/* Bucket Lists Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bucketLists.map((list) => {
                  const TypeIcon = getTypeIcon(list.type)
                  
                  return (
                    <Card key={list.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group border border-[#4ecdc4]/20">
                      {/* Cover Image */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                        {list.coverImage?.url ? (
                          <Image
                            src={list.coverImage.url}
                            alt={`Cover image for ${list.name}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#ff6b6b]/20 to-[#4ecdc4]/20 flex items-center justify-center">
                            <Crown className="h-16 w-16 text-[#ff6b6b]/60" />
                          </div>
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        
                        {/* Type Badge */}
                        <div className="absolute top-3 left-3">
                          <Badge className={`${getTypeColor(list.type)} border-0 shadow-sm text-xs px-2.5 py-1`}>
                            <TypeIcon className="h-3 w-3 mr-1.5" />
                            {list.type === 'ai-generated' ? 'AI-Generated' : list.type.charAt(0).toUpperCase() + list.type.slice(1)}
                          </Badge>
                        </div>
                        
                        {/* Actions */}
                        <div className="absolute top-3 right-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-md"
                                aria-label={`More options for ${list.name}`}
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-[#4ecdc4]/20">
                              <DropdownMenuItem onClick={() => handleViewList(list)} className="text-sm hover:bg-[#4ecdc4]/10">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditList(list)} className="text-sm hover:bg-[#ffe66d]/10">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit List
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShareList(list)} className="text-sm hover:bg-[#ff6b6b]/10">
                                <Share2 className="h-4 w-4 mr-2" />
                                Share List
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteList(list)}
                                className="text-red-600 focus:text-red-700 focus:bg-red-50 text-sm"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete List
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Progress */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                            <div className="flex items-center justify-between text-white text-sm mb-1">
                              <span>Progress</span>
                              <span className="font-medium">{list.stats.progressPercentage}%</span>
                            </div>
                            <Progress 
                              value={list.stats.progressPercentage} 
                              className="h-2 bg-white/20"
                            />
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-6">
                        {/* Card Header with Type Icon */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              list.type === 'personal' ? 'bg-[#4ecdc4]/20 text-[#4ecdc4]' :
                              list.type === 'shared' ? 'bg-[#ffe66d]/20 text-[#b8860b]' :
                              'bg-[#ff6b6b]/20 text-[#ff6b6b]'
                            }`}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900 truncate">
                                {list.name}
                              </h3>
                              <Badge className={`${getTypeColor(list.type)} border-0 text-xs`}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {list.type.charAt(0).toUpperCase() + list.type.slice(1)}
                              </Badge>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-[#4ecdc4]/10">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-[#4ecdc4]/20">
                              <DropdownMenuItem 
                                onClick={() => handleViewList(list)}
                                className="hover:bg-[#4ecdc4]/10 cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleEditList(list)}
                                className="hover:bg-[#ffe66d]/10 cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit List
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleShareList(list)}
                                className="hover:bg-[#ff6b6b]/10 cursor-pointer"
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share List
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteList(list)}
                                className="text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete List
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {list.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {list.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="text-center p-2 bg-[#4ecdc4]/10 rounded-lg">
                            <div className="text-lg font-bold text-[#4ecdc4]">{list.stats.totalItems}</div>
                            <div className="text-xs text-gray-500">Items</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">{list.stats.completedItems}</div>
                            <div className="text-xs text-gray-500">Done</div>
                          </div>
                          <div className="text-center p-2 bg-[#ffe66d]/10 rounded-lg">
                            <div className="text-lg font-bold text-[#b8860b]">{list.stats.progressPercentage}%</div>
                            <div className="text-xs text-gray-500">Progress</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-700">Progress</span>
                            <span className="text-sm font-semibold text-[#ff6b6b]">{list.stats.progressPercentage}%</span>
                          </div>
                          <Progress value={list.stats.progressPercentage} className="h-2 bg-gray-200" />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleViewList(list)} 
                            size="sm" 
                            className="flex-1 bg-[#4ecdc4] hover:bg-[#3dbdb4] text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {list.isPublic && (
                            <Button 
                              onClick={() => handleShareList(list)} 
                              size="sm" 
                              variant="outline"
                              className="border-[#ff6b6b]/30 text-[#ff6b6b] hover:bg-[#ff6b6b]/10"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        <BucketListCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleBucketListCreated}
        />

        {/* View List Modal */}
        <ViewListModal
          list={selectedListForAction}
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          onOpenCompletionModal={handleOpenCompletionModal}
          onItemStatusUpdate={handleItemStatusUpdate}
          isUpdatingItemStatus={isUpdatingItemStatus}
        />

        {/* Edit List Modal */}
        <EditListModal
          list={selectedListForAction}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUpdateList}
          isUpdating={isUpdating}
        />

        {/* Share List Modal */}
        <ShareListModal
          list={selectedListForAction}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareUrl={shareUrl}
          onCopyUrl={handleCopyShareUrl}
          copied={copied}
        />
        
        {/* Item Completion Modal */}
        <ItemCompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => setIsCompletionModalOpen(false)}
          item={selectedItemForCompletion}
          listId={currentListIdForCompletion}
          onItemUpdate={handleItemCompletionUpdate}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bucket List</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedListForAction?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  )
} 