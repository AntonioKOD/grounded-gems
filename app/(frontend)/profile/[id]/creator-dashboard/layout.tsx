import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Creator Dashboard | Sacavia",
  description: "Track your guide sales, earnings, and creator analytics. Manage your creator profile and view detailed performance metrics.",
  keywords: ["creator dashboard", "guide sales", "earnings", "analytics", "creator tools"],
}

export default function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 