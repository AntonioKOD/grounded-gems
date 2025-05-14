import { Suspense } from "react"
import NotificationsPage from "@/components/notifications/notifications-page"
import NotificationsPageSkeleton from "@/components/notifications/notifications-page-skeleton"

export const metadata = {
  title: "Notifications | Local Explorer",
  description: "View your notifications and activity updates",
}

export default function NotificationsRoute() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>

      <Suspense fallback={<NotificationsPageSkeleton />}>
        <NotificationsPage />
      </Suspense>
    </div>
  )
}
