import { Suspense } from "react"
import type { Metadata } from "next"
import { MatchmakingSessionDetail } from "@/components/matchmaking/matchmaking-session-detail"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { getSessionById } from "@/app/(frontend)/matchmaking/actions"

// Now receives params as a Promise<{ id: string }>
type AsyncParams = Promise<{ id: string }>

export async function generateMetadata({
  params,
}: {
  params: AsyncParams
}): Promise<Metadata> {
  const { id } = await params
  const session = await getSessionById({ sessionId: id })

  if (!session) {
    return {
      title: "Session Not Found | Matchmaking",
      description: "The matchmaking session you're looking for could not be found.",
    }
  }

  return {
    title: `${session.title} | Matchmaking`,
    description: session?.description?.substring(0, 160),
    openGraph: {
      title: session.title,
      description: session.description?.substring(0, 160),
      images: session.image ? [session.image] : [],
      type: "website",
    },
  }
}

export default async function MatchmakingSessionPage({
  params,
}: {
  params: AsyncParams
}) {
  const { id } = await params

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        heading="Matchmaking Session"
        subheading="View session details and participants"
      />

      <Suspense fallback={<SessionDetailSkeleton />}>
        <MatchmakingSessionDetail id={id} />
      </Suspense>
    </div>
  )
}

function SessionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}