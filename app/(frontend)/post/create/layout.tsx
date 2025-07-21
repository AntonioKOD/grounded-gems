import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Share a Post | Sacavia",
  description: "Share photos and reviews of places you've visited. Help others discover great restaurants, attractions, and hidden gems.",
}

export default function CreatePostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 