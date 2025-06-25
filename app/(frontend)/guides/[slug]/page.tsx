'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Star, 
  Clock, 
  MapPin, 
  User,
  DollarSign,
  Eye,
  Download,
  CheckCircle,
  Heart,
  Share2,
  Loader2,
  ShoppingCart
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import GuidePaymentModal from '@/components/guides/guide-payment-modal'
import { useCurrentUser } from '@/hooks/use-current-user'

interface Guide {
  id: string
  title: string
  slug: string
  description: string
  creator?: {
    id: string
    name: string
    username: string
    profileImage?: {
      url: string
    }
    creatorProfile?: {
      verification?: {
        isVerified: boolean
      }
      creatorLevel: string
    }
  }
  primaryLocation?: {
    id: string
    name: string
    address?: {
      city?: string
      state?: string
      street?: string
      country?: string
    }
  }
  category?: string
  difficulty: string
  duration: {
    value: number
    unit: string
  }
  pricing: {
    type: 'free' | 'paid' | 'pwyw'
    price?: number
    suggestedPrice?: number
  }
  featuredImage: {
    url: string
    alt: string
  }
  stats: {
    views: number
    purchases: number
    rating?: number
    reviewCount: number
  }
  highlights?: Array<{ highlight: string }>
  content: string | any // Can be string or rich text object
  insiderTips?: Array<{
    category: string
    tip: string
    priority: 'high' | 'medium' | 'low'
  }>
  tags?: Array<{ tag: string }>
  createdAt: string
}

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { user } = useCurrentUser()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [slug, setSlug] = useState<string>('')
  const [creatorGuides, setCreatorGuides] = useState<Guide[]>([])
  const [loadingCreatorGuides, setLoadingCreatorGuides] = useState(false)

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setSlug(resolvedParams.slug)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (slug) {
      fetchGuide()
    }
  }, [slug])

  useEffect(() => {
    if (user && guide) {
      checkPurchaseStatus()
    }
  }, [user, guide?.id])

  useEffect(() => {
    if (guide?.creator?.id) {
      fetchCreatorGuides()
    }
  }, [guide?.creator?.id])

  const fetchGuide = async () => {
    if (!slug) return
    
    try {
      const response = await fetch(`/api/guides/slug/${slug}`)
      const data = await response.json()

      if (data.success) {
        setGuide(data.guide)
      } else {
        toast.error('Guide not found')
      }
    } catch (error) {
      console.error('Error fetching guide:', error)
      toast.error('Failed to load guide')
    } finally {
      setLoading(false)
    }
  }

  const checkPurchaseStatus = async () => {
    if (!user || !guide) return

    try {
      const response = await fetch(`/api/guides/${guide.id}/purchase?userId=${user.id}`)
      const data = await response.json()

      if (data.success) {
        setHasPurchased(data.hasPurchased)
      }
    } catch (error) {
      console.error('Error checking purchase status:', error)
    }
  }

  const fetchCreatorGuides = async () => {
    if (!guide?.creator?.id) return

    setLoadingCreatorGuides(true)
    try {
      const response = await fetch(`/api/guides?creator=${guide.creator.id}&limit=3&sort=-createdAt`)
      const data = await response.json()

      if (data.success) {
        // Filter out the current guide
        const otherGuides = data.guides.filter((g: Guide) => g.id !== guide.id)
        setCreatorGuides(otherGuides)
      }
    } catch (error) {
      console.error('Error fetching creator guides:', error)
    } finally {
      setLoadingCreatorGuides(false)
    }
  }

  const handlePurchaseClick = () => {
    if (!user) {
      toast.error('Please log in to purchase this guide')
      return
    }
    setShowPaymentModal(true)
  }

  const handlePurchaseSuccess = () => {
    setHasPurchased(true)
    setShowPaymentModal(false)
    checkPurchaseStatus() // Refresh purchase status
  }

  const formatPrice = (guide: Guide) => {
    if (guide.pricing.type === 'free') return 'Free'
    if (guide.pricing.type === 'pwyw') {
      const suggested = guide.pricing.suggestedPrice
      return suggested ? `Pay what you want (suggested $${suggested})` : 'Pay what you want'
    }
    return `$${guide.pricing.price}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'challenging': return 'bg-orange-100 text-orange-800'
      case 'expert': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTipPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥'
      case 'medium': return '⭐'
      case 'low': return '💡'
      default: return '💡'
    }
  }

  // Function to extract text from rich text content
  const extractTextFromRichContent = (content: any): string => {
    if (!content) return ''
    
    // If it's already a string, return it
    if (typeof content === 'string') return content
    
    // If it's a rich text object with children
    if (content.root && content.root.children) {
      return extractTextFromChildren(content.root.children)
    }
    
    // If it has children directly
    if (content.children) {
      return extractTextFromChildren(content.children)
    }
    
    return ''
  }

  const extractTextFromChildren = (children: any[]): string => {
    if (!Array.isArray(children)) return ''
    
    return children.map(child => {
      if (child.type === 'text') {
        return child.text || ''
      } else if (child.type === 'paragraph' && child.children) {
        return extractTextFromChildren(child.children)
      } else if (child.children) {
        return extractTextFromChildren(child.children)
      }
      return ''
    }).filter(text => text.trim()).join('\n\n') // Join paragraphs with double newlines
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Guide Not Found</h1>
          <p className="text-gray-600 mb-4">The guide you're looking for doesn't exist or has been removed.</p>
          <Link href="/guides">
            <Button>Browse All Guides</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Preview Notice Banner */}
      {!hasPurchased && guide.pricing.type !== 'free' && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">You're viewing a preview</h3>
                <p className="text-sm text-blue-700">
                  Purchase this guide to unlock the complete content and all insider tips
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={handlePurchaseClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchase Now
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link href="/guides" className="hover:text-blue-600">Guides</Link>
          <span>/</span>
          <span>{guide.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Featured Image */}
            <div className="aspect-video relative overflow-hidden rounded-lg">
              <Image
                src={guide.featuredImage?.url || '/placeholder-guide.jpg'}
                alt={guide.featuredImage?.alt || guide.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Title and Basic Info */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{guide.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <Badge className={getDifficultyColor(guide.difficulty)}>
                  {guide.difficulty}
                </Badge>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{guide.duration.value} {guide.duration.unit}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>
                    {guide.primaryLocation?.name}
                    {guide.primaryLocation?.address?.city && `, ${guide.primaryLocation.address.city}`}
                    {guide.primaryLocation?.address?.state && `, ${guide.primaryLocation.address.state}`}
                  </span>
                </div>

                {hasPurchased && (
                  <>
                    <div className="flex items-center text-sm text-gray-600">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>{guide.stats.views} views</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Download className="h-4 w-4 mr-1" />
                      <span>{guide.stats.purchases} purchases</span>
                    </div>

                    {guide.stats.rating && (
                      <div className="flex items-center text-sm">
                        <Star className="h-4 w-4 mr-1 text-yellow-500" />
                        <span>{guide.stats.rating}</span>
                        <span className="ml-1 text-gray-600">({guide.stats.reviewCount} reviews)</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {hasPurchased && (
                <p className="text-gray-700 text-lg leading-relaxed">{guide.description}</p>
              )}
            </div>

            {/* Creator Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={guide.creator?.profileImage?.url} />
                    <AvatarFallback>
                      {guide.creator?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{guide.creator?.name || 'Unknown Creator'}</h3>
                      {guide.creator?.creatorProfile?.verification?.isVerified && (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {guide.creator?.creatorProfile?.creatorLevel || 'Local Creator'}
                    </p>
                  </div>
                  <Link href={`/guides?creator=${guide.creator?.id || ''}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Only show highlights, content, and tips if purchased */}
            {hasPurchased && (
              <>
                {/* Highlights */}
                {guide.highlights && guide.highlights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>What You'll Experience</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {guide.highlights.map((highlight, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{highlight.highlight}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Main Content */}
                <Card>
                  <CardHeader>
                    <CardTitle>Guide Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-gray max-w-none">
                      {(() => {
                        const contentText = extractTextFromRichContent(guide.content)
                        if (contentText) {
                          return contentText.split('\n').map((paragraph, index) => (
                            <p key={index} className="mb-4 leading-relaxed">
                              {paragraph}
                            </p>
                          ))
                        } else {
                          return <p className="text-gray-500 italic">No content available</p>
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Insider Tips */}
                {guide.insiderTips && guide.insiderTips.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Insider Tips</CardTitle>
                      <CardDescription>
                        Local secrets from {guide.creator?.name || 'the creator'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {guide.insiderTips.map((tip, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg">{getTipPriorityIcon(tip.priority)}</span>
                              <Badge variant="outline" className="text-xs">
                                {tip.category}
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed">{tip.tip}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tags */}
                {guide.tags && guide.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {guide.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag.tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Show preview content for unpurchased guides */}
            {!hasPurchased && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                      Purchase this guide to unlock the complete content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Eye className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-blue-900">What's Inside</h3>
                          <p className="text-sm text-blue-700">Get access to the complete guide content</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">Detailed guide content</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">Insider tips & secrets</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">Location recommendations</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">Lifetime access</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Card */}
            <Card className={`sticky top-4 ${!hasPurchased ? 'ring-2 ring-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {formatPrice(guide)}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {!hasPurchased && (
                  <div className="mt-2 p-3 bg-blue-100 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Preview Mode</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Purchase to unlock full guide content and insider tips
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {hasPurchased ? (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-800">You own this guide!</p>
                    <p className="text-sm text-green-600 mb-3">Access it anytime from your library</p>
                    <Link href="/library">
                      <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-100">
                        View Library
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handlePurchaseClick}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {guide.pricing.type === 'free' ? 'Get Free Guide' : 'Purchase Guide'}
                    </Button>
                    
                    {/* Value proposition for paid guides */}
                    {guide.pricing.type !== 'free' && (
                      <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">What you'll get:</span>
                        </div>
                        <ul className="text-xs text-green-700 space-y-1">
                          <li>• Complete guide content</li>
                          <li>• All insider tips & secrets</li>
                          <li>• Lifetime access</li>
                          <li>• Mobile-friendly format</li>
                        </ul>
                      </div>
                    )}

                    {/* Urgency for paid guides */}
                    {guide.pricing.type !== 'free' && (
                      <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-orange-600">!</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-orange-800">Limited Time Access</p>
                            <p className="text-xs text-orange-700">Get instant access to all content</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 text-center">
                  {guide.pricing.type === 'free' 
                    ? 'This guide is completely free'
                    : 'Secure payment • Instant access • 30-day money-back guarantee'
                  }
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  {guide.category && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{guide.category}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{guide.duration.value} {guide.duration.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Difficulty:</span>
                    <span className="font-medium capitalize">{guide.difficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Language:</span>
                    <span className="font-medium">English</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* More from Creator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">More from {guide.creator?.name || 'this creator'}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCreatorGuides ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading creator guides...</p>
                  </div>
                ) : creatorGuides.length > 0 ? (
                  <div className="space-y-3">
                    {creatorGuides.map((creatorGuide) => (
                      <Link 
                        key={creatorGuide.id} 
                        href={`/guides/${creatorGuide.slug}`}
                        className="block group"
                      >
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                          <div className="w-16 h-16 relative overflow-hidden rounded-lg flex-shrink-0">
                            <Image
                              src={creatorGuide.featuredImage?.url || '/placeholder-guide.jpg'}
                              alt={creatorGuide.featuredImage?.alt || creatorGuide.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors line-clamp-2">
                              {creatorGuide.title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                              >
                                {formatPrice(creatorGuide)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {creatorGuide.duration.value} {creatorGuide.duration.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                    <div className="pt-2">
                      <Link href={`/guides?creator=${guide.creator?.id || ''}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View All Guides
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No other guides from this creator yet</p>
                    <p className="text-xs mt-1">Check back later for more content</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {guide && guide.creator && (
        <GuidePaymentModal
          guide={{
            id: guide.id,
            title: guide.title,
            description: guide.description,
            pricing: guide.pricing,
            author: {
              id: guide.creator.id,
              username: guide.creator.username,
              name: guide.creator.name,
              profileImage: guide.creator.profileImage
            },
            featuredImage: guide.featuredImage,
            stats: guide.stats
          }}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  )
} 