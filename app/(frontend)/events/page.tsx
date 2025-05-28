import { Suspense } from "react"
import type { Metadata } from "next"
import EventsContainer from "@/components/event/events-container"
import EventsSkeleton from "@/components/event/events-skeleton"
import { getServerSideUser } from "@/lib/auth-server"
import { getSavedGemJourneys } from '@/app/(frontend)/events/actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Events | Grounded Gems",
  description: "Discover and join local events in your area",
}

export default async function EventsPage({ searchParams }: { searchParams: any }) {
  const savedJourneys = await getSavedGemJourneys()
  return <EventsContainer savedJourneys={savedJourneys} initialSearchParams={searchParams} />
}
