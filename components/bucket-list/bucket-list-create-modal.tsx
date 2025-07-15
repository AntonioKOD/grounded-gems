"use client"

import React, { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card } from '@/components/ui/card'
import { 
  Crown, 
  Target, 
  Users, 
  Loader2,
  Sparkles,
  Globe,
  Lock,
  Check,
  Plus,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface BucketListCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (bucketList: any) => void
  initialLocation?: {
    id: string
    name: string
  }
}

type ListType = 'personal' | 'shared'

interface BucketListItemDraft {
  id: string
  goal: string
  priority: 'low' | 'medium' | 'high'
}

export default function BucketListCreateModal({
  isOpen,
  onClose,
  onSuccess,
  initialLocation
}: BucketListCreateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedType, setSelectedType] = useState<ListType>('personal')
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Manual item addition states
  const [draftItems, setDraftItems] = useState<BucketListItemDraft[]>([])
  const [newItemGoal, setNewItemGoal] = useState('')
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high'>('medium')

  const listTypes = [
    {
      id: 'personal' as ListType,
      name: 'Personal List',
      description: 'Your private collection of places to explore',
      icon: Target,
      color: 'text-[#4ecdc4] border-[#4ecdc4]/30 bg-[#4ecdc4]/10',
      selectedColor: 'ring-[#4ecdc4] border-[#4ecdc4] bg-[#4ecdc4]/20',
      available: true
    },
    {
      id: 'shared' as ListType,
      name: 'Shared List',
      description: 'Collaborate with friends and family',
      icon: Users,
      color: 'text-[#b8860b] border-[#ffe66d]/40 bg-[#ffe66d]/10',
      selectedColor: 'ring-[#ffe66d] border-[#ffe66d] bg-[#ffe66d]/20',
      available: true
    }
  ]

  // Add a new item to the draft list
  const addDraftItem = () => {
    if (!newItemGoal.trim()) {
      toast.error('Please enter a goal for the item')
      return
    }

    const newItem: BucketListItemDraft = {
      id: Date.now().toString(),
      goal: newItemGoal.trim(),
      priority: newItemPriority
    }

    setDraftItems(prev => [...prev, newItem])
    setNewItemGoal('')
    setNewItemPriority('medium')
  }

  // Remove an item from the draft list
  const removeDraftItem = (id: string) => {
    setDraftItems(prev => prev.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Please enter a list name')
      return
    }

    setIsLoading(true)

    try {
      let items = initialLocation ? [{
        location: initialLocation.id,
        goal: '',
        priority: 'medium',
        status: 'not_started'
      }] : []

      // Handle manual items for personal/shared lists
      if (draftItems.length > 0) {
        const manualItems = draftItems.map(item => ({
          goal: item.goal,
          priority: item.priority,
          status: 'not_started',
          addedAt: new Date().toISOString()
        }))
        items = [...items, ...manualItems] as any
      }

      const response = await fetch('/api/bucket-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type: selectedType,
          isPublic,
          items,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bucket list')
      }

      toast.success(`🎉 Created "${name.trim()}" with ${items.length} items!`)

      // Reset form
      setName('')
      setDescription('')
      setSelectedType('personal')
      setIsPublic(false)
      setDraftItems([])
      setNewItemGoal('')
      setNewItemPriority('medium')

      onSuccess?.(data.bucketList)
      onClose()

    } catch (error) {
      console.error('Error creating bucket list:', error)
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setName('')
      setDescription('')
      setSelectedType('personal')
      setIsPublic(false)
      setDraftItems([])
      setNewItemGoal('')
      setNewItemPriority('medium')
      onClose()
    }
  }

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-[#4ecdc4]/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#ff6b6b]">
            <div className="w-10 h-10 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] rounded-full flex items-center justify-center shadow-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">Create Bucket List</span>
              <DialogDescription className="text-gray-600 mt-1">
                Start your journey to explore amazing places
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* List Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium text-gray-900">Choose List Type</Label>
            <RadioGroup value={selectedType} onValueChange={(value) => setSelectedType(value as ListType)}>
              {listTypes.map((type) => {
                const IconComponent = type.icon
                const isSelected = selectedType === type.id
                
                return (
                  <Card 
                    key={type.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected 
                        ? `${type.selectedColor} ring-2 shadow-lg scale-[1.02]` 
                        : `${type.color} hover:bg-opacity-20 border-2`
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={type.id} className="mt-1" />
                        <IconComponent className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-current' : 'text-current'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{type.name}</h3>
                          </div>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-current" />
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </RadioGroup>
          </div>

          {/* Manual List Creation Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700">List Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Coffee Adventures, Hidden Gems, Date Night Spots"
                className="border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this bucket list about?"
                className="border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
                rows={3}
              />
            </div>

            {/* Manual Item Addition */}
            <div className="space-y-4 p-4 bg-[#4ecdc4]/5 border border-[#4ecdc4]/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#4ecdc4]">
                  <Target className="h-5 w-5" />
                  <span className="font-medium">Add Items (Optional)</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {draftItems.length} item{draftItems.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {/* Add Item Form */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newItemGoal}
                    onChange={(e) => setNewItemGoal(e.target.value)}
                    placeholder="e.g., Visit the local farmers market"
                    className="flex-1 border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDraftItem())}
                  />
                  <select
                    value={newItemPriority}
                    onChange={(e) => setNewItemPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="border border-[#4ecdc4]/30 rounded-md px-3 py-2 text-sm focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <Button
                    type="button"
                    onClick={addDraftItem}
                    size="sm"
                    className="bg-[#4ecdc4] hover:bg-[#3dbdb4] text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Draft Items List */}
              {draftItems.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {draftItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border border-[#4ecdc4]/20">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm text-gray-900 truncate">{item.goal}</span>
                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDraftItem(item.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium text-gray-900">Privacy Settings</Label>
            <div className="flex items-center justify-between p-4 border border-[#4ecdc4]/20 rounded-lg bg-[#4ecdc4]/5">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-[#4ecdc4]" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    {isPublic ? 'Public List' : 'Private List'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isPublic 
                      ? 'Anyone can view and discover your list' 
                      : 'Only you can see this list'
                    }
                  </div>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
                className="data-[state=checked]:bg-[#4ecdc4]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Create List
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 