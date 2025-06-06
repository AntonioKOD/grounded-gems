// app/events/create/page.tsx

import { Suspense } from "react"
import type { Metadata } from "next"
import CreateEventForm from "@/components/event/create-event-form"
import { Skeleton } from "@/components/ui/skeleton"

// Prevent static generation
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Create Community Gathering | Sacavia",
  description: "Organize a meaningful gathering for your community. Share experiences and bring people together around authentic connections.",
}

export default function CreateEventPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Create Event</h1>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        }
      >
        <CreateEventForm />
      </Suspense>
    </div>
  )
}