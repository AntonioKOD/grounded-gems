import { Suspense } from "react"
import type { Metadata } from "next"
import EventsContainer from "@/components/event/events-container"
import EventsSkeleton from "@/components/event/events-skeleton"
import { getServerSideUser } from "@/lib/auth-server"
import { getSavedGemJourneys } from '@/app/(frontend)/events/actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Community Gatherings | Sacavia",
  description: "Discover and join authentic community gatherings and events. Connect with fellow explorers and create meaningful memories together.",
}

export default async function EventsPage({ searchParams }: { searchParams: any }) {
  const savedJourneys = await getSavedGemJourneys()
  return <EventsContainer savedJourneys={savedJourneys} initialSearchParams={searchParams} />
}
