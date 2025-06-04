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
  Brain, 
  Loader2,
  Sparkles,
  Globe,
  Lock,
  Check
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

type ListType = 'personal' | 'shared' | 'ai-generated'

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

  // AI-specific states
  const [aiInterest, setAiInterest] = useState('')

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
    },
    {
      id: 'ai-generated' as ListType,
      name: 'AI-Generated',
      description: 'Let AI create a personalized list for you',
      icon: Brain,
      color: 'text-[#ff6b6b] border-[#ff6b6b]/30 bg-[#ff6b6b]/10',
      selectedColor: 'ring-[#ff6b6b] border-[#ff6b6b] bg-[#ff6b6b]/20',
      available: true
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple validation based on list type
    if (selectedType === 'ai-generated') {
      if (!aiInterest.trim()) {
        toast.error('Please tell us what you\'re interested in')
        return
      }
    } else {
      if (!name.trim()) {
        toast.error('Please enter a list name')
        return
      }
    }

    setIsLoading(true)

    try {
      let items = initialLocation ? [{
        location: initialLocation.id,
        goal: '',
        priority: 'medium',
        status: 'not_started'
      }] : []

      let finalName = name.trim()
      let finalDescription = description.trim()

      // Handle AI generation
      if (selectedType === 'ai-generated') {
        console.log('🤖 Generating bucket list for:', aiInterest)

        // Get user's location quietly in the background
        let coordinates = null
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
          })
          coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        } catch (e) {
          // Location access failed - that's okay, AI can still work
        }

        const aiResponse = await fetch('/api/ai-planner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: `Create a bucket list of local experiences for someone interested in ${aiInterest}. Include diverse activities that would make for amazing local adventures and hidden gems.`,
            coordinates
          })
        })

        if (!aiResponse.ok) {
          throw new Error('Failed to generate your bucket list')
        }

        const aiPlan = await aiResponse.json()

        // Convert AI plan to bucket list items with proper structure
        items = (aiPlan.plan?.steps || aiPlan.steps || []).map((step: string, index: number) => {
          // For AI-generated items, we'll create them without specific locations initially
          // The backend will need to handle this case
          
          // Try to extract location information from the step text
          const locationMatch = step.match(/(?:at|in|near|visit)\s+([^,.\n]+)/i)
          const aiLocationText = locationMatch ? locationMatch[1].trim() : null
          
          return {
            goal: step,
            priority: index < 2 ? 'high' : index < 4 ? 'medium' : 'low',
            status: 'not_started',
            notes: step,
            // Mark as AI-generated so backend can handle differently
            isAiGenerated: true,
            aiLocationText: aiLocationText,
            addedAt: new Date().toISOString()
          }
        })

        // Use AI-generated title and description
        finalName = aiPlan.plan?.title || aiPlan.title || `${aiInterest} Adventures`
        finalDescription = aiPlan.plan?.summary || aiPlan.summary || `AI-generated bucket list for ${aiInterest} experiences`
      }

      const response = await fetch('/api/bucket-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: finalName,
          description: finalDescription,
          type: selectedType,
          isPublic,
          items,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bucket list')
      }

      // Success! 
      const successMessage = selectedType === 'ai-generated' 
        ? `✨ AI created "${finalName}" with ${items.length} experiences!`
        : 'Bucket list created successfully!'

      toast.success(successMessage)

      // Reset form
      setName('')
      setDescription('')
      setSelectedType('personal')
      setIsPublic(false)
      setAiInterest('')

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
      setAiInterest('')
      onClose()
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
            <RadioGroup 
              value={selectedType} 
              onValueChange={(value) => setSelectedType(value as ListType)}
              className="grid gap-3"
            >
              {listTypes.map((type) => {
                const IconComponent = type.icon
                const isSelected = selectedType === type.id
                
                return (
                  <Card
                    key={type.id}
                    className={`
                      relative border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                      ${isSelected 
                        ? `${type.selectedColor} shadow-lg transform scale-[1.02]` 
                        : `${type.color} hover:border-current`
                      }
                    `}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={type.id} className="mt-1" />
                        <IconComponent className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-current' : 'text-current'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{type.name}</h3>
                            {type.id === 'ai-generated' && (
                              <Badge className="bg-[#ff6b6b]/20 text-[#ff6b6b] border-0 text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                New
                              </Badge>
                            )}
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

          {/* Conditional Fields Based on Type */}
          {selectedType === 'ai-generated' ? (
            <div className="space-y-4 p-4 bg-[#ff6b6b]/5 border border-[#ff6b6b]/20 rounded-lg">
              <div className="flex items-center gap-2 text-[#ff6b6b]">
                <Brain className="h-5 w-5" />
                <span className="font-medium">AI List Generation</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="aiInterest" className="text-gray-700">What are you interested in exploring?</Label>
                <Textarea
                  id="aiInterest"
                  value={aiInterest}
                  onChange={(e) => setAiInterest(e.target.value)}
                  placeholder="e.g., coffee shops, hiking trails, art galleries, food trucks, historic sites..."
                  className="border-[#ff6b6b]/30 focus:border-[#ff6b6b] focus:ring-[#ff6b6b]/20"
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  Tell us your interests and we'll create a personalized bucket list for you!
                </p>
              </div>
            </div>
          ) : (
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
            </div>
          )}

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
              disabled={isLoading || (selectedType === 'ai-generated' ? !aiInterest.trim() : !name.trim())}
              className="flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {selectedType === 'ai-generated' ? 'Generating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  {selectedType === 'ai-generated' ? 'Generate List' : 'Create List'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 