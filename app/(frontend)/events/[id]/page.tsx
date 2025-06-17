import { Suspense } from "react"
import type { Metadata } from "next"
import EventDetailContainer from "@/components/event/event-detail-container"
import { getEventById } from "@/app/(frontend)/events/actions"
import { EventStructuredData } from "@/components/seo/enhanced-structured-data"

export const dynamic = 'force-dynamic'
// Params now comes in as a Promise<{ id: string }>
type AsyncParams = Promise<{ id: string }>

// generateMetadata must also await the async params
export async function generateMetadata({
  params,
}: {
  params: AsyncParams
}): Promise<Metadata> {
  const { id } = await params
  const event = await getEventById({ eventId: id })

  if (!event) {
    return {
      title: "Event Not Found | Sacavia",
      description: "The event you're looking for could not be found on Sacavia.",
      robots: 'noindex, nofollow'
    }
  }

  // Generate comprehensive event metadata
  const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const locationName = typeof event.location === 'string' 
    ? event.location 
    : event.location?.name || 'Event Location'

  const seoTitle = `${event.name} - ${eventDate} | Sacavia`
  const description = event.description.length > 160 
    ? event.description.substring(0, 157) + '...'
    : event.description || `Join ${event.name} on ${eventDate}. Find local events, meetups, and activities happening near you.`

  const getEventImageUrl = (image: any): string => {
    if (typeof image === "string") {
      return image.startsWith('http') ? image : `https://www.sacavia.com${image}`
    } else if (image?.url) {
      return image.url.startsWith('http') ? image.url : `https://www.sacavia.com${image.url}`
    }
    return 'https://www.sacavia.com/og-image.png'
  }

  const eventImage = getEventImageUrl(event.image)

  return {
    title: seoTitle,
    description,
    keywords: [
      event.name,
      'events near me',
      'meetups',
      'local events',
      locationName,
      event.category || 'local event',
      'activities',
      'join event',
      eventDate
    ].filter(Boolean).join(', '),
    authors: [{ name: 'Sacavia Community' }],
    creator: 'Sacavia',
    publisher: 'Sacavia',
    alternates: {
      canonical: `https://www.sacavia.com/events/${id}`
    },
    openGraph: {
      title: seoTitle,
      description,
      url: `https://www.sacavia.com/events/${id}`,
      siteName: 'Sacavia',
      images: [
        {
          url: eventImage,
          width: 1200,
          height: 630,
          alt: `${event.name} - Event photo from Sacavia community`,
        },
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description,
      site: '@sacavia',
      creator: '@sacavia',
      images: [eventImage],
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
      'event:start_time': event.startDate,
      'event:end_time': event.endDate,
      'event:location': locationName,
      'article:author': 'Sacavia Community',
      'article:publisher': 'https://www.sacavia.com',
      'og:locale': 'en_US',
      'og:type': 'event',
    }
  }
}

// The page component must also destructure & await the Promise
export default async function EventDetailPage({
  params,
}: {
  params: AsyncParams
}) {
  const { id } = await params
  const data = await getEventById({ eventId: id })

  // Map raw data into your Event shape (or null if not found)
  const event = data
    ? {
        id: String(data.id),
        name: data.name as string,
        slug: data.slug as string,
        description: data.description as string,
        startDate: data.startDate as string,
        endDate: data.endDate as string,
        location: {
          id:
            typeof data.location === "string"
              ? data.location
              : data.location.id,
          name:
            typeof data.location === "string"
              ? data.location
              : data.location.name,
          address:
            typeof data.location === "string"
              ? ""
              : data.location.address ?? "",
        },
        image: data.image,
        organizerId: data.organizerId as string,
        organizer: data.organizer,
        status: data.status as
          | "draft"
          | "published"
          | "cancelled"
          | "postponed",
        createdAt: data.createdAt as string,
        updatedAt: data.updatedAt as string,
        participantCount: data.participantCount ?? 0,
        locationType: data.locationType ?? "physical",
        eventType: data.eventType ?? "event",
        category: data.category ?? "other",
        createdBy: data.createdBy ?? data.organizerId,
        visibility: data.visibility ?? "public",
      }
    : null

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Add structured data for SEO */}
      {event && (
        <EventStructuredData event={{
          id: event.id,
          name: event.name,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          image: event.image,
          organizer: event.organizer,
          eventType: event.eventType,
          slug: event.slug
        }} />
      )}
      
      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetailContainer eventId={id} initialEvent={event} />
      </Suspense>
    </div>
  )
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
      <div className="relative rounded-xl overflow-hidden">
        <div className="h-64 md:h-80 w-full bg-gray-300"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <div className="h-8 bg-gray-200 w-1/3 rounded-md"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-md"></div>
              <div className="h-4 bg-gray-200 rounded-md"></div>
              <div className="h-4 bg-gray-200 rounded-md w-2/3"></div>
            </div>
          </div>
          <div className="rounded-lg border">
            <div className="p-4 border-b">
              <div className="h-8 bg-gray-200 w-1/4 rounded-md"></div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex space-x-3">
                <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 w-32 rounded-md"></div>
                  <div className="h-3 bg-gray-200 w-24 rounded-md"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <div className="h-20 bg-gray-200 rounded-md"></div>
            <div className="h-10 bg-gray-300 rounded-md"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  )
}