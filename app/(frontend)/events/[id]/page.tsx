import { Suspense } from "react"
import type { Metadata } from "next"
import EventDetailContainer from "@/components/event/event-detail-container"
import { getEventById } from "@/app/(frontend)/events/actions"

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
      title: "Event Not Found | Events",
      description: "The event you're looking for could not be found.",
    }
  }

  return {
    title: `${event.name} | Events`,
    description: event.description.substring(0, 160),
    openGraph: {
      title: event.name,
      description: event.description.substring(0, 160),
      images:
        typeof event.image === "string"
          ? [event.image]
          : event.image?.url
          ? [event.image.url]
          : [],
      type: "website",
    },
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