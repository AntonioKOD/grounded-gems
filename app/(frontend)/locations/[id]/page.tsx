import { Suspense } from "react"
import { notFound } from "next/navigation"
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/locations/${id}`)
    
    if (!response.ok) {
      return {
        title: 'Location Not Found | Grounded Gems',
        description: 'The requested location could not be found.',
      }
    }

    const { location } = await response.json()
    
    const getLocationImageUrl = (loc: any): string => {
      if (typeof loc.featuredImage === "string") {
        return loc.featuredImage
      } else if (loc.featuredImage?.url) {
        return loc.featuredImage.url
      }
      return "/placeholder.svg"
    }

    const formatAddress = (address: any): string => {
      if (typeof address === 'string') {
        return address
      }
      if (address && typeof address === 'object') {
        return Object.values(address).filter(Boolean).join(', ')
      }
      return ''
    }

    return {
      title: `${location.name} | Grounded Gems`,
      description: location.shortDescription || location.description || `Discover ${location.name} on Grounded Gems`,
      keywords: [
        location.name,
        ...(location.categories?.map((cat: any) => typeof cat === 'string' ? cat : cat.name) || []),
        'local discovery',
        'hidden gems',
        'travel',
        'places to visit'
      ].join(', '),
      openGraph: {
        title: `${location.name} | Grounded Gems`,
        description: location.shortDescription || location.description || `Discover ${location.name} on Grounded Gems`,
        images: [
          {
            url: getLocationImageUrl(location),
            width: 1200,
            height: 630,
            alt: location.name,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${location.name} | Grounded Gems`,
        description: location.shortDescription || location.description || `Discover ${location.name} on Grounded Gems`,
        images: [getLocationImageUrl(location)],
      },
      other: {
        'geo.position': location.latitude && location.longitude ? `${location.latitude};${location.longitude}` : undefined,
        'geo.placename': location.name,
        'geo.region': formatAddress(location.address),
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Location | Grounded Gems',
      description: 'Discover amazing places on Grounded Gems',
    }
  }
}

// For static generation of popular locations
export async function generateStaticParams() {
  try {
    // Fetch popular/featured locations to pre-generate
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/locations/all?featured=true&limit=50`)
    
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