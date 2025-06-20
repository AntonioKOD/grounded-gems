'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  X, 
  Save, 
  Eye, 
  Upload,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Users,
  Lightbulb,
  Route,
  Camera,
  FileText,
  Settings,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface GuideFormData {
  title: string
  description: string
  location: string
  category: string
  difficulty: string
  duration: {
    value: number
    unit: 'hours' | 'days'
  }
  pricing: {
    type: 'free' | 'paid' | 'pwyw'
    price?: number
    suggestedPrice?: number
  }
  highlights: Array<{ highlight: string }>
  content: string
  itinerary: Array<{
    time: string
    activity: string
    description: string
    location?: string
    tips?: string
  }>
  recommendations: {
    restaurants: Array<{
      name: string
      type: string
      recommendation: string
      priceRange: 'budget' | 'moderate' | 'expensive' | 'luxury'
    }>
    attractions: Array<{
      name: string
      type: string
      recommendation: string
      bestTime?: string
    }>
    shopping: Array<{
      name: string
      type: string
      recommendation: string
    }>
  }
  insiderTips: Array<{
    category: string
    tip: string
    priority: 'high' | 'medium' | 'low'
  }>
  tags: Array<{ tag: string }>
  language: string
}

const categoryOptions = [
  { label: 'Food & Dining', value: 'food' },
  { label: 'Nightlife & Entertainment', value: 'nightlife' },
  { label: 'Culture & Arts', value: 'culture' },
  { label: 'Outdoor & Adventure', value: 'outdoor' },
  { label: 'Shopping', value: 'shopping' },
  { label: 'Historical', value: 'historical' },
  { label: 'Family-Friendly', value: 'family' },
  { label: 'Hidden Gems', value: 'hidden' },
  { label: 'Photography Spots', value: 'photography' },
  { label: 'Local Lifestyle', value: 'lifestyle' },
]

const difficultyOptions = [
  { label: 'Easy - Accessible to everyone', value: 'easy' },
  { label: 'Moderate - Some walking/planning required', value: 'moderate' },
  { label: 'Challenging - Requires good fitness/preparation', value: 'challenging' },
  { label: 'Expert - For experienced travelers', value: 'expert' },
]

const tipCategories = [
  { label: '💡 Local Secrets', value: 'secrets' },
  { label: '⏰ Best Times', value: 'timing' },
  { label: '💰 Money Saving', value: 'savings' },
  { label: '🚗 Getting Around', value: 'transport' },
  { label: '📱 Apps & Tools', value: 'tools' },
  { label: '🎯 Pro Tips', value: 'protips' },
  { label: '⚠️ Things to Avoid', value: 'avoid' },
]

export default function GuideCreationForm() {
  const [activeTab, setActiveTab] = useState('basics')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<GuideFormData>({
    title: '',
    description: '',
    location: '',
    category: '',
    difficulty: '',
    duration: { value: 1, unit: 'hours' },
    pricing: { type: 'free' },
    highlights: [{ highlight: '' }],
    content: '',
    itinerary: [],
    recommendations: {
      restaurants: [],
      attractions: [],
      shopping: []
    },
    insiderTips: [],
    tags: [],
    language: 'en'
  })

  const updateFormData = (updates: Partial<GuideFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const addHighlight = () => {
    if (formData.highlights.length < 10) {
      updateFormData({
        highlights: [...formData.highlights, { highlight: '' }]
      })
    }
  }

  const removeHighlight = (index: number) => {
    if (formData.highlights.length > 1) {
      updateFormData({
        highlights: formData.highlights.filter((_, i) => i !== index)
      })
    }
  }

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...formData.highlights]
    newHighlights[index] = { highlight: value }
    updateFormData({ highlights: newHighlights })
  }

  const addItineraryItem = () => {
    updateFormData({
      itinerary: [...formData.itinerary, {
        time: '',
        activity: '',
        description: '',
        location: '',
        tips: ''
      }]
    })
  }

  const removeItineraryItem = (index: number) => {
    updateFormData({
      itinerary: formData.itinerary.filter((_, i) => i !== index)
    })
  }

  const updateItineraryItem = (index: number, field: string, value: string) => {
    const newItinerary = [...formData.itinerary]
    newItinerary[index] = { ...newItinerary[index], [field]: value }
    updateFormData({ itinerary: newItinerary })
  }

  const addInsiderTip = () => {
    updateFormData({
      insiderTips: [...formData.insiderTips, {
        category: 'protips',
        tip: '',
        priority: 'medium'
      }]
    })
  }

  const removeInsiderTip = (index: number) => {
    updateFormData({
      insiderTips: formData.insiderTips.filter((_, i) => i !== index)
    })
  }

  const updateInsiderTip = (index: number, field: string, value: string) => {
    const newTips = [...formData.insiderTips]
    newTips[index] = { ...newTips[index], [field]: value }
    updateFormData({ insiderTips: newTips })
  }

  const addTag = (tagValue: string) => {
    if (tagValue.trim() && !formData.tags.some(t => t.tag === tagValue.trim())) {
      updateFormData({
        tags: [...formData.tags, { tag: tagValue.trim() }]
      })
    }
  }

  const removeTag = (index: number) => {
    updateFormData({
      tags: formData.tags.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (status: 'draft' | 'review') => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          status
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Guide ${status === 'draft' ? 'saved as draft' : 'submitted for review'}!`)
        // Redirect to guide management page
      } else {
        toast.error('Failed to save guide')
      }
    } catch (error) {
      console.error('Error saving guide:', error)
      toast.error('Failed to save guide')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    return formData.title.trim() && 
           formData.description.trim() && 
           formData.location && 
           formData.category && 
           formData.difficulty &&
           formData.highlights.some(h => h.highlight.trim()) &&
           formData.content.trim()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create a New Guide</h1>
        <p className="text-gray-600">
          Share your local expertise and help others discover amazing experiences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basics">
            <FileText className="h-4 w-4 mr-2" />
            Basics
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="itinerary">
            <Route className="h-4 w-4 mr-2" />
            Itinerary
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Star className="h-4 w-4 mr-2" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="tips">
            <Lightbulb className="h-4 w-4 mr-2" />
            Insider Tips
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Basics Tab */}
        <TabsContent value="basics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about your guide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Guide Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Hidden Food Gems of Downtown Portland"
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                  maxLength={100}
                />
                <p className="text-sm text-gray-500">{formData.title.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="A compelling description that will attract users to your guide..."
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-sm text-gray-500">{formData.description.length}/500 characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select value={formData.location} onValueChange={(value) => updateFormData({ location: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* TODO: Load from locations API */}
                      <SelectItem value="location1">Sample Location 1</SelectItem>
                      <SelectItem value="location2">Sample Location 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => updateFormData({ category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => updateFormData({ difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty..." />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.duration.value}
                      onChange={(e) => updateFormData({
                        duration: { ...formData.duration, value: parseInt(e.target.value) || 1 }
                      })}
                      className="flex-1"
                    />
                    <Select 
                      value={formData.duration.unit} 
                      onValueChange={(value: 'hours' | 'days') => updateFormData({
                        duration: { ...formData.duration, unit: value }
                      })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <Label>Pricing</Label>
                <div className="space-y-4">
                  <Select 
                    value={formData.pricing.type} 
                    onValueChange={(value: 'free' | 'paid' | 'pwyw') => updateFormData({
                      pricing: { type: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pwyw">Pay What You Want</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.pricing.type === 'paid' && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (USD) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0.99"
                        placeholder="9.99"
                        value={formData.pricing.price || ''}
                        onChange={(e) => updateFormData({
                          pricing: { ...formData.pricing, price: parseFloat(e.target.value) || undefined }
                        })}
                      />
                    </div>
                  )}

                  {formData.pricing.type === 'pwyw' && (
                    <div className="space-y-2">
                      <Label htmlFor="suggestedPrice">Suggested Price (USD)</Label>
                      <Input
                        id="suggestedPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="5.00"
                        value={formData.pricing.suggestedPrice || ''}
                        onChange={(e) => updateFormData({
                          pricing: { ...formData.pricing, suggestedPrice: parseFloat(e.target.value) || undefined }
                        })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Key Highlights * (3-10)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHighlight}
                    disabled={formData.highlights.length >= 10}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Highlight
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {formData.highlights.map((highlight, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Highlight ${index + 1}`}
                        value={highlight.highlight}
                        onChange={(e) => updateHighlight(index, e.target.value)}
                        maxLength={150}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeHighlight(index)}
                        disabled={formData.highlights.length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guide Content</CardTitle>
              <CardDescription>
                The main content of your guide - be detailed and helpful
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content">Main Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your detailed guide content here. Include everything visitors need to know..."
                  value={formData.content}
                  onChange={(e) => updateFormData({ content: e.target.value })}
                  rows={15}
                  className="min-h-[400px]"
                />
                <p className="text-sm text-gray-500">
                  Use rich formatting to make your guide engaging and easy to read
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Itinerary Tab */}
        <TabsContent value="itinerary" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detailed Itinerary</CardTitle>
                  <CardDescription>
                    Optional step-by-step itinerary for your guide
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItineraryItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.itinerary.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No itinerary items yet. Add your first item to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.itinerary.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-medium">Step {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItineraryItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Time</Label>
                          <Input
                            placeholder="e.g., 9:00 AM or Morning"
                            value={item.time}
                            onChange={(e) => updateItineraryItem(index, 'time', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Activity</Label>
                          <Input
                            placeholder="e.g., Visit Central Market"
                            value={item.activity}
                            onChange={(e) => updateItineraryItem(index, 'activity', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Detailed description of this activity..."
                            value={item.description}
                            onChange={(e) => updateItineraryItem(index, 'description', e.target.value)}
                            rows={3}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Location (Optional)</Label>
                          <Input
                            placeholder="Specific address or location"
                            value={item.location || ''}
                            onChange={(e) => updateItineraryItem(index, 'location', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Tips (Optional)</Label>
                          <Textarea
                            placeholder="Additional tips for this activity..."
                            value={item.tips || ''}
                            onChange={(e) => updateItineraryItem(index, 'tips', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insider Tips Tab */}
        <TabsContent value="tips" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Insider Tips</CardTitle>
                  <CardDescription>
                    Share your local knowledge and secrets
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addInsiderTip}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tip
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.insiderTips.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tips yet. Share your insider knowledge to make your guide valuable.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.insiderTips.map((tip, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-medium">Tip {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInsiderTip(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select 
                            value={tip.category} 
                            onValueChange={(value) => updateInsiderTip(index, 'category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tipCategories.map(category => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select 
                            value={tip.priority} 
                            onValueChange={(value: 'high' | 'medium' | 'low') => updateInsiderTip(index, 'priority', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">🔥 Essential</SelectItem>
                              <SelectItem value="medium">⭐ Helpful</SelectItem>
                              <SelectItem value="low">💡 Nice to Know</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tip</Label>
                        <Textarea
                          placeholder="Share your insider knowledge..."
                          value={tip.tip}
                          onChange={(e) => updateInsiderTip(index, 'tip', e.target.value)}
                          maxLength={300}
                          rows={3}
                        />
                        <p className="text-sm text-gray-500">{tip.tip.length}/300 characters</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guide Settings</CardTitle>
              <CardDescription>
                Final settings and tags for your guide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tags */}
              <div className="space-y-4">
                <Label>Tags</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Add a tag and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = ''
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {tag.tag}
                        <X 
                          className="h-3 w-3 ml-1" 
                          onClick={() => removeTag(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>Language</Label>
                <Select 
                  value={formData.language} 
                  onValueChange={(value) => updateFormData({ language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Form Validation Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Form Status</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center">
                    {formData.title.trim() ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span>Title</span>
                  </div>
                  <div className="flex items-center">
                    {formData.description.trim() ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span>Description</span>
                  </div>
                  <div className="flex items-center">
                    {formData.location ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span>Location</span>
                  </div>
                  <div className="flex items-center">
                    {formData.category ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span>Category</span>
                  </div>
                  <div className="flex items-center">
                    {formData.highlights.some(h => h.highlight.trim()) ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span>At least one highlight</span>
                  </div>
                  <div className="flex items-center">
                    {formData.content.trim() ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span>Main content</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => handleSubmit('draft')}
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        
        <Button
          onClick={() => handleSubmit('review')}
          disabled={isSubmitting || !isFormValid()}
        >
          <Eye className="h-4 w-4 mr-2" />
          Submit for Review
        </Button>
      </div>
    </div>
  )
} 