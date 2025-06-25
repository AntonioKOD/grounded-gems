"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Lightbulb, 
  Clock, 
  Utensils, 
  Eye, 
  Star, 
  DollarSign, 
  MapPin, 
  Sparkles,
  Loader2,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

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
    label: 'Best Time to Visit',
    description: 'When to go for the best experience',
    icon: Clock,
    color: 'bg-blue-100 text-blue-600',
    examples: [
      'Go on weekdays to avoid crowds',
      'Visit during happy hour for better prices',
      'Best lighting for photos is early morning'
    ]
  },
  food: {
    label: 'Food & Drinks',
    description: 'What to order and try',
    icon: Utensils,
    color: 'bg-orange-100 text-orange-600',
    examples: [
      'Try the house specialty dish',
      'Ask for the chef\'s recommendation',
      'Don\'t miss the seasonal menu items'
    ]
  },
  secrets: {
    label: 'Hidden Secrets',
    description: 'Insider knowledge only locals know',
    icon: Eye,
    color: 'bg-purple-100 text-purple-600',
    examples: [
      'There\'s a secret garden in the back',
      'Ask for the "locals only" menu',
      'Best spot is actually upstairs'
    ]
  },
  protips: {
    label: 'Pro Tips',
    description: 'How to get the most out of your visit',
    icon: Star,
    color: 'bg-yellow-100 text-yellow-600',
    examples: [
      'Make reservations 2 weeks in advance',
      'Bring cash for better service',
      'Park in the back lot to avoid meters'
    ]
  },
  access: {
    label: 'Accessibility',
    description: 'Important access information',
    icon: MapPin,
    color: 'bg-green-100 text-green-600',
    examples: [
      'Wheelchair accessible through side entrance',
      'Elevator available on the right side',
      'Service animals welcome'
    ]
  },
  savings: {
    label: 'Money Saving',
    description: 'How to save money here',
    icon: DollarSign,
    color: 'bg-emerald-100 text-emerald-600',
    examples: [
      'Student discount available with ID',
      'Happy hour is 4-6pm daily',
      'Group discounts for 6+ people'
    ]
  },
  recommendations: {
    label: 'Local Recommendations',
    description: 'What locals love about this place',
    icon: Sparkles,
    color: 'bg-pink-100 text-pink-600',
    examples: [
      'Locals always order the special',
      'This is where we bring out-of-town guests',
      'Best kept secret in the neighborhood'
    ]
  },
  hidden: {
    label: 'Hidden Gems',
    description: 'Lesser-known features or items',
    icon: Sparkles,
    color: 'bg-indigo-100 text-indigo-600',
    examples: [
      'There\'s a rooftop terrace not many know about',
      'Try the off-menu items',
      'Best photo spot is around the corner'
    ]
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
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 rounded-full p-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Share an Insider Tip</h2>
                  <p className="text-sm text-gray-600">Help other visitors discover what makes {locationName} special</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
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

              {/* Footer */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.category || !formData.tip.trim()}
                  className="flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0"
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
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 