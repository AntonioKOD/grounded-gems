'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Star, MapPin, Users, Zap } from 'lucide-react'

interface CreatorApplicationFormProps {
  userId: string
  onSubmissionSuccess?: () => void
}

const specialtyOptions = [
  { value: 'food', label: '🍽️ Food & Dining', icon: '🍽️' },
  { value: 'nightlife', label: '🍻 Nightlife & Entertainment', icon: '🍻' },
  { value: 'culture', label: '🎨 Culture & Arts', icon: '🎨' },
  { value: 'outdoor', label: '🏞️ Outdoor & Adventure', icon: '🏞️' },
  { value: 'shopping', label: '🛍️ Shopping', icon: '🛍️' },
  { value: 'historical', label: '🏛️ Historical Sites', icon: '🏛️' },
  { value: 'family', label: '👨‍👩‍👧‍👦 Family-Friendly', icon: '👨‍👩‍👧‍👦' },
  { value: 'hidden', label: '💎 Hidden Gems', icon: '💎' },
  { value: 'photography', label: '📸 Photography Spots', icon: '📸' },
  { value: 'lifestyle', label: '🏠 Local Lifestyle', icon: '🏠' },
]

export default function CreatorApplicationForm({ userId, onSubmissionSuccess }: CreatorApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    motivation: '',
    experienceLevel: '',
    localAreas: '',
    specialties: [] as string[],
    portfolioDescription: '',
    socialMedia: '',
  })

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      specialties: checked 
        ? [...prev.specialties, specialty]
        : prev.specialties.filter(s => s !== specialty)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/creator-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`, // Simplified for demo
        },
        body: JSON.stringify({
          userId,
          ...formData,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onSubmissionSuccess?.()
        // Show success message
        alert('Application submitted successfully! We\'ll review it and get back to you soon.')
      } else {
        alert(result.error || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Become a Sacavia Creator
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Join our community of local experts and share your knowledge with travelers and locals alike. 
          Create guides, earn money, and help others discover amazing places.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Star className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Share Your Expertise</h3>
            <p className="text-sm text-gray-600">
              Create detailed guides about places you know and love
            </p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <Zap className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Earn Money</h3>
            <p className="text-sm text-gray-600">
              Monetize your local knowledge with paid guides and tips
            </p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Build Community</h3>
            <p className="text-sm text-gray-600">
              Connect with fellow creators and local enthusiasts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle>Creator Application</CardTitle>
          <CardDescription>
            Tell us about yourself and why you'd like to become a creator
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Motivation */}
            <div>
              <Label htmlFor="motivation" className="text-base font-medium">
                Why do you want to become a creator? *
              </Label>
              <Textarea
                id="motivation"
                placeholder="Tell us about your passion for sharing local knowledge, your goals as a creator, and what unique perspective you bring..."
                value={formData.motivation}
                onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                required
                maxLength={1000}
                className="mt-2"
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.motivation.length}/1000 characters
              </p>
            </div>

            {/* Experience Level */}
            <div>
              <Label className="text-base font-medium">Experience Level *</Label>
              <div className="grid sm:grid-cols-3 gap-3 mt-2">
                {[
                  { value: 'beginner', label: '🌱 Beginner', desc: 'New to creating content' },
                  { value: 'intermediate', label: '🌿 Intermediate', desc: 'Some content creation experience' },
                  { value: 'expert', label: '🌳 Expert', desc: 'Experienced content creator' },
                ].map((level) => (
                  <Card 
                    key={level.value}
                    className={`cursor-pointer transition-all ${
                      formData.experienceLevel === level.value 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level.value }))}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="font-medium">{level.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{level.desc}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Local Areas */}
            <div>
              <Label htmlFor="localAreas" className="text-base font-medium">
                What local areas/cities do you know well? *
              </Label>
              <Textarea
                id="localAreas"
                placeholder="e.g., Downtown Portland, Brooklyn neighborhoods, San Francisco food scene, etc."
                value={formData.localAreas}
                onChange={(e) => setFormData(prev => ({ ...prev, localAreas: e.target.value }))}
                required
                maxLength={500}
                className="mt-2"
                rows={3}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.localAreas.length}/500 characters
              </p>
            </div>

            {/* Specialties */}
            <div>
              <Label className="text-base font-medium">
                What are your specialties? (Select all that apply) *
              </Label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {specialtyOptions.map((specialty) => (
                  <div key={specialty.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={specialty.value}
                      checked={formData.specialties.includes(specialty.value)}
                      onCheckedChange={(checked) => 
                        handleSpecialtyChange(specialty.value, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={specialty.value}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {specialty.label}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.specialties.map((specialty) => {
                    const option = specialtyOptions.find(opt => opt.value === specialty)
                    return (
                      <Badge key={specialty} variant="secondary">
                        {option?.label}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Portfolio Description */}
            <div>
              <Label htmlFor="portfolioDescription" className="text-base font-medium">
                Portfolio & Experience (Optional)
              </Label>
              <Textarea
                id="portfolioDescription"
                placeholder="Describe any relevant experience, social media presence, blog, or content you've created. Include links if applicable."
                value={formData.portfolioDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, portfolioDescription: e.target.value }))}
                maxLength={800}
                className="mt-2"
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.portfolioDescription.length}/800 characters
              </p>
            </div>

            {/* Social Media */}
            <div>
              <Label htmlFor="socialMedia" className="text-base font-medium">
                Social Media or Website (Optional)
              </Label>
              <Input
                id="socialMedia"
                placeholder="@yourusername, website.com, or social media profile"
                value={formData.socialMedia}
                onChange={(e) => setFormData(prev => ({ ...prev, socialMedia: e.target.value }))}
                className="mt-2"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={
                  isSubmitting || 
                  !formData.motivation || 
                  !formData.experienceLevel || 
                  !formData.localAreas || 
                  formData.specialties.length === 0
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  'Submit Creator Application'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="text-center mt-6 text-sm text-gray-600">
        <p>
          We review all applications carefully. You'll hear back from us within 3-5 business days.
        </p>
      </div>
    </div>
  )
} 