import { Suspense } from "react"
import type { Metadata } from "next"
import EventsContainer from "@/components/event/events-container"
import EventsSkeleton from "@/components/event/events-skeleton"
import { getServerSideUser } from "@/lib/auth-server"
import { getSavedGemJourneys } from '@/app/(frontend)/events/actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Local Events Near You | Sacavia",
  description: "Find fun events, meetups, and activities happening near you. Join local gatherings, workshops, and social events in your area.",
}

export default async function EventsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const savedJourneys = await getSavedGemJourneys()
  const resolvedSearchParams = await searchParams
  return <EventsContainer savedJourneys={savedJourneys} initialSearchParams={resolvedSearchParams} />
}
