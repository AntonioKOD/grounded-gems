import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Test Private Event | Sacavia",
  description: "Test the private event functionality with privacy controls and location search.",
}

export default function TestPrivateEventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
} 