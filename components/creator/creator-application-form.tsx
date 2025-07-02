'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Star, MapPin, Users, Zap, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [existingApplication, setExistingApplication] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [formData, setFormData] = useState({
    motivation: '',
    experienceLevel: '',
    localAreas: '',
    specialties: [] as string[],
    portfolioDescription: '',
    socialMedia: '',
  })

  // Check for existing application on mount
  useEffect(() => {
    const checkExistingApplication = async () => {
      try {
        const response = await fetch('/api/creator-application', {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.hasApplication) {
            setExistingApplication(result.application)
          }
        }
      } catch (error) {
        console.error('Error checking existing application:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkExistingApplication()
  }, [])

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
    setError('')

    try {
      const response = await fetch('/api/creator-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        // Set the application data to show the status
        setExistingApplication({
          ...result.application,
          status: 'pending'
        })
        
        // Call the optional callback if provided
        if (onSubmissionSuccess) {
          onSubmissionSuccess()
        }
      } else {
        setError(result.error || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      setError('Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading application status...</span>
        </div>
      </div>
    )
  }

  // Show existing application status
  if (existingApplication) {
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'pending':
          return <Clock className="h-5 w-5 text-yellow-500" />
        case 'reviewing':
          return <AlertCircle className="h-5 w-5 text-blue-500" />
        case 'approved':
          return <CheckCircle className="h-5 w-5 text-green-500" />
        case 'rejected':
          return <AlertCircle className="h-5 w-5 text-red-500" />
        default:
          return <Clock className="h-5 w-5 text-gray-500" />
      }
    }

    const getStatusMessage = (status: string) => {
      switch (status) {
        case 'pending':
          return 'Thank you for applying! Your application has been submitted and is pending review. We\'ll get back to you within 3-5 business days.'
        case 'reviewing':
          return 'Great news! Your application is currently under review by our team. We\'ll notify you once we have an update.'
        case 'approved':
          return 'Congratulations! Your creator application has been approved. You can now start creating and selling guides!'
        case 'rejected':
          return 'Your application was not approved at this time. Please review the feedback below and feel free to submit a new application.'
        case 'needs_info':
          return 'We need some additional information to complete your application review. Please see the details below.'
        default:
          return 'Application status unknown.'
      }
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Creator Application Status
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon(existingApplication.status)}
              <h3 className="text-lg font-semibold capitalize">
                {existingApplication.status.replace('_', ' ')} Application
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              {getStatusMessage(existingApplication.status)}
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Application Details</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Submitted:</strong> {new Date(existingApplication.createdAt).toLocaleDateString()}</p>
                  <p><strong>Experience Level:</strong> {existingApplication.experienceLevel}</p>
                  <p><strong>Specialties:</strong> {existingApplication.specialties?.length || 0} selected</p>
                </div>
              </div>
              
              {existingApplication.status === 'rejected' && existingApplication.rejectionReason && (
                <div>
                  <h4 className="font-medium mb-2">Feedback</h4>
                  <p className="text-sm text-gray-600">{existingApplication.rejectionReason}</p>
                </div>
              )}
            </div>

            {existingApplication.status === 'rejected' && (
              <div className="mt-6 pt-6 border-t">
                <Button 
                  onClick={() => setExistingApplication(null)}
                  className="w-full"
                >
                  Submit New Application
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
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

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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