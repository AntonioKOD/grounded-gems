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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Target, 
  Loader2,
  Plus,
  Calendar,
  MapPin
} from 'lucide-react'
import { toast } from 'sonner'

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  bucketListId: string
  bucketListName: string
  onItemAdded?: (item: any) => void
}

export default function AddItemModal({
  isOpen,
  onClose,
  bucketListId,
  bucketListName,
  onItemAdded
}: AddItemModalProps) {
  const [goal, setGoal] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-200' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!goal.trim()) {
      toast.error('Please enter a goal for this item')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/bucket-lists/${bucketListId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          goal: goal.trim(),
          notes: notes.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
          status: 'not_started'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item to bucket list')
      }

      toast.success(`✅ Added "${goal}" to ${bucketListName}`)

      // Reset form
      setGoal('')
      setNotes('')
      setPriority('medium')
      setDueDate('')

      onItemAdded?.(data.item)
      onClose()

    } catch (error) {
      console.error('Error adding item to bucket list:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add item. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setGoal('')
      setNotes('')
      setPriority('medium')
      setDueDate('')
      onClose()
    }
  }

  const getPriorityColor = (priorityValue: string) => {
    return priorityOptions.find(option => option.value === priorityValue)?.color || 'bg-gray-100 text-gray-700'
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border-[#4ecdc4]/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#4ecdc4]">
            <div className="w-10 h-10 bg-gradient-to-r from-[#4ecdc4] to-[#ff6b6b] rounded-full flex items-center justify-center shadow-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">Add Item</span>
              <DialogDescription className="text-gray-600 mt-1">
                Add a new goal to "{bucketListName}"
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal Input */}
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-gray-700 font-medium">
              What would you like to do? *
            </Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Visit the local farmers market, Try the new pizza place..."
              className="border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
              autoFocus
            />
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-gray-700 font-medium">Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high')}>
              <SelectTrigger className="border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${option.color} border`}>
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-gray-700 font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date (Optional)
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
            />
            <p className="text-xs text-gray-500">
              Set a target date for when you'd like to complete this goal
            </p>
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-700 font-medium">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details, reminders, or reasons why this is important to you..."
              className="border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20"
              rows={3}
            />
          </div>

          {/* Preview */}
          {goal.trim() && (
            <div className="p-4 bg-[#4ecdc4]/5 border border-[#4ecdc4]/20 rounded-lg">
              <p className="text-sm text-gray-600 mb-2 font-medium">Preview:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-medium">{goal}</span>
                  <Badge className={`text-xs ${getPriorityColor(priority)}`}>
                    {priority}
                  </Badge>
                </div>
                {dueDate && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due: {new Date(dueDate).toLocaleDateString()}
                  </p>
                )}
                {notes.trim() && (
                  <p className="text-sm text-gray-600">{notes}</p>
                )}
              </div>
            </div>
          )}

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
              disabled={isLoading || !goal.trim()}
              className="flex-1 bg-gradient-to-r from-[#4ecdc4] to-[#ff6b6b] hover:from-[#3dbdb4] hover:to-[#ff5555] text-white border-0 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 