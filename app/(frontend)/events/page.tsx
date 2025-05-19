import { Suspense } from "react"
import type { Metadata } from "next"
import EventsContainer from "@/components/event/events-container"
import EventsSkeleton from "@/components/event/events-skeleton"

export const metadata: Metadata = {
  title: "Events | Grounded Gems",
  description: "Discover and join local events in your area",
}

export default function EventsPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Events</h1>

      <Suspense fallback={<EventsSkeleton />}>
        <EventsContainer />
      </Suspense>
    </div>
  )
}
