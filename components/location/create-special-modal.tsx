'use client'

import React, { useState } from 'react'
import { X, Calendar, Clock, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface CreateSpecialModalProps {
  isOpen: boolean
  onClose: () => void
  locationId: string
  locationName: string
  onSpecialCreated?: (special: Record<string, unknown>) => void
}

interface SpecialFormData {
  title: string
  description: string
  shortDescription: string
  specialType: string
  discountValue: {
    amount: number
    type: 'percentage' | 'fixed'
  }
  startDate: string
  endDate: string
  isOngoing: boolean
  daysAvailable: Array<{ day: string }>
  timeRestrictions: {
    startTime: string
    endTime: string
  }
  terms: string
  restrictions: Array<{ restriction: string }>
}

export default function CreateSpecialModal({
  isOpen,
  onClose,
  locationId,
  locationName,
  onSpecialCreated
}: CreateSpecialModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<SpecialFormData>({
    title: '',
    description: '',
    shortDescription: '',
    specialType: 'discount',
    discountValue: {
      amount: 0,
      type: 'percentage'
    },
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isOngoing: false,
    daysAvailable: [],
    timeRestrictions: {
      startTime: '',
      endTime: ''
    },
    terms: '',
    restrictions: []
  })

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]

  const handleInputChange = (field: keyof SpecialFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDiscountValueChange = (field: 'amount' | 'type', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      discountValue: {
        ...prev.discountValue,
        [field]: value
      }
    }))
  }

  const handleTimeRestrictionsChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      timeRestrictions: {
        ...prev.timeRestrictions,
        [field]: value
      }
    }))
  }

  const handleDayToggle = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      daysAvailable: checked
        ? [...prev.daysAvailable, { day }]
        : prev.daysAvailable.filter(d => d.day !== day)
    }))
  }

  const addRestriction = () => {
    setFormData(prev => ({
      ...prev,
      restrictions: [...prev.restrictions, { restriction: '' }]
    }))
  }

  const updateRestriction = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      restrictions: prev.restrictions.map((r, i) => 
        i === index ? { restriction: value } : r
      )
    }))
  }

  const removeRestriction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      restrictions: prev.restrictions.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title for your special')
      return false
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a description')
      return false
    }
    if (!formData.shortDescription.trim()) {
      toast.error('Please enter a short description')
      return false
    }
    if (formData.discountValue.amount <= 0) {
      toast.error('Please enter a valid discount amount')
      return false
    }
    if (!formData.isOngoing && !formData.endDate) {
      toast.error('Please set an end date or mark as ongoing')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/specials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          shortDescription: formData.shortDescription,
          locationId,
          specialType: formData.specialType,
          discountValue: formData.discountValue,
          startDate: formData.startDate,
          endDate: formData.isOngoing ? null : formData.endDate,
          isOngoing: formData.isOngoing,
          daysAvailable: formData.daysAvailable,
          timeRestrictions: formData.timeRestrictions.startTime || formData.timeRestrictions.endTime ? formData.timeRestrictions : null,
          terms: formData.terms,
          restrictions: formData.restrictions.filter(r => r.restriction.trim()),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Special created successfully!')
        onSpecialCreated?.(data.special)
        onClose()
        // Reset form
        setFormData({
          title: '',
          description: '',
          shortDescription: '',
          specialType: 'discount',
          discountValue: {
            amount: 0,
            type: 'percentage'
          },
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          isOngoing: false,
          daysAvailable: [],
          timeRestrictions: {
            startTime: '',
            endTime: ''
          },
          terms: '',
          restrictions: []
        })
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to create special')
      }
    } catch (error) {
      console.error('Error creating special:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-orange-500" />
            Create Special Offer
          </DialogTitle>
          <DialogDescription>
            Create a special offer for {locationName}. This will be visible to users who follow your location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Taco Tuesday, Happy Hour, 50% Off Week"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="shortDescription">Short Description *</Label>
                <Input
                  id="shortDescription"
                  value={formData.shortDescription}
                  onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                  placeholder="Brief description for previews (max 100 chars)"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="description">Full Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detailed description of your special offer"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="specialType">Special Type</Label>
                <Select
                  value={formData.specialType}
                  onValueChange={(value) => handleInputChange('specialType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="happy_hour">Happy Hour</SelectItem>
                    <SelectItem value="bundle">Bundle Deal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Discount Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Discount Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="discountAmount">Discount Amount *</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountValue.amount}
                    onChange={(e) => handleDiscountValueChange('amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="discountType">Type</Label>
                  <Select
                    value={formData.discountValue.type}
                    onValueChange={(value: 'percentage' | 'fixed') => handleDiscountValueChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  Preview: {formData.discountValue.amount > 0 && (
                    formData.discountValue.type === 'percentage' 
                      ? `${formData.discountValue.amount}% off` 
                      : `$${formData.discountValue.amount} off`
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                When is this offer available?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    disabled={formData.isOngoing}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isOngoing"
                  checked={formData.isOngoing}
                  onCheckedChange={(checked) => handleInputChange('isOngoing', checked)}
                />
                <Label htmlFor="isOngoing">This is an ongoing offer (no end date)</Label>
              </div>

              <div>
                <Label>Available Days (leave empty for all days)</Label>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mt-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={formData.daysAvailable.some(d => d.day === day)}
                        onCheckedChange={(checked) => handleDayToggle(day, checked as boolean)}
                      />
                      <Label htmlFor={day} className="text-sm">{day.substring(0, 3)}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Restrictions (optional)
                </Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex-1">
                    <Label htmlFor="startTime" className="text-sm">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.timeRestrictions.startTime}
                      onChange={(e) => handleTimeRestrictionsChange('startTime', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="endTime" className="text-sm">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.timeRestrictions.endTime}
                      onChange={(e) => handleTimeRestrictionsChange('endTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Restrictions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Terms & Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="terms">Terms and Conditions</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => handleInputChange('terms', e.target.value)}
                  placeholder="e.g., Cannot be combined with other offers, Valid for dine-in only..."
                  rows={3}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Additional Restrictions</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRestriction}>
                    Add Restriction
                  </Button>
                </div>
                <div className="space-y-2 mt-2">
                  {formData.restrictions.map((restriction, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={restriction.restriction}
                        onChange={(e) => updateRestriction(index, e.target.value)}
                        placeholder="Enter restriction"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRestriction(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            style={{ 
              backgroundColor: 'var(--color-success)', 
              color: 'white',
              borderColor: 'var(--color-success)'
            }}
            className="hover:opacity-90"
          >
            {isSubmitting ? 'Creating...' : 'Create Special'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 