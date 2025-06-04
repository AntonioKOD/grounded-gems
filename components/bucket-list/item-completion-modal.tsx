'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { BucketListItem, BucketList } from '@/app/(frontend)/bucket-list/BucketListClient' // Adjust path as needed

interface ItemCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  item: BucketListItem | null
  listId: string | null
  onItemUpdate: (updatedItemData: Partial<BucketListItem>, newStats: BucketList['stats']) => void
}

export default function ItemCompletionModal({
  isOpen,
  onClose,
  item,
  listId,
  onItemUpdate,
}: ItemCompletionModalProps) {
  const [rating, setRating] = useState(0)
  const [memory, setMemory] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const starRatingRef = useRef<HTMLDivElement>(null) // Ref for the radiogroup container

  useEffect(() => {
    if (item) {
      setRating(item.completionData?.rating || 0)
      setMemory(item.completionData?.memory || '')
    } else {
      // Reset when item is null (modal closed or no item)
      setRating(0)
      setMemory('')
    }
  }, [item])

  const handleSave = async () => {
    if (!item || !listId) {
      toast.error('Cannot save, item or list information is missing.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        completionData: {
          rating: rating > 0 ? rating : null, // Send null if rating is 0 to remove it
          memory: memory.trim(),
        },
        // We might also want to ensure status is 'completed' if this modal is only for completed items
        // status: 'completed' 
      }

      const response = await fetch(`/api/bucket-lists/${listId}/items/${item.id}`,
        {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify(payload),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save completion details')
      }

      toast.success('Experience details saved!')
      onItemUpdate({ id: item.id, completionData: result.item.completionData, status: result.item.status, completedAt: result.item.completedAt }, result.listStats)
      onClose()
    } catch (error) {
      console.error('Error saving completion data:', error)
      toast.error(error instanceof Error ? error.message : 'Could not save details')
    } finally {
      setIsSaving(false)
    }
  }

  const handleModalClose = () => {
    if (!isSaving) {
      onClose()
    }
  }

  // Keyboard navigation for star rating
  const handleStarKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, starValue: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const nextStar = Math.min(5, starValue + 1)
      setRating(nextStar)
      // Focus the next star button
      const nextButton = starRatingRef.current?.querySelector(`button[data-star-value="${nextStar}"]`) as HTMLButtonElement
      nextButton?.focus()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const prevStar = Math.max(1, starValue - 1) // Min rating is 1 if using arrows, or 0 to clear
      setRating(prevStar)
       // Focus the previous star button
      const prevButton = starRatingRef.current?.querySelector(`button[data-star-value="${prevStar}"]`) as HTMLButtonElement
      prevButton?.focus()
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      // Clicking a star already handles setting rating, including clearing it.
      // If we want Enter/Space to clear if it's the current rating, we can add that logic here.
      // For now, it will just re-select or select.
      setRating(starValue)
    }
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-md border-[#4ecdc4]/20">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-[#ff6b6b]">
            <Sparkles className="h-5 w-5 text-[#ffe66d]" />
            Share Your Experience
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Add details about completing "{item.goal || item.location?.name || item.aiLocationText || 'this item'}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <Label id="rating-label" className="font-medium text-gray-700">Your Rating</Label>
            <div 
              id="memory-rating" 
              ref={starRatingRef}
              role="radiogroup" 
              aria-labelledby="rating-label"
              className="flex items-center space-x-1"
              tabIndex={0} // Make the group focusable
              onKeyDown={(e) => { // Handle group-level arrow keys if first star not focused
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  setRating(1);
                  (starRatingRef.current?.querySelector('button[data-star-value="1"]') as HTMLButtonElement)?.focus();
                }
              }}
            >
              {[1, 2, 3, 4, 5].map((starValue) => (
                <button
                  key={starValue}
                  type="button"
                  role="radio"
                  aria-checked={starValue === rating}
                  aria-label={`Rate ${starValue} out of 5 stars`}
                  data-star-value={starValue} // For querying
                  onClick={() => setRating(starValue === rating ? 0 : starValue)}
                  onKeyDown={(e) => handleStarKeyDown(e, starValue)}
                  className={`p-1 rounded-full transition-colors hover:bg-[#ffe66d]/20 focus:outline-none focus:ring-2 focus:ring-[#ffe66d] focus:ring-offset-2 
                              ${starValue <= rating ? 'text-[#ffe66d]' : 'text-gray-300 hover:text-[#ffe66d]/70'}`}
                  tabIndex={-1} // Individual stars not in tab order, group handles focus
                >
                  <Star className={`h-7 w-7 ${starValue <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Memory Textarea */}
          <div className="space-y-2">
            <Label htmlFor="memory-text" className="font-medium text-gray-700">Your Memory</Label>
            <Textarea
              id="memory-text"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder="What was it like? Any tips or thoughts to share?"
              rows={5}
              className="resize-none border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
            />
            <p className="text-xs text-gray-500">Share a few words about your experience.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleModalClose} 
            disabled={isSaving}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSave} 
            disabled={isSaving} 
            className="min-w-[100px] bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Save Experience
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 