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

interface Guide {
  id: string
  title: string
  slug: string
  description: string
  creator: {
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
  location: {
    id: string
    name: string
    city: string
    state: string
  }
  category: string
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
  highlights: Array<{ highlight: string }>
  content: string
  insiderTips: Array<{
    category: string
    tip: string
    priority: 'high' | 'medium' | 'low'
  }>
  tags: Array<{ tag: string }>
  createdAt: string
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [hasPurchased, setHasPurchased] = useState(false)

  useEffect(() => {
    fetchGuide()
  }, [params.slug])

  const fetchGuide = async () => {
    try {
      const response = await fetch(`/api/guides/${params.slug}`)
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

  const handlePurchase = async () => {
    if (!guide) return

    setPurchasing(true)
    try {
      const response = await fetch(`/api/guides/${guide.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: guide.pricing.price || 0,
          userId: 'current-user-id' // TODO: Get from auth
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Guide purchased successfully!')
        setHasPurchased(true)
      } else {
        toast.error(data.error || 'Failed to purchase guide')
      }
    } catch (error) {
      console.error('Error purchasing guide:', error)
      toast.error('Failed to purchase guide')
    } finally {
      setPurchasing(false)
    }
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
                  <span>{guide.location.name}, {guide.location.city}</span>
                </div>

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
              </div>

              <p className="text-gray-700 text-lg leading-relaxed">{guide.description}</p>
            </div>

            {/* Creator Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={guide.creator.profileImage?.url} />
                    <AvatarFallback>
                      {guide.creator.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{guide.creator.name}</h3>
                      {guide.creator.creatorProfile?.verification?.isVerified && (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {guide.creator.creatorProfile?.creatorLevel || 'Local Creator'}
                    </p>
                  </div>
                  <Link href={`/profile/${guide.creator.id}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Highlights */}
            {guide.highlights.length > 0 && (
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
                  {guide.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Insider Tips */}
            {guide.insiderTips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Insider Tips</CardTitle>
                  <CardDescription>
                    Local secrets from {guide.creator.name}
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
            {guide.tags.length > 0 && (
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Card */}
            <Card className="sticky top-4">
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
              </CardHeader>
              <CardContent className="space-y-4">
                {hasPurchased ? (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-800">You own this guide!</p>
                    <p className="text-sm text-green-600">Access it anytime from your library</p>
                  </div>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handlePurchase}
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    {guide.pricing.type === 'free' ? 'Get Free Guide' : 'Purchase Guide'}
                  </Button>
                )}

                <div className="text-xs text-gray-500 text-center">
                  {guide.pricing.type === 'free' 
                    ? 'This guide is completely free'
                    : 'Secure payment • Instant access • 30-day money-back guarantee'
                  }
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{guide.category}</span>
                  </div>
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
                <CardTitle className="text-lg">More from {guide.creator.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Browse more guides from this creator</p>
                  <Link href={`/guides?creator=${guide.creator.id}`}>
                    <Button variant="outline" size="sm" className="mt-2">
                      View All Guides
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 