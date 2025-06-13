'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  Clock, 
  Utensils, 
  Eye, 
  Target, 
  Car, 
  DollarSign, 
  Star, 
  Sparkles,
  Loader2,
  X,
  Lightbulb
} from 'lucide-react'

interface SubmitInsiderTipModalProps {
  isOpen: boolean
  onClose: () => void
  locationId: string
  locationName: string
  onSuccess?: () => void
}

interface TipFormData {
  category: string
  tip: string
  priority: 'high' | 'medium' | 'low'
}

const categoryConfig = {
  timing: {
    icon: Clock,
    label: 'Best Times to Visit',
    description: 'When to visit for the best experience',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    examples: ['Visit weekdays 2-4pm to avoid crowds', 'Best lighting for photos at sunset']
  },
  food: {
    icon: Utensils,
    label: 'Food & Drinks',
    description: 'What to order and food secrets',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    examples: ['Ask for the off-menu seasonal special', 'Try the house-made dessert']
  },
  secrets: {
    icon: Eye,
    label: 'Local Secrets',
    description: 'Hidden features only locals know',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    examples: ['Secret rooftop access on weekends', 'Hidden speakeasy entrance in the back']
  },
  protips: {
    icon: Target,
    label: 'Pro Tips',
    description: 'Expert advice for the best experience',
    color: 'bg-green-100 text-green-700 border-green-200',
    examples: ['Bring cash for faster service', 'Download their app for exclusive deals']
  },
  access: {
    icon: Car,
    label: 'Getting There',
    description: 'Transportation and parking tips',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    examples: ['Free parking behind the building', 'Take the blue line, exit at Main St']
  },
  savings: {
    icon: DollarSign,
    label: 'Money Saving',
    description: 'Deals and ways to save money',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    examples: ['Happy hour 3-6pm, half price drinks', 'Student discount with valid ID']
  },
  recommendations: {
    icon: Star,
    label: 'What to Order/Try',
    description: 'Must-try items and recommendations',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    examples: ['The signature cocktail is amazing', 'Must try the chocolate lava cake']
  },
  hidden: {
    icon: Sparkles,
    label: 'Hidden Features',
    description: 'Secret spots and lesser-known features',
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    examples: ['Secret garden patio upstairs', 'Hidden photo booth in the basement']
  }
}

export default function SubmitInsiderTipModal({
  isOpen,
  onClose,
  locationId,
  locationName,
  onSuccess
}: SubmitInsiderTipModalProps) {
  const [formData, setFormData] = useState<TipFormData>({
    category: '',
    tip: '',
    priority: 'medium'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category || !formData.tip.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.tip.trim().length < 10) {
      toast.error('Tip must be at least 10 characters long')
      return
    }

    if (formData.tip.trim().length > 200) {
      toast.error('Tip must be less than 200 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/locations/${locationId}/insider-tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          category: formData.category,
          tip: formData.tip.trim(),
          priority: formData.priority,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Thank you! Your insider tip has been submitted and will be reviewed.')
        
        // Reset form
        setFormData({
          category: '',
          tip: '',
          priority: 'medium'
        })
        setSelectedCategory('')
        
        if (onSuccess) {
          onSuccess()
        }
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit tip')
      }
    } catch (error) {
      console.error('Error submitting tip:', error)
      toast.error('Failed to submit tip. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCategorySelect = (category: string) => {
    setFormData(prev => ({ ...prev, category }))
    setSelectedCategory(category)
  }

  const selectedCategoryConfig = selectedCategory ? categoryConfig[selectedCategory as keyof typeof categoryConfig] : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Share an Insider Tip
          </DialogTitle>
          <DialogDescription>
            Help other visitors discover what makes {locationName} special. Share your local knowledge!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">What type of tip are you sharing? *</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const IconComponent = config.icon
                const isSelected = selectedCategory === key
                
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'
                    }`}
                    onClick={() => handleCategorySelect(key)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm leading-tight">{config.label}</h4>
                          <p className="text-xs text-gray-600 mt-1">{config.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Category Examples */}
          {selectedCategoryConfig && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <selectedCategoryConfig.icon className="h-4 w-4" />
                {selectedCategoryConfig.label} Examples:
              </h4>
              <div className="space-y-1">
                {selectedCategoryConfig.examples.map((example, index) => (
                  <p key={index} className="text-sm text-gray-600">• {example}</p>
                ))}
              </div>
            </div>
          )}

          {/* Tip Input */}
          <div className="space-y-2">
            <Label htmlFor="tip" className="text-base font-medium">
              Your Insider Tip *
            </Label>
            <Textarea
              id="tip"
              value={formData.tip}
              onChange={(e) => setFormData(prev => ({ ...prev, tip: e.target.value }))}
              placeholder="Share your insider knowledge... (10-200 characters)"
              className="min-h-[100px] resize-none"
              maxLength={200}
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Be specific and actionable</span>
              <span>{formData.tip.length}/200</span>
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label className="text-base font-medium">How important is this tip?</Label>
            <div className="flex gap-3">
              {[
                { value: 'high', label: '🔥 Essential', description: 'Must-know information' },
                { value: 'medium', label: '⭐ Helpful', description: 'Good to know' },
                { value: 'low', label: '💡 Nice to Know', description: 'Interesting detail' }
              ].map((priority) => (
                <Card 
                  key={priority.value}
                  className={`cursor-pointer transition-all duration-200 flex-1 ${
                    formData.priority === priority.value 
                      ? 'ring-2 ring-blue-500 shadow-md' 
                      : 'hover:shadow-sm'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, priority: priority.value as any }))}
                >
                  <CardContent className="p-3 text-center">
                    <div className="font-medium text-sm">{priority.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{priority.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 text-blue-900">Tip Guidelines:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be specific and actionable</li>
              <li>• Share information only locals would know</li>
              <li>• Keep it concise but helpful</li>
              <li>• Avoid promotional content</li>
            </ul>
          </div>
        </form>

        <DialogFooter className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.category || !formData.tip.trim()}
            className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Submit Tip
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 