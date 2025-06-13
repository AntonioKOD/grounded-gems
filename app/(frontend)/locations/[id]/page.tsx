import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { parseLocationParam } from '@/lib/slug-utils'
import { getPrimaryImageUrl } from '@/lib/image-utils'
import Image from 'next/image'
import Link from 'next/link'
import { 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Star, 
  DollarSign,
  Lightbulb,
  ChevronRight,
  Award,
  Shield,
  Users,
  Camera,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  LocationHeroButtons
} from './location-interactions'
import { ContactActions } from './contact-actions'
import { UserPhotosSection } from '@/components/location/user-photos-section'
import StructuredInsiderTips from '@/components/location/structured-insider-tips'

export const dynamic = 'force-dynamic'

interface BusinessHours {
  day: string
  open: string
  close: string
  isOpen?: boolean
}

interface Address {
  street?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
}

interface ContactInfo {
  phone?: string
  website?: string
  email?: string
}

interface LocationData {
  id: string
  slug?: string
  name: string
  description?: string
  address: Address | string
  featuredImage?: string | { url: string }
  gallery?: Array<{ url: string; alt?: string }>
  businessHours?: BusinessHours[]
  contactInfo?: ContactInfo
  coordinates?: { latitude: number; longitude: number }
  categories?: Array<{ name: string; id: string }>
  averageRating?: number
  reviewCount?: number
  priceRange?: string
  amenities?: string[]
  isVerified?: boolean
  isFeatured?: boolean
  insiderTips?: string
}

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params
    const { slug: urlSlug, id: urlId } = parseLocationParam(id)
    
    const payload = await getPayload({ config })
    
    // Try to find location by slug first, then by ID
    let location
    try {
      if (urlSlug) {
        const slugResults = await payload.find({
          collection: 'locations',
          where: {
            slug: {
              equals: urlSlug
            }
          },
          limit: 1
        })
        location = slugResults.docs[0]
      }
    } catch (error) {
      console.warn('Failed to find location by slug:', error)
    }
    
    // Fallback to ID lookup if slug lookup failed
    if (!location && urlId) {
      try {
        location = await payload.findByID({
          collection: 'locations',
          id: urlId
        })
      } catch (error) {
        console.warn('Failed to find location by ID:', error)
      }
    }

    if (!location) {
      return {
        title: 'Location Not Found',
        description: 'The requested location could not be found.'
      }
    }

    const locationName = location.name || 'Unnamed Location'
    const description = location.shortDescription || location.description || `Discover ${locationName} - a unique destination worth visiting.`
    
    // Get image URL using the robust utility function
    const imageUrl = getPrimaryImageUrl(location) || '/og-default.jpg'

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sacavia.com'
    const canonicalUrl = `${baseUrl}/locations/${urlSlug || urlId}`

    return {
      title: `${locationName} | Sacavia`,
      description,
      keywords: [
        locationName,
        'travel',
        'destinations',
        'places to visit',
        'local guide',
        'reviews',
        'recommendations'
      ],
      authors: [{ name: 'Sacavia' }],
      creator: 'Sacavia',
      publisher: 'Sacavia',
      robots: 'index, follow',
      openGraph: {
        title: locationName,
        description,
        url: canonicalUrl,
        siteName: 'Sacavia',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: locationName,
          }
        ],
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: locationName,
        description,
        images: [imageUrl],
        creator: '@sacavia',
      },
      alternates: {
        canonical: canonicalUrl,
      },
      other: {
        'geo.region': location.address?.state || undefined,
        'geo.placename': locationName,
        'geo.position': location.latitude && location.longitude 
          ? `${location.latitude};${location.longitude}` 
          : undefined,
        'ICBM': location.latitude && location.longitude 
          ? `${location.latitude}, ${location.longitude}` 
          : undefined,
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Location | Sacavia',
      description: 'Discover amazing places and hidden gems on Sacavia.'
    }
  }
}

export default async function LocationPage({ params }: PageProps) {
  const resolvedParams = await params
  const parsedParams = parseLocationParam(resolvedParams.id)
  
  if (!parsedParams) {
    notFound()
  }

  const { slug, id } = parsedParams
  const payload = await getPayload({ config })

  try {
    const locationResult = await payload.find({
      collection: 'locations',
      where: id ? { id: { equals: id } } : { slug: { equals: slug } },
      limit: 1,
    })

    if (!locationResult.docs.length) {
      notFound()
    }

    const location = locationResult.docs[0] as LocationData

    if (id && location.slug && location.slug !== slug) {
      redirect(`/locations/${location.slug}`)
    }

    // Helper functions
    const getLocationImageUrl = (loc: LocationData): string => {
      return getPrimaryImageUrl(loc)
    }

    const formatAddress = (address: Address | string): string => {
      if (typeof address === 'string') return address
      const parts = [address.street, address.city, address.state, address.zipCode]
      return parts.filter(Boolean).join(', ')
    }

    const formatTime = (timeStr: string): string => {
      if (!timeStr) return ''
      
      const time = timeStr.toLowerCase().replace(/\s+/g, '')
      let [hours, minutes = '0'] = time.split(':')
      
      // Remove any am/pm suffixes that might already exist
      hours = hours.replace(/[ap]m/, '')
      minutes = minutes.replace(/[ap]m/, '')
      
      const hourNum = parseInt(hours)
      const minuteNum = parseInt(minutes)
      
      if (isNaN(hourNum) || isNaN(minuteNum)) return timeStr
      
      // Convert to 12-hour format
      const period = hourNum >= 12 ? 'PM' : 'AM'
      const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum
      const displayMinute = minuteNum.toString().padStart(2, '0')
      
      return `${displayHour}:${displayMinute} ${period}`
    }

    const formatPriceRange = (priceRange?: string): string => {
      if (!priceRange) return 'Price not available'
      
      // Check for expensive indicators
      const expensiveIndicators = ['$$$$', 'expensive', 'upscale', 'fine dining', 'luxury', 'premium']
      const isExpensive = expensiveIndicators.some(indicator => 
        priceRange.toLowerCase().includes(indicator)
      )
      
      if (isExpensive) {
        return '100+'
      }
      
      return priceRange
    }

    const getBusinessStatus = (businessHours?: BusinessHours[]) => {
      if (!businessHours?.length) return { status: 'Hours not available', isOpen: false }
      
      const parseTime = (timeStr: string): number | null => {
        if (!timeStr || timeStr.trim() === '') return null
        
        // Clean up the time string
        let cleanTime = timeStr.toLowerCase().trim().replace(/\s+/g, '')
        
        // Handle common variations
        cleanTime = cleanTime.replace(/\./g, ':') // Replace dots with colons
        
        // Extract hours, minutes, and period
        let hours = 0
        let minutes = 0
        let isPM = false
        
        // Check for AM/PM
        if (cleanTime.includes('pm')) {
          isPM = true
          cleanTime = cleanTime.replace('pm', '')
        } else if (cleanTime.includes('am')) {
          isPM = false
          cleanTime = cleanTime.replace('am', '')
        }
        
        // Split by colon or just get the number
        const timeParts = cleanTime.split(':')
        hours = parseInt(timeParts[0]) || 0
        minutes = parseInt(timeParts[1]) || 0
        
        // Validate hours and minutes
        if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) {
          return null
        }
        
        // Convert to 24-hour format
        if (isPM && hours !== 12) {
          hours += 12
        } else if (!isPM && hours === 12) {
          hours = 0
        }
        
        // Convert to minutes since midnight
        return hours * 60 + minutes
      }

      const now = new Date()
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
      const currentTime = now.getHours() * 60 + now.getMinutes()
      
      // Find today's hours (case-insensitive matching)
      const todayHours = businessHours.find(h => 
        h.day.toLowerCase() === currentDay.toLowerCase()
      )
      
      if (!todayHours) {
        return { status: 'Hours not available', isOpen: false }
      }
      
      // Check if closed today
      if (todayHours.isOpen === false || !todayHours.open || !todayHours.close) {
        return { status: 'Closed today', isOpen: false }
      }
      
      const openTime = parseTime(todayHours.open)
      const closeTime = parseTime(todayHours.close)
      
      if (openTime === null || closeTime === null) {
        return { status: 'Hours not available', isOpen: false }
      }
      
      // Handle cases where closing time is after midnight (e.g., 2:00 AM)
      let isOpen = false
      if (closeTime < openTime) {
        // Crosses midnight (e.g., 10 PM to 2 AM)
        isOpen = currentTime >= openTime || currentTime <= closeTime
      } else {
        // Normal case (e.g., 9 AM to 5 PM)
        isOpen = currentTime >= openTime && currentTime <= closeTime
      }
      
      // Provide more detailed status messages
      let status = 'Closed'
      if (isOpen) {
        status = 'Open now'
      } else {
        // Check if opening soon (within next 2 hours)
        const timeUntilOpen = openTime > currentTime ? openTime - currentTime : (24 * 60) - currentTime + openTime
        if (timeUntilOpen <= 120 && timeUntilOpen > 0) { // 2 hours = 120 minutes
          const hoursUntil = Math.floor(timeUntilOpen / 60)
          const minutesUntil = timeUntilOpen % 60
          if (hoursUntil > 0) {
            status = `Opens in ${hoursUntil}h ${minutesUntil}m`
          } else {
            status = `Opens in ${minutesUntil}m`
          }
        } else {
          // Check if closed recently (within last 2 hours)
          const timeSinceClosed = closeTime < currentTime ? currentTime - closeTime : currentTime + (24 * 60) - closeTime
          if (timeSinceClosed <= 120 && timeSinceClosed > 0) {
            status = 'Recently closed'
          } else {
            status = 'Closed'
          }
        }
      }
      
      return { status, isOpen }
    }

    const processGalleryImages = (loc: LocationData): string[] => {
      const images: string[] = []
      
      // Add featured image first
      const featuredUrl = getLocationImageUrl(loc)
      if (featuredUrl && featuredUrl !== '/placeholder.svg' && featuredUrl !== '/images/placeholder-location.jpg') {
        images.push(featuredUrl)
      }
      
      // Add gallery images
      if (loc.gallery?.length) {
        loc.gallery.forEach(item => {
          if (typeof item === 'object' && item.url) {
            images.push(item.url)
          }
        })
      }
      
      return images
    }

    // Process data
    const businessStatus = getBusinessStatus(location.businessHours)
    const galleryImages = processGalleryImages(location)
    const rating = location.averageRating || 0
    const reviewCount = location.reviewCount || 0
    const priceRange = location.priceRange
    const categories = location.categories || []

    const locationUrl = `https://sacavia.com/locations/${location.slug || location.id}`

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Website Navigation Breadcrumbs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center space-x-2 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Link href="/locations" className="text-muted-foreground hover:text-primary transition-colors">
                Locations
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{location.name}</span>
            </nav>
          </div>
        </div>

        {/* Hero Section - Website Style */}
        <div className="relative">
          <div className="h-96 lg:h-[500px] relative overflow-hidden">
            <Image
              src={getLocationImageUrl(location) || '/images/placeholder-location.jpg'}
              alt={location.name}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            
            {/* Hero Content */}
            <div className="absolute inset-0 flex items-end">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
                <div className="max-w-3xl">
                  {/* Location Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {location.isVerified && (
                      <Badge className="bg-green-600 text-white">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {location.isFeatured && (
                      <Badge className="bg-yellow-600 text-white">
                        <Award className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {categories.length > 0 && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {categories[0].name}
                      </Badge>
                    )}
                  </div>

                  {/* Location Name & Rating */}
                  <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                    {location.name}
                  </h1>
                  
                  <div className="flex items-center gap-4 mb-6 text-white/90">
                    {rating > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{rating.toFixed(1)}</span>
                        <span className="text-sm">({reviewCount} reviews)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      <span className="text-sm">{formatAddress(location.address)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className={`text-sm font-medium ${businessStatus.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                        {businessStatus.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <LocationHeroButtons 
                    locationName={location.name}
                    description={location.description || ''}
                    coordinates={location.coordinates}
                    contactInfo={location.contactInfo}
                    locationUrl={locationUrl}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-12">
              {/* Quick Info Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center p-4">
                  <CardContent className="p-0">
                    <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Price Range</p>
                    <p className="font-semibold">{formatPriceRange(priceRange)}</p>
                  </CardContent>
                </Card>
                <Card className="text-center p-4">
                  <CardContent className="p-0">
                    <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="font-semibold">{reviewCount}</p>
                  </CardContent>
                </Card>
                <Card className="text-center p-4">
                  <CardContent className="p-0">
                    <Star className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="font-semibold">{rating > 0 ? rating.toFixed(1) : 'N/A'}</p>
                  </CardContent>
                </Card>
                <Card className="text-center p-4">
                  <CardContent className="p-0">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`font-semibold ${businessStatus.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {businessStatus.isOpen ? 'Open' : 'Closed'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* About Section */}
              <Card>
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-primary">About {location.name}</h2>
                  {location.description && (
                    <div className="prose prose-gray max-w-none mb-6">
                      <p className="text-lg leading-relaxed text-muted-foreground">
                        {location.description}
                      </p>
                    </div>
                  )}
                  
                  {location.insiderTips && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-amber-800 mb-1">Insider Tip</h4>
                          <p className="text-amber-700 text-sm">{location.insiderTips}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gallery Section */}
              {galleryImages.length > 0 && (
                <Card>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-primary">Gallery</h2>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Camera className="w-4 h-4" />
                        <span className="text-sm">{galleryImages.length} photos</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {galleryImages.slice(0, 6).map((image, index) => (
                        <div key={index} className="relative aspect-square group cursor-pointer">
                          <Image
                            src={image}
                            alt={`${location.name} - Image ${index + 1}`}
                            fill
                            className="object-cover rounded-lg transition-transform group-hover:scale-105"
                          />
                          {index === 5 && galleryImages.length > 6 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                              <span className="text-white font-semibold text-lg">
                                +{galleryImages.length - 6} more
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {galleryImages.length > 6 && (
                      <Button variant="outline" className="w-full mt-4">
                        View All Photos ({galleryImages.length})
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Insider Tips Section */}
              {location.insiderTips && (
                <Card>
                  <CardContent className="p-8">
                    <StructuredInsiderTips
                      tips={location.insiderTips}
                      locationName={location.name}
                      locationId={location.id}
                      showAddTip={true}
                      compact={false}
                    />
                  </CardContent>
                </Card>
              )}

              {/* User Photos Section */}
              <Card>
                <CardContent className="p-8">
                  <UserPhotosSection 
                    locationId={location.id} 
                    locationName={location.name}
                  />
                </CardContent>
              </Card>

              {/* Business Hours */}
              {location.businessHours && location.businessHours.length > 0 && (
                <Card>
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6 text-primary">Hours of Operation</h2>
                    <div className="space-y-3">
                      {location.businessHours.map((hours, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="font-medium capitalize">{hours.day}</span>
                          <span className="text-muted-foreground">
                            {hours.open && hours.close ? (
                              `${formatTime(hours.open)} - ${formatTime(hours.close)}`
                            ) : (
                              'Closed'
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="top-6">
                <Card className="bg-white/95 backdrop-blur-md border-2 shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4 text-primary">Contact Information</h3>
                    <div className="space-y-4">
                      {/* Address */}
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Address</p>
                          <p className="text-muted-foreground text-sm">{formatAddress(location.address)}</p>
                        </div>
                      </div>

                      {/* Phone */}
                      {location.contactInfo?.phone && (
                        <div className="flex items-start gap-3">
                          <Phone className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Phone</p>
                            <a 
                              href={`tel:${location.contactInfo.phone}`}
                              className="text-muted-foreground text-sm hover:text-primary transition-colors"
                            >
                              {location.contactInfo.phone}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Website */}
                      {location.contactInfo?.website && (
                        <div className="flex items-start gap-3">
                          <Globe className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Website</p>
                            <a 
                              href={location.contactInfo.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground text-sm hover:text-primary transition-colors flex items-center gap-1"
                            >
                              Visit Website
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Price Range */}
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Price Range</p>
                          <p className="text-muted-foreground text-sm">{formatPriceRange(priceRange)}</p>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Quick Actions */}
                    <ContactActions 
                      coordinates={location.coordinates}
                      phone={location.contactInfo?.phone}
                      locationUrl={locationUrl}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Categories & Tags */}
              {categories.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category, index) => (
                        <Badge key={index} variant="outline">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Features */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Features</h3>
                  <div className="space-y-3">
                    {location.isVerified && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Verified Location</span>
                      </div>
                    )}
                    {rating > 4 && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm">Highly Rated</span>
                      </div>
                    )}
                    {businessStatus.isOpen && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Currently Open</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error fetching location:', error)
    notFound()
  }
} 