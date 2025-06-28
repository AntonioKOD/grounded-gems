import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Become a Creator | Sacavia',
  description: 'Join our community of local experts and share your knowledge with fellow explorers. Apply to become a Sacavia creator today.',
  keywords: 'creator, local expert, travel guide, community, application',
}

export default function CreatorApplicationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {children}
    </div>
  )
} 