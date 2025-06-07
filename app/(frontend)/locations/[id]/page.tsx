import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getBaseUrl } from "@/lib/utils"
import LocationDetailPage from "./location-detail-page"

// Dynamic route for individual location pages
// Following Next.js 15 App Router conventions

interface LocationPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LocationPage({ params }: LocationPageProps) {
  // Await params as required in Next.js 15
  const { id } = await params

  if (!id || typeof id !== 'string') {
    notFound()
  }

  return (
    <Suspense fallback={<LocationPageSkeleton />}>
      <LocationDetailPage locationId={id} />
    </Suspense>
  )
}

// Loading skeleton component
function LocationPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image Skeleton */}
      <div className="relative h-96 bg-gray-200 animate-pulse">
        <div className="absolute top-4 left-4 w-10 h-10 bg-gray-300 rounded-full"></div>
        <div className="absolute top-4 right-4 flex gap-2">
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4/6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="space-y-4">
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: LocationPageProps) {
  const { id } = await params
  
  try {
    // Fetch location data for metadata
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/locations/${id}`)
    
    if (!response.ok) {
      return {
        title: 'Location Not Found | Sacavia',
        description: 'The requested location could not be found on Sacavia.',
        robots: 'noindex, nofollow'
      }
    }

    const { location } = await response.json()
    
    const getLocationImageUrl = (loc: any): string => {
      if (typeof loc.featuredImage === "string") {
        return loc.featuredImage.startsWith('http') ? loc.featuredImage : `${baseUrl}${loc.featuredImage}`
      } else if (loc.featuredImage?.url) {
        return loc.featuredImage.url.startsWith('http') ? loc.featuredImage.url : `${baseUrl}${loc.featuredImage.url}`
      }
      return `${baseUrl}/og-image.png`
    }

    const formatAddress = (address: any): string => {
      if (typeof address === 'string') {
        return address
      }
      if (address && typeof address === 'object') {
        const parts = [address.street, address.city, address.state, address.country].filter(Boolean)
        return parts.join(', ')
      }
      return ''
    }

    // Generate comprehensive title
    const categories = location.categories?.map((cat: any) => typeof cat === 'string' ? cat : cat.name) || []
    const primaryCategory = categories[0] || 'Location'
    const addressPart = formatAddress(location.address)
    const cityPart = addressPart.split(',')[1]?.trim() || addressPart.split(',')[0]?.trim()
    
    const seoTitle = cityPart 
      ? `${location.name} - ${primaryCategory} in ${cityPart} | Sacavia`
      : `${location.name} - ${primaryCategory} | Sacavia`

    // Generate rich description
    const shortDesc = location.shortDescription || 
      (typeof location.description === 'string' ? location.description.slice(0, 160) : '') ||
      `Discover ${location.name}, a ${primaryCategory.toLowerCase()} located in ${cityPart || 'your area'}. Join the Sacavia community and explore authentic local experiences.`

    const keywords = [
      location.name,
      ...categories,
      'local discovery',
      'authentic experiences',
      'community recommendations',
      'travel guide',
      'hidden gems',
      cityPart,
      addressPart
    ].filter(Boolean).join(', ')

    return {
      title: seoTitle,
      description: shortDesc,
      keywords,
      authors: [{ name: 'Sacavia Community' }],
      creator: 'Sacavia',
      publisher: 'Sacavia',
      alternates: {
        canonical: `${baseUrl}/locations/${id}`
      },
      openGraph: {
        title: seoTitle,
        description: shortDesc,
        url: `${baseUrl}/locations/${id}`,
        siteName: 'Sacavia',
        images: [
          {
            url: getLocationImageUrl(location),
            width: 1200,
            height: 630,
            alt: `${location.name} - Photo from Sacavia community`,
          },
        ],
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description: shortDesc,
        site: '@sacavia',
        creator: '@sacavia',
        images: [getLocationImageUrl(location)],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      other: {
        'geo.position': location.latitude && location.longitude ? `${location.latitude};${location.longitude}` : undefined,
        'geo.placename': location.name,
        'geo.region': formatAddress(location.address),
        'article:author': 'Sacavia Community',
        'article:publisher': 'https://www.sacavia.com',
        'og:locale': 'en_US',
        'og:type': 'place',
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Location | Sacavia - Guided Discovery & Authentic Journeys',
      description: 'Discover amazing places and authentic experiences with the Sacavia community.',
      robots: 'noindex'
    }
  }
}

// For static generation of popular locations
export async function generateStaticParams() {
  try {
    // Fetch popular/featured locations to pre-generate
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/locations/all?featured=true&limit=50`)
    
    if (!response.ok) {
      return []
    }

    const { locations } = await response.json()
    
    return locations.map((location: any) => ({
      id: location.id,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
} 